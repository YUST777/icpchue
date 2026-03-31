'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.replace(`/login?from=${encodeURIComponent(pathname)}`);
        }
    }, [isAuthenticated, loading, router, pathname]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0B0B0C] flex">
                <div className="hidden md:flex w-[256px] shrink-0 border-r border-white/5 flex-col p-6 gap-6">
                    <Skeleton className="h-8 w-32 rounded-lg" />
                    <div className="space-y-2 mt-4">
                        {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
                    </div>
                </div>
                <div className="flex-1 p-4 md:p-8 space-y-6">
                    <Skeleton className="h-7 w-40 rounded-lg" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1,2,3].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
                    </div>
                    <Skeleton className="h-64 rounded-xl" />
                </div>
            </div>
        );
    }

    if (!isAuthenticated) return null;

    return <>{children}</>;
}
