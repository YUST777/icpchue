'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { extensionErrorMessage } from '@/lib/utils/codeforcesUtils';

interface SheetPlan {
    sheetId: string;
    sheetName: string;
    sheetSlug: string;
    levelSlug: string;
    contestId: string;
    urlType: string;
    groupId: string | null;
    unsolved: string[];
    solvedCount: number;
    totalCount: number;
}

type Phase = 'idle' | 'planning' | 'running' | 'done' | 'error';

// Ask the extension (via the content-script bridge) for ALL of the user's
// All submissions in one contest. Resolves with the result message.
function askExtensionForContest(
    contestId: string,
    urlType: string,
    groupId: string | null,
    timeoutMs = 120000
): Promise<{ success: boolean; accepted?: any[]; submissions?: any[]; handle?: string | null; error?: string }> {
    return new Promise((resolve) => {
        const requestId = `${contestId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        const handler = (event: MessageEvent) => {
            if (event.source !== window) return;
            if (event.data?.type !== 'VERDICT_CONTEST_SUBMISSIONS_RESULT') return;
            if (event.data.requestId !== requestId) return;
            cleanup();
            resolve(event.data);
        };
        const timer = setTimeout(() => {
            cleanup();
            resolve({ success: false, error: 'TIMEOUT' });
        }, timeoutMs);
        function cleanup() {
            clearTimeout(timer);
            window.removeEventListener('message', handler);
        }

        window.addEventListener('message', handler);
        window.postMessage({
            type: 'VERDICT_GET_CONTEST_SUBMISSIONS',
            payload: { requestId, contestId, urlType, groupId, maxPages: 50 }
        }, '*');
    });
}

export default function BackfillCard() {
    const [hasExtension, setHasExtension] = useState(false);
    const [phase, setPhase] = useState<Phase>('idle');
    const [progress, setProgress] = useState({ done: 0, total: 0 });
    const [currentSheet, setCurrentSheet] = useState<string>('');
    const [totalSolved, setTotalSolved] = useState(0);
    const [totalAttempts, setTotalAttempts] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const cancelRef = useRef(false);

    useEffect(() => {
        const check = () => setHasExtension(!!document.getElementById('verdict-extension-installed'));
        check();
        const t = setTimeout(check, 600);
        return () => clearTimeout(t);
    }, []);

    const run = useCallback(async () => {
        setError(null);
        setTotalSolved(0);
        setTotalAttempts(0);
        setPhase('planning');
        cancelRef.current = false;

        // 1. Get the plan: all curriculum Codeforces targets. The plan includes
        // solved sheets because their historical WAs still count as tries.
        let plan: SheetPlan[];
        try {
            const res = await fetch('/api/codeforces/backfill-plan', { credentials: 'include' });
            if (!res.ok) {
                setError(res.status === 401 ? 'Please log in again.' : 'Could not load your sheets.');
                setPhase('error');
                return;
            }
            const data = await res.json();
            plan = data.sheets || [];
        } catch {
            setError('Network error while loading your sheets.');
            setPhase('error');
            return;
        }

        if (plan.length === 0) {
            setPhase('done');
            setProgress({ done: 0, total: 0 });
            return;
        }

        setPhase('running');
        setProgress({ done: 0, total: plan.length });

        let solvedTotal = 0;

        // Scan each unique contest once. A single request then imports every
        // verdict (including failed attempts) for every matching sheet.
        const targets = Array.from(new Map(
            plan.map(sheet => [`${sheet.urlType}|${sheet.groupId || ''}|${sheet.contestId}`, sheet])
        ).values());
        const batches: any[] = [];
        let discoveredHandle: string | null = null;
        let partialContests = 0;
        let failedContests = 0;
        let lastExtensionError: string | undefined;
        let cursor = 0;
        const worker = async () => {
            while (cursor < targets.length && !cancelRef.current) {
                const sheet = targets[cursor++];
                setCurrentSheet(sheet.sheetName);
                const extResult = await askExtensionForContest(sheet.contestId, sheet.urlType, sheet.groupId);
                if (!extResult.success) {
                    failedContests++;
                    lastExtensionError = extResult.error;
                }
                if (extResult.success) {
                    if ((extResult as { partial?: string | null }).partial) partialContests++;
                    if (extResult.handle) discoveredHandle = extResult.handle;
                    batches.push({
                        contestId: sheet.contestId,
                        urlType: sheet.urlType,
                        groupId: sheet.groupId,
                        submissions: extResult.submissions || [],
                        accepted: extResult.accepted || [],
                    });
                }
                setProgress({ done: Math.min(cursor, targets.length), total: targets.length });
            }
        };
        // One contest at a time: parallel scans trigger Codeforces throttling,
        // which used to cut histories short and time out.
        await worker();

        if (!cancelRef.current && targets.length > 0 && batches.length === 0) {
            setError(extensionErrorMessage(lastExtensionError) || 'The extension could not read any Codeforces contests. Check that you are logged in and try again.');
            setPhase('error');
            return;
        }
        if (!cancelRef.current && batches.length > 0) {
            try {
                let inserted = 0;
                // The API accepts a bounded number of batches per request.
                for (let i = 0; i < batches.length; i += 40) {
                    const res = await fetch('/api/codeforces/backfill', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ batches: batches.slice(i, i + 40), cfHandle: discoveredHandle }),
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) {
                        throw new Error(res.status === 403 && /mismatch/i.test(data.error || '')
                            ? 'The Codeforces account logged in on this browser is not the one linked to your ICPC HUE account.'
                            : 'The history was read, but the server could not save it. Please try again.');
                    }
                    solvedTotal += data.newlySolved || data.solved || 0;
                    inserted += Number(data.newlyInserted) || 0;
                }
                setTotalSolved(solvedTotal);
                // newlyInserted is idempotent: submissions are upserted by CF id.
                setTotalAttempts(inserted);
                if (partialContests || failedContests) {
                    setError(`Saved what was read. ${partialContests + failedContests} contest(s) could not be fully read from Codeforces; run the backfill again later to finish.`);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'The history was read, but the server could not save it. Please try again.');
                setPhase('error');
                return;
            }
        }

        setCurrentSheet('');
        setPhase('done');
    }, []);

    const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
    const running = phase === 'planning' || phase === 'running';

    return (
        <section id="codeforces-backfill" className="ui-card p-4 sm:p-5">
            <h3 className="mb-2 text-lg font-medium text-[var(--color-text)]">Import tries from Codeforces</h3>
            <p className="mb-5 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)]">
                Imports your accepted and failed attempts so each problem&apos;s tries count is accurate.
                Only problems linked to Codeforces are included. VJudge and other providers are skipped.
            </p>

            {!hasExtension ? (
                <div className="border-t border-white/[0.06] pt-4">
                    <p className="text-sm text-[var(--color-text)]">Extension required</p>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)]">
                        Install the ICPC HUE Helper extension and make sure you&apos;re logged into Codeforces, then reload this page.
                    </p>
                    <a
                        href="https://chromewebstore.google.com/detail/verdict-helper/jeiffogppnpnefphgpglagmgbcnifnhj"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-block text-sm text-[#E8C15A] hover:underline"
                    >
                        Get the extension
                    </a>
                </div>
            ) : (
                <>
                    <button
                        onClick={run}
                        disabled={running}
                        className="ui-button-primary w-full sm:w-auto disabled:opacity-50"
                    >
                        {running && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
                        {phase === 'planning' && 'Finding your sheets'}
                        {phase === 'running' && `Syncing ${progress.done} of ${progress.total} sheets`}
                        {(phase === 'idle' || phase === 'error') && 'Import my progress'}
                        {phase === 'done' && 'Run again'}
                    </button>

                    {running && (
                        <div className="mt-4 space-y-2">
                            <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.08]">
                                <div className="h-full rounded-full bg-[#E8C15A] transition-[width] duration-300" style={{ width: `${pct}%` }} />
                            </div>
                            <p className="truncate text-xs text-[var(--color-text-muted)]">
                                {currentSheet ? `Scanning ${currentSheet}` : 'Preparing'}
                                {totalSolved > 0 && ` · ${totalSolved} marked solved`}
                            </p>
                        </div>
                    )}

                    {phase === 'done' && (
                        <p className="mt-4 text-sm text-[var(--color-text-secondary)]">
                            {totalAttempts > 0
                                ? `Imported ${totalAttempts} new attempt${totalAttempts !== 1 ? 's' : ''}${totalSolved > 0 ? ` and marked ${totalSolved} problem${totalSolved !== 1 ? 's' : ''} solved` : ''}.`
                                : 'Already up to date. No new attempts were added.'}
                        </p>
                    )}
                    {phase === 'done' && error && <p className="mt-2 text-sm text-amber-300">{error}</p>}
                    {phase === 'error' && error && <p className="mt-4 text-sm text-red-400">{error}</p>}
                </>
            )}
        </section>
    );
}
