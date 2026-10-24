'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

/** Signed-in members see the same profile inside the dashboard. */
export default function RedirectIfSignedIn({ to }: { to: string }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    useEffect(() => {
        if (!loading && user) router.replace(to);
    }, [loading, user, to, router]);
    return null;
}
