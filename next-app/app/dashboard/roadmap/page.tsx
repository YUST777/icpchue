'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, CheckCircle2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { TracingBeam } from "@/components/ui/tracing-beam";
import { cn } from "@/lib/utils";

interface RoadmapWeek {
    id: string;
    slug: string;
    name: string;
    title: string;
    description: string;
    problemCount: number;
    solvedCount?: number;
    levelSlug: string;
    sheetNumber?: number;
    weekNumber?: number;
}

interface RoadmapLevel {
    levelNumber: number;
    title: string;
    description: string;
    weeks: RoadmapWeek[];
}

export default function RoadmapPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [roadmap, setRoadmap] = useState<RoadmapLevel[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRoadmap = async () => {
            try {
                const res = await fetch('/api/curriculum/roadmap');
                if (res.ok) {
                    const data = await res.json();
                    setRoadmap(data.roadmap || []);
                }
            } catch (error) {
                console.error('Failed to fetch roadmap:', error);
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchRoadmap();
        }
    }, [user]);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [authLoading, user, router]);

    if (authLoading || loading) {
        return (
            <div className="space-y-10 max-w-4xl mx-auto py-4">
                <div className="space-y-3">
                    <Skeleton className="h-9 w-56 rounded-lg" />
                    <Skeleton className="h-4 w-80 rounded" />
                </div>
                {[1, 2, 3].map(i => (
                    <div key={i} className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <Skeleton className="h-6 w-40 rounded-lg" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pl-12">
                            {[1, 2, 3].map(j => (
                                <Skeleton key={j} className="h-20 rounded-xl" />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="relative space-y-8 overflow-hidden pb-12 text-white animate-fade-in">
            {/* Background Pattern */}
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none"
                style={{
                    backgroundImage: 'radial-gradient(circle at 1px 1px, #333 1px, transparent 0)',
                    backgroundSize: '40px 40px'
                }}
            />

            <TracingBeam className="px-6 relative z-10">
                <div className="max-w-7xl mx-auto antialiased pt-4 relative">

                    {/* Header */}
                    <div className="mb-16">
                        <h1 className="mb-4 text-4xl font-medium tracking-tight text-white md:text-6xl">
                            Curriculum Roadmap
                        </h1>
                        <p className="text-neutral-400 text-lg max-w-2xl font-light">
                            Your personalized path to competitive programming mastery. Track your progress, solve problems, and level up your skills.
                        </p>
                    </div>

                    {roadmap.map((level, levelIndex) => (
                        <div key={`level-${level.levelNumber}`} className="mb-24 relative pl-8 md:pl-0">
                            {/* Top-Level Vertical Line (Timeline) - Desktop Only for now */}
                            {levelIndex < roadmap.length - 1 && (
                                <div className="absolute left-[19px] top-12 bottom-[-96px] w-[2px] bg-gradient-to-b from-[#E8C15A]/20 to-transparent z-0 md:block hidden" />
                            )}
                            {/* Mobile Vertical Timeline */}
                            <div className="absolute left-0 top-12 bottom-0 w-[2px] bg-gradient-to-b from-[#E8C15A]/20 to-transparent z-0 md:hidden block" />


                            <div className="flex items-center gap-6 mb-10 relative z-10 -ml-8 md:ml-0">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] border border-[#E8C15A]/40 bg-[#E8C15A] text-xl font-medium text-black">
                                    {level.levelNumber}
                                </div>
                                <div>
                                    <h2 className="text-3xl font-semibold text-white tracking-tight">{level.title}</h2>
                                    <p className="text-neutral-500 text-sm mt-1">{level.description}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
                                {/* Vertical Line on left of grid for timeline effect */}
                                <div className="absolute left-[-2rem] top-0 bottom-0 w-px bg-white/5 hidden md:block" />

                                {level.weeks.map((week, index) => {
                                    // Calculate week number or use sheet number
                                    // PREFER weekNumber from API
                                    const weekNum = week.weekNumber || week.sheetNumber || parseInt(week.name.replace(/\D/g, '')) || (index + 1);
                                    const monthNum = Math.ceil(weekNum / 4);
                                    const showMonth = level.levelNumber > 0;
                                    const solved = week.solvedCount || 0;
                                    const total = week.problemCount || 0;
                                    const progress = total > 0 ? (solved / total) * 100 : 0;
                                    const isCompleted = progress === 100 && total > 0;

                                    // Helper for sheet badge
                                    const isLevel0 = level.levelNumber === 0;
                                    const isLevel1 = level.levelNumber === 1;
                                    const showSheetBadge = (isLevel0 || isLevel1) && week.sheetNumber;

                                    // Determine sheet label (Letter for Lv0 & Lv1)
                                    let sheetLabel = '';
                                    if (week.sheetNumber) {
                                        // Both Level 0 and Level 1 now use Sheet A, B, C... naming
                                        if (isLevel0 || isLevel1) {
                                            sheetLabel = String.fromCharCode(64 + week.sheetNumber);
                                        } else {
                                            sheetLabel = week.sheetNumber.toString();
                                        }
                                    }

                                    return (
                                        <div key={week.id} className="h-full relative">
                                            {/* Horizontal Connector to timeline (decorative) */}
                                            {index % 3 === 0 && (
                                                <div className="absolute left-[-2rem] top-8 w-8 h-px bg-white/5 hidden md:block pointer-events-none" />
                                            )}

                                            <Link
                                                href={`/dashboard/sheets/${week.levelSlug}/${week.slug}`}
                                                className="group block h-full relative"
                                            >
                                                <div
                                                    className={cn(
                                                        "pointer-events-none absolute inset-0 rounded-[14px] bg-white/[0.03] opacity-0 transition-opacity duration-150 group-hover:opacity-100",
                                                        isCompleted ? "from-[#E8C15A]/10" : ""
                                                    )}
                                                />

                                                <div className={cn(
                                                    "relative h-full rounded-[14px] border border-white/10 bg-[#16181b] p-5 transition-colors duration-150 group-hover:border-[#E8C15A]/30 sm:p-6",
                                                    isCompleted ? "border-[#E8C15A]/25" : ""
                                                )}>

                                                    {/* Header: Week Capsule & Month/Sheet Badges */}
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="flex items-center gap-2">
                                                            {/* Week Capsule */}
                                                            <div className={cn(
                                                                "flex h-6 items-center gap-1.5 rounded-[8px] border px-2.5 text-[10px] font-medium transition-colors",
                                                                isCompleted
                                                                    ? "bg-[#E8C15A]/10 border-[#E8C15A]/30 text-[#E8C15A]"
                                                                    : "bg-white/5 border-white/10 text-neutral-400 group-hover:text-white group-hover:border-white/20"
                                                            )}>
                                                                <span className="opacity-70">Week</span>
                                                                <span>{weekNum}</span>
                                                            </div>

                                                            {/* Sheet Capsule (Level 0 & 1) */}
                                                            {showSheetBadge && (
                                                                <div className="flex h-6 items-center gap-1.5 rounded-[8px] border border-white/10 bg-white/5 px-2.5 text-[10px] font-medium text-[#E8C15A]">
                                                                    <span className="opacity-70">Sheet</span>
                                                                    <span>{sheetLabel}</span>
                                                                </div>
                                                            )}

                                                            {/* Month Capsule removed as per user request to avoid confusion */}
                                                        </div>

                                                        {/* Right side checkmark */}
                                                        {isCompleted && <CheckCircle2 size={20} className="text-[#E8C15A]" />}
                                                    </div>

                                                    {/* Title & Desc */}
                                                    <div className="mb-6">
                                                        <h3 className="mb-2 line-clamp-1 text-lg font-medium leading-tight text-white transition-colors group-hover:text-[#E8C15A]">
                                                            {week.title}
                                                        </h3>
                                                        <p className="text-xs text-neutral-500 leading-relaxed line-clamp-2">
                                                            {week.description || "Master these concepts to advance your rank."}
                                                        </p>
                                                    </div>

                                                    {/* Progress Bar */}
                                                    <div className="mt-auto pt-4 border-t border-white/5">
                                                        <div className="flex justify-between items-end mb-2">
                                                            <span className="text-xs font-medium text-neutral-400 group-hover:text-white transition-colors">
                                                                Progress
                                                            </span>
                                                            <span className="text-xs font-semibold text-[#E8C15A]">
                                                                {solved} / {total}
                                                            </span>
                                                        </div>
                                                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-[#E8C15A] rounded-full transition-[color,background-color,border-color,opacity,transform] duration-1000 ease-out"
                                                                style={{ width: `${progress}%` }}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Chevron on hover */}
                                                    <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-[color,background-color,border-color,opacity,transform] duration-300 transform group-hover:translate-x-1">
                                                        <ChevronRight className="text-[#E8C15A]" size={16} />
                                                    </div>
                                                </div>
                                            </Link>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                </div>
            </TracingBeam>

            <style jsx global>{`
                @keyframes gradient-x {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }
                .animate-gradient-x {
                    background-size: 200% 200%;
                    animation: gradient-x 15s ease infinite;
                }
            `}</style>
        </div>
    );
}
