'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import { useSessionWatch } from './SessionWatch';

interface SlideViewerProps {
    /** Folder under /public holding slide-01.webp, slide-02.webp, ... */
    basePath: string;
    count: number;
    title: string;
}

const slideSrc = (basePath: string, n: number) => `${basePath}/slide-${String(n).padStart(2, '0')}.webp`;

/** View-only slide deck: arrows, keyboard, swipe, fullscreen. No download. */
export default function SlideViewer({ basePath, count, title }: SlideViewerProps) {
    const [index, setIndex] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const frameRef = useRef<HTMLDivElement>(null);
    const touchX = useRef<number | null>(null);

    const go = useCallback((delta: number) => {
        setIndex((i) => Math.min(count, Math.max(1, i + delta)));
    }, [count]);

    // Report each slide opened (mentors see which slides a trainee went through).
    const watch = useSessionWatch();
    useEffect(() => { watch?.slideSeen(index); }, [index, watch]);

    // Slides are pre-sized webp files; warm the neighbours so paging is instant.
    useEffect(() => {
        [index + 1, index + 2, index - 1].forEach((n) => {
            if (n >= 1 && n <= count) new window.Image().src = slideSrc(basePath, n);
        });
    }, [index, count, basePath]);

    useEffect(() => {
        const onFs = () => setIsFullscreen(document.fullscreenElement === frameRef.current);
        document.addEventListener('fullscreenchange', onFs);
        return () => document.removeEventListener('fullscreenchange', onFs);
    }, []);

    const toggleFullscreen = () => {
        if (document.fullscreenElement) document.exitFullscreen?.();
        else frameRef.current?.requestFullscreen?.();
    };

    return (
        <div
            ref={frameRef}
            tabIndex={0}
            aria-roledescription="slide viewer"
            aria-label={`${title}, slide ${index} of ${count}`}
            onKeyDown={(e) => {
                if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); go(1); }
                if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(-1); }
            }}
            onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
            onTouchEnd={(e) => {
                if (touchX.current === null) return;
                const dx = e.changedTouches[0].clientX - touchX.current;
                if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
                touchX.current = null;
            }}
            onContextMenu={(e) => e.preventDefault()}
            className={`relative bg-black rounded-2xl border border-white/10 overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-[#d59928] select-none ${isFullscreen ? 'flex flex-col justify-center rounded-none border-0' : ''}`}
        >
            <div className="relative w-full aspect-video">
                <Image
                    key={index}
                    src={slideSrc(basePath, index)}
                    alt={`${title}, slide ${index}`}
                    fill
                    unoptimized
                    priority={index === 1}
                    draggable={false}
                    className="object-contain"
                />
                <button type="button" onClick={() => go(-1)} disabled={index === 1} aria-label="Previous slide"
                    className="absolute left-0 inset-y-0 w-1/4 flex items-center justify-start pl-2 sm:pl-3 text-white/0 hover:text-white/80 disabled:hidden transition-colors">
                    <ChevronLeft className="w-8 h-8 drop-shadow" />
                </button>
                <button type="button" onClick={() => go(1)} disabled={index === count} aria-label="Next slide"
                    className="absolute right-0 inset-y-0 w-1/4 flex items-center justify-end pr-2 sm:pr-3 text-white/0 hover:text-white/80 disabled:hidden transition-colors">
                    <ChevronRight className="w-8 h-8 drop-shadow" />
                </button>
            </div>

            <div className="flex items-center justify-between gap-3 px-3 py-2 bg-[#111] border-t border-white/10">
                <div className="flex items-center gap-1">
                    <button type="button" onClick={() => go(-1)} disabled={index === 1} aria-label="Previous slide"
                        className="p-1.5 rounded-md text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-xs text-white/60 tabular-nums min-w-[52px] text-center">{index} / {count}</span>
                    <button type="button" onClick={() => go(1)} disabled={index === count} aria-label="Next slide"
                        className="p-1.5 rounded-md text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden max-w-[240px]">
                    <div className="h-full bg-[#d59928] transition-all" style={{ width: `${(index / count) * 100}%` }} />
                </div>
                <button type="button" onClick={toggleFullscreen} aria-label={isFullscreen ? 'Exit full screen' : 'Full screen'}
                    className="p-1.5 rounded-md text-white/70 hover:text-white hover:bg-white/10">
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
            </div>
        </div>
    );
}
