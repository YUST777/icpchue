'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FileCode2, ChevronRight, Loader2, Info, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchWithCache } from '@/lib/api-cache';

interface DBSheet {
    id: string;
    letter: string;
    number: number;
    name: string;
    slug: string;
    description: string | null;
    contestId: string;
    contestUrl: string;
    totalProblems: number;
    solvedCount: number;
}

interface DBLevel {
    id: string;
    levelNumber: number;
    name: string;
    slug: string;
    description: string;
    durationWeeks: number;
    totalProblems: number;
}

export default function LevelOverviewPage() {
    const params = useParams();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const levelSlug = params.level as string;

    const [level, setLevel] = useState<DBLevel | null>(null);
    const [sheets, setSheets] = useState<DBSheet[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCredits, setShowCredits] = useState(false);

    useEffect(() => {
        const fetchLevel = async () => {
            try {
                // Cache level data for 60s
                const data = await fetchWithCache<any>(`/api/curriculum/sheets/${levelSlug}`, {
                    credentials: 'include'
                }, 60);

                if (data && data.level) {
                    setLevel(data.level);
                    // Ensure solvedCount is always a number
                    const safeSheets = (data.sheets || []).map((s: any) => ({
                        ...s,
                        solvedCount: Number(s.solvedCount) || 0,
                        totalProblems: Number(s.totalProblems) || 0
                    }));
                    setSheets(safeSheets);
                } else {
                    router.push('/dashboard/sheets');
                }
            } catch (error) {
                console.error('Failed to fetch level data:', error);
                router.push('/dashboard/sheets');
            } finally {
                setLoading(false);
            }
        };
        fetchLevel();
    }, [levelSlug, router]);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [authLoading, user, router]);

    // Compute overall level progress
    const levelProgress = useMemo(() => {
        const totalSolved = sheets.reduce((sum, s) => sum + s.solvedCount, 0);
        const totalProblems = sheets.reduce((sum, s) => sum + s.totalProblems, 0);
        const percentage = totalProblems > 0 ? (totalSolved / totalProblems) * 100 : 0;
        return { totalSolved, totalProblems, percentage };
    }, [sheets]);

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="animate-spin text-[#E8C15A]" size={48} />
            </div>
        );
    }

    if (!level) return null;

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
                                <h1 className="text-2xl md:text-3xl font-bold text-[#F2F2F2]">{level.name}</h1>
                                <p className="text-[#A0A0A0] text-sm mt-1">{level.durationWeeks} weeks • {sheets.length} Sheets • {level.totalProblems} Problems</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowCredits(true)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#E8C15A]/10 text-[#E8C15A] hover:bg-[#E8C15A]/20 transition-colors text-xs font-bold self-start"
                        >
                            <Info size={16} />
                            <span>CREDITS</span>
                        </button>
                    </div>
                    <p className="text-[#808080] text-sm leading-relaxed max-w-2xl mb-5">
                        {level.description}
                    </p>

                    {/* Main Level Progress Bar */}
                    {levelProgress.totalProblems > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-[#A0A0A0]">Overall Progress</span>
                                <span className="text-xs font-bold text-[#E8C15A]">
                                    {levelProgress.totalSolved}/{levelProgress.totalProblems} solved
                                    <span className="text-[#666] ml-1">({levelProgress.percentage.toFixed(0)}%)</span>
                                </span>
                            </div>
                            <div className="h-2.5 bg-[#0a0a0a] rounded-full overflow-hidden border border-white/5">
                                <div
                                    className="h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r from-[#E8C15A] to-[#d4a843]"
                                    style={{ width: `${levelProgress.percentage}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Sheets Grid */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-[#F2F2F2]">Training Sheets</h2>

                    {sheets.length === 0 ? (
                        <div className="text-center py-12 text-[#666]">
                            <p>No sheets available for this level yet.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {sheets.map((sheet) => {
                                const sheetPct = sheet.totalProblems > 0 ? (sheet.solvedCount / sheet.totalProblems) * 100 : 0;
                                const isComplete = sheetPct === 100;

                                return (
                                    <Link
                                        key={sheet.id}
                                        href={`/dashboard/sheets/${levelSlug}/${sheet.slug}`}
                                        className={`group rounded-xl border transition-all p-5 ${isComplete
                                            ? 'bg-green-500/5 border-green-500/20 hover:border-green-500/40'
                                            : 'bg-[#121212] border-white/10 hover:border-[#E8C15A]/30 hover:bg-[#161616]'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between relative z-10">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors border ${isComplete
                                                    ? 'bg-green-500/15 border-green-500/30'
                                                    : 'bg-[#E8C15A]/10 group-hover:bg-[#E8C15A]/20 border-[#E8C15A]/20'
                                                    }`}>
                                                    <span className={`font-bold text-lg ${isComplete ? 'text-green-400' : 'text-[#E8C15A]'}`}>
                                                        {sheet.letter}
                                                    </span>
                                                </div>
                                                <div>
                                                    <h3 className={`font-bold transition-colors ${isComplete
                                                        ? 'text-green-400'
                                                        : 'text-[#F2F2F2] group-hover:text-[#E8C15A]'
                                                        }`}>
                                                        Sheet {sheet.letter}: {sheet.name}
                                                    </h3>
                                                    <p className="text-xs text-[#666]">{sheet.totalProblems} Problems</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="text-[#444] group-hover:text-[#E8C15A] transition-colors" size={20} />
                                        </div>
                                        {sheet.description && (
                                            <p className="text-sm text-[#808080] line-clamp-2 relative z-10 mb-3">{sheet.description}</p>
                                        )}

                                        {/* Per-sheet Progress Bar */}
                                        <div className="mt-auto">
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-[10px] text-[#666]">
                                                    {sheet.solvedCount}/{sheet.totalProblems} solved
                                                </span>
                                                <span className={`text-[10px] font-bold ${isComplete ? 'text-green-400' : sheetPct > 0 ? 'text-[#E8C15A]' : 'text-[#444]'
                                                    }`}>
                                                    {sheetPct.toFixed(0)}%
                                                </span>
                                            </div>
                                            <div className="h-1.5 bg-[#0a0a0a] rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-1000 ease-out ${isComplete
                                                        ? 'bg-gradient-to-r from-green-500 to-green-400'
                                                        : 'bg-gradient-to-r from-[#E8C15A] to-[#d4a843]'
                                                        }`}
                                                    style={{ width: `${sheetPct}%` }}
                                                />
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Credits Modal */}
            {showCredits && (
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
            )}

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
