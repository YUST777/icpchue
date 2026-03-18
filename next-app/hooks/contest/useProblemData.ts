import { useState, useEffect, useRef } from 'react';
import { Problem, CFProblemData, Example } from '@/components/mirror/types';
import { fetchWithCache } from '@/lib/api-cache';
import { useCodeforcesHandle } from './useCodeforcesHandle';

interface UseProblemDataParams {
    contestId: string;
    problemId: string;
    urlType: string;
    groupId?: string;
    /** Pre-fetched CF data — if provided, skips the mirror fetch entirely */
    initialCfData?: CFProblemData;
    /** The ICPhue DB sheetId (if available) - passed to save-submission */
    sheetId?: string;
}

interface UseProblemDataReturn {
    problem: Problem | null;
    cfData: CFProblemData | null;
    loading: boolean;
    error: string | null;
    cfStats: { rating?: number; solvedCount: number } | null;
    sampleTestCases: Example[];
}

/** Transform raw CFProblemData into the Problem interface used by components */
function transformCfData(data: CFProblemData, problemId: string): { problem: Problem; testCases: Example[] } {
    const mappedProblem: Problem = {
        id: Array.isArray(problemId) ? problemId[0].toUpperCase() : problemId.toUpperCase(),
        title: data.meta.title,
        statement: data.story,
        inputFormat: data.inputSpec || 'See problem statement',
        outputFormat: data.outputSpec || 'See problem statement',
        examples: data.testCases.map((tc) => ({
            input: tc.input,
            output: tc.output,
            expectedOutput: tc.output
        })),
        note: data.note || undefined,
        timeLimit: data.meta.timeLimitMs,
        memoryLimit: data.meta.memoryLimitMB,
        codeforcesUrl: data.codeforcesUrl
    };
    return { problem: mappedProblem, testCases: mappedProblem.examples };
}

export function useProblemData({ contestId, problemId, urlType, groupId, initialCfData, sheetId }: UseProblemDataParams): UseProblemDataReturn {
    // If we have pre-fetched data, initialize state directly (no loading needed)
    const hasInitial = !!initialCfData;
    const initialTransform = initialCfData ? transformCfData(initialCfData, problemId) : null;

    const [cfData, setCfData] = useState<CFProblemData | null>(initialCfData || null);
    const [problem, setProblem] = useState<Problem | null>(initialTransform?.problem || null);
    const [loading, setLoading] = useState(!hasInitial);
    const [error, setError] = useState<string | null>(null);
    const [cfStats, setCfStats] = useState<{ rating?: number; solvedCount: number } | null>(null);
    const [sampleTestCases, setSampleTestCases] = useState<Example[]>(initialTransform?.testCases || []);

    const { handle: cfHandle } = useCodeforcesHandle();
    const syncAttemptedRef = useRef<string | null>(null);

    // Fetch Low Cost Global Stats (always runs — it's async and non-blocking)
    useEffect(() => {
        let cancelled = false;
        if (!contestId || !problemId) return;

        // Cache stats for 60s
        fetchWithCache<any>(`/api/codeforces/problem-stats?contestId=${contestId}&index=${problemId}`, {}, 60)
            .then(data => { if (!cancelled && data && !data.error) setCfStats(data); })
            .catch(err => console.error('Failed to load CF stats', err));

        return () => { cancelled = true; };
    }, [contestId, problemId]);

    // Fetch problem from Codeforces Mirror API (SKIP if pre-fetched)
    useEffect(() => {
        if (hasInitial) return; // Data already provided, no fetch needed

        const fetchProblem = async () => {
            try {
                const res = await fetch(`/api/codeforces/mirror?contestId=${contestId}&problemId=${problemId}&type=${urlType}${groupId ? `&groupId=${groupId}` : ''}`);
                if (cancelled) return;

                if (res.ok) {
                    const data: CFProblemData = await res.json();
                    if (cancelled) return;

                    setCfData(data);
                    const { problem: mapped, testCases } = transformCfData(data, problemId);
                    setProblem(mapped);
                    setSampleTestCases(testCases);
                } else {
                    const err = await res.json();
                    if (cancelled) return;
                    setError(err.error || 'Failed to fetch problem');
                }
            } catch (err: unknown) {
                if (cancelled) return;
                setError(err instanceof Error ? err.message : 'Network error');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        let cancelled = false;
        if (contestId && problemId) {
            fetchProblem();
        }

        return () => { cancelled = true; };
    }, [contestId, problemId, urlType, groupId, hasInitial]);

    // AUTO-SYNC: Check if user solved this problem on CF and sync to DB
    useEffect(() => {
        if (!cfHandle || !contestId || !problemId) return;
        const syncKey = `${cfHandle}-${contestId}-${problemId}`;
        if (syncAttemptedRef.current === syncKey) return;

        let cancelled = false;

        const syncExternalSolve = async () => {
            try {
                // 1. Fetch user's latest submissions for this problem from CF
                const res = await fetch(`/api/codeforces/user-submissions?handle=${cfHandle}&contestId=${contestId}&problemIndex=${problemId}`);
                if (res.ok && !cancelled) {
                    const data = await res.json();
                    if (data.success && data.submissions?.length > 0) {
                        const solvedSub = data.submissions.find((s: any) => s.verdict === 'Accepted');
                        if (solvedSub) {
                            // 2. We found an external solve! Mark sync as attempted for this problem.
                            syncAttemptedRef.current = syncKey;
                            
                            // 3. Sync to our DB
                            await fetch('/api/codeforces/save-submission', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    cfSubmissionId: solvedSub.id,
                                    contestId: contestId,
                                    problemIndex: problemId,
                                    sheetId: sheetId,
                                    verdict: 'Accepted', // Force Accepted/OK for sync
                                    timeMs: solvedSub.timeConsumedMillis || 0,
                                    memoryKb: Math.round((solvedSub.memoryConsumedBytes || 0) / 1024),
                                    language: solvedSub.language,
                                    cfHandle: cfHandle,
                                    urlType: urlType,
                                    groupId: groupId
                                })
                            });
                            console.log(`[AutoSync] Synced external solve for ${contestId}-${problemId}`);
                        }
                    }
                }
            } catch (err) {
                console.error('[AutoSync] Failed:', err);
            }
        };

        syncExternalSolve();
        return () => { cancelled = true; };
    }, [cfHandle, contestId, problemId, sheetId, urlType, groupId]);

    return {
        problem,
        cfData,
        loading,
        error,
        cfStats,
        sampleTestCases
    };
}
