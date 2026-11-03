'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchWithCache } from '@/lib/cache/api-cache';

export interface AssignmentItem {
    sheet: string;
    sheetLabel: string;
    sheetName: string;
    letter: string;
    title: string;
    solved: boolean;
    due: string;
    href: string;
}

export function useAssignments() {
    const { user } = useAuth();
    const [items, setItems] = useState<AssignmentItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) { setLoading(false); return; }
        fetchWithCache<{ items: AssignmentItem[] }>('/api/assignments', { credentials: 'include' }, 60)
            .then((d) => setItems(d.items || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [user]);

    return { items, loading };
}

/** "2026-11-15" -> "15 Nov" */
export const formatDue = (iso: string) =>
    new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

export const isOverdue = (iso: string) => iso < new Date().toLocaleDateString('en-CA');
