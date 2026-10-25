import { Skeleton } from '@/components/ui/Skeleton';

// Shown the instant a profile link is clicked, while the profile loads on the server.
export default function ProfileLoading() {
    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-4">
            <Skeleton className="h-28 rounded-2xl" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
            <Skeleton className="h-64 rounded-2xl" />
        </div>
    );
}
