'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';

interface VirtualLeaderboardProps<T = unknown> {
    items: T[];
    itemSize: number;
    children: (props: { index: number; style: React.CSSProperties }) => React.ReactNode;
    /**
     * Index of the signed-in user's row. While that row is scrolled out of view,
     * a button appears that scrolls the list back to it.
     */
    currentUserIndex?: number;
}

export default function VirtualLeaderboard<T = unknown>({ items, itemSize, children, currentUserIndex }: VirtualLeaderboardProps<T>) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [containerHeight, setContainerHeight] = useState(600);

    useEffect(() => {
        const updateHeight = () => {
            if (containerRef.current) {
                setContainerHeight(containerRef.current.clientHeight);
            }
        };
        updateHeight();
        window.addEventListener('resize', updateHeight);
        return () => window.removeEventListener('resize', updateHeight);
    }, []);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop);
    };

    // Scroll so the signed-in user's row sits in the middle of the list.
    // The browser clamps the position near the top and bottom of the list.
    const scrollToCurrentUser = () => {
        const container = containerRef.current;
        if (!container || currentUserIndex === undefined || currentUserIndex < 0) return;
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        container.scrollTo({
            top: currentUserIndex * itemSize - (container.clientHeight - itemSize) / 2,
            behavior: reduceMotion ? 'auto' : 'smooth',
        });
    };

    // Handle empty items array
    if (!items || items.length === 0) {
        return null;
    }

    const totalHeight = items.length * itemSize;
    const startIndex = Math.max(0, Math.floor(scrollTop / itemSize) - 5); // Buffer of 5 items
    const endIndex = Math.min(
        items.length - 1,
        Math.ceil((scrollTop + containerHeight) / itemSize) + 5
    );

    const visibleItems = [];
    for (let i = startIndex; i <= endIndex; i++) {
        visibleItems.push({
            index: i,
            offsetTop: i * itemSize,
        });
    }

    // Where the signed-in user's row is relative to the visible area.
    // Stays null while the row is fully visible, or when the user is not in the list.
    const currentUserRank =
        currentUserIndex !== undefined && currentUserIndex >= 0 && currentUserIndex < items.length
            ? currentUserIndex + 1
            : null;
    let jumpDirection: 'up' | 'down' | null = null;
    if (currentUserRank !== null) {
        const rowTop = (currentUserRank - 1) * itemSize;
        if (rowTop < scrollTop) {
            jumpDirection = 'up';
        } else if (rowTop + itemSize > scrollTop + containerHeight) {
            jumpDirection = 'down';
        }
    }

    return (
        <div
            style={{
                flex: 1,
                minHeight: 0,
                height: '100%',
                width: '100%',
                position: 'relative',
            }}
        >
            <div
                ref={containerRef}
                onScroll={handleScroll}
                style={{
                    position: 'absolute',
                    inset: 0,
                    overflow: 'auto',
                }}
            >
                <div style={{ height: totalHeight, position: 'relative' }}>
                    {visibleItems.map(({ index, offsetTop }) => {
                        // Create the positioning style to pass to children
                        const itemStyle: React.CSSProperties = {
                            position: 'absolute',
                            top: offsetTop,
                            left: 0,
                            right: 0,
                            height: itemSize,
                        };

                        return (
                            <React.Fragment key={`virtual-item-${index}`}>
                                {children({ index, style: itemStyle })}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>

            {jumpDirection && (
                <button
                    type="button"
                    onClick={scrollToCurrentUser}
                    aria-label={`Scroll to your rank, number ${currentUserRank}`}
                    className={`absolute left-1/2 z-10 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-[#E8C15A] px-3.5 py-2 text-xs font-bold text-black shadow-lg shadow-black/50 transition-colors hover:bg-[#D4AF37] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${jumpDirection === 'down' ? 'bottom-3' : 'top-3'}`}
                >
                    {jumpDirection === 'down' ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
                    Your rank #{currentUserRank}
                </button>
            )}
        </div>
    );
}
