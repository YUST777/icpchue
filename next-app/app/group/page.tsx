'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MentorGroupCard, type Result } from '@/components/group/MentorGroupCard';
import { useAuth } from '@/contexts/AuthContext';

/** Each Level 0 trainee's own mentor WhatsApp group (no one sees other groups or lists). */
export default function MentorGroupPage() {
    const router = useRouter();
    const { isAuthenticated, loading: authLoading } = useAuth();
    const [result, setResult] = useState<Result | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (authLoading) return;
        if (!isAuthenticated) {
            router.replace('/login?redirect=/group');
            return;
        }
        fetch('/api/mentor-group', { credentials: 'include' })
            .then(async (res) => {
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.error || 'Could not load your mentor group.');
                setResult(data as Result);
            })
            .catch((e) => setError(e instanceof Error ? e.message : 'Could not load your mentor group.'));
    }, [authLoading, isAuthenticated, router]);

    return <MentorGroupCard result={result} error={error} />;
}
