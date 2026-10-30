import { Skeleton } from '@/components/ui/Skeleton';

// Shown the instant a profile link is clicked, while the profile loads on the server.
export default function ProfileLoading() {
    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-5 animate-fade-in" role="status" aria-label="Loading profile">
            {/* Top grid: Hero + 3 Stat cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Identity Hero */}
                <div className="md:col-span-2 rounded-2xl border border-white/[0.08] bg-[#121214]/90 p-5 flex flex-col justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Skeleton className="w-16 h-16 rounded-full shrink-0" />
                        <div className="space-y-2 flex-1">
                            <Skeleton className="h-6 w-44 rounded-lg" />
                            <Skeleton className="h-3.5 w-28 rounded" />
                            <Skeleton className="h-3 w-36 rounded" />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Skeleton className="h-9 flex-1 rounded-xl" />
                        <Skeleton className="h-9 w-28 rounded-xl" />
                    </div>
                </div>

                {/* Solved */}
                <div className="rounded-2xl border border-white/[0.08] bg-[#121214]/90 p-5 flex flex-col justify-between gap-3">
                    <Skeleton className="h-3 w-16 rounded" />
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-20 rounded" />
                        <Skeleton className="h-1.5 w-full rounded-full" />
                        <Skeleton className="h-2.5 w-24 rounded" />
                    </div>
                </div>

                {/* Streak */}
                <div className="rounded-2xl border border-white/[0.08] bg-[#121214]/90 p-5 flex flex-col justify-between gap-3">
                    <Skeleton className="h-3 w-16 rounded" />
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-20 rounded" />
                        <Skeleton className="h-2.5 w-28 rounded" />
                    </div>
                </div>
            </div>

            {/* Achievements Showcase */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#121214]/90 p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32 rounded" />
                    <Skeleton className="h-3 w-16 rounded" />
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="p-3 rounded-xl border border-white/5 bg-white/[0.02] flex flex-col items-center gap-2">
                            <Skeleton className="w-14 h-14 rounded-full" />
                            <Skeleton className="h-3 w-14 rounded" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Sheets Section */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#121214]/90 p-5 space-y-4">
                <Skeleton className="h-4 w-36 rounded" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="p-4 rounded-xl border border-white/5 bg-white/[0.02] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
                                <div className="space-y-1.5">
                                    <Skeleton className="h-4 w-32 rounded" />
                                    <Skeleton className="h-3 w-20 rounded" />
                                </div>
                            </div>
                            <Skeleton className="h-4 w-12 rounded" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
