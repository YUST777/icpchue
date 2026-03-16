'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ProgressRingProps {
    progress: number;
    total: number;
    label?: string;
    size?: number;
    href?: string;
}

export function ProgressRing({ progress, total, label = 'Sheet', size = 220, href }: ProgressRingProps) {
    const [animatedProgress, setAnimatedProgress] = useState(0);

    useEffect(() => {
        const timer = setTimeout(() => setAnimatedProgress(progress), 100);
        return () => clearTimeout(timer);
    }, [progress]);

    const pct = total > 0 ? Math.min((animatedProgress / total) * 100, 100) : 0;
    const r = (size / 2) - 22;
    const c = r * 2 * Math.PI;
    const offset = c - (pct / 100) * c;
    const center = size / 2;

    const content = (
        <div className="relative self-center lg:self-auto max-w-full">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-[#E8C15A]/10 rounded-full blur-3xl opacity-50 animate-pulse-slow" />

            <div className="relative w-[180px] h-[180px] sm:w-[220px] sm:h-[220px]">
                <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full transform -rotate-90">
                    {/* Background circle */}
                    <circle
                        cx={center}
                        cy={center}
                        r={r}
                        fill="none"
                        stroke="rgba(255,255,255,0.06)"
                        strokeWidth="14"
                    />
                    {/* Progress circle */}
                    <circle
                        cx={center}
                        cy={center}
                        r={r}
                        fill="none"
                        stroke={pct === 100 ? 'url(#ringGradComplete)' : 'url(#ringGrad)'}
                        strokeWidth="14"
                        strokeLinecap="round"
                        strokeDasharray={c}
                        strokeDashoffset={offset}
                        className="transition-all duration-1000 ease-out"
                    />
                    <defs>
                        <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#E8C15A" />
                            <stop offset="100%" stopColor="#C9A227" />
                        </linearGradient>
                        <linearGradient id="ringGradComplete" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#22c55e" />
                            <stop offset="100%" stopColor="#16a34a" />
                        </linearGradient>
                    </defs>
                </svg>

                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    {total > 0 ? (
                        <>
                            <span className="text-4xl sm:text-5xl font-bold text-white">{progress}</span>
                            <span className="text-xs sm:text-sm text-white/40">of {total}</span>
                        </>
                    ) : (
                        <>
                            <span className="text-3xl font-bold text-white/30">—</span>
                            <span className="text-xs text-white/30">Start solving</span>
                        </>
                    )}
                </div>

                {/* Label badge */}
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 bg-[#1a1a1a] border border-[#E8C15A]/30 rounded-full text-[#E8C15A] text-xs font-medium whitespace-nowrap max-w-[200px] truncate inline-block text-center">
                        {label}
                    </span>
                </div>
            </div>

            <style jsx>{`
                @keyframes pulseSlow {
                    0%, 100% { opacity: 0.5; }
                    50% { opacity: 0.3; }
                }
                .animate-pulse-slow {
                    animation: pulseSlow 3s ease-in-out infinite;
                }
            `}</style>
        </div>
    );

    if (href) {
        return (
            <Link href={href} className="hover:scale-105 transition-transform duration-300">
                {content}
            </Link>
        );
    }

    return content;
}
