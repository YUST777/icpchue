import { useState, useEffect } from 'react';
import { CFSubmissionStatus } from '@/components/mirror/types';
import { mapLanguageToExtension, getSubmitUrl, getProblemDescriptionUrl, mapVerdict } from '@/lib/utils/codeforcesUtils';
import { fetchWithAuth } from '@/lib/api';

const FINAL_VERDICTS = new Set([
    'OK', 'WRONG_ANSWER', 'TIME_LIMIT_EXCEEDED', 'MEMORY_LIMIT_EXCEEDED',
    'RUNTIME_ERROR', 'COMPILATION_ERROR', 'CHALLENGED', 'SKIPPED', 'PARTIAL',
    'IDLENESS_LIMIT_EXCEEDED', 'SECURITY_VIOLATED', 'CRASHED',
    'Accepted', 'Wrong Answer', 'Time Limit Exceeded', 'Memory Limit Exceeded',
    'Runtime Error', 'Compilation Error', 'Challenged', 'Skipped', 'Partial',
    'Idleness Limit Exceeded',
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

    // Reset status when problem changes
    useEffect(() => {
        setCfStatus(null);
    }, [contestId, problemId]);

    const handleSubmit = async () => {
        if (!code) return;

        setSubmitting(true);
        setIsTestPanelVisible(true);

        setTestPanelActiveTab('codeforces');
        setCfStatus({ status: 'submitting' });

        if (!document.getElementById('verdict-extension-installed')) {
            window.open(codeforcesUrl || getProblemDescriptionUrl(contestId, problemId, urlType, groupId), '_blank');
            setCfStatus({
                status: 'error',
                error: 'Extension not detected. Opened Codeforces problem page in a new tab.'
            });
            setSubmitting(false);
            return;
        }

        // Promise to handle the submission response
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const submitPromise = new Promise<any>((resolve) => {
            const handler = (event: MessageEvent) => {
                if (event.data.type === 'VERDICT_SUBMISSION_RESULT') {
                    window.removeEventListener('message', handler);
                    resolve(event.data);
                }
            };

            // Set a timeout for the submission response
            setTimeout(() => {
                window.removeEventListener('message', handler);
                resolve({ success: false, error: 'TIMEOUT_NO_RESPONSE' });
            }, 60000); // Increased timeout for captcha wait

            window.addEventListener('message', handler);

            // Send submission request
            window.postMessage({
                type: 'VERDICT_SUBMIT',
                payload: {
                    contestId,
                    problemIndex: problemId,
                    code,
                    language: mapLanguageToExtension(language),
                    urlType, // contest, gym, problemset, group
                    groupId
                }
            }, '*');
        });

        // Helper to check status with timeout
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const checkStatus = (subId: string) => new Promise<any>((resolve) => {
            const handler = (event: MessageEvent) => {
                if (event.data.type === 'VERDICT_SUBMISSION_STATUS_RESULT') {
                    clearTimeout(timeoutId);
                    window.removeEventListener('message', handler);
                    resolve(event.data);
                }
            };

            const timeoutId = setTimeout(() => {
                window.removeEventListener('message', handler);
                resolve({ success: false, error: 'STATUS_CHECK_TIMEOUT' });
            }, 10000); // 10 second timeout for status check

            window.addEventListener('message', handler);
            window.postMessage({
                type: 'VERDICT_CHECK_SUBMISSION',
                payload: { contestId, submissionId: subId, urlType, groupId }
            }, '*');
        });

        try {
            const response = await submitPromise;

            // 2. Timeout Fallback
            if (response.error === 'TIMEOUT_NO_RESPONSE') {
                window.open(codeforcesUrl || getProblemDescriptionUrl(contestId, problemId, urlType, groupId), '_blank');
                setCfStatus({
                    status: 'error',
                    error: 'Extension did not respond. Opened Codeforces problem page for manual submission.'
                });
                return;
            }

            // 3. Handle Duplicate Submission
            if (response.error === 'DUPLICATE_SUBMISSION') {
                setCfStatus({
                    status: 'error',
                    error: 'You have submitted exactly the same code before!',
                    isDuplicate: true,
                    submissionId: response.submissionId ? Number(response.submissionId) : undefined
                });
                return;
            }

            // Handle Captcha/Cloudflare Challenge
            if (response.error === 'CLOUDFLARE_CHALLENGE' || response.error === 'CAPTCHA_REQUIRED') {
                setCfStatus({
                    status: 'error',
                    error: 'Captcha verification required. Please complete it manually.',
                    needsCaptcha: true,
                    captchaUrl: codeforcesUrl || getProblemDescriptionUrl(contestId, problemId, urlType, groupId)
                });
                return;
            }

            if (response.success) {
                const submissionId = response.submissionId ? Number(response.submissionId) : undefined;
                let userHandle: string | null = response.handle || null;

                // If no handle from submission response, ask the extension for it
                if (!userHandle) {
                    try {
                        const handleResponse = await new Promise<{ handle: string | null }>((resolve) => {
                            const handler = (event: MessageEvent) => {
                                if (event.data.type === 'VERDICT_HANDLE_RESPONSE') {
                                    window.removeEventListener('message', handler);
                                    clearTimeout(tid);
                                    resolve({ handle: event.data.handle || null });
                                }
                            };
                            const tid = setTimeout(() => {
                                window.removeEventListener('message', handler);
                                resolve({ handle: null });
                            }, 3000);
                            window.addEventListener('message', handler);
                            window.postMessage({ type: 'VERDICT_GET_HANDLE' }, '*');
                        });
                        userHandle = handleResponse.handle;
                    } catch {
                        // ignore — handle stays null
                    }
                }

                // Update CF status to waiting
                setCfStatus({
                    status: 'waiting',
                    submissionId
                });

                // Start Polling if we have an ID
                if (submissionId) {
                    let attempts = 0;
                    const maxAttempts = 120; // ~3 minutes max

                    // Direct API polling function
                    const pollCfApi = async () => {
                        try {
                            // Always use our API route (handles keys and signing securely on server)
                            const handleParam = userHandle ? `&handle=${encodeURIComponent(userHandle)}` : '';
                            const res = await fetch(`/api/codeforces/submission?contestId=${contestId}&submissionId=${submissionId}${handleParam}`);
                            if (res.ok) {
                                return await res.json();
                            }
                            return null;
                        } catch {
                            return null;
                        }
                    };

                    while (attempts < maxAttempts) {
                        // Fast polling - 1 second intervals
                        await new Promise(r => setTimeout(r, 1000));

                        // Try direct API first (faster)
                        let status = await pollCfApi();

                        // Fallback to extension if API failed OR returned no verdict
                        // (user.status doesn't return group contest submissions, so extension
                        // scraping the actual group page is the only way to get the verdict)
                        if (!status || (status.verdict === null && status.waiting)) {
                            const extStatus = await checkStatus(String(submissionId));
                            // Only use extension result if it actually has something useful
                            if (extStatus && extStatus.success !== false && extStatus.verdict) {
                                status = extStatus;
                            }
                        } else if (status && (status.verdict === 'COMPILATION_ERROR' || mapVerdict(status.verdict) === 'Compilation Error') && !status.compilationError) {
                            // The fast Codeforces API returns "COMPILATION_ERROR" but omits the actual error text.
                            // If we hit this, explicitly fetch from the extension so it scrapes the error details.
                            const extStatus = await checkStatus(String(submissionId));
                            if (extStatus && extStatus.success !== false && extStatus.compilationError) {
                                status.compilationError = extStatus.compilationError;
                            }
                        }

                        if (status && status.success !== false) {
                            const rawVerdict = status.verdict;
                            const verdictText = mapVerdict(rawVerdict);

                            const isFinal =
                                rawVerdict !== null &&
                                (FINAL_VERDICTS.has(rawVerdict) || FINAL_VERDICTS.has(verdictText));

                            if (isFinal) {
                                // Calculate failed test case (1-indexed for display)
                                const failedTest = verdictText !== 'Accepted' && status.testNumber !== undefined
                                    ? status.testNumber + 1
                                    : undefined;

                                setCfStatus({
                                    status: 'done',
                                    verdict: verdictText,
                                    time: status.time,
                                    memory: status.memory,
                                    testNumber: status.testNumber,
                                    submissionId,
                                    compilationError: status.compilationError,
                                    failedTestCase: failedTest
                                });

                                // Save CF submission + verdict to database (fire-and-forget, but we await it to ensure DB is updated before lists refresh)
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
                                    })
                                }).catch(err => console.warn('Failed to save CF submission to DB:', err));

                                break;
                            }

                            // Non-final states
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
            } else {
                // Handle specific error types
                let errorMessage = response.error || 'Submission failed';
                let needsCaptcha = false;

                if (response.error === 'NOT_LOGGED_IN') {
                    errorMessage = 'Please log in to Codeforces first';
                    needsCaptcha = true; // User needs to visit CF
                } else if (response.error === 'RATE_LIMITED') {
                    errorMessage = 'Too many submissions. Please wait a moment.';
                } else if (response.error === 'VIRTUAL_REGISTRATION_REQUIRED') {
                    errorMessage = 'This is a past contest. Register for virtual participation on Codeforces first.';
                    window.open(`https://codeforces.com/contestRegistration/${contestId}/virtual/true`, '_blank');
                } else if (response.error === 'GYM_ENTRY_REQUIRED') {
                    errorMessage = 'You need to enter this Gym first.';
                    window.open(`https://codeforces.com/gym/${contestId}`, '_blank');
                }

                setCfStatus({
                    status: 'error',
                    error: errorMessage,
                    needsCaptcha,
                    captchaUrl: needsCaptcha ? getSubmitUrl(contestId, problemId, urlType, groupId) : undefined
                });
            }
        } catch (err) {
            console.error('Submission error:', err);
            setCfStatus({
                status: 'error',
                error: 'Failed to communicate with extension. Please refresh the page.'
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

