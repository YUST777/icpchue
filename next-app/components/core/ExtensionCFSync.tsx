'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Automatically listens for the Verdict Helper Chrome Extension.
 * When the extension reports the user is logged into Codeforces,
 * this component automatically syncs their CF handle and ratings to
 * icpchue.com so their ranking appears on the leaderboard and profile
 * without requiring the student to go through OAuth connect.
 */
export default function ExtensionCFSync() {
    const { user, profile, refreshProfile } = useAuth();
    const syncingRef = useRef(false);

    useEffect(() => {
        if (!user) return;

        const sessionKey = 'verdict_cf_synced_handle';

        const syncHandle = async (rawHandle: string) => {
            const trimmed = String(rawHandle || '').trim();
            if (!trimmed || syncingRef.current) return;

            const lastSynced = sessionStorage.getItem(sessionKey);
            if (lastSynced === trimmed) return;

            // If user profile already has this handle and recent data, skip duplicate network call
            const currentProfileHandle = profile?.codeforces_profile || (user as any).codeforces_handle;
            const currentRating = profile?.codeforces_data?.rating;
            if (currentProfileHandle && currentProfileHandle.toLowerCase() === trimmed.toLowerCase() && currentRating) {
                sessionStorage.setItem(sessionKey, trimmed);
                return;
            }

            syncingRef.current = true;
            try {
                const res = await fetch('/api/codeforces/sync-handle', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ handle: trimmed }),
                    credentials: 'include',
                });

                if (res.ok) {
                    sessionStorage.setItem(sessionKey, trimmed);
                    await refreshProfile();
                } else if (res.status === 409) {
                    // Handle linked to another account; don't retry in this session
                    sessionStorage.setItem(sessionKey, trimmed);
                }
            } catch {
                // Ignore network errors
            } finally {
                syncingRef.current = false;
            }
        };

        const onMessage = (event: MessageEvent) => {
            if (event.source !== window) return;
            const data = event.data;
            if (!data) return;

            // Existing extension sends VERDICT_HANDLE_RESPONSE or VERDICT_LOGIN_STATUS
            if (data.type === 'VERDICT_HANDLE_RESPONSE' && data.handle) {
                syncHandle(data.handle);
            } else if (data.type === 'VERDICT_LOGIN_STATUS' && data.loggedIn && data.handle) {
                syncHandle(data.handle);
            }
        };

        window.addEventListener('message', onMessage);

        // Ping existing extension once the DOM is ready
        const pingExtension = () => {
            window.postMessage({ type: 'VERDICT_GET_HANDLE' }, '*');
            window.postMessage({ type: 'VERDICT_CHECK_LOGIN' }, '*');
        };

        const timer1 = setTimeout(pingExtension, 400);
        const timer2 = setTimeout(pingExtension, 1500);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
            window.removeEventListener('message', onMessage);
        };
    }, [user, profile, refreshProfile]);

    return null;
}
