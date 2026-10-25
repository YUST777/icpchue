'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowRight, Check, Lock, X } from 'lucide-react';
import { getAchievementHowTo, getAchievementMeta } from '@/lib/achievements/catalog';

const Badge3D = dynamic(() => import('@/components/3d/Badge3D'), { ssr: false });

const RARITY_TEXT = { common: 'text-white/50', rare: 'text-sky-400', legendary: 'text-[#E8C15A]' } as const;

export interface AchievementDetailData {
    id: string;
    modelPath: string;
    title: string;
    unlocked: boolean;
    rarity: 'common' | 'rare' | 'legendary';
    /** ISO times it was earned; a monthly podium can have several. */
    earnedAt?: string[];
    scale?: number;
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/** What the badge is, how to get it, when you got it, and where to go to earn it. */
export default function AchievementDetail({ badge, onClose }: { badge: AchievementDetailData; onClose: () => void }) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = previous; };
    }, [onClose]);

    if (!mounted) return null;
    const howTo = getAchievementHowTo(badge.id);
    const meta = getAchievementMeta(badge.id);
    const dates = (badge.earnedAt ?? []).slice().sort();

    const cta = howTo.href && (() => {
        const cls = 'inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl bg-[#E8C15A] text-black text-sm font-semibold hover:bg-[#d4ad45] transition-colors';
        const label = <>{howTo.cta ?? 'Go'} <ArrowRight size={15} /></>;
        return howTo.href.startsWith('http')
            ? <a href={howTo.href} target="_blank" rel="noopener noreferrer" className={cls}>{label}</a>
            : <Link href={howTo.href} onClick={onClose} className={cls}>{label}</Link>;
    })();

    const field = 'text-[10px] font-mono uppercase tracking-[0.16em] text-white/35';

    return createPortal(
        <div className="fixed inset-0 z-[2147483000] bg-black/65 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-6" onClick={onClose}>
            <div role="dialog" aria-modal="true" aria-label={badge.title} onClick={e => e.stopPropagation()}
                className="relative w-full sm:max-w-3xl max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-white/[0.1] bg-[#121214] sm:grid sm:grid-cols-[17rem_1fr] animate-[drawerUp_0.32s_cubic-bezier(0.32,0.72,0,1)] sm:animate-none">
                <button type="button" onClick={onClose} aria-label="Close"
                    className="absolute top-3 right-3 z-10 p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer">
                    <X size={16} />
                </button>

                {/* Left page: the badge */}
                <div className="relative flex flex-col items-center justify-center bg-gradient-to-b from-white/[0.04] to-transparent sm:border-r border-white/[0.08] px-6 pt-5 pb-4 sm:py-8">
                    <div className="sm:hidden mx-auto mb-2 h-1 w-10 rounded-full bg-white/20" aria-hidden />
                    <div className={`${field} mb-2`}>ICPC HUE · Achievement</div>
                    <div className="relative h-44 sm:h-56 w-full">
                        <Badge3D modelPath={badge.modelPath} scale={badge.scale ?? 2} unlocked={badge.unlocked} compact fallbackSrc={meta?.imageSrc} />
                        {!badge.unlocked && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><Lock className="w-7 h-7 text-white/60" /></div>}
                    </div>
                    <div className={`mt-2 text-xs capitalize ${RARITY_TEXT[badge.rarity]}`}>{badge.rarity}</div>
                </div>

                {/* Right page: the details */}
                <div className="px-6 pb-6 pt-2 sm:py-8 sm:pr-10 flex flex-col gap-4">
                    <div>
                        <div className={field}>Achievement</div>
                        <h2 className="text-xl font-semibold text-white mt-1">{badge.title}</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className={field}>Status</div>
                            <div className={`mt-1 inline-flex items-center gap-1.5 text-sm font-medium ${badge.unlocked ? 'text-emerald-400' : 'text-white/50'}`}>
                                {badge.unlocked ? <Check size={14} /> : <Lock size={13} />}
                                {badge.unlocked ? 'Unlocked' : 'Locked'}
                            </div>
                        </div>
                        <div>
                            <div className={field}>{dates.length > 1 ? 'Earned' : 'Issued'}</div>
                            <div className="mt-1 text-sm text-white/80">
                                {dates.length === 0 ? '—' : dates.map(d => <div key={d}>{formatDate(d)}</div>)}
                            </div>
                        </div>
                    </div>

                    <div>
                        <div className={field}>How to get it</div>
                        <p className="text-sm text-white/80 leading-relaxed mt-1">{howTo.how}</p>
                    </div>

                    {cta && <div className="pt-1">{cta}</div>}
                </div>
                <style>{`@keyframes drawerUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
            </div>
        </div>,
        document.body
    );
}
