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
        setCfStatus({ status: 'submitting', substatus: 'Opening Codeforces...', progress: 30 });
        activeSubIdRef.current = null;

        try {
            // 1. Open the Codeforces submit page in a new tab
            const cfUrl = getSubmitUrl(contestId, problemId, urlType, groupId);
            window.open(cfUrl, '_blank');

            setCfStatus({ status: 'submitting', substatus: 'Saving progress locally...', progress: 70 });

            // 2. Fetch the user's CF handle if available
            let userHandle = '';
            try {
                const meRes = await fetch('/api/auth/me');
                if (meRes.ok) {
                    const meData = await meRes.json();
                    userHandle = meData.user?.codeforces_handle || '';
                }
            } catch (e) {
                console.error('Error fetching handle:', e);
            }

            // Save submitted code snapshot to DB for tracking
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

            // 3. Save the submission locally as "Accepted" (SOLVED) so the roadmap/sheets update!
            const cfSubmissionId = -Date.now(); // Negative unique ID for manual bypasses
            
            const saveRes = await fetch('/api/codeforces/save-submission', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cfSubmissionId,
                    contestId,
                    problemIndex: problemId,
                    sheetId: sheetId || null,
                    verdict: 'Accepted',
                    timeMs: 0,
                    memoryKb: 0,
                    language: mapLanguageToExtension(language),
                    sourceCode: code,
                    cfHandle: userHandle || null,
                    urlType,
                    groupId: groupId || null,
                })
            });

            if (saveRes.ok) {
                setCfStatus({
                    status: 'done',
                    verdict: 'Accepted',
                    time: 0,
                    memory: 0,
                    submissionId: cfSubmissionId
                });
            } else {
                const errorData = await saveRes.json().catch(() => ({ error: 'Database save failed' }));
                setCfStatus({
                    status: 'error',
                    error: errorData.error || 'Failed to save submission progress locally.'
                });
            }

        } catch (err) {
            console.error('Manual submit failed:', err);
            setCfStatus({ status: 'error', error: 'Failed to complete submission.' });
        } finally {
            submittingRef.current = false;
            setSubmitting(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contestId, problemId, urlType, groupId, codeforcesUrl, setIsTestPanelVisible, setTestPanelActiveTab, sheetId]);

    return {
        cfStatus,
        handleSubmit,
        submitting
    };
}
