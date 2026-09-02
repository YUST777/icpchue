'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface PlanSheet {
    sheetId: string;
    contestId: string;
    urlType: string;
    groupId: string | null;
}

function askExtension(contestId: string, urlType: string, groupId: string | null): Promise<any> {
    return new Promise(resolve => {
        const requestId = `auto-${contestId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const onMessage = (event: MessageEvent) => {
            if (event.source !== window || event.data?.type !== 'VERDICT_CONTEST_SUBMISSIONS_RESULT' || event.data.requestId !== requestId) return;
            cleanup();
            resolve(event.data);
        };
        const timer = window.setTimeout(() => { cleanup(); resolve({ success: false, error: 'TIMEOUT' }); }, 30_000);
        const cleanup = () => { window.clearTimeout(timer); window.removeEventListener('message', onMessage); };
        window.addEventListener('message', onMessage);
        window.postMessage({
            type: 'VERDICT_GET_CONTEST_SUBMISSIONS',
            payload: { requestId, contestId, urlType, groupId, maxPages: 50 },
        }, '*');
    });
}

/** Runs once per six-hour browser window after the authenticated dashboard loads. */
export default function AutoBackfillTrigger() {
    const { user, isAuthenticated, loading } = useAuth();
    const started = useRef(false);

    useEffect(() => {
        if (loading || !isAuthenticated || !user?.id || started.current) return;
        started.current = true;

        const storageKey = `icpchue:auto-backfill:${user.id}`;
        const lastClientRun = Number(localStorage.getItem(storageKey) || 0);
        if (Date.now() - lastClientRun < 6 * 60 * 60 * 1000) return;

        let cancelled = false;
        const run = async () => {
            try {
                const response = await fetch('/api/codeforces/auto-backfill', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ source: 'dashboard' }),
                });
                if (!response.ok || cancelled) return;
                const result = await response.json().catch(() => ({}));
                // A server-side cooldown/lease response is not a completed
                // browser sync. Leave the local marker untouched so another
                // dashboard visit can retry the group history.
                if (!result.success) return;
                if (!result.groupContestsRequireExtension) {
                    localStorage.setItem(storageKey, String(Date.now()));
                    return;
                }
                // Public API completed, but private/group history still needs
                // the browser extension. Leave the client timestamp untouched
                // when it is absent so installing it and revisiting the
                // dashboard retries the group sync.
                if (!document.getElementById('verdict-extension-installed')) return;

                const planResponse = await fetch('/api/codeforces/backfill-plan', { credentials: 'include' });
                if (!planResponse.ok) return;
                const planData = await planResponse.json();
                const plan: PlanSheet[] = planData.sheets || [];
                const targets = Array.from(new Map(plan.map(sheet =>
                    [`${sheet.urlType}|${sheet.groupId || ''}|${sheet.contestId}`, sheet]
                )).values()).filter(target => target.urlType === 'group');
                const batches: any[] = [];
                let discoveredHandle: string | null = null;
                for (const target of targets) {
                    if (cancelled) return;
                    const extension = await askExtension(target.contestId, target.urlType, target.groupId);
                    if (!extension.success) continue;
                    if (extension.handle) discoveredHandle = extension.handle;
                    batches.push({
                        contestId: target.contestId,
                        urlType: target.urlType,
                        groupId: target.groupId,
                        submissions: extension.submissions || [],
                        accepted: extension.accepted || [],
                    });
                }
                if (targets.length > 0 && batches.length === 0) return;
                if (batches.length && !cancelled) {
                    const groupResponse = await fetch('/api/codeforces/backfill', {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ batches, cfHandle: discoveredHandle }),
                    });
                    if (!groupResponse.ok) return;
                }
                if (!cancelled) localStorage.setItem(storageKey, String(Date.now()));
            } catch {
                // Automatic sync is best-effort; the Settings button remains
                // available when Codeforces or the extension is unavailable.
            }
        };
        void run();
        return () => { cancelled = true; };
    }, [isAuthenticated, loading, user?.id]);

    return null;
}
