'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight } from 'lucide-react';
import { CurrentSheet } from '@/hooks/useDashboardStats';

import { Skeleton } from '@/components/ui/Skeleton';

interface CurrentSheetWidgetProps {
    sheet: CurrentSheet | null;
    loading?: boolean;
}

export default function CurrentSheetWidget({ sheet, loading = false }: CurrentSheetWidgetProps) {
    if (loading) {
        return (
            // Same frame as the loaded card: image banner, sheet badge + title, progress, button.
            <div className="h-full flex flex-col" role="status" aria-label="Loading current sheet">
                <div className="rounded-2xl p-[1px] bg-white/10 overflow-hidden flex-1">
                    <div className="bg-[#0f0f0f] rounded-[15px] overflow-hidden h-full flex flex-col">
                        <Skeleton className="flex-1 w-full min-h-[180px] rounded-none" />
                        <div className="p-5 pt-0 mt-auto">
                            <div className="flex items-center gap-3 mb-3">
                                <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
                                <div className="space-y-1.5">
                                    <Skeleton className="h-7 md:h-8 w-48 rounded" />
                                    <Skeleton className="h-4 w-32 rounded" />
                                </div>
                            </div>
                            <div className="mb-4">
                                <div className="flex justify-between mb-1.5">
                                    <Skeleton className="h-4 w-20 rounded" />
                                    <Skeleton className="h-4 w-8 rounded" />
                                </div>
                                <Skeleton className="h-2 w-full rounded-full" />
                            </div>
                            <Skeleton className="h-[46px] w-full rounded-xl" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!sheet) {
        return (
            <div className="bg-[#121212] rounded-xl border border-white/5 p-6 h-full flex flex-col items-center justify-center text-center min-h-[320px]">
                <h3 className="text-lg font-semibold text-[#F2F2F2] mb-1">No sheet started yet</h3>
                <p className="text-xs text-[#666] mb-4">Start solving problems to track your progress here.</p>
                <Link
                    href="/dashboard/sheets"
                    className="px-4 py-2 bg-[#E8C15A]/10 text-[#E8C15A] rounded-lg text-sm font-semibold hover:bg-[#E8C15A]/20 transition-colors"
                >
                    Browse sheets
                </Link>
            </div>
        );
    }

    const pct = sheet.totalProblems > 0 ? Math.round((sheet.solvedCount / sheet.totalProblems) * 100) : 0;
    const isComplete = pct === 100;
    const href = `/dashboard/sheets/${sheet.levelSlug}/${sheet.slug}`;

    return (
        <div className="space-y-0 h-full flex flex-col">
            <div className="relative group rounded-2xl p-[1px] bg-white/10 overflow-hidden flex-1">
                <div className="bg-[#0f0f0f] rounded-[15px] relative overflow-hidden h-full flex flex-col">

                    {/* Image Banner */}
                    <div className="relative min-h-[80px] w-full flex-1 transition-transform duration-700">
                        <Image
                            src="/images/sheet/sheet1.webp"
                            alt={`Sheet ${sheet.letter}`}
                            fill
                            className="object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f]/40 to-transparent" />
                    </div>

                    {/* Top Label Overlay */}
                    <div className="absolute top-0 left-0 p-4 z-10 w-full">
                        <h2 className="text-[10px] md:text-xs font-semibold text-white/90">
                                Current sheet
                            </h2>
                    </div>

                    {/* Bottom Content */}
                    <div className="relative z-10 p-4 pt-0 mt-auto">
                        {/* Sheet Info */}
                        <div className="flex items-center gap-3 mb-2">
                            <div>
                                <h3 className="text-xl font-semibold text-white">
                                    Sheet {sheet.letter}: {sheet.name}
                                </h3>
                                <p className="text-gray-400 text-xs">
                                    {sheet.totalProblems} problems · {sheet.levelName}
                                </p>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-3">
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs text-[#666]">
                                    {sheet.solvedCount}/{sheet.totalProblems} solved
                                </span>
                                <span className={`text-xs font-semibold ${
                                    isComplete ? 'text-green-400' : pct > 0 ? 'text-[#E8C15A]' : 'text-[#444]'
                                }`}>
                                    {pct}%
                                </span>
                            </div>
                            <div className="h-2 bg-[#0a0a0a] rounded-full overflow-hidden border border-white/5">
                                <div
                                    className={`h-full rounded-full transition-[color,background-color,border-color,opacity,transform] duration-1000 ease-out ${
                                        isComplete
                                            ? 'bg-green-500'
                                            : 'bg-[#E8C15A]'
                                    }`}
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                        </div>

                        {/* Action Link */}
                        <Link
                            href={href}
                            className="w-full relative overflow-hidden rounded-xl bg-[#161616] border border-white/5 hover:bg-[#1a1a1a] hover:border-[#E8C15A]/20 transition-[color,background-color,border-color,opacity,transform] group/btn block"
                        >
                            <div className="relative z-10 px-4 py-2.5 flex items-center justify-between">
                                <span className="text-sm font-semibold text-white group-hover/btn:text-[#E8C15A] transition-colors">
                                    {isComplete ? 'Completed ✓' : 'Continue solving'}
                                </span>
                                <ChevronRight className="w-4 h-4 text-gray-500 group-hover/btn:text-[#E8C15A] transition-colors" />
                            </div>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
