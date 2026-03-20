'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertCircle, ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';

interface SolutionViewProps {
    contestId: string;
    problemId: string;
    sheetSlug?: string;
    levelSlug?: string;
}

interface VideoStats {
    likes: number;
    dislikes: number;
    userRating: number; // 1, -1, or 0
}

export default function SolutionView({ contestId, problemId, sheetSlug, levelSlug }: SolutionViewProps) {
    const [solutionUrl, setSolutionUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Rating state
    const [stats, setStats] = useState<VideoStats>({ likes: 0, dislikes: 0, userRating: 0 });
    const [ratingLoading, setRatingLoading] = useState(false);

    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch(`/api/video/rate?contestId=${contestId}&problemId=${problemId}`);
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (err) {
            console.error('Error fetching video stats:', err);
        }
    }, [contestId, problemId]);

    useEffect(() => {
        const fetchSolutionUrl = async () => {
            try {
                setLoading(true);
                setError(null);

                // Fetch problem details from curriculum API
                const response = await fetch(`/api/curriculum/problem/${levelSlug}/${sheetSlug}/${problemId}`);

                if (!response.ok) {
                    throw new Error('Failed to fetch problem details');
                }

                const data = await response.json();

                if (data.problem?.solutionVideoUrl) {
                    setSolutionUrl(data.problem.solutionVideoUrl);
                    // Also fetch stats if video exists
                    fetchStats();
                } else {
                    setError('No solution video available for this problem yet.');
                }
            } catch (err) {
                console.error('Error fetching solution:', err);
                setError('Failed to load solution video.');
            } finally {
                setLoading(false);
            }
        };

        if (levelSlug && sheetSlug && problemId) {
            fetchSolutionUrl();
        }
    }, [contestId, problemId, sheetSlug, levelSlug, fetchStats]);

    // Handle Rating click
    const handleRate = async (newRating: number) => {
        if (ratingLoading) return;

        // If clicking the same rating, toggle it off (set 0)
        const finalRating = stats.userRating === newRating ? 0 : newRating;

        setRatingLoading(true);
        try {
            const res = await fetch('/api/video/rate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contestId, problemId, rating: finalRating })
            });

            if (res.ok) {
                const data = await res.json();
                setStats({
                    likes: data.likes,
                    dislikes: data.dislikes,
                    userRating: data.userRating
                });
            }
        } catch (err) {
            console.error('Error updating rating:', err);
        } finally {
            setRatingLoading(false);
        }
    };

    // Extract Google Drive file ID and create embed URL
    const getEmbedUrl = (url: string) => {
        // Handle /file/d/ID/... format
        const matchD = url.match(/\/file\/d\/([^\/]+)/);
        if (matchD) {
            return `https://drive.google.com/file/d/${matchD[1]}/preview`;
        }
        // Handle ?id=ID format
        const matchId = url.match(/[?&]id=([^&]+)/);
        if (matchId) {
            return `https://drive.google.com/file/d/${matchId[1]}/preview`;
        }
        // Handle direct ID if the input is just the 33-char ID
        if (url.length === 33 && !url.includes('/')) {
            return `https://drive.google.com/file/d/${url}/preview`;
        }
        return url;
    };

    if (loading) {
        return (
            <div className="flex-1 bg-[#0B0B0C] p-3 sm:p-4 md:p-5 flex flex-col items-center justify-center">
                <div className="w-full max-w-4xl space-y-6">
                    <div className="aspect-video w-full rounded-xl bg-white/5 animate-pulse border border-white/10" />
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-1">
                        <div className="space-y-2">
                            <div className="h-3 w-48 rounded bg-white/5 animate-pulse" />
                            <div className="h-3 w-32 rounded bg-white/5 animate-pulse" />
                        </div>
                        <div className="h-10 w-40 rounded-xl bg-white/5 animate-pulse border border-white/5" />
                    </div>
                </div>
            </div>
        );
    }

    if (error || !solutionUrl) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                <AlertCircle className="w-12 h-12 text-[#666] mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No Solution Available</h3>
                <p className="text-[#888] text-sm max-w-md">
                    {error || 'The solution video for this problem is not available yet. Check back later!'}
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#121212]">
            {/* Video Player Area */}
            <div className="flex-1 bg-[#0B0B0C] p-3 sm:p-4 md:p-5 overflow-y-auto custom-scrollbar">
                <div className="min-h-full w-full flex flex-col items-center justify-center py-6">
                    <div className="w-full max-w-4xl space-y-6">
                        {/* Player Frame */}
                        <div className="relative w-full overflow-hidden rounded-xl border border-white/10 bg-black shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.06),_transparent_55%)] pointer-events-none" />
                            <div className="aspect-video w-full">
                                <iframe
                                    src={getEmbedUrl(solutionUrl)}
                                    className="h-full w-full"
                                    allow="autoplay"
                                    allowFullScreen
                                    title="Solution Video"
                                />
                            </div>
                        </div>

                        {/* Controls & Feedback Row */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-1">
                            {/* Tips */}
                            <div className="flex flex-col gap-1 text-[11px] text-white/40">
                                <span>Best viewed in full screen for clarity.</span>
                                <span>Quality adapts automatically to your connection.</span>
                            </div>

                            {/* Like / Dislike Buttons */}
                            <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/5">
                                <button
                                    onClick={() => handleRate(1)}
                                    disabled={ratingLoading}
                                    className={`group flex items-center gap-2 px-4 py-2 rounded-lg transition-all active:scale-95 ${
                                        stats.userRating === 1 
                                            ? 'bg-[#2cbb5d]/20 text-[#2cbb5d] border border-[#2cbb5d]/30' 
                                            : 'hover:bg-white/5 text-[#888] hover:text-white'
                                    }`}
                                >
                                    <ThumbsUp size={16} className={stats.userRating === 1 ? 'fill-[#2cbb5d]' : 'group-hover:scale-110 transition-transform'} />
                                    <span className="text-sm font-bold tabular-nums">{stats.likes}</span>
                                </button>

                                <div className="w-px h-6 bg-white/10" />

                                <button
                                    onClick={() => handleRate(-1)}
                                    disabled={ratingLoading}
                                    className={`group flex items-center gap-2 px-4 py-2 rounded-lg transition-all active:scale-95 ${
                                        stats.userRating === -1 
                                            ? 'bg-[#ef4743]/20 text-[#ef4743] border border-[#ef4743]/30' 
                                            : 'hover:bg-white/5 text-[#888] hover:text-white'
                                    }`}
                                >
                                    <ThumbsDown size={16} className={stats.userRating === -1 ? 'fill-[#ef4743]' : 'group-hover:scale-110 transition-transform'} />
                                    <span className="text-sm font-bold tabular-nums">{stats.dislikes}</span>
                                </button>

                                {ratingLoading && (
                                    <div className="ml-2 pr-2">
                                        <Loader2 size={14} className="animate-spin text-[#E8C15A]" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

