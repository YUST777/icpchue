'use client';

import { useState, useMemo, useEffect } from 'react';
import VirtualLeaderboard from '@/components/common/VirtualLeaderboard';

export default function StressTestPage() {
    const [count, setCount] = useState(1000); // Start with 1k
    const [isClient, setIsClient] = useState(false);

    // Hydration fix
    useEffect(() => {
        setTimeout(() => setIsClient(true), 0);
    }, []);

    // Use deterministic rating based on index to avoid impure Math.random()
    const dummyItems = useMemo(() => {
        return Array.from({ length: count }, (_, i) => ({
            id: i,
            handle: `StressUser_${i}`,
            rating: (i * 17 + 100) % 3000, // Deterministic pseudo-random
            rank: 'Grandmaster'
        }));
    }, [count]);

    if (!isClient) return null;

    return (
        <div className="p-8 space-y-6">
            <h1 className="text-2xl font-bold text-white mb-4">Level 1: UI Stress Test</h1>

            <div className="bg-[#121212] p-6 rounded-lg border border-white/10">
                <div className="flex gap-4 mb-6">
                    <button
                        onClick={() => setCount(1000)}
                        className={`px-4 py-2 rounded ${count === 1000 ? 'bg-[#E8C15A] text-black' : 'bg-[#333] text-white'}`}
                    >
                        1,000 Items
                    </button>
                    <button
                        onClick={() => setCount(5000)}
                        className={`px-4 py-2 rounded ${count === 5000 ? 'bg-[#E8C15A] text-black' : 'bg-[#333] text-white'}`}
                    >
                        5,000 Items
                    </button>
                    <button
                        onClick={() => setCount(10000)}
                        className={`px-4 py-2 rounded ${count === 10000 ? 'bg-[#E8C15A] text-black' : 'bg-[#333] text-white'}`}
                    >
                        10,000 Items
                    </button>
                    <button
                        onClick={() => setCount(50000)}
                        className={`px-4 py-2 rounded ${count === 50000 ? 'bg-red-500 text-white' : 'bg-[#333] text-white'}`}
                    >
                        50,000 Items (Crash?)
                    </button>
                </div>

                <div className="h-[600px] border border-white/10 rounded-lg overflow-hidden">
                    <VirtualLeaderboard items={dummyItems} itemSize={50}>
                        {({ index, style }) => (
                            <div style={style} className="flex items-center px-4 border-b border-white/5 hover:bg-white/5 text-white">
                                <span className="w-12 text-[#666]">{index + 1}</span>
                                <span className="flex-1 font-mono">{dummyItems[index].handle}</span>
                                <span className="text-[#E8C15A]">{dummyItems[index].rating}</span>
                            </div>
                        )}
                    </VirtualLeaderboard>
                </div>
            </div>

            <p className="text-[#666] text-sm mt-4">
                Open Chrome DevTools Performance tab and record while clicking these buttons to measure &quot;Mount&quot; and &quot;Update&quot; timings.
            </p>
        </div>
    );
}
