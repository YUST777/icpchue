'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { extensionAtLeast, SAFE_SOURCE_EXTENSION } from '@/lib/utils/extensionVersion';

/**
 * Fills in the code of synced submissions that have none (e.g. recovered by
 * the quick sync from a status page, which shows no code). A small batch per
 * visit, spaced out so Codeforces is not hammered; accepted solutions first.
 * Only with extension 1.5.0+, which refuses another submission's page.
 */

const RUN_INTERVAL_MS = 10 * 60 * 1000;
const BATCH = 10;
const GAP_MS = 1500;
const SKIP_FOR_MS = 7 * 24 * 60 * 60 * 1000;

interface Missing { id: number; cfSubmissionId: number; contestId: string; urlType: string; groupId: string | null }

function readSource(s: Missing): Promise<{ success: boolean; sourceCode?: string; error?: string }> {
    return new Promise(resolve => {
        const requestId = `fill-${s.cfSubmissionId}-${Date.now()}`;
        const onMessage = (event: MessageEvent) => {
            if (event.source !== window || event.data?.type !== 'VERDICT_SUBMISSION_SOURCE_RESULT' || event.data.requestId !== requestId) return;
            cleanup();
            resolve(event.data);
        };
        const timer = window.setTimeout(() => { cleanup(); resolve({ success: false, error: 'TIMEOUT' }); }, 45_000);
        const cleanup = () => { window.clearTimeout(timer); window.removeEventListener('message', onMessage); };
        window.addEventListener('message', onMessage);
        window.postMessage({
            type: 'VERDICT_GET_SUBMISSION_SOURCE',
            payload: { requestId, contestId: s.contestId, urlType: s.urlType, groupId: s.groupId, submissionId: s.cfSubmissionId },
        }, '*');
    });
}

export default function CodeBackfillTrigger() {
    const { user, isAuthenticated, loading } = useAuth();
    const running = useRef(false);

    useEffect(() => {
        if (loading || !isAuthenticated || !user?.id) return;
        const lastKey = `icpchue:code-fill:${user.id}`;
        const skipKey = `icpchue:code-fill-skip:${user.id}`;
        let cancelled = false;

        const run = async () => {
            if (running.current || document.visibilityState !== 'visible') return;
            if (!extensionAtLeast(SAFE_SOURCE_EXTENSION)) return;
            if (Date.now() - Number(localStorage.getItem(lastKey) || 0) < RUN_INTERVAL_MS) return;
            running.current = true;
            localStorage.setItem(lastKey, String(Date.now()));
            try {
                let skip: Record<string, number> = {};
                try { skip = JSON.parse(localStorage.getItem(skipKey) || '{}'); } catch { /* reset */ }
                const now = Date.now();
                for (const k of Object.keys(skip)) if (now - skip[k] > SKIP_FOR_MS) delete skip[k];

                const res = await fetch('/api/codeforces/missing-sources', {
                    method: 'POST', credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ limit: BATCH, skip: Object.keys(skip).map(Number) }),
                });
                if (!res.ok) return;
                const missing: Missing[] = (await res.json()).submissions || [];

                for (const s of missing) {
                    if (cancelled || document.visibilityState !== 'visible') break;
                    const r = await readSource(s);
                    if (r.success && typeof r.sourceCode === 'string' && r.sourceCode) {
                        await fetch(`/api/submissions/cf/${s.id}`, {
                            method: 'PATCH', credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ sourceCode: r.sourceCode }),
                        }).catch(() => {});
                    } else if (/NOT_LOGGED_IN|CLOUDFLARE|TIMEOUT|context invalidated|NO_CODEFORCES_TAB|COULD_NOT_OPEN/i.test(r.error || '')) {
                        break; // Codeforces unavailable right now: try again next visit
                    } else {
                        skip[String(s.cfSubmissionId)] = now; // not this account's / no source: retry in a week
                    }
                    await new Promise(resolve => setTimeout(resolve, GAP_MS));
                }
                localStorage.setItem(skipKey, JSON.stringify(skip));
            } catch {
                // Best effort.
            } finally {
                running.current = false;
            }
        };

        // After the quick sync has had its turn.
        const first = window.setTimeout(run, 20_000);
        const onVisible = () => { if (document.visibilityState === 'visible') void run(); };
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            cancelled = true;
            window.clearTimeout(first);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [isAuthenticated, loading, user?.id]);

    return null;
}
