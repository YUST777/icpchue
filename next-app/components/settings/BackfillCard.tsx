'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, Zap, CheckCircle2, AlertTriangle, Download } from 'lucide-react';

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
// Accepted submissions in one contest. Resolves with the result message.
function askExtensionForContest(
    contestId: string,
    urlType: string,
    groupId: string | null,
    timeoutMs = 30000
): Promise<{ success: boolean; accepted?: any[]; handle?: string | null; error?: string }> {
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
            payload: { requestId, contestId, urlType, groupId, maxPages: 10 }
        }, '*');
    });
}

export default function BackfillCard() {
    const [hasExtension, setHasExtension] = useState(false);
    const [phase, setPhase] = useState<Phase>('idle');
    const [progress, setProgress] = useState({ done: 0, total: 0 });
    const [currentSheet, setCurrentSheet] = useState<string>('');
    const [totalSolved, setTotalSolved] = useState(0);
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
        setPhase('planning');
        cancelRef.current = false;

        // 1. Get the plan: all sheets with unsolved problems.
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

        // 2. For each sheet, ask the extension for that contest's ACs, then post
        //    the matches to the backfill endpoint. Sequential to be gentle on
        //    Codeforces (avoids rate-limiting the user's own session).
        for (let i = 0; i < plan.length; i++) {
            if (cancelRef.current) break;
            const sheet = plan[i];
            setCurrentSheet(sheet.sheetName);

            const extResult = await askExtensionForContest(sheet.contestId, sheet.urlType, sheet.groupId);

            if (extResult.success && Array.isArray(extResult.accepted) && extResult.accepted.length > 0) {
                // Only send ACs for problems still unsolved in this sheet.
                const unsolvedSet = new Set(sheet.unsolved.map(s => s.toUpperCase()));
                const relevant = extResult.accepted.filter((a: any) =>
                    unsolvedSet.has(String(a.problemIndex || '').toUpperCase())
                );

                if (relevant.length > 0) {
                    try {
                        const res = await fetch('/api/codeforces/backfill', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({
                                sheetId: sheet.sheetId,
                                contestId: sheet.contestId,
                                urlType: sheet.urlType,
                                groupId: sheet.groupId,
                                cfHandle: extResult.handle || undefined,
                                accepted: relevant,
                                submissions: extResult.submissions || [],
                            })
                        });
                        if (res.ok) {
                            const data = await res.json();
                            solvedTotal += data.solved || 0;
                            setTotalSolved(solvedTotal);
                        }
                    } catch {
                        // Skip this sheet on error, keep going.
                    }
                }
            }

            setProgress({ done: i + 1, total: plan.length });
        }

        setCurrentSheet('');
        setPhase('done');
    }, []);

    const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
    const running = phase === 'planning' || phase === 'running';

    return (
        <div className="bg-[#121212] rounded-xl border border-white/5 p-5 md:p-6">
            <h3 className="text-lg font-bold text-[#F2F2F2] mb-1 flex items-center gap-2">
                <Zap size={20} className="text-[#E8C15A]" />
                Backfill from Codeforces
            </h3>
            <p className="text-sm text-[#A0A0A0] mb-4">
                Already solved problems on Codeforces directly? Pull all your Accepted
                submissions across every sheet and mark them solved here — in one click.
            </p>

            {!hasExtension ? (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-300 text-sm">
                    <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold text-orange-200">Extension required</p>
                        <p className="text-xs mt-0.5">
                            Install the ICPC HUE Helper extension and make sure you&apos;re logged
                            into Codeforces, then reload this page.
                        </p>
                        <a
                            href="https://chromewebstore.google.com/detail/verdict-helper/jeiffogppnpnefphgpglagmgbcnifnhj"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block mt-2 text-xs font-semibold text-[#E8C15A] hover:underline"
                        >
                            Get the extension →
                        </a>
                    </div>
                </div>
            ) : (
                <>
                    <button
                        onClick={run}
                        disabled={running}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#E8C15A] hover:bg-[#D4AF37] disabled:bg-[#E8C15A]/20 disabled:text-[#666] text-black font-bold rounded-lg transition-colors cursor-pointer"
                    >
                        {phase === 'planning' && (<><Loader2 size={18} className="animate-spin" /> Finding your sheets...</>)}
                        {phase === 'running' && (<><Loader2 size={18} className="animate-spin" /> Syncing {progress.done}/{progress.total} sheets...</>)}
                        {(phase === 'idle' || phase === 'error') && (<><Download size={18} /> Backfill my progress</>)}
                        {phase === 'done' && (<><CheckCircle2 size={18} /> Run again</>)}
                    </button>

                    {running && (
                        <div className="mt-4 space-y-2">
                            <div className="w-full bg-[#1A1A1A] rounded-full h-2 overflow-hidden">
                                <div
                                    className="h-full bg-[#E8C15A] rounded-full transition-all duration-300"
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                            <p className="text-xs text-[#888] truncate">
                                {currentSheet ? <>Scanning <span className="text-[#E8C15A]">{currentSheet}</span>...</> : 'Preparing...'}
                                {totalSolved > 0 && <span className="text-emerald-400"> · {totalSolved} marked solved</span>}
                            </p>
                        </div>
                    )}

                    {phase === 'done' && (
                        <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm">
                            <CheckCircle2 size={18} className="shrink-0" />
                            {totalSolved > 0
                                ? <span>Done — marked <strong>{totalSolved}</strong> problem{totalSolved !== 1 ? 's' : ''} solved from your Codeforces history.</span>
                                : <span>All caught up — no new solved problems found.</span>}
                        </div>
                    )}

                    {phase === 'error' && error && (
                        <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            <AlertTriangle size={18} className="shrink-0" />
                            {error}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
