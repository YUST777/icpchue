import { Skeleton } from "@/components/ui/Skeleton"

/** Shown the instant a dashboard link is clicked, while the next page's code and data arrive. */
export default function Loading() {
    return (
        <div className="space-y-6 animate-fade-in" aria-busy="true" aria-label="Loading">
            <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <Skeleton className="h-7 w-44" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Skeleton className="h-56 w-full rounded-2xl" />
                <Skeleton className="h-56 w-full rounded-2xl" />
            </div>
            <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
    )
}
