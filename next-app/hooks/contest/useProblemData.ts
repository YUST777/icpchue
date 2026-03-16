import { useState, useEffect } from 'react';
import { Problem, CFProblemData, Example } from '@/components/mirror/types';
import { fetchWithCache } from '@/lib/api-cache';

interface UseProblemDataParams {
    contestId: string;
    problemId: string;
    urlType: string;
    groupId?: string;
    /** Pre-fetched CF data — if provided, skips the mirror fetch entirely */
    initialCfData?: CFProblemData;
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

export function useProblemData({ contestId, problemId, urlType, groupId, initialCfData }: UseProblemDataParams): UseProblemDataReturn {
    // If we have pre-fetched data, initialize state directly (no loading needed)
    const hasInitial = !!initialCfData;
    const initialTransform = initialCfData ? transformCfData(initialCfData, problemId) : null;

    const [cfData, setCfData] = useState<CFProblemData | null>(initialCfData || null);
    const [problem, setProblem] = useState<Problem | null>(initialTransform?.problem || null);
    const [loading, setLoading] = useState(!hasInitial);
    const [error, setError] = useState<string | null>(null);
    const [cfStats, setCfStats] = useState<{ rating?: number; solvedCount: number } | null>(null);
    const [sampleTestCases, setSampleTestCases] = useState<Example[]>(initialTransform?.testCases || []);

    // Fetch Low Cost Global Stats (always runs — it's async and non-blocking)
    useEffect(() => {
        if (!contestId || !problemId) return;

        // Cache stats for 60s
        fetchWithCache<any>(`/api/codeforces/problem-stats?contestId=${contestId}&index=${problemId}`, {}, 60)
            .then(data => { if (data && !data.error) setCfStats(data); })
            .catch(err => console.error('Failed to load CF stats', err));
    }, [contestId, problemId]);

    // Fetch problem from Codeforces Mirror API (SKIP if pre-fetched)
    useEffect(() => {
        if (hasInitial) return; // Data already provided, no fetch needed

        const fetchProblem = async () => {
            try {
                const res = await fetch(`/api/codeforces/mirror?contestId=${contestId}&problemId=${problemId}&type=${urlType}${groupId ? `&groupId=${groupId}` : ''}`);
                if (res.ok) {
                    const data: CFProblemData = await res.json();
                    setCfData(data);
                    const { problem: mapped, testCases } = transformCfData(data, problemId);
                    setProblem(mapped);
                    setSampleTestCases(testCases);
                } else {
                    const err = await res.json();
                    setError(err.error || 'Failed to fetch problem');
                }
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'Network error');
            } finally {
                setLoading(false);
            }
        };

        if (contestId && problemId) {
            fetchProblem();
        }
    }, [contestId, problemId, urlType, groupId, hasInitial]);

    return {
        problem,
        cfData,
        loading,
        error,
        cfStats,
        sampleTestCases
    };
}
