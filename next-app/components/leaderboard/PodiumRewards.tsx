'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { X } from 'lucide-react';

const Badge3D = dynamic(() => import('@/components/3d/Badge3D'), { ssr: false });

const REWARDS = [
    { place: 1, title: '1st place', text: 'Most problems solved in the month', tone: 'text-[#E8C15A]' },
    { place: 2, title: '2nd place', text: 'Second most problems solved', tone: 'text-slate-300' },
    { place: 3, title: '3rd place', text: 'Third most problems solved', tone: 'text-[#D99A6C]' },
] as const;

/**
 * The three monthly podium badges. A bottom sheet on phones, a centred dialog on larger screens.
 */
export default function PodiumRewards({ onClose }: { onClose: () => void }) {
    // Rendered into <body>: the page content is animated with a transform, which would otherwise
    // become the containing block for this fixed overlay and pin it to the bottom of the page.
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
    return createPortal(
        <div className="fixed inset-0 z-[2147483000] bg-black/65 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={onClose}>
            <div role="dialog" aria-modal="true" aria-label="Monthly podium badges" onClick={e => e.stopPropagation()}
                className="w-full sm:max-w-2xl max-h-[62vh] sm:max-h-[88vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-white/[0.08] bg-[#121214] px-5 pt-3 pb-6 sm:p-6 animate-[drawerUp_0.32s_cubic-bezier(0.32,0.72,0,1)] sm:animate-none">
                <div className="sm:hidden mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" aria-hidden />
                <div className="flex items-start justify-between gap-4 mb-5">
                    <div>
                        <h2 className="text-base font-semibold text-white">Monthly podium badges</h2>
                        <p className="text-xs text-white/45 mt-1 max-w-sm">Finish in the top 3 of the Level 0 leaderboard at the end of a month to earn one. Every month has its own set.</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close"
                        className="-m-1.5 p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer">
                        <X size={16} />
                    </button>
                </div>

                <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {REWARDS.map(r => (
                        <li key={r.place} className="flex sm:flex-col items-center gap-4 sm:gap-2 rounded-xl border border-white/[0.08] bg-black/20 p-3 sm:p-4 text-left sm:text-center">
                            <div className="relative h-24 w-24 sm:h-32 sm:w-full shrink-0">
                                <Badge3D modelPath={`/3d/podium-${r.place}.glb`} scale={2} compact fallbackSrc={`/images/achievements/badges/podium-${r.place}.webp`} />
                            </div>
                            <div className="min-w-0">
                                <div className={`text-sm font-semibold ${r.tone}`}>{r.title}</div>
                                <div className="text-xs text-white/45 mt-0.5">{r.text}</div>
                            </div>
                        </li>
                    ))}
                </ul>
                <style>{`@keyframes drawerUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
            </div>
        </div>,
        document.body
    );
}
