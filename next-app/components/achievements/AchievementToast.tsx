'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAchievements } from '@/hooks/useAchievements';
import { ACHIEVEMENT_META } from '@/lib/achievements/catalog';

const AUTH_PAGES = ['/register', '/login', '/forgot-password', '/reset-password'];
const SHOW_MS = 7000;

const TIER_STYLE = {
    common: { label: 'text-white/60', ring: 'rgba(255,255,255,0.25)', glow: 'bg-white/20' },
    rare: { label: 'text-sky-300', ring: 'rgba(56,189,248,0.45)', glow: 'bg-sky-400/30' },
    legendary: { label: 'text-[#E8C15A]', ring: 'rgba(232,193,90,0.6)', glow: 'bg-[#E8C15A]/40' },
} as const;

/**
 * Shows each newly earned achievement as a toast, one after another, on any
 * page after sign-in. A toast marks its achievement as seen when it closes.
 */
export default function AchievementToast() {
    const pathname = usePathname();
    const { isAuthenticated, loading } = useAuth();
    const onAuthPage = pathname ? AUTH_PAGES.includes(pathname) : false;
    const { unseenAchievement, markAsSeen } = useAchievements(isAuthenticated && !loading && !onAuthPage);
    const [leaving, setLeaving] = useState(false);

    const current = unseenAchievement;
    const meta = current ? ACHIEVEMENT_META[current.achievement_id] : undefined;

    const dismiss = useCallback(() => {
        if (!current) return;
        setLeaving(true);
        setTimeout(() => { markAsSeen(current.id); setLeaving(false); }, 250);
    }, [current, markAsSeen]);

    useEffect(() => {
        if (!current) return;
        // Unknown ids (art not shipped yet) are skipped instead of shown blank.
        if (!meta) { markAsSeen(current.id); return; }
        const t = setTimeout(dismiss, SHOW_MS);
        return () => clearTimeout(t);
    }, [current, meta, dismiss, markAsSeen]);

    if (!isAuthenticated || !current || !meta) return null;
    const tier = TIER_STYLE[meta.tier];

    return (
        <div className="fixed z-[1000000] bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:w-[360px] pointer-events-none" role="status" aria-live="polite">
            <div key={current.id}
                className={`pointer-events-auto relative overflow-hidden rounded-2xl border border-white/[0.1] bg-[#121214]/95 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.06)] ${leaving ? 'achievement-toast-out' : 'achievement-toast-in'}`}>
                <div className={`absolute -left-10 -top-10 h-40 w-40 rounded-full blur-3xl opacity-60 ${tier.glow}`} aria-hidden />
                <div className="relative flex items-center gap-4 p-3.5 pr-10">
                    <div className="relative h-[72px] w-[72px] shrink-0">
                        <div className="absolute inset-0 rounded-full blur-md achievement-badge-glow" style={{ background: `radial-gradient(circle, ${tier.ring}, transparent 70%)` }} aria-hidden />
                        <Image src={meta.imageSrc} alt="" fill sizes="72px" className="object-contain achievement-badge-pop drop-shadow-[0_6px_14px_rgba(0,0,0,0.6)]" />
                    </div>
                    <Link href="/dashboard/profile" onClick={dismiss} className="min-w-0 flex-1">
                        <div className={`text-[10px] font-mono uppercase tracking-[0.18em] ${tier.label}`}>Achievement unlocked</div>
                        <div className="mt-1 text-[15px] font-semibold text-white leading-tight truncate">{meta.name}</div>
                        <div className="mt-0.5 text-xs text-white/50 leading-snug line-clamp-2">{meta.desc}</div>
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
        </div>
    );
}
