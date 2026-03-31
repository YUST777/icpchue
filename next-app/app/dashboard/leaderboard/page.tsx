'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, ExternalLink, Trophy, Code } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { addCacheBust } from '@/lib/cache/cache-version';

// Dynamic import for Lottie to avoid SSR issues
const Lottie = dynamic(() => import('lottie-react'), { ssr: false });
const VirtualLeaderboard = dynamic(() => import('@/components/common/VirtualLeaderboard'), {
    ssr: false,
});

// Medal animation component
const MedalAnimation = ({ place }: { place: 1 | 2 | 3 }) => {
    const [animationData, setAnimationData] = useState<unknown>(null);

    useEffect(() => {
        const files = {
            1: '/tgs/1st Place Medal.json',
            2: '/tgs/2nd Place Medal.json',
            3: '/tgs/3rd Place Medal.json'
        };
        fetchWithCache<any>(files[place], {}, 3600)
            .then(data => setAnimationData(data))
            .catch(err => console.error('Failed to load medal animation:', err));
    }, [place]);

    if (!animationData) return <span className="text-[#E8C15A] font-bold">{place}</span>;

    return (
        <Lottie
            animationData={animationData}
            loop={true}
            style={{ width: 32, height: 32 }}
        />
    );
};

interface CFUser {
    handle: string;
    name: string;
    rating: number;
    rank: string;
}

interface SheetUser {
    userId: number;
    username: string;
    solvedCount: number;
    totalSubmissions: number;
    acceptedCount: number;
}

import { fetchWithCache } from '@/lib/cache/api-cache';

export default function LeaderboardPage() {
    useAuth(); // Keep auth context active
    const [activeTab, setActiveTab] = useState<'codeforces' | 'sheets'>('sheets');
    const [cfLeaderboard, setCfLeaderboard] = useState<CFUser[]>([]);
    const [sheetsLeaderboard, setSheetsLeaderboard] = useState<SheetUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            setLoading(true);
            setError(null);

            try {
                if (activeTab === 'codeforces') {
                    // Cache leaderboard for 5 minutes
                    const data = await fetchWithCache<any>(addCacheBust('/api/leaderboard'), {}, 300);
                    setCfLeaderboard(Array.isArray(data.leaderboard) ? data.leaderboard : []);
                } else if (activeTab === 'sheets') {
                    // Cache sheets leaderboard for 5 minutes
                    const data = await fetchWithCache<any>(addCacheBust('/api/leaderboard/sheets'), { credentials: 'include' }, 300);
                    setSheetsLeaderboard(Array.isArray(data.leaderboard) ? data.leaderboard : []);
                }
            } catch (err) {
                console.error('Failed to fetch leaderboard:', err);
                setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, [activeTab]);

    const getRatingColor = (rating: number) => {
        if (rating >= 2400) return 'text-red-500';
        if (rating >= 2100) return 'text-orange-400';
        if (rating >= 1900) return 'text-purple-400';
        if (rating >= 1600) return 'text-blue-400';
        if (rating >= 1400) return 'text-cyan-400';
        if (rating >= 1200) return 'text-green-400';
        return 'text-gray-400';
    };

    const getSolvedBadge = (count: number) => {
        if (count >= 20) return 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black';
        if (count >= 10) return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white';
        if (count >= 5) return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white';
        return 'bg-[#333] text-[#A0A0A0]';
    };

    return (
        <>


            <div className="space-y-6 animate-fade-in">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-bold text-[#F2F2F2] flex items-center gap-3">
                            <Trophy className="text-[#E8C15A]" size={28} />
                            Leaderboard
                        </h2>
                        <p className="text-[#A0A0A0] mt-1 ml-10">
                            Compare your progress with the community
                        </p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-white/10">
                    <div className="flex gap-6">
                        <button
                            onClick={() => setActiveTab('sheets')}
                            className={`pb-4 text-sm font-medium transition-all relative ${activeTab === 'sheets'
                                ? 'text-[#E8C15A]'
                                : 'text-[#A0A0A0] hover:text-[#F2F2F2]'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <Code size={16} />
                                Training Sheets
                            </div>
                            {activeTab === 'sheets' && (
                                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#E8C15A] rounded-t-full shadow-[0_-2px_8px_rgba(232,193,90,0.3)]" />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('codeforces')}
                            className={`pb-4 text-sm font-medium transition-all relative ${activeTab === 'codeforces'
                                ? 'text-[#E8C15A]'
                                : 'text-[#A0A0A0] hover:text-[#F2F2F2]'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <ExternalLink size={16} />
                                Codeforces Rating
                            </div>
                            {activeTab === 'codeforces' && (
                                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#E8C15A] rounded-t-full shadow-[0_-2px_8px_rgba(232,193,90,0.3)]" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Leaderboard Table */}
                <div className="bg-[#121212] rounded-xl border border-white/5 overflow-hidden h-[600px] flex flex-col">
                    {activeTab === 'sheets' ? (
                        <>
                            {/* Sheets Header - Mobile Responsive */}
                            <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 sm:gap-4 p-3 sm:p-4 border-b border-white/5 text-xs text-[#666] uppercase tracking-wider bg-[#121212] z-10 shrink-0">
                                <div className="col-span-1">#</div>
                                <div className="col-span-2 sm:col-span-4">Username</div>
                                <div className="col-span-3 sm:col-span-3">Solved</div>
                                <div className="hidden sm:block col-span-2">Accepted</div>
                                <div className="hidden sm:block col-span-2">Submissions</div>
                            </div>
                            {loading ? (
                                <div className="p-4 space-y-2 flex-1">
                                    {[1,2,3,4,5,6,7,8].map(i => (
                                        <Skeleton key={i} className="h-12 w-full rounded-lg" />
                                    ))}
                                </div>
                            ) : error ? (
                                <div className="p-12 text-center flex flex-col items-center flex-1 justify-center">
                                    <div className="w-16 h-16 bg-[#1A1A1A] rounded-full flex items-center justify-center mb-4 border border-red-500/20">
                                        <Code className="text-red-500" size={32} />
                                    </div>
                                    <h3 className="text-lg font-bold text-[#F2F2F2] mb-2">Failed to load leaderboard</h3>
                                    <p className="text-sm text-[#A0A0A0] max-w-md mx-auto mb-6">
                                        {error}
                                    </p>
                                    <button
                                        onClick={() => window.location.reload()}
                                        className="px-6 py-2.5 bg-[#E8C15A] text-black font-bold rounded-lg hover:bg-[#D4AF37] transition-all transform hover:scale-105"
                                    >
                                        Retry
                                    </button>
                                </div>
                            ) : sheetsLeaderboard.length === 0 ? (
                                <div className="p-12 text-center flex flex-col items-center flex-1 justify-center">
                                    <div className="w-16 h-16 bg-[#1A1A1A] rounded-full flex items-center justify-center mb-4 border border-white/5">
                                        <Code className="text-[#E8C15A]" size={32} />
                                    </div>
                                    <h3 className="text-lg font-bold text-[#F2F2F2] mb-2">No submissions yet</h3>
                                    <p className="text-sm text-[#A0A0A0] max-w-xs mx-auto mb-6">
                                        Be the first to solve a problem and claim your spot on the leaderboard!
                                    </p>
                                    <Link
                                        href="/dashboard/sheets"
                                        className="px-6 py-2.5 bg-[#E8C15A] text-black font-bold rounded-lg hover:bg-[#D4AF37] transition-all transform hover:scale-105"
                                    >
                                        Start Solving
                                    </Link>
                                </div>
                            ) : (
                                <VirtualLeaderboard
                                    items={sheetsLeaderboard}
                                    itemSize={56}
                                >
                                    {({ index, style }: { index: number; style: React.CSSProperties }) => {
                                        const user = sheetsLeaderboard[index];
                                        return (
                                            <div style={style} key={user.userId} className="grid grid-cols-6 sm:grid-cols-12 gap-2 sm:gap-4 p-3 sm:p-4 hover:bg-white/5 transition-colors items-center border-b border-white/5 last:border-0">
                                                <div className="col-span-1 flex items-center justify-center">
                                                    {index < 3 ? (
                                                        <MedalAnimation place={(index + 1) as 1 | 2 | 3} />
                                                    ) : (
                                                        <span className="text-sm font-bold text-[#666]">{index + 1}</span>
                                                    )}
                                                </div>
                                                <div className="col-span-2 sm:col-span-4 min-w-0">
                                                    <span className="text-sm font-medium text-[#F2F2F2] truncate block">{user.username}</span>
                                                </div>
                                                <div className="col-span-3">
                                                    <span className={`inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full text-xs font-bold ${getSolvedBadge(user.solvedCount)}`}>
                                                        {user.solvedCount}
                                                    </span>
                                                </div>
                                                <div className="hidden sm:block col-span-2 text-sm text-green-400 font-medium">
                                                    {user.acceptedCount}
                                                </div>
                                                <div className="hidden sm:block col-span-2 text-sm text-[#666]">
                                                    {user.totalSubmissions}
                                                </div>
                                            </div>
                                        );
                                    }}
                                </VirtualLeaderboard>
                            )}
                        </>
                    ) : (
                        <>
                            {/* CF Header - Mobile Responsive */}
                            <div className="grid grid-cols-8 sm:grid-cols-12 gap-2 sm:gap-4 p-3 sm:p-4 border-b border-white/5 text-xs text-[#666] uppercase tracking-wider bg-[#121212] z-10 shrink-0">
                                <div className="col-span-1">#</div>
                                <div className="col-span-4 sm:col-span-5">Handle</div>
                                <div className="col-span-3">Rating</div>
                                <div className="hidden sm:block col-span-3">Rank</div>
                            </div>
                            {loading ? (
                                <div className="p-4 space-y-2 flex-1">
                                    {[1,2,3,4,5,6,7,8].map(i => (
                                        <Skeleton key={i} className="h-12 w-full rounded-lg" />
                                    ))}
                                </div>
                            ) : error ? (
                                <div className="p-12 text-center flex flex-col items-center flex-1 justify-center">
                                    <div className="w-16 h-16 bg-[#1A1A1A] rounded-full flex items-center justify-center mb-4 border border-red-500/20">
                                        <Trophy className="text-red-500" size={32} />
                                    </div>
                                    <h3 className="text-lg font-bold text-[#F2F2F2] mb-2">Failed to load leaderboard</h3>
                                    <p className="text-sm text-[#A0A0A0] max-w-md mx-auto mb-6">
                                        {error}
                                    </p>
                                    <button
                                        onClick={() => window.location.reload()}
                                        className="px-6 py-2.5 bg-[#E8C15A] text-black font-bold rounded-lg hover:bg-[#D4AF37] transition-all transform hover:scale-105"
                                    >
                                        Retry
                                    </button>
                                </div>
                            ) : cfLeaderboard.length === 0 ? (
                                <div className="p-12 text-center flex flex-col items-center flex-1 justify-center">
                                    <div className="w-16 h-16 bg-[#1A1A1A] rounded-full flex items-center justify-center mb-4 border border-white/5">
                                        <Trophy className="text-[#E8C15A]" size={32} />
                                    </div>
                                    <h3 className="text-lg font-bold text-[#F2F2F2] mb-2">No rated users yet</h3>
                                    <p className="text-sm text-[#A0A0A0] max-w-md mx-auto mb-6">
                                        To appear on this leaderboard, you need to compete in a rated Codeforces contest.
                                        Your rating will be calculated after your first rated participation.
                                    </p>
                                    <a
                                        href="https://codeforces.com/contests"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-6 py-2.5 bg-[#E8C15A] text-black font-bold rounded-lg hover:bg-[#D4AF37] transition-all transform hover:scale-105 flex items-center gap-2"
                                    >
                                        <ExternalLink size={16} />
                                        View Upcoming Contests
                                    </a>
                                </div>
                            ) : (
                                <VirtualLeaderboard
                                    items={cfLeaderboard}
                                    itemSize={56}
                                >
                                    {({ index, style }: { index: number; style: React.CSSProperties }) => {
                                        const user = cfLeaderboard[index];
                                        return (
                                            <div style={style} key={user.handle} className="grid grid-cols-8 sm:grid-cols-12 gap-2 sm:gap-4 p-3 sm:p-4 hover:bg-white/5 transition-colors items-center border-b border-white/5 last:border-0">
                                                <div className="col-span-1 flex items-center justify-center">
                                                    {index < 3 ? (
                                                        <MedalAnimation place={(index + 1) as 1 | 2 | 3} />
                                                    ) : (
                                                        <span className="text-sm font-bold text-[#666]">{index + 1}</span>
                                                    )}
                                                </div>
                                                <div className="col-span-4 sm:col-span-5 min-w-0">
                                                    <a
                                                        href={`https://codeforces.com/profile/${user.handle}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-sm font-medium text-[#F2F2F2] hover:text-[#E8C15A] flex items-center gap-1 sm:gap-2 truncate"
                                                    >
                                                        <span className="truncate">{user.handle}</span>
                                                        <ExternalLink size={12} className="text-[#666] flex-shrink-0 hidden sm:block" />
                                                    </a>
                                                    <p className="text-xs text-[#666] truncate">{user.name}</p>
                                                </div>
                                                <div className={`col-span-3 text-sm font-bold ${getRatingColor(user.rating)}`}>
                                                    {user.rating}
                                                </div>
                                                <div className="hidden sm:block col-span-3 text-sm text-[#A0A0A0] capitalize">{user.rank}</div>
                                            </div>
                                        );
                                    }}
                                </VirtualLeaderboard>
                            )}
                            {/* CF Ranking Info Box - Moved out to bottom if needed, or overlay */}
                            <div className="p-4 bg-[#0A0A0A] border-t border-white/5 shrink-0 z-10">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-[#1A1A1A] rounded-lg">
                                        <Trophy className="text-[#E8C15A]" size={16} />
                                    </div>
                                    <div>
                                        <p className="text-sm text-[#A0A0A0]">
                                            <span className="text-[#F2F2F2] font-medium">How to get ranked?</span>{' '}
                                            Compete in any rated Codeforces contest. Your rating will be calculated after your first participation.
                                        </p>
                                        <a
                                            href="https://codeforces.com/contests"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[#E8C15A] text-sm hover:underline inline-flex items-center gap-1 mt-1"
                                        >
                                            View Upcoming Contests <ExternalLink size={12} />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div >

            <style>{`
                @keyframes fadeIn { 
                    from { opacity: 0; transform: translateY(10px); } 
                    to { opacity: 1; transform: translateY(0); } 
                } 
                .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
            `}</style>
        </>
    );
}
