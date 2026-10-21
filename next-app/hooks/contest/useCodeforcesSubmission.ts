import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { CFSubmissionStatus } from '@/components/mirror/types';
import { mapLanguageToExtension, getSubmitUrl, mapVerdict, extensionErrorMessage } from '@/lib/utils/codeforcesUtils';

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
            // 1. Hand the code to the extension so it pastes it on the
            //    Codeforces submit page (extension v1.4.0+). Also copy it to
            //    the clipboard as a fallback for older extension versions.
            window.postMessage({
                type: 'VERDICT_PREPARE_SUBMIT',
                payload: {
                    contestId: String(contestId),
                    problemIndex: String(problemId),
                    groupId: urlType === 'group' ? groupId || null : null,
                    code,
                    language,
                },
            }, window.location.origin);
            navigator.clipboard?.writeText(code).catch(() => {});

            // 2. Open the Codeforces submit page in a new tab
            const cfUrl = getSubmitUrl(contestId, problemId, urlType, groupId);
            window.open(cfUrl, '_blank');

            // Without the extension (e.g. on a phone, where Chrome has no
            // extensions) nothing pastes or syncs automatically: say so.
            if (!document.getElementById('verdict-extension-installed')) {
                setCfStatus({
                    status: 'done',
                    verdict: 'Submitted',
                    substatus: 'Your code is copied. Paste it in the Codeforces page that just opened and press Submit there. Your verdict syncs to ICPC HUE the next time you open it on a computer with Verdict Helper.',
                });
            }

            // 3. Save submitted code snapshot to DB for tracking
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
                        error: messages[error] || extensionErrorMessage(error) || error || 'The extension could not read your Codeforces submissions.'
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
                    const latestSubmission = latest || submissions[0];
                    const rawLatestVerdict = String(latestSubmission?.verdict || 'Unknown');
                    const latestVerdict = mapVerdict(rawLatestVerdict);
                    const failedTestMatch = rawLatestVerdict.match(/(?:pre)?test\s+(\d+)/i);

                    // Persist the complete history first. This is what powers
                    // the tries column and mentor view. Every row carries its
                    // own verdict, language, measurements, timestamp and exact
                    // source when Codeforces makes it available.
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
                                    problemIndex: problemId,
                                    urlType,
                                    groupId: groupId || null,
                                    submissions,
                                    accepted: accepted ? [accepted] : [],
                                }],
                            }),
                        });
                        const backfillData = await backfillRes.json().catch(() => ({}));
                        // matchingSubmissions === 0 only means this problem is not
                        // in the tracked curriculum; verification can still run.
                        if (!backfillRes.ok || !backfillData.success) {
                            throw new Error('Found your Codeforces history, but failed to save it. Please try again.');
                        }
                    }

                    // An Accepted row still goes through the ownership-checked
                    // verification route so the explicit sync records the
                    // source code and the canonical solved submission. For a
                    // failed latest row, the history save above is sufficient;
                    // show its real verdict instead of claiming no AC exists.
                    if (!accepted) {
                        setCfStatus({
                            // The real verdict of the latest submission; the
                            // status panel offers "Check again" for a fix.
                            status: 'done',
                            verdict: latestVerdict,
                            substatus: `Recorded ${submissions.length} attempt${submissions.length === 1 ? '' : 's'} for this problem; it is not solved yet.`,
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
                            sourceCode: accepted.sourceCode || null,
                            // Why the extension could not read the code (logged by the server).
                            sourceError: accepted.sourceCode ? null : (accepted.sourceError || 'NOT_SENT_BY_EXTENSION'),
                            language: accepted.language || mapLanguageToExtension(language),
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
                            const latestIsAccepted = latestSubmission?.id === accepted.id ||
                                latestVerdict === 'Accepted';
                            if (latestIsAccepted) {
                                setCfStatus({
                                    status: 'done',
                                    verdict: latestVerdict,
                                    time: latestSubmission?.timeConsumedMillis || data.timeMs || 0,
                                    memory: Math.round((latestSubmission?.memoryConsumedBytes || 0) / 1024),
                                    submissionId: latestSubmission?.id || accepted.id,
                                    substatus: `Recorded ${submissions.length} attempt${submissions.length === 1 ? '' : 's'} for this problem.`,
                                });
                            } else {
                                setCfStatus({
                                    status: 'done',
                                    verdict: latestVerdict,
                                    solvedEarlier: true,
                                    substatus: `Recorded ${submissions.length} attempt${submissions.length === 1 ? '' : 's'} for this problem.`,
                                    time: latestSubmission?.timeConsumedMillis || 0,
                                    memory: Math.round((latestSubmission?.memoryConsumedBytes || 0) / 1024),
                                    submissionId: latestSubmission?.id,
                                    failedTestCase: failedTestMatch ? Number(failedTestMatch[1]) : undefined,
                                });
                            }
                        } else {
                            setCfStatus({
                                status: 'error',
                                substatus: 'verify-pending',
                                error: data.error || 'Found your AC but failed to save it. Please try again.'
                            });
                        }
                    } else {
                        // Show the server's reason (e.g. the account has no linked
                        // Codeforces handle) instead of a generic failure.
                        const data = await verifyRes.json().catch(() => ({}));
                        const needsCfLink = data.code === 'CF_HANDLE_NOT_LINKED' || data.error === 'CF handle mismatch';
                        setCfStatus({
                            status: 'error',
                            substatus: 'verify-pending',
                            needsCfLink,
                            error: data.error === 'CF handle mismatch'
                                ? `Your icpchue.com account is linked to a different Codeforces account than the one you are logged into (${resolvedHandle || cfHandle}). Log in to Codeforces with your linked account, or re-link it below.`
                                : data.error || 'Failed to record verification on the server. Please try again.'
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
                // Opening a Codeforces tab when Cloudflare blocks the extension's
                // background read plus reading two sources can take ~30s.
            }, 75000);

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

    // Live verdict from the extension (v1.5+): while Codeforces judges the
    // submission, show "In queue" / "Testing on test N"; once it is final,
    // save it automatically so the student never has to press Sync.
    const handleVerifyRef = useRef(handleVerify);
    handleVerifyRef.current = handleVerify;
    const liveSavedRef = useRef<number | null>(null);
    useEffect(() => {
        const onLive = (event: MessageEvent) => {
            const d = event.data;
            if (event.source !== window || d?.type !== 'VERDICT_LIVE_STATUS') return;
            if (String(d.contestId) !== String(contestId) ||
                String(d.problemIndex).toUpperCase() !== String(problemId).toUpperCase()) return;
            setIsTestPanelVisible(true);
            setTestPanelActiveTab('codeforces');
            if (d.pending) {
                setCfStatus({
                    status: d.testNumber ? 'testing' : 'waiting',
                    substatus: d.testNumber ? undefined : (d.verdict || 'In queue...'),
                    testNumber: d.testNumber || undefined,
                    submissionId: d.submissionId,
                });
                return;
            }
            if (liveSavedRef.current === d.submissionId) return;
            liveSavedRef.current = d.submissionId;
            setCfStatus({ status: 'waiting', substatus: `${mapVerdict(String(d.verdict))}: saving your result...` });
            handleVerifyRef.current();
        };
        window.addEventListener('message', onLive);
        return () => window.removeEventListener('message', onLive);
    }, [contestId, problemId, setIsTestPanelVisible, setTestPanelActiveTab]);

    // Links in the status panel must point at the right kind of contest.
    const contestBaseUrl = urlType === 'group' && groupId
        ? `https://codeforces.com/group/${groupId}/contest/${contestId}`
        : urlType === 'gym'
            ? `https://codeforces.com/gym/${contestId}`
            : `https://codeforces.com/contest/${contestId}`;
    const cfStatusWithLinks = useMemo(
        () => (cfStatus ? { ...cfStatus, contestBaseUrl } : null),
        [cfStatus, contestBaseUrl]
    );

    return {
        cfStatus: cfStatusWithLinks,
        handleSubmit,
        submitting
    };
}
