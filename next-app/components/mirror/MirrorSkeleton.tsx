"use client";

import { Skeleton } from "@/components/ui/Skeleton";

export default function MirrorSkeleton() {
    return (
        <div className="fixed inset-0 bg-[#0B0B0C] text-[#DCDCDC] z-50 flex flex-col overflow-hidden">
            {/* Header Skeleton */}
            <div className="flex flex-col gap-4 border-b border-white/10 bg-[#121212] px-4 py-2 shrink-0">
                <div className="flex items-center justify-between gap-4 h-9 relative">
                    <div className="flex items-center gap-3 overflow-hidden flex-1">
                        <Skeleton className="h-8 w-8 rounded-md" /> {/* Back button */}
                        <Skeleton className="h-8 w-24 rounded-lg hidden sm:block" /> {/* Problems button */}
                    </div>
                    
                    {/* Centered Buttons Skeleton */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-1.5">
                        <Skeleton className="h-9 w-9 rounded-lg" />
                        <Skeleton className="h-9 w-28 rounded-lg" />
                        <Skeleton className="h-9 w-9 rounded-lg" />
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
                </div>
            </div>

            {/* Main Content Skeleton */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel Skeleton (~40%) */}
                <div className="hidden md:flex flex-col w-[40%] border-r border-white/5 bg-[#0B0B0C] shrink-0">
                    <div className="flex items-center gap-1 p-2 border-b border-white/5 bg-[#121212]/50">
                        <Skeleton className="h-7 w-20 rounded-md" />
                        <Skeleton className="h-7 w-20 rounded-md" />
                        <Skeleton className="h-7 w-20 rounded-md" />
                    </div>
                    <div className="p-6 space-y-6 overflow-y-auto">
                        <div className="space-y-3">
                            <Skeleton className="h-8 w-1/3 rounded-lg" />
                            <div className="flex gap-2">
                                <Skeleton className="h-5 w-16 rounded-full" />
                                <Skeleton className="h-5 w-16 rounded-full" />
                            </div>
                        </div>

                        <div className="space-y-4 pt-4">
                            <Skeleton className="h-4 w-full rounded" />
                            <Skeleton className="h-4 w-full rounded" />
                            <Skeleton className="h-4 w-5/6 rounded" />
                            <Skeleton className="h-4 w-full rounded" />
                            <Skeleton className="h-4 w-4/6 rounded" />
                        </div>

                        <div className="space-y-4 pt-8">
                            <Skeleton className="h-6 w-1/4 rounded-md" />
                            <div className="bg-white/5 rounded-xl p-4 space-y-3 border border-white/5">
                                <Skeleton className="h-4 w-full rounded" />
                                <Skeleton className="h-4 w-3/4 rounded" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Resizer Skeleton */}
                <div className="hidden md:block w-1 bg-white/5 shrink-0" />

                {/* Right Panel/Editor Skeleton (~60%) */}
                <div className="flex-1 flex flex-col bg-[#121213]">
                    {/* Editor Header Skeleton - Single Action Row */}
                    <div className="flex items-center justify-between px-4 h-10 border-b border-white/5 bg-[#1a1a1b]">
                        <div className="flex items-center gap-4">
                            <Skeleton className="h-5 w-20 rounded" />
                        </div>
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-5 w-5 rounded" />
                            <Skeleton className="h-5 w-5 rounded" />
                            <Skeleton className="h-5 w-5 rounded" />
                            <Skeleton className="h-5 w-5 rounded" />
                        </div>
                    </div>

                    {/* Editor Area */}
                    <div className="flex-1 font-mono">
                        <div className="space-y-2">
                            {[65, 45, 80, 35, 55, 70, 40, 60, 50, 75, 30, 85, 45, 55, 65].map((w, i) => (
                                <div key={i} className="flex gap-4">
                                    <Skeleton className="h-4 w-4 opacity-20 shrink-0" />
                                    <Skeleton 
                                        className="h-4 rounded opacity-40" 
                                        style={{ width: `${w}%` }} 
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bottom Panel Skeleton */}
                    <div className="h-[45%] border-t border-white/10 bg-[#0B0B0C] flex flex-col">
                        <div className="h-9 border-b border-white/5 flex items-center px-4 gap-4">
                            <Skeleton className="h-5 w-16 rounded" />
                            <Skeleton className="h-5 w-16 rounded" />
                        </div>
                        <div className="flex-1 p-4 space-y-4">
                            <Skeleton className="h-10 w-full rounded-xl" />
                            <div className="grid grid-cols-2 gap-4">
                                <Skeleton className="h-20 rounded-xl" />
                                <Skeleton className="h-20 rounded-xl" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
