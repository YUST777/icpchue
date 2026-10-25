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

    return createPortal(
        <div className="fixed inset-0 z-[2147483000] bg-black/65 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={onClose}>
            <div role="dialog" aria-modal="true" aria-label={badge.title} onClick={e => e.stopPropagation()}
                className="w-full sm:max-w-md max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-white/[0.08] bg-[#121214] px-5 pt-3 pb-6 sm:p-6 animate-[drawerUp_0.32s_cubic-bezier(0.32,0.72,0,1)] sm:animate-none">
                <div className="sm:hidden mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" aria-hidden />
                <div className="flex justify-end">
                    <button type="button" onClick={onClose} aria-label="Close"
                        className="-m-1.5 p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer">
                        <X size={16} />
                    </button>
                </div>

                <div className="relative h-56 -mt-2">
                    <Badge3D modelPath={badge.modelPath} scale={badge.scale ?? 2} unlocked={badge.unlocked} compact fallbackSrc={meta?.imageSrc} />
                    {!badge.unlocked && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><Lock className="w-7 h-7 text-white/60" /></div>}
                </div>

                <div className="text-center mt-2">
                    <h2 className="text-lg font-semibold text-white">{badge.title}</h2>
                    <div className={`text-xs capitalize mt-1 ${RARITY_TEXT[badge.rarity]}`}>{badge.rarity}</div>
                </div>

                <div className={`mt-4 rounded-xl border px-3.5 py-2.5 text-sm flex items-start gap-2 ${badge.unlocked ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300' : 'border-white/[0.08] bg-white/[0.03] text-white/50'}`}>
                    {badge.unlocked ? <Check size={15} className="mt-0.5 shrink-0" /> : <Lock size={14} className="mt-0.5 shrink-0" />}
                    <div>
                        {badge.unlocked ? 'Unlocked' : 'Not unlocked yet'}
                        {dates.map(d => <div key={d} className="text-xs opacity-80 mt-0.5">{formatDate(d)}</div>)}
                    </div>
                </div>

                <div className="mt-4">
                    <div className="text-xs font-medium text-white/40 mb-1">How to get it</div>
                    <p className="text-sm text-white/80 leading-relaxed">{howTo.how}</p>
                </div>

                {howTo.href && (() => {
                    const cls = 'mt-5 inline-flex w-full items-center justify-center gap-2 h-10 rounded-xl bg-[#E8C15A] text-black text-sm font-semibold hover:bg-[#d4ad45] transition-colors';
                    const label = <>{howTo.cta ?? 'Go'} <ArrowRight size={15} /></>;
                    return howTo.href.startsWith('http')
                        ? <a href={howTo.href} target="_blank" rel="noopener noreferrer" className={cls}>{label}</a>
                        : <Link href={howTo.href} onClick={onClose} className={cls}>{label}</Link>;
                })()}
                <style>{`@keyframes drawerUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
            </div>
        </div>,
        document.body
    );
}
