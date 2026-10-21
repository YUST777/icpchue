'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Quick Codeforces check on every visit (at most every 10 minutes): reads only
 * the newest page of the student's submissions in each sheet through the
 * extension and saves anything missing. A sheet whose whole newest page is
 * unknown gets a full history read. The 6-hourly AutoBackfillTrigger still
 * does the complete pass.
 */

const QUICK_INTERVAL_MS = 10 * 60 * 1000;
const EMPTY_SKIP_MS = 24 * 60 * 60 * 1000;
const AUTO_BACKFILL_INTERVAL_MS = 6 * 60 * 60 * 1000;
const PAGE_SIZE = 50;

interface PlanSheet { contestId: string; urlType: string; groupId: string | null }
interface ContestResult {
    success: boolean;
    error?: string;
    handle?: string | null;
    submissions?: { id: number }[];
    accepted?: unknown[];
}

function askExtension(target: PlanSheet, maxPages: number): Promise<ContestResult> {
    return new Promise(resolve => {
        const requestId = `quick-${target.contestId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const onMessage = (event: MessageEvent) => {
            if (event.source !== window || event.data?.type !== 'VERDICT_CONTEST_SUBMISSIONS_RESULT' || event.data.requestId !== requestId) return;
            cleanup();
            resolve(event.data);
        };
        const timer = window.setTimeout(() => { cleanup(); resolve({ success: false, error: 'TIMEOUT' }); }, maxPages > 1 ? 120_000 : 45_000);
        const cleanup = () => { window.clearTimeout(timer); window.removeEventListener('message', onMessage); };
        window.addEventListener('message', onMessage);
        window.postMessage({
            type: 'VERDICT_GET_CONTEST_SUBMISSIONS',
            payload: { requestId, contestId: target.contestId, urlType: target.urlType, groupId: target.groupId, maxPages },
        }, '*');
    });
}

const readJson = <T,>(key: string, fallback: T): T => {
    try { return JSON.parse(localStorage.getItem(key) || '') as T; } catch { return fallback; }
};

export default function QuickSyncTrigger() {
    const { user, isAuthenticated, loading } = useAuth();
    const running = useRef(false);

    useEffect(() => {
        if (loading || !isAuthenticated || !user?.id) return;
        const userId = user.id;
        const lastKey = `icpchue:quick-sync:${userId}`;
        const emptyKey = `icpchue:quick-sync-empty:${userId}`;
        let cancelled = false;

        const run = async () => {
            if (running.current || document.visibilityState !== 'visible') return;
            if (!document.getElementById('verdict-extension-installed')) return;
            if (Date.now() - Number(localStorage.getItem(lastKey) || 0) < QUICK_INTERVAL_MS) return;
            // The full 6-hourly pass is about to run on this visit: let it.
            const lastFull = Number(localStorage.getItem(`icpchue:auto-backfill:${userId}`) || 0);
            if (Date.now() - lastFull >= AUTO_BACKFILL_INTERVAL_MS) return;

            running.current = true;
            localStorage.setItem(lastKey, String(Date.now()));
            try {
                const planRes = await fetch('/api/codeforces/backfill-plan', { credentials: 'include' });
                if (!planRes.ok) return;
                const plan: PlanSheet[] = (await planRes.json()).sheets || [];
                const targets = Array.from(new Map(plan.map(s => [`${s.urlType}|${s.groupId || ''}|${s.contestId}`, s])).values())
                    .filter(t => t.urlType === 'group');

                const empty = readJson<Record<string, number>>(emptyKey, {});
                const now = Date.now();
                const batches: Array<PlanSheet & { submissions: unknown[]; accepted: unknown[] }> = [];
                const fullPages: PlanSheet[] = [];
                let handle: string | null = null;

                for (const target of targets) {
                    if (cancelled) return;
                    const key = `${target.groupId || ''}:${target.contestId}`;
                    if (empty[key] && now - empty[key] < EMPTY_SKIP_MS) continue;
                    const res = await askExtension(target, 1);
                    if (!res.success) {
                        // Logged out / Cloudflare / extension trouble: stop quietly.
                        if (/NOT_LOGGED_IN|CLOUDFLARE|TIMEOUT|context invalidated/i.test(res.error || '')) break;
                        empty[key] = now; // no access to this contest
                        continue;
                    }
                    if (res.handle) handle = res.handle;
                    const subs = res.submissions || [];
                    if (subs.length === 0) { empty[key] = now; continue; }
                    delete empty[key];
                    batches.push({ ...target, submissions: subs, accepted: res.accepted || [] });
                    if (subs.length >= PAGE_SIZE) fullPages.push(target);
                }
                localStorage.setItem(emptyKey, JSON.stringify(empty));
                if (cancelled || batches.length === 0) return;

                // A full newest page whose oldest row is not saved yet may hide
                // more missing submissions: read that sheet's whole history.
                if (fullPages.length) {
                    const oldest = fullPages.map(t => {
                        const subs = (batches.find(b => b.contestId === t.contestId && b.groupId === t.groupId)?.submissions || []) as { id: number }[];
                        return Math.min(...subs.map(s => Number(s.id)));
                    });
                    const knownRes = await fetch('/api/codeforces/known-ids', {
                        method: 'POST', credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ids: oldest }),
                    });
                    const known = new Set<number>(knownRes.ok ? (await knownRes.json()).known || [] : []);
                    for (let i = 0; i < fullPages.length && !cancelled; i++) {
                        if (known.has(oldest[i])) continue;
                        const deep = await askExtension(fullPages[i], 50);
                        if (!deep.success) continue;
                        const batch = batches.find(b => b.contestId === fullPages[i].contestId && b.groupId === fullPages[i].groupId);
                        if (batch) { batch.submissions = deep.submissions || batch.submissions; batch.accepted = deep.accepted || batch.accepted; }
                    }
                }
                if (cancelled) return;

                await fetch('/api/codeforces/backfill', {
                    method: 'POST', credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ batches, cfHandle: handle }),
                });
            } catch {
                // Best effort: the problem page sync and the Settings backfill remain.
            } finally {
                running.current = false;
            }
        };

        // Let the page and the extension settle first.
        const first = window.setTimeout(run, 4000);
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
