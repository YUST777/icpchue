'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import { ExternalLink, Trophy, Code } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { addCacheBust } from '@/lib/cache/cache-version';
import MonthlyPodium from '@/components/leaderboard/MonthlyPodium';

// Dynamic import for Lottie to avoid SSR issues
const Lottie = dynamic(() => import('lottie-react').then(mod => mod.Lottie), { ssr: false });
const VirtualLeaderboard = dynamic(() => import('@/components/common/VirtualLeaderboard'), {
    ssr: false,
});

// Medal animation component
const MedalAnimation = ({ place }: { place: 1 | 2 | 3 }) => {
    const files = {
        1: '/tgs/1st Place Medal.json',
        2: '/tgs/2nd Place Medal.json',
        3: '/tgs/3rd Place Medal.json'
    };

    return (
        <Lottie
            src={files[place]}
            loop
            autoplay
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
    studentId?: string | null;
    solvedCount: number;
    totalSubmissions: number;
    acceptedCount: number;
}

import { fetchWithCache } from '@/lib/cache/api-cache';

// Small "You" tag next to the signed-in user's name (hidden on phones, where the name column is narrow)
const YouBadge = () => (
    <span className="hidden sm:inline-flex shrink-0 items-center rounded-full bg-[#E8C15A] px-1.5 py-0.5 text-[10px] font-bold leading-none text-black">
        You
    </span>
);

// "https://codeforces.com/profile/Tourist/" or "Tourist" -> "tourist"
const normalizeCfHandle = (value?: string | null) => {
    if (!value) return '';
    const parts = value.trim().split('/').filter(Boolean);
    return (parts[parts.length - 1] ?? '').toLowerCase();
};

export default function LeaderboardPage() {
    const { user, profile } = useAuth();
    const [activeTab, setActiveTab] = useState<'level0' | 'level1' | 'codeforces'>(() => {
        if (typeof window !== 'undefined') {
            const saved = sessionStorage.getItem('leaderboard_active_tab');
            if (saved === 'level0' || saved === 'level1' || saved === 'codeforces') return saved;
        }
        return 'level0';
    });
    const [cfLeaderboard, setCfLeaderboard] = useState<CFUser[]>([]);
    const [sheetsLeaderboard, setSheetsLeaderboard] = useState<SheetUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const handleTabChange = (key: 'level0' | 'level1' | 'codeforces') => {
        setActiveTab(key);
        if (typeof window !== 'undefined') {
            try { sessionStorage.setItem('leaderboard_active_tab', key); } catch {}
        }
    };

    useEffect(() => {
        const fetchLeaderboard = async () => {
            setLoading(true);
            setError(null);

            try {
                if (activeTab === 'codeforces') {
                    // Cache leaderboard for 5 minutes
                    const data = await fetchWithCache<any>(addCacheBust('/api/leaderboard'), {}, 300);
                    setCfLeaderboard(Array.isArray(data.leaderboard) ? data.leaderboard : []);
                } else {
                    // Cache sheets leaderboard for 5 minutes
                    const data = await fetchWithCache<any>(addCacheBust(`/api/leaderboard/sheets?level=${activeTab === 'level1' ? 1 : 0}`), { credentials: 'include' }, 300);
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
    if (count >= 20) return 'border border-[#E8C15A]/25 bg-[#E8C15A]/10 text-[#E8C15A]';
    if (count >= 5) return 'border border-white/10 bg-white/[0.06] text-[#E4E4E7]';
    return 'border border-white/[0.06] bg-[#202327] text-[#A1A1AA]';
    };

    // Position of the signed-in user in each list (-1 when they are not on it).
    // Sheets rows carry the user id; Codeforces rows only carry the handle.
    const mySheetsIndex = user
        ? sheetsLeaderboard.findIndex(entry => Number(entry.userId) === Number(user.id))
        : -1;
    const myCfHandle = normalizeCfHandle(profile?.codeforces_data?.handle ?? profile?.codeforces_profile);
    const myCfIndex = myCfHandle
        ? cfLeaderboard.findIndex(entry => normalizeCfHandle(entry.handle) === myCfHandle)
        : -1;

    return (
        <>


            <div className="ui-compact space-y-6 animate-fade-in">
                {/* Header Section */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="ui-page-title flex items-center gap-3">
                            <Trophy className="shrink-0 text-[var(--color-accent)]" size={22} aria-hidden="true" />
                            Leaderboard
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm leading-5 text-[var(--color-text-secondary)] md:ml-9">
                            Level 0 is the newcomers and mentors; Level 1 is the ECPC qualification teams
                        </p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="overflow-x-auto border-b border-[var(--color-line)] scrollbar-hide">
                    <div className="flex min-w-max gap-4 sm:gap-6">
                        {([['level0', 'Level 0'], ['level1', 'Level 1']] as const).map(([key, label]) => (
                            <button
                                key={key}
                                onClick={() => handleTabChange(key)}
                                className={`relative min-h-11 shrink-0 px-1 pt-2 pb-3 text-sm font-medium transition-colors ${activeTab === key
                                    ? 'text-[var(--color-accent)]'
                                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <Code size={16} />
                                    {label}
                                </div>
                                {activeTab === key && (
                                    <div className="absolute inset-x-0 bottom-0 h-0.5 rounded-t-sm bg-[var(--color-accent)]" />
                                )}
                            </button>
                        ))}
                        <button
                            onClick={() => setActiveTab('codeforces')}
                            className={`relative min-h-11 shrink-0 px-1 pt-2 pb-3 text-sm font-medium transition-colors ${activeTab === 'codeforces'
                                ? 'text-[var(--color-accent)]'
                                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <ExternalLink size={16} />
                                Codeforces Rating
                            </div>
                            {activeTab === 'codeforces' && (
                                <div className="absolute inset-x-0 bottom-0 h-0.5 rounded-t-sm bg-[var(--color-accent)]" />
                            )}
                        </button>
                    </div>
                </div>

                {activeTab === 'level0' && <MonthlyPodium live={sheetsLeaderboard} />}

                {/* Leaderboard Table */}
                <div className="ui-card flex h-[min(600px,calc(100dvh-240px))] min-h-[360px] flex-col overflow-hidden">
                    {activeTab !== 'codeforces' ? (
                        <>
                            {/* Sheets Header - Mobile Responsive */}
                            <div className="z-10 grid shrink-0 grid-cols-6 gap-2 border-b border-[var(--color-line-subtle)] bg-[var(--color-surface)] p-3 text-xs text-[var(--color-text-secondary)] sm:grid-cols-12 sm:gap-4 sm:p-4">
                                <div className="col-span-1">#</div>
                                <div className="col-span-3 sm:col-span-4">Username</div>
                                <div className="col-span-2 sm:col-span-3">Solved</div>
                                <div className="hidden sm:block col-span-2">Accepted</div>
                                <div className="hidden sm:block col-span-2">Submissions</div>
                            </div>
                            {loading ? (
                                <div className="flex-1">
                                    {Array.from({length: 10}).map((_, i) => (
                                        <div key={i} className="grid grid-cols-6 sm:grid-cols-12 gap-2 sm:gap-4 px-3 sm:px-4 h-[56px] items-center border-b border-white/[0.03]">
                                            <div className="col-span-1"><Skeleton className="h-5 w-5 rounded-full mx-auto" /></div>
                                            <div className="col-span-3 sm:col-span-4"><Skeleton className="h-4 w-3/4 rounded" /></div>
                                            <div className="col-span-2 sm:col-span-3"><Skeleton className="h-5 w-10 rounded-full" /></div>
                                            <div className="hidden sm:block col-span-2"><Skeleton className="h-4 w-8 rounded" /></div>
                                            <div className="hidden sm:block col-span-2"><Skeleton className="h-4 w-8 rounded" /></div>
                                        </div>
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
                                    currentUserIndex={mySheetsIndex}
                                >
                                    {({ index, style }: { index: number; style: React.CSSProperties }) => {
                                        const user = sheetsLeaderboard[index];
                                        const isMe = index === mySheetsIndex;
                                        return (
                                            <div
                                                style={style}
                                                key={user.userId}
                                                aria-current={isMe ? 'true' : undefined}
                                        className={`grid grid-cols-6 items-center gap-2 border-b border-[var(--color-line-subtle)] p-3 transition-colors last:border-0 sm:grid-cols-12 sm:gap-4 sm:p-4 ${isMe ? 'border-s-2 border-s-[var(--color-accent)] bg-[#E8C15A]/[0.06]' : 'hover:bg-white/[0.03]'}`}
                                            >
                                                <div className="col-span-1 flex items-center justify-center">
                                                    {index < 3 ? (
                                                        <MedalAnimation place={(index + 1) as 1 | 2 | 3} />
                                                    ) : (
                                                        <span className={`text-sm font-bold ${isMe ? 'text-[#E8C15A]' : 'text-[#666]'}`}>{index + 1}</span>
                                                    )}
                                                </div>
                                                <div className="col-span-3 sm:col-span-4 min-w-0 flex items-center gap-2">
                                                    {user.studentId ? (
                                                        <Link href={`/dashboard/profile/${user.studentId}`} className={`text-sm font-medium hover:text-[#E8C15A] truncate block transition-colors ${isMe ? 'text-[#E8C15A]' : 'text-[#F2F2F2]'}`}>{user.username}</Link>
                                                    ) : (
                                                        <span className={`text-sm font-medium truncate block ${isMe ? 'text-[#E8C15A]' : 'text-[#F2F2F2]'}`}>{user.username}</span>
                                                    )}
                                                    {isMe && <YouBadge />}
                                                </div>
                                                <div className="col-span-2 sm:col-span-3">
                                                    <span className={`inline-flex min-w-8 items-center justify-center rounded-md px-2 py-1 text-xs font-medium tabular-nums ${getSolvedBadge(user.solvedCount)}`}>
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
                            {/* CF Header */}
                            <div className="z-10 grid shrink-0 grid-cols-[40px_1fr_70px] gap-2 border-b border-[var(--color-line-subtle)] bg-[var(--color-surface)] px-3 py-3 text-xs text-[var(--color-text-secondary)] sm:grid-cols-[40px_1fr_100px_120px] sm:px-4">
                                <div>#</div>
                                <div>Handle</div>
                                <div className="text-right">Rating</div>
                                <div className="hidden sm:block">Rank</div>
                            </div>
                            {loading ? (
                                <div className="flex-1">
                                    {Array.from({length: 10}).map((_, i) => (
                                        <div key={i} className="grid grid-cols-[40px_1fr_70px] sm:grid-cols-[40px_1fr_100px_120px] gap-2 px-3 sm:px-4 h-[56px] items-center border-b border-white/[0.03]">
                                            <Skeleton className="h-5 w-5 rounded-full mx-auto" />
                                            <Skeleton className="h-4 w-3/4 rounded" />
                                            <Skeleton className="h-4 w-10 rounded ml-auto" />
                                            <Skeleton className="h-4 w-16 rounded hidden sm:block" />
                                        </div>
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
                                    currentUserIndex={myCfIndex}
                                >
                                    {({ index, style }: { index: number; style: React.CSSProperties }) => {
                                        const user = cfLeaderboard[index];
                                        const isMe = index === myCfIndex;
                                        return (
                                            <div
                                                style={style}
                                                key={user.handle}
                                                aria-current={isMe ? 'true' : undefined}
                                                className={`grid grid-cols-[40px_1fr_70px] items-center gap-2 border-b border-[var(--color-line-subtle)] px-3 transition-colors last:border-0 sm:grid-cols-[40px_1fr_100px_120px] sm:px-4 ${isMe ? 'border-s-2 border-s-[var(--color-accent)] bg-[#E8C15A]/[0.06]' : 'hover:bg-white/[0.03]'}`}
                                            >
                                                <div className="flex items-center justify-center">
                                                    {index < 3 ? (
                                                        <MedalAnimation place={(index + 1) as 1 | 2 | 3} />
                                                    ) : (
                                                        <span className={`text-sm font-bold ${isMe ? 'text-[#E8C15A]' : 'text-[#666]'}`}>{index + 1}</span>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <a
                                                            href={`https://codeforces.com/profile/${user.handle}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className={`text-sm font-medium hover:text-[#E8C15A] flex items-center gap-1.5 truncate ${isMe ? 'text-[#E8C15A]' : 'text-[#F2F2F2]'}`}
                                                        >
                                                            <span className="truncate">{user.handle}</span>
                                                            <ExternalLink size={12} className="text-[#666] flex-shrink-0 hidden sm:inline" />
                                                        </a>
                                                        {isMe && <YouBadge />}
                                                    </div>
                                                    <p className="text-xs text-[#666] truncate hidden sm:block">{user.name}</p>
                                                </div>
                                                <div className={`text-sm font-bold text-right ${getRatingColor(user.rating)}`}>
                                                    {user.rating}
                                                </div>
                                                <div className="hidden sm:block text-sm text-[#A0A0A0] capitalize">{user.rank}</div>
                                            </div>
                                        );
                                    }}
                                </VirtualLeaderboard>
                            )}
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
