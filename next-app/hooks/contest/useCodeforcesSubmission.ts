import { useState, useEffect, useRef } from 'react';
import { CFSubmissionStatus } from '@/components/mirror/types';
import { mapLanguageToExtension, getSubmitUrl, getProblemDescriptionUrl, mapVerdict } from '@/lib/utils/codeforcesUtils';
import { fetchWithAuth } from '@/lib/api';

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

    const handleSubmit = async () => {
        if (!code || submitting) return;

        setSubmitting(true);
        setIsTestPanelVisible(true);
        setTestPanelActiveTab('codeforces');
        setCfStatus({ status: 'submitting' });
        activeSubIdRef.current = null;

        // Check extension is installed
        if (!document.getElementById('verdict-extension-installed')) {
            window.open(codeforcesUrl || getProblemDescriptionUrl(contestId, problemId, urlType, groupId), '_blank');
            setCfStatus({
                status: 'error',
                error: 'Extension not detected. Opened Codeforces problem page in a new tab.'
            });
            setSubmitting(false);
            return;
        }

        // Check login status
        const loginStatus = await new Promise<{ loggedIn: boolean; handle?: string }>((resolve) => {
            const timeout = setTimeout(() => {
                window.removeEventListener('message', handler);
                resolve({ loggedIn: false });
            }, 3000);

            const handler = (event: MessageEvent) => {
                if (event.data?.type === 'VERDICT_LOGIN_STATUS') {
                    clearTimeout(timeout);
                    window.removeEventListener('message', handler);
                    resolve({
                        loggedIn: event.data.loggedIn,
                        handle: event.data.handle
                    });
                }
            };

            window.addEventListener('message', handler);
            window.postMessage({ type: 'VERDICT_CHECK_LOGIN' }, '*');
        });

        if (!loginStatus.loggedIn) {
            setCfStatus({
                status: 'error',
                error: 'You must log in to Codeforces first. Open codeforces.com and sign in.',
                needsLogin: true,
                captchaUrl: codeforcesUrl || getProblemDescriptionUrl(contestId, problemId, urlType, groupId)
            });
            setSubmitting(false);
            return;
        }

        // ── Request cookies + CSRF from extension ──
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const extResponse = await new Promise<any>((resolve) => {
            const handler = (event: MessageEvent) => {
                if (event.data.type === 'VERDICT_SUBMISSION_RESULT') {
                    window.removeEventListener('message', handler);
                    resolve(event.data);
                }
            };

            setTimeout(() => {
                window.removeEventListener('message', handler);
                resolve({ success: false, error: 'TIMEOUT_NO_RESPONSE' });
            }, 15000);

            window.addEventListener('message', handler);

            window.postMessage({
                type: 'VERDICT_SUBMIT',
                payload: {
                    contestId,
                    problemIndex: problemId,
                    code,
                    language: mapLanguageToExtension(language),
                    urlType,
                    groupId
                }
            }, '*');
        });

        if (!extResponse.success) {
            if (extResponse.error === 'TIMEOUT_NO_RESPONSE') {
                window.open(codeforcesUrl || getProblemDescriptionUrl(contestId, problemId, urlType, groupId), '_blank');
                setCfStatus({
                    status: 'error',
                    error: 'Extension did not respond. Opened Codeforces problem page for manual submission.'
                });
            } else if (extResponse.error === 'NOT_LOGGED_IN') {
                setCfStatus({
                    status: 'error',
                    error: 'Please log in to Codeforces first',
                    needsLogin: true,
                    captchaUrl: 'https://codeforces.com/enter'
                });
            } else {
                setCfStatus({
                    status: 'error',
                    error: extResponse.error || 'Failed to get cookies from extension'
                });
            }
            setSubmitting(false);
            return;
        }

        // ── Server-side submission via our API → Scrapling bridge ──
        const userHandle = extResponse.handle || loginStatus.handle || null;

        try {
            setCfStatus({ status: 'submitting' });

            const apiRes = await fetch('/api/codeforces/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contestId,
                    problemIndex: problemId,
                    code,
                    language: mapLanguageToExtension(language),
                    cookies: extResponse.cookies,
                    csrfToken: extResponse.csrfToken,
                    urlType,
                    groupId: groupId || null,
                }),
            });

            const apiData = await apiRes.json();

            // Handle API errors
            if (!apiData.success) {
                let errorMessage = apiData.error || 'Submission failed';
                let needsLogin = false;

                if (apiData.error === 'DUPLICATE_SUBMISSION') {
                    setCfStatus({
                        status: 'error',
                        error: 'You have submitted exactly the same code before!',
                        isDuplicate: true,
                        submissionId: apiData.submissionId ? Number(apiData.submissionId) : undefined
                    });
                    setSubmitting(false);
                    return;
                }

                if (apiData.error === 'NOT_LOGGED_IN') {
                    errorMessage = 'Session expired. Please log in to Codeforces again.';
                    needsLogin = true;
                } else if (apiData.error === 'RATE_LIMITED') {
                    errorMessage = 'Too many submissions. Please wait a moment.';
                } else if (apiData.error === 'VIRTUAL_REGISTRATION_REQUIRED') {
                    errorMessage = 'This is a past contest. Register for virtual participation on Codeforces first.';
                    window.open(`https://codeforces.com/contestRegistration/${contestId}/virtual/true`, '_blank');
                } else if (apiData.error === 'GYM_ENTRY_REQUIRED') {
                    errorMessage = 'You need to enter this Gym first.';
                    window.open(`https://codeforces.com/gym/${contestId}`, '_blank');
                }

                setCfStatus({
                    status: 'error',
                    error: errorMessage,
                    needsLogin,
                    captchaUrl: needsLogin ? 'https://codeforces.com/enter' : undefined
                });
                setSubmitting(false);
                return;
            }

            // ── Submission success → start polling for verdict ──
            const submissionId = apiData.submissionId ? Number(apiData.submissionId) : undefined;

            setCfStatus({
                status: 'waiting',
                submissionId
            });

            if (submissionId) {
                activeSubIdRef.current = submissionId;
                let attempts = 0;
                const maxAttempts = 120;

                const pollCfApi = async () => {
                    try {
                        const handleParam = userHandle ? `&handle=${encodeURIComponent(userHandle)}` : '';
                        const cookieParam = `&cookies=${encodeURIComponent(extResponse.cookies)}`;
                        const typeParam = `&urlType=${urlType}${groupId ? `&groupId=${groupId}` : ''}`;
                        const res = await fetch(`/api/codeforces/submission?contestId=${contestId}&submissionId=${submissionId}${handleParam}${cookieParam}${typeParam}`);
                        if (res.ok) {
                            return await res.json();
                        }
                        return null;
                    } catch {
                        return null;
                    }
                };

                while (attempts < maxAttempts) {
                    if (!isMountedRef.current || activeSubIdRef.current !== submissionId) {
                        console.log(`Polling for ${submissionId} cancelled.`);
                        return;
                    }

                    await new Promise(r => setTimeout(r, 1000));

                    const status = await pollCfApi();

                    if (status && status.success !== false) {
                        const rawVerdict = status.verdict;
                        const verdictText = mapVerdict(rawVerdict);

                        const isFinal =
                            rawVerdict !== null &&
                            (FINAL_VERDICTS.has(rawVerdict) || FINAL_VERDICTS.has(verdictText));

                        if (isFinal) {
                            const failedTest = verdictText !== 'Accepted' && status.testNumber !== undefined
                                ? status.testNumber + 1
                                : undefined;

                            await fetchWithAuth('/api/codeforces/save-submission', {
                                method: 'POST',
                                body: JSON.stringify({
                                    cfSubmissionId: submissionId,
                                    contestId,
                                    problemIndex: problemId,
                                    sheetId: sheetId || null,
                                    verdict: verdictText,
                                    timeMs: status.time || 0,
                                    memoryKb: status.memory || 0,
                                    language,
                                    sourceCode: code,
                                    cfHandle: userHandle,
                                    urlType,
                                    groupId: groupId || null,
                                    compilationError: status.compilationError || null,
                                    details: status.details || null,
                                    testNumber: status.testNumber || null,
                                })
                            }).catch(err => console.warn('Failed to save CF submission to DB:', err));

                            setCfStatus({
                                status: 'done',
                                verdict: verdictText,
                                time: status.time,
                                memory: status.memory,
                                testNumber: status.testNumber,
                                submissionId,
                                compilationError: status.compilationError,
                                details: status.details,
                                failedTestCase: failedTest
                            });

                            break;
                        }

                        if (rawVerdict === 'TESTING' || verdictText === 'Testing') {
                            setCfStatus({
                                status: 'testing',
                                testNumber: status.testNumber,
                                submissionId
                            });
                        } else if (!rawVerdict || verdictText === 'In queue') {
                            setCfStatus({
                                status: 'waiting',
                                submissionId
                            });
                        }
                    }
                    attempts++;
                }

                if (attempts >= maxAttempts) {
                    console.warn('Polling timeout - verdict may still be pending');
                    setCfStatus(prev => prev ? {
                        ...prev,
                        status: 'error',
                        error: 'Polling timed out. Check Codeforces directly for the result.'
                    } : { status: 'error', error: 'Polling timed out' });
                }
            }

        } catch (err) {
            console.error('Server submission error:', err);
            setCfStatus({
                status: 'error',
                error: 'Failed to submit via server. Please try again.'
            });
        } finally {
            setSubmitting(false);
        }
    };

    return {
        cfStatus,
        handleSubmit,
        submitting
    };
}
