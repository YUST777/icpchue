'use client';

import { useId } from 'react';

// ICPC-style balloons: each sheet gets its own color, picked from a fixed palette.
// Sheets numbered in their slug (sheet-1, sheet-2, ...) walk the palette in order;
// any other slug falls back to a hash, so the color is stable across visits.
const BALLOON_COLORS = [
    '#EF4444', // red
    '#3B82F6', // blue
    '#22C55E', // green
    '#EAB308', // yellow
    '#A855F7', // purple
    '#F97316', // orange
    '#EC4899', // pink
    '#14B8A6', // teal
    '#6366F1', // indigo
    '#84CC16', // lime
    '#06B6D4', // cyan
    '#F43F5E', // rose
];

export function getSheetBalloonColor(levelSlug: string, sheetSlug: string): string {
    const levelNum = Number(levelSlug.match(/(\d+)\s*$/)?.[1] ?? NaN);
    const sheetNum = Number(sheetSlug.match(/(\d+)\s*$/)?.[1] ?? NaN);
    const n = BALLOON_COLORS.length;
    if (Number.isFinite(sheetNum)) {
        // Shift each level so sheet 1 of level 0 and sheet 1 of level 1 differ.
        const index = sheetNum - 1 + (Number.isFinite(levelNum) ? levelNum * 5 : 0);
        return BALLOON_COLORS[((index % n) + n) % n];
    }
    let hash = 0;
    for (const ch of `${levelSlug}/${sheetSlug}`) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
    return BALLOON_COLORS[Math.abs(hash) % n];
}

interface SheetBalloonProps {
    color: string;
    solved: number;
    total: number;
    className?: string;
}

// Starts as a small balloon and inflates a step with every solved problem,
// reaching full size when the whole sheet is solved.
export function SheetBalloon({ color, solved, total, className = '' }: SheetBalloonProps) {
    const gradientId = useId();
    const progress = total > 0 ? Math.min(solved / total, 1) : 0;
    const scale = 0.45 + 0.55 * progress;
    const done = total > 0 && solved >= total;

    return (
        <div
            className={`pointer-events-none select-none ${className}`}
            title={`${solved}/${total} solved`}
            aria-label={`Balloon: ${solved} of ${total} problems solved`}
            role="img"
        >
            <div className="sheet-balloon-float">
                <svg
                    width="56"
                    height="84"
                    viewBox="0 0 56 84"
                    className="overflow-visible transition-transform duration-700 ease-[cubic-bezier(.34,1.56,.64,1)]"
                    style={{ transform: `scale(${scale})`, transformOrigin: '50% 100%' }}
                >
                    <defs>
                        <radialGradient id={gradientId} cx="35%" cy="30%" r="75%">
                            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
                            <stop offset="35%" stopColor={color} stopOpacity="1" />
                            <stop offset="100%" stopColor={color} stopOpacity="0.85" />
                        </radialGradient>
                    </defs>
                    {/* string */}
                    <path d="M28 60 C 24 66, 32 72, 27 84" stroke="#9CA3AF" strokeWidth="1.2" fill="none" />
                    {/* knot */}
                    <path d="M25 58 L31 58 L28 62 Z" fill={color} />
                    {/* balloon body */}
                    <path
                        d="M28 2 C 44 2, 54 14, 54 28 C 54 44, 40 56, 28 58 C 16 56, 2 44, 2 28 C 2 14, 12 2, 28 2 Z"
                        fill={`url(#${gradientId})`}
                        style={{ filter: done ? `drop-shadow(0 0 10px ${color})` : `drop-shadow(0 2px 6px ${color}55)` }}
                    />
                    {/* shine */}
                    <ellipse cx="18" cy="17" rx="5" ry="8" fill="#fff" opacity="0.35" transform="rotate(-25 18 17)" />
                </svg>
            </div>
            <style>{`
                @keyframes sheetBalloonFloat { 0%, 100% { transform: translateY(0) rotate(-3deg); } 50% { transform: translateY(-5px) rotate(3deg); } }
                .sheet-balloon-float { animation: sheetBalloonFloat 3.5s ease-in-out infinite; transform-origin: 50% 100%; }
                @media (prefers-reduced-motion: reduce) { .sheet-balloon-float { animation: none; } }
            `}</style>
        </div>
    );
}
