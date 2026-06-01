import { useState, useEffect, useRef, useCallback } from 'react';
import { CFSubmissionStatus } from '@/components/mirror/types';
import { mapLanguageToExtension, getProblemDescriptionUrl, getSubmitUrl, mapVerdict } from '@/lib/utils/codeforcesUtils';

const FINAL_VERDICTS = new Set([
    'OK', 'WRONG_ANSWER', 'TIME_LIMIT_EXCEEDED', 'MEMORY_LIMIT_EXCEEDED',
    'RUNTIME_ERROR', 'COMPILATION_ERROR', 'CHALLENGED', 'SKIPPED', 'PARTIAL',
    'IDLENESS_LIMIT_EXCEEDED', 'SECURITY_VIOLATED', 'CRASHED',
    'Accepted', 'Wrong Answer', 'Time Limit Exceeded', 'Memory Limit Exceeded',
    'Runtime Error', 'Compilation Error', 'Challenged', 'Skipped', 'Partial',
    'Idleness Limit Exceeded', 'Compilation error', 'Wrong answer', 'Time limit exceeded', 'Memory limit exceeded'
]);

interface UseCodeforcesSubmissionParams {
    code: string;
    language: string;
    contestId: string;
    problemId: string;
    urlType: string;
    groupId?: string;
    codeforcesUrl?: string;
    setIsTestPanelVisible: (visible: boolean) => void;
    setTestPanelActiveTab: (tab: 'testcase' | 'result' | 'codeforces') => void;
    sheetId?: string;
}

interface UseCodeforcesSubmissionReturn {
    cfStatus: CFSubmissionStatus | null;
    handleSubmit: () => Promise<void>;
    submitting: boolean;
}

export function useCodeforcesSubmission({
    code,
    language,
    contestId,
    problemId,
    urlType,
    groupId,
    codeforcesUrl,
    setIsTestPanelVisible,
    setTestPanelActiveTab,
    sheetId
}: UseCodeforcesSubmissionParams): UseCodeforcesSubmissionReturn {
    const [cfStatus, setCfStatus] = useState<CFSubmissionStatus | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const activeSubIdRef = useRef<number | null>(null);
    const isMountedRef = useRef(true);
    const submittingRef = useRef(false); // Ref to prevent double-submit race
    // Refs for values used inside handleSubmit to keep the callback stable
    const codeRef = useRef(code);
    const languageRef = useRef(language);
    codeRef.current = code;
    languageRef.current = language;

    // Track mount status
    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);

    // Reset status when problem changes
    useEffect(() => {
        setCfStatus(null);
        activeSubIdRef.current = null;
    }, [contestId, problemId]);

    const handleSubmit = useCallback(async () => {
        const code = codeRef.current;
        const language = languageRef.current;
        if (!code || submittingRef.current) return;

        submittingRef.current = true;
        setSubmitting(true);
        setIsTestPanelVisible(true);
        setTestPanelActiveTab('codeforces');
        
        // Put the tab into the wait state so the user can verify their submission
        setCfStatus({
            status: 'waiting',
            substatus: 'verify-pending'
        });
        activeSubIdRef.current = null;

        try {
            // 1. Open the Codeforces submit page in a new tab
            const cfUrl = getSubmitUrl(contestId, problemId, urlType, groupId);
            window.open(cfUrl, '_blank');

            // 2. Save submitted code snapshot to DB for tracking
            fetch('/api/user/code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    contestId,
                    problemId,
                    language,
                    code,
                    isSubmitted: true,
                }),
                keepalive: true,
            }).catch(() => {});

        } catch (err) {
            console.error('Manual submit failed:', err);
            setCfStatus({ status: 'error', error: 'Failed to open Codeforces submit page.' });
        } finally {
            submittingRef.current = false;
            setSubmitting(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contestId, problemId, urlType, groupId, codeforcesUrl, setIsTestPanelVisible, setTestPanelActiveTab, sheetId]);

    // Handle explicit verification of Codeforces submission status
    const handleVerify = useCallback(async (cfHandle: string) => {
        const code = codeRef.current;
        const language = languageRef.current;
        if (!cfHandle) return;

        setSubmitting(true);
        setCfStatus({
            status: 'waiting',
            substatus: 'verify-pending',
            progress: 50 // Mock loading progress
        });

        try {
            const verifyRes = await fetch('/api/submissions/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contestId,
                    problemIndex: problemId,
                    cfHandle,
                    sourceCode: code,
                    language: mapLanguageToExtension(language),
                    sheetId: sheetId || null,
                    urlType,
                    groupId: groupId || null
                })
            });

            if (verifyRes.ok) {
                const data = await verifyRes.json();
                if (data.success) {
                    setCfStatus({
                        status: 'done',
                        verdict: 'Accepted',
                        time: data.timeMs || 0,
                        memory: data.memoryKb || 0,
                        submissionId: data.submissionId
                    });
                } else {
                    setCfStatus({
                        status: 'error',
                        substatus: 'verify-pending',
                        error: data.error || 'No Accepted submission found on Codeforces.'
                    });
                }
            } else {
                const errorData = await verifyRes.json().catch(() => ({ error: 'Verification failed' }));
                setCfStatus({
                    status: 'error',
                    substatus: 'verify-pending',
                    error: errorData.error || 'Failed to verify. Please try again.'
                });
            }
        } catch (err: any) {
            console.error('Verification query failed:', err);
            setCfStatus({
                status: 'error',
                substatus: 'verify-pending',
                error: err.message || 'Verification connection failed.'
            });
        } finally {
            setSubmitting(false);
        }
    }, [contestId, problemId, urlType, groupId, sheetId]);

    // Attach handleVerify to global window object so CFStatusTab can call it easily without prop drilling
    useEffect(() => {
        (window as any).__verdict_verify_cf = handleVerify;
        return () => {
            if ((window as any).__verdict_verify_cf === handleVerify) {
                delete (window as any).__verdict_verify_cf;
            }
        };
    }, [handleVerify]);

    return {
        cfStatus,
        handleSubmit,
        submitting
    };
}
