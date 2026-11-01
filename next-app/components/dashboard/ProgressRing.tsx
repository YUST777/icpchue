'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ProgressRingProps {
    progress: number;
    total: number;
    label?: string;
    size?: number;
    href?: string;
    /** Small ring with no label badge, for phone layouts. */
    compact?: boolean;
}

export function ProgressRing({ progress, total, label = 'Sheet', size = 220, href, compact = false }: ProgressRingProps) {
    const [animatedProgress, setAnimatedProgress] = useState(0);

    useEffect(() => {
        const timer = setTimeout(() => setAnimatedProgress(progress), 100);
        return () => clearTimeout(timer);
    }, [progress]);

    const pct = total > 0 ? Math.max(0, Math.min((animatedProgress / total) * 100, 100)) : 0;
    const r = (size / 2) - 22;
    const c = r * 2 * Math.PI;
    const offset = c - (pct / 100) * c;
    const center = size / 2;

    const content = (
        <div className="relative max-w-full self-center lg:self-auto">
            <div className={compact ? 'relative w-[92px] h-[92px]' : 'relative w-[180px] h-[180px] sm:w-[220px] sm:h-[220px]'}>
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
                        stroke={pct === 100 ? '#55B98A' : 'var(--color-accent)'}
                        strokeWidth="14"
                        strokeLinecap="round"
                        strokeDasharray={c}
                        strokeDashoffset={offset}
                        className="transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
                    />
                </svg>

                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    {total > 0 ? (
                        <>
                            <span className={compact ? 'text-2xl font-medium leading-none text-[var(--color-text)] tabular-nums' : 'text-4xl font-medium text-[var(--color-text)] sm:text-5xl tabular-nums'}>{progress}</span>
                            <span className={compact ? 'mt-0.5 text-xs text-[var(--color-text-muted)]' : 'text-xs text-[var(--color-text-muted)] sm:text-sm'}>of {total}</span>
                        </>
                    ) : (
                        <>
                            <span className="text-3xl font-medium text-[var(--color-text-muted)]">—</span>
                            <span className="text-xs text-[var(--color-text-secondary)]">Start solving</span>
                        </>
                    )}
                </div>

                {/* Label badge */}
                {!compact && <div className="absolute -bottom-3 left-1/2 -translate-x-1/2">
                    <span className="ui-card block w-max max-w-[240px] px-3 py-1 text-center text-xs font-medium leading-snug text-[var(--color-text-secondary)]">
                        {label}
                    </span>
                </div>}
            </div>
        </div>
    );

    if (href) {
        return (
            <Link href={href} aria-label={`${label}: ${progress} of ${total} problems solved`} className="block rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--color-page)]">
                {content}
            </Link>
        );
    }

    return content;
}
