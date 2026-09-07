import { useState, useEffect, useRef, useCallback } from 'react';
import { CFSubmissionStatus } from '@/components/mirror/types';
import { mapLanguageToExtension, getSubmitUrl, mapVerdict } from '@/lib/utils/codeforcesUtils';

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

    // Handle explicit verification of Codeforces submission status.
    // The optional `cfHandle` arg is now just a fallback for the no-extension
    // path; with the extension we use the handle it resolves from the live CF
    // session (never icpchue's DB).
    const handleVerify = useCallback(async (cfHandle?: string) => {
        const code = codeRef.current;
        const language = languageRef.current;

        setSubmitting(true);
        setCfStatus({
            status: 'waiting',
            substatus: 'verify-pending',
            progress: 50 // Mock loading progress
        });

        const hasExtension = typeof document !== 'undefined' && !!document.getElementById('verdict-extension-installed');

        if (hasExtension) {
            console.log('[Verify] Extension detected. Asking it to read your recent Codeforces submissions...');

            const handleExtensionResponse = async (event: MessageEvent) => {
                if (event.source !== window || event.data?.type !== 'VERDICT_SUBMISSIONS_RESULT') return;

                window.removeEventListener('message', handleExtensionResponse);
                clearTimeout(safetyTimer);

                const {
                    success,
                    accepted,
                    latest,
                    submissions = [],
                    handle: resolvedHandle,
                    error
                } = event.data;

                if (!success) {
                    const messages: Record<string, string> = {
                        NOT_LOGGED_IN: 'You are not logged into Codeforces. Please log in on codeforces.com, then try again.',
                        CLOUDFLARE_CHALLENGE: 'Codeforces is asking the extension to verify it\'s human. Open codeforces.com once in another tab, then try again.',
                        NO_SUBMISSIONS_TABLE: 'Could not read your Codeforces submissions. Make sure you can open the contest on Codeforces.',
                    };
                    setCfStatus({
                        status: 'error',
                        substatus: 'verify-pending',
                        error: messages[error] || error || 'The extension could not read your Codeforces submissions.'
                    });
                    setSubmitting(false);
                    return;
                }

                if (!latest && (!Array.isArray(submissions) || submissions.length === 0)) {
                    setCfStatus({
                        status: 'error',
                        substatus: 'verify-pending',
                        error: `No Codeforces submission was found for problem ${problemId}. Submit an attempt first, then sync.`
                    });
                    setSubmitting(false);
                    return;
                }

                try {
                    // Persist the complete history first. This is what powers
                    // the tries column and mentor view, including a latest WA
                    // even when the problem was solved in an earlier attempt.
                    if (Array.isArray(submissions) && submissions.length > 0) {
                        const backfillRes = await fetch('/api/codeforces/backfill', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({
                                cfHandle: resolvedHandle || cfHandle,
                                batches: [{
                                    sheetId: sheetId || null,
                                    contestId,
                                    problemIndex,
                                    urlType,
                                    groupId: groupId || null,
                                    submissions,
                                    accepted: accepted ? [accepted] : [],
                                }],
                            }),
                        });
                        const backfillData = await backfillRes.json().catch(() => ({}));
                        if (!backfillRes.ok || !backfillData.success || backfillData.matchingSubmissions === 0) {
                            throw new Error('Found your Codeforces history, but failed to save it. Please try again.');
                        }
                    }

                    // An Accepted row still goes through the ownership-checked
                    // verification route so the explicit sync records the
                    // source code and the canonical solved submission. For a
                    // failed latest row, the history save above is sufficient;
                    // show its real verdict instead of claiming no AC exists.
                    if (!accepted) {
                        const latestSubmission = latest || submissions[0];
                        const rawLatestVerdict = String(latestSubmission?.verdict || 'Unknown');
                        const latestVerdict = mapVerdict(rawLatestVerdict);
                        const failedTestMatch = rawLatestVerdict.match(/(?:pre)?test\s+(\d+)/i);
                        setCfStatus({
                            // Keep the sync panel available so the student can
                            // submit a fix and check again, while still showing
                            // the real failed verdict instead of "no AC".
                            status: 'error',
                            verdict: latestVerdict,
                            substatus: 'verify-pending',
                            error: `Latest Codeforces result: ${latestVerdict}. Recorded ${submissions.length} attempt${submissions.length === 1 ? '' : 's'} for this problem; it is not solved yet.`,
                            time: latestSubmission?.timeConsumedMillis || 0,
                            memory: Math.round((latestSubmission?.memoryConsumedBytes || 0) / 1024),
                            submissionId: latestSubmission?.id,
                            failedTestCase: failedTestMatch ? Number(failedTestMatch[1]) : undefined,
                        });
                        setSubmitting(false);
                        return;
                    }

                    const verifyRes = await fetch('/api/submissions/verify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contestId,
                            problemIndex: problemId,
                            cfHandle: resolvedHandle || cfHandle,
                            sourceCode: code,
                            language: mapLanguageToExtension(language),
                            sheetId: sheetId || null,
                            urlType,
                            groupId: groupId || null,
                            // Extension-verified: it read the AC from the user's
                            // own live CF session on their own IP.
                            isExtensionVerified: true,
                            submissionId: accepted.id,
                            timeMs: accepted.timeConsumedMillis || 0,
                            memoryKb: Math.round((accepted.memoryConsumedBytes || 0) / 1024),
                        })
                    });

                    if (verifyRes.ok) {
                        const data = await verifyRes.json();
                        if (data.success) {
                            setCfStatus({
                                status: 'done',
                                verdict: 'Accepted',
                                time: data.timeMs || accepted.timeConsumedMillis || 0,
                                memory: data.memoryKb || Math.round((accepted.memoryConsumedBytes || 0) / 1024),
                                submissionId: data.submissionId || accepted.id
                            });
                        } else {
                            setCfStatus({
                                status: 'error',
                                substatus: 'verify-pending',
                                error: data.error || 'Found your AC but failed to save it. Please try again.'
                            });
                        }
                    } else {
                        setCfStatus({
                            status: 'error',
                            substatus: 'verify-pending',
                            error: 'Failed to record verification on the server.'
                        });
                    }
                } catch (err: any) {
                    setCfStatus({
                        status: 'error',
                        substatus: 'verify-pending',
                        error: err.message || 'Connection error while saving your verified submission.'
                    });
                } finally {
                    setSubmitting(false);
                }
            };

            window.addEventListener('message', handleExtensionResponse);
            window.postMessage({
                type: 'VERDICT_GET_SUBMISSIONS',
                payload: {
                    contestId,
                    problemIndex: problemId,
                    urlType,
                    groupId: groupId || null
                }
            }, '*');

            // Safety timeout: clean up the listener if the extension never replies.
            const safetyTimer = setTimeout(() => {
                window.removeEventListener('message', handleExtensionResponse);
                setCfStatus({
                    status: 'error',
                    substatus: 'verify-pending',
                    error: 'The extension did not respond. Please reload the page and try again.'
                });
                setSubmitting(false);
            }, 20000);

            return;
        }

        // Backend Fallback (no extension installed). Public-API only — cannot see
        // private groups, but works for public contests.
        if (!cfHandle) {
            setCfStatus({
                status: 'error',
                substatus: 'verify-pending',
                error: 'The ICPC HUE Helper extension is required to sync private sheet submissions. Please install it.'
            });
            setSubmitting(false);
            return;
        }
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
