import { useState, useEffect, useCallback, useRef } from 'react';
import { Example } from '@/components/mirror/types';

const DB_SAVE_DEBOUNCE = 2000;

interface UseCustomTestCasesParams {
    contestId: string;
    problemId: string;
    sampleTestCasesCount: number;
}

interface UseCustomTestCasesReturn {
    customTestCases: Example[];
    handleAdd: (testCase: Example) => void;
    handleDelete: (index: number) => void;
    handleUpdate: (index: number, testCase: Example) => void;
}

export function useCustomTestCases({ contestId, problemId, sampleTestCasesCount }: UseCustomTestCasesParams): UseCustomTestCasesReturn {
    const [customTestCases, setCustomTestCases] = useState<Example[]>([]);
    const dbTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isHydratedRef = useRef(false);

    // Save to DB (debounced)
    const saveToDb = useCallback((tests: Example[]) => {
        if (!contestId || !problemId) return;
        fetch('/api/user/custom-tests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ contestId, problemId, testCases: tests }),
            keepalive: true,
        }).catch(() => {});
    }, [contestId, problemId]);

    const scheduleSave = useCallback((tests: Example[]) => {
        if (dbTimerRef.current) clearTimeout(dbTimerRef.current);
        dbTimerRef.current = setTimeout(() => saveToDb(tests), DB_SAVE_DEBOUNCE);
    }, [saveToDb]);

    // Hydrate from DB only
    useEffect(() => {
        if (!contestId || !problemId) return;
        isHydratedRef.current = false;

        // Migrate: clean up old localStorage key
        try {
            const c = Array.isArray(contestId) ? contestId[0] : contestId;
            const p = Array.isArray(problemId) ? problemId[0] : problemId;
            localStorage.removeItem(`verdict-custom-tests-${c}-${p}`);
        } catch { /* ignore */ }

        // Fetch from DB
        fetch(`/api/user/custom-tests?contestId=${contestId}&problemId=${problemId}`, {
            credentials: 'include',
        })
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data?.testCases?.length) {
                    const dbTests = data.testCases.map((tc: Example) => ({ ...tc, isCustom: true }));
                    setCustomTestCases(dbTests);
                }
                isHydratedRef.current = true;
            })
            .catch(() => {
                isHydratedRef.current = true;
            });
    }, [contestId, problemId]);

    // Schedule DB save on changes
    useEffect(() => {
        if (!contestId || !problemId || !isHydratedRef.current) return;
        scheduleSave(customTestCases);
    }, [customTestCases, contestId, problemId, scheduleSave]);

    // Flush to DB on unmount
    useEffect(() => {
        return () => {
            if (dbTimerRef.current) {
                clearTimeout(dbTimerRef.current);
                dbTimerRef.current = null;
            }
        };
    }, []);

    // Flush on beforeunload using sendBeacon
    useEffect(() => {
        const handleUnload = () => {
            if (dbTimerRef.current) {
                clearTimeout(dbTimerRef.current);
            }
            if (contestId && problemId && customTestCases.length > 0) {
                try {
                    const blob = new Blob(
                        [JSON.stringify({ contestId, problemId, testCases: customTestCases })],
                        { type: 'application/json' }
                    );
                    navigator.sendBeacon('/api/user/custom-tests', blob);
                } catch {
                    fetch('/api/user/custom-tests', {
                        method: 'POST',
                        body: JSON.stringify({ contestId, problemId, testCases: customTestCases }),
                        keepalive: true,
                        headers: { 'Content-Type': 'application/json' },
                    }).catch(() => {});
                }
            }
        };
        window.addEventListener('beforeunload', handleUnload);
        return () => window.removeEventListener('beforeunload', handleUnload);
    }, [contestId, problemId, customTestCases]);

    const handleAdd = useCallback((testCase: Example) => {
        setCustomTestCases(prev => [...prev, { ...testCase, isCustom: true }]);
    }, []);

    const handleDelete = useCallback((index: number) => {
        const customIndex = index - sampleTestCasesCount;
        if (customIndex >= 0) {
            setCustomTestCases(prev => prev.filter((_, i) => i !== customIndex));
        }
    }, [sampleTestCasesCount]);

    const handleUpdate = useCallback((index: number, testCase: Example) => {
        const customIndex = index - sampleTestCasesCount;
        if (customIndex >= 0) {
            setCustomTestCases(prev => prev.map((tc, i) =>
                i === customIndex ? { ...testCase, isCustom: true } : tc
            ));
        }
    }, [sampleTestCasesCount]);

    return { customTestCases, handleAdd, handleDelete, handleUpdate };
}
