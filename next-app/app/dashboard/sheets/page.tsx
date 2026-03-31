'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, FileCode2, Info, X, ChevronRight, Calendar, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { curriculum } from '@/lib/content/curriculum';
import { fetchWithCache } from '@/lib/cache/api-cache';

export default function SheetsPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [levels, setLevels] = useState<any[]>([]);
    const [progress, setProgress] = useState<Record<string, { solved: number; total: number }>>({});
    const [loading, setLoading] = useState(true);
    const [showCredits, setShowCredits] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Levels
            const levelsData = await fetchWithCache<any>('/api/curriculum/levels', {
                credentials: 'include'
            }, 300); // Cache for 5 mins

            if (levelsData && levelsData.levels) {
                // Map API fields to match existing UI needs
                const mappedLevels = levelsData.levels.map((l: any) => ({
                    id: l.slug, // used as key
                    slug: l.slug,
                    name: l.name,
                    description: l.description,
                    totalProblems: l.total_problems,
                    duration: `${l.duration_weeks} weeks`,
                    image: `/images/lessons/levels/${l.level_number}.webp`
                }));
                setLevels(mappedLevels);
            }

            // 2. Fetch Progress
            const progressData = await fetchWithCache<any>('/api/curriculum/progress', {
                credentials: 'include'
            }, 60);

            if (progressData) {
                setProgress(progressData.progress || {});
            }
        } catch (error) {
            console.error('Failed to fetch curriculum data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        } else if (user) {
            fetchData();
        }
    }, [authLoading, user, router]);

    if (authLoading) {
        return (
            <div className="space-y-6 p-4">
                <Skeleton className="h-8 w-56 rounded-lg" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="space-y-8 animate-fade-in">
                {/* Hero Section */}
                <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-2xl p-6 md:p-8 border border-white/10">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-[#E8C15A]/10">
                                <FileCode2 className="text-[#E8C15A]" size={28} />
                            </div>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold text-[#F2F2F2]">Training Curriculum</h1>
                                <p className="text-[#A0A0A0] text-sm mt-1">Your Roadmap to Competitive Programming</p>
                            </div>
                        </div>
                        <div className="flex gap-3 self-start">
                            <button
                                onClick={() => setShowCredits(true)}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#E8C15A]/10 text-[#E8C15A] hover:bg-[#E8C15A]/20 transition-colors text-xs font-bold"
                            >
                                <Info size={16} />
                                <span>CREDITS</span>
                            </button>
                        </div>
                    </div>
                    <p className="text-[#808080] text-sm leading-relaxed max-w-2xl">
                        Access a comprehensive 3-level curriculum with 249+ problems designed to build your skills from the ground up.
                        Write code, submit solutions, and get instant feedback to accelerate your learning.
                    </p>
                </div>

                {/* Curriculum Levels */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-[#F2F2F2]">Curriculum Levels</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {loading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="h-96 rounded-3xl bg-white/5 animate-pulse" />
                            ))
                        ) : (
                            <>
                                {levels.map((level) => (
                                    <Link
                                        key={level.id}
                                        href={`/dashboard/sheets/${level.slug}`}
                                        className="group"
                                    >
                                        <div className="relative group rounded-3xl p-[1px] bg-gradient-to-b from-white/10 to-transparent overflow-hidden">
                                            <div className="bg-[#0f0f0f] rounded-[23px] relative overflow-hidden h-full flex flex-col">
                                                <div className="relative h-48 w-full overflow-hidden">
                                                    <img
                                                        src={level.image}
                                                        alt={level.name}
                                                        className="w-full h-full object-cover object-[center_0%] opacity-50 group-hover:opacity-100 transition-all duration-700 scale-100 group-hover:scale-105"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f]/20 to-transparent"></div>
                                                </div>

                                                <div className="relative z-10 p-5 pt-4 mt-auto">
                                                    <div className="mb-3">
                                                        <h3 className="text-xl font-bold text-white group-hover:text-[#E8C15A] transition-colors">
                                                            {level.name}
                                                        </h3>
                                                        <p className="text-xs text-gray-400">
                                                            {level.totalProblems} Problems • {level.duration}
                                                        </p>
                                                    </div>
                                                    <p className="text-sm text-[#808080] line-clamp-2 mb-4">{level.description}</p>

                                                    <div className="w-full relative overflow-hidden rounded-xl bg-[#161616] border border-white/5 group-hover:border-white/10 transition-all">
                                                        <div className="relative z-10 px-4 py-3 flex items-center justify-between">
                                                            <span className="text-sm font-bold text-white/90 group-hover:text-[#E8C15A] transition-colors">
                                                                Explore Level
                                                            </span>
                                                            <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-[#E8C15A] transition-colors" />
                                                        </div>
                                                        {/* Progress Bar overlay */}
                                                        {progress[level.slug] && (
                                                            <div
                                                                className="absolute bottom-0 left-0 h-0.5 bg-[#E8C15A] transition-all duration-700"
                                                                style={{ width: `${(progress[level.slug].solved / Math.max(progress[level.slug].total, 1)) * 100}%` }}
                                                            />
                                                        )}
                                                    </div>
                                                    {progress[level.slug] && (
                                                        <div className="mt-2 flex justify-between px-1">
                                                            <div className="flex items-center gap-1">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-[#E8C15A]"></div>
                                                                <span className="text-[10px] text-[#666] font-bold">
                                                                    {progress[level.slug].solved} Solved
                                                                </span>
                                                            </div>
                                                            <span className="text-[10px] text-[#444] font-bold">
                                                                {Math.round((progress[level.slug].solved / Math.max(progress[level.slug].total, 1)) * 100)}%
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ))}

                                {/* Roadmap Widget */}
                                <Link
                                    href="/dashboard/roadmap"
                                    className="group"
                                >
                                    <div className="relative group rounded-3xl p-[1px] bg-gradient-to-b from-white/10 to-transparent overflow-hidden">
                                        <div className="bg-[#0f0f0f] rounded-[23px] relative overflow-hidden h-full flex flex-col">
                                            <div className="relative h-48 w-full overflow-hidden">
                                                <img
                                                    src="/images/lessons/levels/roadmap.webp"
                                                    alt="Roadmap"
                                                    className="w-full h-full object-cover object-[center_0%] opacity-50 group-hover:opacity-100 transition-all duration-700 scale-100 group-hover:scale-105"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f]/20 to-transparent"></div>
                                            </div>

                                            <div className="relative z-10 p-5 pt-4 mt-auto">
                                                <div className="mb-3">
                                                    <h3 className="text-xl font-bold text-white group-hover:text-[#E8C15A] transition-colors">
                                                        Visual Roadmap
                                                    </h3>
                                                    <p className="text-xs text-gray-400">
                                                        Learning Path • Interactive
                                                    </p>
                                                </div>
                                                <p className="text-sm text-[#808080] line-clamp-2 mb-4">
                                                    Visualize your progress and upcoming topics across all levels of the curriculum.
                                                </p>

                                                <div className="w-full relative overflow-hidden rounded-xl bg-[#161616] border border-white/5 group-hover:border-white/10 transition-all">
                                                    <div className="relative z-10 px-4 py-3 flex items-center justify-between">
                                                        <span className="text-sm font-bold text-white/90 group-hover:text-[#E8C15A] transition-colors">
                                                            Open Roadmap
                                                        </span>
                                                        <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-[#E8C15A] transition-colors" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div >

            {/* Credits Modal */}
            {
                showCredits && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowCredits(false)}>
                        <div className="bg-[#181818] border border-white/10 p-6 rounded-2xl max-w-md w-full relative transform scale-100 transition-all shadow-2xl" onClick={e => e.stopPropagation()}>
                            <button className="absolute top-4 right-4 text-[#666] hover:text-white transition-colors" onClick={() => setShowCredits(false)}>
                                <X size={20} />
                            </button>
                            <div className="flex flex-col items-center text-center">
                                <div className="w-12 h-12 bg-[#E8C15A]/10 rounded-full flex items-center justify-center text-[#E8C15A] mb-4">
                                    <Info size={24} />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Acknowledgement</h3>
                                <p className="text-[#A0A0A0] text-sm leading-relaxed mb-4">
                                    These training sheets are based on the excellent curriculum provided by:
                                </p>
                                <a
                                    href="https://www.facebook.com/icpcassiutt/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-[#E8C15A] font-bold hover:underline bg-[#E8C15A]/10 px-4 py-2 rounded-lg transition-colors hover:bg-[#E8C15A]/20"
                                >
                                    ICPC Assiut University Community
                                </a>
                            </div>
                        </div>
                    </div>
                )
            }

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
