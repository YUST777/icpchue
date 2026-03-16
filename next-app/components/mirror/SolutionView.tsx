'use client';

import { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

interface SolutionViewProps {
    contestId: string;
    problemId: string;
    sheetSlug?: string;
    levelSlug?: string;
}

export default function SolutionView({ contestId, problemId, sheetSlug, levelSlug }: SolutionViewProps) {
    const [solutionUrl, setSolutionUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
    }, [contestId, problemId, sheetSlug, levelSlug]);

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
            <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E8C15A] mb-4"></div>
                <p className="text-[#888] text-sm">Loading solution...</p>
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
            {/* Video Player */}
            <div className="flex-1 bg-[#0B0B0C] p-3 sm:p-4 md:p-5">
                <div className="h-full w-full flex items-center justify-center">
                    <div className="w-full max-w-4xl">
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
                        <div className="mt-3 flex items-center justify-between text-[11px] text-white/50">
                            <span>Best viewed in full screen for clarity.</span>
                            <span className="hidden sm:inline">Quality adapts automatically.</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Info */}
            <div className="px-4 py-3 bg-[#1a1a1a] border-t border-white/10">
                <p className="text-xs text-[#888]">
                    💡 Watch the full solution walkthrough and understand the approach step by step.
                </p>
            </div>
        </div>
    );
}
