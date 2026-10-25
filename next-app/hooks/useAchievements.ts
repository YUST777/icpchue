'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { addCacheBust } from '@/lib/cache/cache-version';
import { fetchWithCache } from '@/lib/cache/api-cache';
import { loadHolderStats } from '@/lib/achievements/holder-stats';

export interface Achievement {
    id: number;
    achievement_id: string;
    earned_at: string;
    seen: boolean;
    /** Mint number: 1 for the first member to earn this badge. */
    serial?: number;
    /** Number printed on the physical badge. */
    factory?: string;
}

export function useAchievements(isAuthenticated: boolean = false) {
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [loading, setLoading] = useState(true);
    const [unseenAchievement, setUnseenAchievement] = useState<Achievement | null>(null);
    const markSeenInFlight = useRef<Set<number>>(new Set());

    const fetchAchievements = useCallback(async (fresh = false) => {
        if (!isAuthenticated) {
            setLoading(false);
            return;
        }
        try {
            const data = fresh
                ? await fetch(addCacheBust('/api/achievements'), { credentials: 'include', cache: 'no-store' }).then(r => r.json())
                : await fetchWithCache<any>(addCacheBust('/api/achievements'), { credentials: 'include' }, 60);

            const fetchedAchievements = data.achievements || [];
            setAchievements(fetchedAchievements);

            const unseen = fetchedAchievements.find((a: Achievement) => !a.seen);
            setUnseenAchievement(unseen || null);
        } catch {
            setUnseenAchievement(null);
        }
        setLoading(false);
    }, [isAuthenticated]);

    const markAsSeen = useCallback(async (achievementId: number) => {
        if (markSeenInFlight.current.has(achievementId)) return;
        markSeenInFlight.current.add(achievementId);

        // Optimistic update: dismiss modal immediately so Claim feels responsive
        setAchievements(prev => {
            const updated = prev.map(a =>
                a.id === achievementId ? { ...a, seen: true } : a
            );
            const nextUnseen = updated.find(a => !a.seen);
            setUnseenAchievement(nextUnseen || null);
            return updated;
        });

        try {
            const res = await fetch(addCacheBust(`/api/achievements/${achievementId}/seen`), {
                method: 'PATCH',
                credentials: 'include'
            });
            if (!res.ok) {
                fetchAchievements(); // Rollback: refetch to restore state
            }
        } catch {
            /* Silently ignore - modal already dismissed */
        } finally {
            markSeenInFlight.current.delete(achievementId);
        }
    }, [fetchAchievements]);

    // Another part of the page found a new badge: every list on screen updates at once.
    useEffect(() => {
        const onChanged = () => { void fetchAchievements(true); };
        window.addEventListener('achievements:changed', onChanged);
        return () => window.removeEventListener('achievements:changed', onChanged);
    }, [fetchAchievements]);

    useEffect(() => {
        // Use setTimeout to avoid synchronous setState in effect
        setTimeout(() => {
            fetchAchievements();
            // Warm the rarity numbers so a badge card opens with them already there.
            if (isAuthenticated) loadHolderStats();
        }, 0);
    }, [fetchAchievements, isAuthenticated]);

    const refetch = useCallback(() => fetchAchievements(), [fetchAchievements]);

    const unseenAchievements = achievements.filter(a => !a.seen);

    return {
        achievements,
        unseenAchievements,
        loading,
        unseenAchievement,
        markAsSeen,
        refetch,
    };
}
