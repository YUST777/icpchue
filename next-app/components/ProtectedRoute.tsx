'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        if (!loading) {
            if (!isAuthenticated) {
                // Redirect to login with return URL
                router.replace(`/login?from=${encodeURIComponent(pathname)}`);
            } else {
                // Use setTimeout to avoid synchronous setState in effect
                setTimeout(() => setIsAuthorized(true), 0);
            }
        }
    }, [isAuthenticated, loading, router, pathname]);

    if (loading || !isAuthorized) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
                <Loader2 className="h-8 w-8 text-[#d59928] animate-spin mb-4" />
                <p className="text-white/60 animate-pulse">Verifying Session...</p>
            </div>
        );
    }

    return <>{children}</>;
}
