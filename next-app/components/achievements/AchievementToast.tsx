'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAchievements, type Achievement } from '@/hooks/useAchievements';
import { getAchievementMeta } from '@/lib/achievements/catalog';
import { playAchievementSound } from '@/lib/achievements/sound';
import { addCacheBust } from '@/lib/cache/cache-version';

const AUTH_PAGES = ['/register', '/login', '/forgot-password', '/reset-password'];
const SHOW_MS = 6000;
const DIGEST_FROM = 3;
const TIER_RANK = { common: 0, rare: 1, legendary: 2 } as const;
const POLL_MS = 20000;

const TIER_STYLE = {
    common: { label: 'text-white/60', ring: 'rgba(255,255,255,0.25)', glow: 'bg-white/20' },
    rare: { label: 'text-sky-300', ring: 'rgba(56,189,248,0.45)', glow: 'bg-sky-400/30' },
    legendary: { label: 'text-[#E8C15A]', ring: 'rgba(232,193,90,0.6)', glow: 'bg-[#E8C15A]/40' },
} as const;

/**
 * Shows every newly earned achievement as a toast, stacked under each other, on
 * any page after sign-in. A toast marks its achievement as seen when it closes.
 */
export default function AchievementToast() {
    const pathname = usePathname();
    const { isAuthenticated, loading } = useAuth();
    const onAuthPage = pathname ? AUTH_PAGES.includes(pathname) : false;
    const { unseenAchievements, markAsSeen, refetch } = useAchievements(isAuthenticated && !loading && !onAuthPage);

    // Badges are earned while solving, so look for new ones after every page change.
    useEffect(() => {
        if (isAuthenticated && !loading && !onAuthPage) refetch();
    }, [pathname, isAuthenticated, loading, onAuthPage, refetch]);

    // Live: look for new badges while the tab is open, and the moment it comes back into view.
    useEffect(() => {
        if (!isAuthenticated || loading || onAuthPage) return;
        let known = '';
        let stopped = false;
        const check = async () => {
            if (stopped || document.visibilityState !== 'visible') return;
            try {
                const res = await fetch(addCacheBust('/api/achievements'), { credentials: 'include', cache: 'no-store' });
                if (!res.ok) return;
                const data = await res.json();
                const sig = (data.achievements ?? []).map((a: { id: number }) => a.id).sort().join(',');
                if (known && sig !== known) window.dispatchEvent(new Event('achievements:changed'));
                known = sig;
            } catch { /* try again on the next tick */ }
        };
        void check();
        const timer = setInterval(check, POLL_MS);
        const onVisible = () => { if (document.visibilityState === 'visible') void check(); };
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('focus', onVisible);
        return () => { stopped = true; clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); window.removeEventListener('focus', onVisible); };
    }, [isAuthenticated, loading, onAuthPage]);

    const shown = unseenAchievements.filter(a => getAchievementMeta(a.achievement_id));
    if (!isAuthenticated || shown.length === 0) return null;
    const digest = shown.length >= DIGEST_FROM;

    return (
        <div className="fixed z-[1000000] left-3 right-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] sm:left-auto sm:right-6 sm:bottom-6 sm:w-[360px] pointer-events-none flex flex-col gap-2 max-h-[80vh] overflow-hidden" role="status" aria-live="polite">
            {digest
                ? <DigestCard achievements={shown} onSeen={markAsSeen} />
                : shown.slice(0, 2).map(a => <ToastCard key={a.id} achievement={a} onSeen={markAsSeen} />)}
        </div>
    );
}

/** Three or more at once (a backfill, a big solve session): one summary toast and one sound. */
function DigestCard({ achievements, onSeen }: { achievements: Achievement[]; onSeen: (id: number) => void }) {
    const [leaving, setLeaving] = useState(false);
    const ids = achievements.map(a => a.id);
    const key = ids.join(',');
    const metas = achievements
        .map(a => getAchievementMeta(a.achievement_id)!)
        .sort((a, b) => TIER_RANK[b.tier] - TIER_RANK[a.tier]);
    const top = metas[0];

    const dismiss = useCallback(() => {
        setLeaving(true);
        setTimeout(() => ids.forEach(id => onSeen(id)), 250);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, onSeen]);

    useEffect(() => {
        const t = setTimeout(dismiss, SHOW_MS + 2000);
        return () => clearTimeout(t);
    }, [dismiss]);

    useEffect(() => { playAchievementSound(`digest:${key}`, top.tier); }, [key, top.tier]);

    const tier = TIER_STYLE[top.tier];
    return (
        <div className={`pointer-events-auto relative overflow-hidden rounded-2xl border border-white/[0.1] bg-[#121214]/95 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] ${leaving ? 'achievement-toast-out' : 'achievement-toast-in'}`}>
            <div className={`absolute -left-10 -top-10 h-40 w-40 rounded-full blur-3xl opacity-50 ${tier.glow}`} aria-hidden />
            <div className="relative flex items-center gap-3 p-3 pr-9">
                <div className="flex shrink-0 -space-x-4">
                    {metas.slice(0, 4).map((m, i) => (
                        <div key={m.imageSrc} className="relative h-12 w-12 sm:h-14 sm:w-14" style={{ zIndex: 10 - i }}>
                            <Image src={m.imageSrc} alt="" fill sizes="56px" className="object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]" />
                        </div>
                    ))}
                </div>
                <Link href="/dashboard/achievements" onClick={dismiss} className="min-w-0 flex-1">
                    <div className={`text-[10px] font-mono uppercase tracking-[0.18em] ${tier.label}`}>Achievements unlocked</div>
                    <div className="mt-0.5 text-sm font-semibold text-white leading-tight">{achievements.length} new badges</div>
                    <div className="text-xs text-white/50 truncate">{metas.slice(0, 3).map(m => m.name).join(', ')}{metas.length > 3 ? ` +${metas.length - 3}` : ''}</div>
                </Link>
                <button type="button" onClick={dismiss} aria-label="Close"
                    className="absolute top-2 right-2 p-1 rounded-md text-white/30 hover:text-white hover:bg-white/5 cursor-pointer">
                    <X size={14} />
                </button>
            </div>
        </div>
    );
}

function ToastCard({ achievement: current, onSeen }: { achievement: Achievement; onSeen: (id: number) => void }) {
    const [leaving, setLeaving] = useState(false);
    const meta = getAchievementMeta(current.achievement_id);

    const dismiss = useCallback(() => {
        setLeaving(true);
        setTimeout(() => onSeen(current.id), 250);
    }, [current.id, onSeen]);

    useEffect(() => {
        // Unknown ids (art not shipped yet) are skipped instead of shown blank.
        if (!meta) { onSeen(current.id); return; }
        const t = setTimeout(dismiss, SHOW_MS);
        return () => clearTimeout(t);
    }, [current.id, meta, dismiss, onSeen]);

    useEffect(() => { if (meta) playAchievementSound(String(current.id), meta.tier); }, [current.id, meta]);

    if (!meta) return null;
    const tier = TIER_STYLE[meta.tier];

    return (
            <div
                className={`pointer-events-auto relative overflow-hidden rounded-2xl border border-white/[0.1] bg-[#121214]/95 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.06)] ${leaving ? 'achievement-toast-out' : 'achievement-toast-in'}`}>
                <div className={`absolute -left-10 -top-10 h-40 w-40 rounded-full blur-3xl opacity-60 ${tier.glow}`} aria-hidden />
                <div className="relative flex items-center gap-3 sm:gap-4 p-3 sm:p-3.5 pr-9 sm:pr-10">
                    <div className="relative h-[52px] w-[52px] sm:h-[72px] sm:w-[72px] shrink-0">
                        <div className="absolute inset-0 rounded-full blur-md achievement-badge-glow" style={{ background: `radial-gradient(circle, ${tier.ring}, transparent 70%)` }} aria-hidden />
                        <Image src={meta.imageSrc} alt="" fill sizes="72px" className="object-contain achievement-badge-pop drop-shadow-[0_6px_14px_rgba(0,0,0,0.6)]" />
                    </div>
                    <Link href="/dashboard/profile" onClick={dismiss} className="min-w-0 flex-1">
                        <div className={`text-[10px] font-mono uppercase tracking-[0.18em] ${tier.label}`}>Achievement unlocked</div>
                        <div className="mt-1 text-[15px] font-semibold text-white leading-tight truncate">{meta.name}</div>
                        <div className="mt-0.5 text-xs text-white/50 leading-snug line-clamp-1 sm:line-clamp-2">{meta.desc}</div>
                    </Link>
                    <button type="button" onClick={dismiss} aria-label="Close"
                        className="absolute top-2.5 right-2.5 p-1 rounded-md text-white/30 hover:text-white hover:bg-white/5 cursor-pointer">
                        <X size={14} />
                    </button>
                </div>
                <div className="h-0.5 bg-white/[0.06]">
                    <div className="h-full bg-[#E8C15A] achievement-toast-timer" style={{ animationDuration: `${SHOW_MS}ms` }} />
                </div>
            </div>
    );
}
