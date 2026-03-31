'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import { ExternalLink, Trophy, Code } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { fetchWithCache } from '@/lib/cache/api-cache';
import { addCacheBust } from '@/lib/cache/cache-version';

const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

function MedalAnimation({ place }: { place: 1 | 2 | 3 }) {
    const [animationData, setAnimationData] = useState<unknown>(null);
    useEffect(() => {
        const files = { 1: '/tgs/1st Place Medal.json', 2: '/tgs/2nd Place Medal.json', 3: '/tgs/3rd Place Medal.json' };
        fetchWithCache<unknown>(files[place], {}, 3600).then(setAnimationData).catch(() => {});
    }, [place]);
    if (!animationData) return <span className="text-lg font-black text-[#E8C15A]">{place}</span>;
    return <Lottie animationData={animationData} loop style={{ width: 28, height: 28 }} />;
}

interface CFUser { handle: string; name: string; rating: number; rank: string; }
interface SheetUser { userId: number; username: string; solvedCount: number; totalSubmissions: number; acceptedCount: number; }

export default function LeaderboardPage() {
    useAuth();
    const [activeTab, setActiveTab] = useState<'sheets' | 'codeforces'>('sheets');
    const [cfLeaderboard, setCfLeaderboard] = useState<CFUser[]>([]);
    const [sheetsLeaderboard, setSheetsLeaderboard] = useState<SheetUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        (async () => {
            try {
                if (activeTab === 'codeforces') {
                    const data = await fetchWithCache<any>(addCacheBust('/api/leaderboard'), {}, 300);
                    if (!cancelled) setCfLeaderboard(Array.isArray(data.leaderboard) ? data.leaderboard : []);
                } else {
                    const data = await fetchWithCache<any>(addCacheBust('/api/leaderboard/sheets'), { credentials: 'include' }, 300);
                    if (!cancelled) setSheetsLeaderboard(Array.isArray(data.leaderboard) ? data.leaderboard : []);
                }
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [activeTab]);

    const getRatingColor = (r: number) => {
        if (r >= 2400) return 'text-red-500';
        if (r >= 2100) return 'text-orange-400';
        if (r >= 1900) return 'text-purple-400';
        if (r >= 1600) return 'text-blue-400';
        if (r >= 1400) return 'text-cyan-400';
        if (r >= 1200) return 'text-green-400';
        return 'text-gray-400';
    };

    return (
        <div className="space-y-5">
            {/* Header */}
            <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
                    <Trophy className="text-[#E8C15A]" size={24} />
                    Leaderboard
                </h2>
                <p className="text-sm text-white/40 mt-1 ml-9">Compare your progress with the community</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-white/[0.03] rounded-xl border border-white/5 w-fit">
                {(['sheets', 'codeforces'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                            activeTab === tab
                                ? 'bg-[#E8C15A] text-black shadow-lg'
                                : 'text-white/40 hover:text-white/70'
                        }`}
                    >
                        {tab === 'sheets' ? 'Training Sheets' : 'CF Rating'}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="bg-[#111] rounded-xl border border-white/5 overflow-hidden">
                {loading ? (
                    <div className="p-3 space-y-1.5">
                        {Array.from({ length: 12 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full rounded-lg" />
                        ))}
                    </div>
                ) : error ? (
                    <div className="py-16 text-center">
                        <p className="text-white/40 text-sm mb-4">{error}</p>
                        <button onClick={() => window.location.reload()} className="px-5 py-2 bg-[#E8C15A] text-black text-xs font-bold rounded-lg">Retry</button>
                    </div>
                ) : activeTab === 'sheets' ? (
                    <SheetsTable data={sheetsLeaderboard} />
                ) : (
                    <CFTable data={cfLeaderboard} getRatingColor={getRatingColor} />
                )}
            </div>
        </div>
    );
}

function SheetsTable({ data }: { data: SheetUser[] }) {
    if (data.length === 0) {
        return (
            <div className="py-16 text-center">
                <Code className="mx-auto text-white/10 mb-3" size={32} />
                <p className="text-white/40 text-sm">No submissions yet</p>
                <Link href="/dashboard/sheets" className="inline-block mt-4 px-5 py-2 bg-[#E8C15A] text-black text-xs font-bold rounded-lg">Start Solving</Link>
            </div>
        );
    }

    return (
        <div className="overflow-y-auto max-h-[calc(100vh-280px)]">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-[#111] border-b border-white/5 px-3 py-2.5 flex items-center text-[10px] text-white/30 uppercase tracking-widest font-bold">
                <span className="w-10 text-center shrink-0">#</span>
                <span className="flex-1 min-w-0">Name</span>
                <span className="w-16 text-center shrink-0">Solved</span>
                <span className="w-16 text-center shrink-0 hidden sm:block">AC</span>
                <span className="w-20 text-center shrink-0 hidden sm:block">Total</span>
            </div>
            {/* Rows */}
            {data.map((user, i) => (
                <div key={user.userId} className={`flex items-center px-3 py-2.5 border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors ${i < 3 ? 'bg-[#E8C15A]/[0.03]' : ''}`}>
                    <div className="w-10 flex items-center justify-center shrink-0">
                        {i < 3 ? <MedalAnimation place={(i + 1) as 1 | 2 | 3} /> : <span className="text-xs font-bold text-white/20 tabular-nums">{i + 1}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-white truncate block">{user.username}</span>
                    </div>
                    <div className="w-16 flex justify-center shrink-0">
                        <span className={`px-2 py-0.5 rounded-md text-xs font-bold tabular-nums ${
                            user.solvedCount >= 20 ? 'bg-[#E8C15A]/20 text-[#E8C15A]' :
                            user.solvedCount >= 10 ? 'bg-purple-500/20 text-purple-400' :
                            user.solvedCount >= 5 ? 'bg-blue-500/20 text-blue-400' :
                            'bg-white/5 text-white/40'
                        }`}>
                            {user.solvedCount}
                        </span>
                    </div>
                    <div className="w-16 text-center shrink-0 hidden sm:block">
                        <span className="text-xs text-green-400/70 tabular-nums">{user.acceptedCount}</span>
                    </div>
                    <div className="w-20 text-center shrink-0 hidden sm:block">
                        <span className="text-xs text-white/20 tabular-nums">{user.totalSubmissions}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

function CFTable({ data, getRatingColor }: { data: CFUser[]; getRatingColor: (r: number) => string }) {
    if (data.length === 0) {
        return (
            <div className="py-16 text-center">
                <Trophy className="mx-auto text-white/10 mb-3" size={32} />
                <p className="text-white/40 text-sm">No rated users yet</p>
                <a href="https://codeforces.com/contests" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 mt-4 px-5 py-2 bg-[#E8C15A] text-black text-xs font-bold rounded-lg">
                    <ExternalLink size={13} /> View Contests
                </a>
            </div>
        );
    }

    return (
        <div className="overflow-y-auto max-h-[calc(100vh-280px)]">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-[#111] border-b border-white/5 px-3 py-2.5 flex items-center text-[10px] text-white/30 uppercase tracking-widest font-bold">
                <span className="w-10 text-center shrink-0">#</span>
                <span className="flex-1 min-w-0">Handle</span>
                <span className="w-16 text-center shrink-0">Rating</span>
                <span className="w-24 text-center shrink-0 hidden sm:block">Rank</span>
            </div>
            {/* Rows */}
            {data.map((user, i) => (
                <div key={user.handle} className={`flex items-center px-3 py-2.5 border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors ${i < 3 ? 'bg-[#E8C15A]/[0.03]' : ''}`}>
                    <div className="w-10 flex items-center justify-center shrink-0">
                        {i < 3 ? <MedalAnimation place={(i + 1) as 1 | 2 | 3} /> : <span className="text-xs font-bold text-white/20 tabular-nums">{i + 1}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                        <a href={`https://codeforces.com/profile/${user.handle}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-white hover:text-[#E8C15A] transition-colors truncate block">
                            {user.handle}
                        </a>
                        {user.name && <p className="text-[11px] text-white/20 truncate">{user.name}</p>}
                    </div>
                    <div className="w-16 text-center shrink-0">
                        <span className={`text-sm font-bold tabular-nums ${getRatingColor(user.rating)}`}>{user.rating}</span>
                    </div>
                    <div className="w-24 text-center shrink-0 hidden sm:block">
                        <span className="text-xs text-white/30 capitalize">{user.rank}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}
