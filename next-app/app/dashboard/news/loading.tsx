import { Skeleton } from "@/components/ui/Skeleton"

export default function Loading() {
    return (
        <div className="space-y-8 animate-fade-in">
            {/* Page Title Skeleton */}
            <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <Skeleton className="h-8 w-48" />
            </div>

            {/* Featured News Skeleton (Hero) */}
            <div className="relative bg-[#1a1a1a] rounded-2xl border border-white/5 overflow-hidden h-[400px] md:h-[320px]">
                <div className="grid md:grid-cols-2 gap-0 h-full">
                    <Skeleton className="h-56 md:h-full w-full rounded-none" />
                    <div className="p-6 md:p-8 flex flex-col justify-center space-y-4">
                        <div className="flex gap-2">
                            <Skeleton className="h-6 w-20 rounded-full" />
                            <Skeleton className="h-6 w-24" />
                        </div>
                        <Skeleton className="h-8 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                        <div className="pt-4 flex gap-2">
                            <Skeleton className="h-8 w-16 rounded-full" />
                            <Skeleton className="h-8 w-16 rounded-full" />
                            <Skeleton className="h-8 w-16 rounded-full" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Other News Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="bg-[#121212] p-5 rounded-xl border border-white/5 space-y-4">
                        <div className="flex justify-between items-center">
                            <Skeleton className="h-6 w-20 rounded-full" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                        <Skeleton className="h-6 w-3/4 mb-2" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-5/6" />
                        </div>
                        <div className="pt-2 flex gap-2">
                            <Skeleton className="h-6 w-12 rounded-full" />
                            <Skeleton className="h-6 w-12 rounded-full" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
