import { useState, useEffect } from 'react';
import {
    CheckCircle2,
    XCircle,
    Loader2,
    ExternalLink,
    AlertTriangle
} from 'lucide-react';
import { CFSubmissionStatus } from '../types';
import { getVerdictIcon, getCFStatusColor, getCFStatusBg } from './verdictUtils';
import { getSubmitUrl } from '@/lib/utils/codeforcesUtils';

interface CFStatusTabProps {
    cfStatus: CFSubmissionStatus | null;
    contestId?: string;
    problemId?: string;
    urlType?: string;
    groupId?: string;
}

export default function CFStatusTab({ cfStatus, contestId, problemId, urlType, groupId }: CFStatusTabProps) {
    const [isExtensionInstalled, setIsExtensionInstalled] = useState(true);
    const [sessionHandle, setSessionHandle] = useState('');
    const [sessionState, setSessionState] = useState<'checking' | 'ready' | 'signed-out' | 'unavailable'>('checking');

    useEffect(() => {
        // Fallback check in case the content script loads slightly late
        const checkExtension = () => {
            const hasExtension = !!document.getElementById('verdict-extension-installed');
            setIsExtensionInstalled(hasExtension);
        };

        checkExtension();
        // Give the extension script a tiny bit of time to inject if this mounted too fast
        const timer = setTimeout(checkExtension, 500);
        return () => clearTimeout(timer);
    }, []);

    // The live browser session is authoritative; a saved handle cannot log in
    // to Codeforces. Check again when returning from its login/register page.
    useEffect(() => {
        if (!isExtensionInstalled) return;
        if (!document.getElementById('verdict-extension-installed')) return;

        let pending = false;
        let timeout: ReturnType<typeof setTimeout> | undefined;
        const updateSession = (handle: unknown) => {
            pending = false;
            clearTimeout(timeout);
            const resolved = typeof handle === 'string' ? handle.trim() : '';
            setSessionHandle(resolved);
            setSessionState(resolved ? 'ready' : 'signed-out');
            try {
                if (resolved) localStorage.setItem('verdict-cf-handle', resolved);
                else localStorage.removeItem('verdict-cf-handle');
            } catch {}
        };
        const handler = (event: MessageEvent) => {
            if (event.source !== window) return;
            if (event.data?.type === 'VERDICT_HANDLE_RESPONSE') {
                updateSession(event.data.handle);
            } else if (event.data?.type === 'VERDICT_SUBMISSIONS_RESULT') {
                if (event.data.error === 'NOT_LOGGED_IN') updateSession(null);
                else if (event.data.success && event.data.handle) updateSession(event.data.handle);
            }
        };
        const checkSession = () => {
            if (pending || document.visibilityState === 'hidden') return;
            pending = true;
            setSessionState('checking');
            timeout = setTimeout(() => {
                pending = false;
                setSessionHandle('');
                setSessionState('unavailable');
            }, 10000);
            window.postMessage({ type: 'VERDICT_GET_HANDLE' }, window.location.origin);
        };
        window.addEventListener('message', handler);
        window.addEventListener('focus', checkSession);
        document.addEventListener('visibilitychange', checkSession);
        checkSession();
        return () => {
            window.removeEventListener('message', handler);
            window.removeEventListener('focus', checkSession);
            document.removeEventListener('visibilitychange', checkSession);
            clearTimeout(timeout);
        };
    }, [isExtensionInstalled]);

    const isVerifyPending = cfStatus?.substatus === 'verify-pending';
    // Show the one-click sync panel both when idle (extension present) and when
    // a submit flow put us into "verify-pending". This makes the CF tab itself a
    // button: open the problem, solve on CF, come back and sync — no Submit needed.
    const showSyncPanel = isExtensionInstalled && (!cfStatus || cfStatus.status === 'idle' || isVerifyPending);

    // ── Phone: browsers there cannot install extensions ──
    const isPhone = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    if ((!cfStatus || cfStatus.status === 'idle') && !isExtensionInstalled && isPhone) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-[#888] gap-3 p-4 text-center">
                <div className="w-14 h-14 rounded-full bg-[#E8C15A]/10 text-[#E8C15A] flex items-center justify-center border border-[#E8C15A]/20">
                    <span className="text-[11px] font-black tracking-tight">CF</span>
                </div>
                <p className="text-base font-bold text-white">Submitting from your phone</p>
                <p className="text-sm leading-relaxed max-w-xs">
                    Press <span className="text-white font-semibold">Submit</span>: your code is copied and Codeforces opens. Paste it there and submit.
                    Your verdict and code sync to ICPC HUE the next time you open it on a computer with Verdict Helper.
                </p>
                {contestId && problemId && (
                    <a
                        href={getSubmitUrl(contestId, problemId, urlType || 'contest', groupId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 flex items-center gap-1.5 px-3 py-1.5 bg-[#E8C15A]/10 hover:bg-[#E8C15A]/20 text-[#E8C15A] rounded-lg border border-[#E8C15A]/30 text-xs font-medium transition-colors"
                    >
                        Open Codeforces Directly <ExternalLink size={12} />
                    </a>
                )}
            </div>
        );
    }

    // ── Extension missing: prompt to install ──
    if ((!cfStatus || cfStatus.status === 'idle') && !isExtensionInstalled) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-[#666] gap-4 p-4 text-center">
                <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center border border-red-500/20">
                    <AlertTriangle size={28} />
                </div>
                <div>
                    <p className="text-base font-bold text-white mb-1">Extension Required</p>
                    <p className="text-sm text-[#888] mb-4">
                        You need the ICPC HUE Helper extension to sync your Codeforces submissions to this page.
                    </p>
                </div>
                <a
                    href="https://chromewebstore.google.com/detail/verdict-helper/jeiffogppnpnefphgpglagmgbcnifnhj"
                    target="_blank"
                    className="flex items-center gap-2 px-4 py-2 bg-[#E8C15A] hover:bg-[#F0D06A] text-black font-semibold rounded-lg transition-colors text-sm"
                >
                    Download Extension
                    <ExternalLink size={14} />
                </a>
            </div>
        );
    }

    if (showSyncPanel) {
        const verifying = cfStatus?.progress === 50;
        const hasError = cfStatus?.status === 'error';
        const knownHandle = sessionHandle.trim();
        const needsLogin = (sessionState === 'signed-out' && !hasError) || (cfStatus?.needsLogin && sessionState !== 'ready');
        const checkingSession = sessionState === 'checking';

        const runVerify = async () => {
            const verifyFn = (window as any).__verdict_verify_cf;
            if (verifyFn) {
                await verifyFn();
            }
        };

        return (
            <div className="h-full flex flex-col space-y-4 p-4 bg-[#252526]/30 rounded-xl border border-white/5 animate-fade-in text-left">
                <div className="flex items-center gap-3 text-[#E8C15A]">
                    <div className="p-2 rounded-full bg-[#E8C15A]/10 border border-[#E8C15A]/20">
                        <span className="text-[10px] font-black tracking-tight">CF</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-sm text-white">Sync your Codeforces submissions</h3>
                        <p className="text-[10px] text-[#888]">Record every attempt and mark the problem solved when an AC is found</p>
                    </div>
                </div>

                {needsLogin ? (
                    <div role="alert" className="space-y-3 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-sm leading-relaxed text-amber-100">
                        <div className="flex items-start gap-2">
                            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-400" />
                            <div className="min-w-0 space-y-1">
                                <p className="font-semibold text-white">Log in to Codeforces to sync</p>
                                <p className="text-xs text-amber-100/80">No signed-in Codeforces account was detected in this browser. Log in, or create an account first. Your handle will be detected automatically.</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <a href="https://codeforces.com/enter" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#E8C15A] px-3 py-2 text-xs font-semibold text-black hover:bg-[#F0D06A]">
                                Log in to Codeforces <ExternalLink size={12} className="shrink-0" />
                            </a>
                            <a href="https://codeforces.com/register" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white hover:bg-white/5">
                                Create Codeforces account <ExternalLink size={12} className="shrink-0" />
                            </a>
                        </div>
                    </div>
                ) : (
                <div className="text-[11px] text-[#b8b8b8] bg-white/5 p-3 rounded-lg leading-relaxed space-y-2">
                    <p><strong>1. Submit on Codeforces:</strong> Send your solution and wait for a final verdict.</p>
                    <p><strong>2. Sync here:</strong> Click below — the extension imports your full attempt history, shows the latest verdict, and marks the problem solved only when an AC is found.</p>
                </div>
                )}

                {hasError && cfStatus?.error && !cfStatus.needsLogin && !needsLogin && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 flex items-start gap-2 leading-relaxed">
                        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                        <span>{cfStatus.error}</span>
                    </div>
                )}

                {hasError && cfStatus?.needsCfLink && (
                    <a
                        href="/api/auth/codeforces/login"
                        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-white/10 border border-white/15 text-xs font-bold text-white hover:bg-white/15 transition-colors"
                    >
                        Link Codeforces account
                    </a>
                )}

                <button
                    onClick={runVerify}
                    disabled={verifying || checkingSession}
                    className="min-h-11 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#E8C15A] hover:bg-[#F0D06A] disabled:bg-[#E8C15A]/20 disabled:text-[#666] text-black font-semibold rounded-lg transition-colors text-sm cursor-pointer"
                >
                    {verifying || checkingSession ? (
                        <>
                            <Loader2 size={14} className="animate-spin" /> {verifying ? 'Checking your submissions...' : 'Checking Codeforces login...'}
                        </>
                    ) : (
                        <>
                            <CheckCircle2 size={14} /> {needsLogin ? "I’m logged in — check again" : 'Check & Sync attempts'}
                        </>
                    )}
                </button>

                <div role="status" className="text-center text-xs text-[#888]">
                    {checkingSession ? 'Checking your Codeforces login…' : knownHandle && !needsLogin ? (
                        <span>
                            Detected account: <span className="break-all text-[#E8C15A] font-mono">{knownHandle}</span>. To use another account, switch accounts on Codeforces.
                        </span>
                    ) : (
                        <span>{needsLogin ? 'Return here after logging in, then check again. No handle needs to be entered.' : 'Could not check your Codeforces login. Open Codeforces, then try syncing again.'}</span>
                    )}
                </div>

                {contestId && problemId && (
                    <div className="pt-2 flex items-center justify-between border-t border-white/5">
                        <a
                            href={getSubmitUrl(contestId, problemId, urlType || 'contest', groupId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-[#E8C15A] hover:underline transition-colors flex items-center gap-1"
                        >
                            Open Codeforces Submit Page Again <ExternalLink size={10} />
                        </a>
                    </div>
                )}
            </div>
        );
    }

    // After the early returns above, cfStatus is guaranteed non-null (idle/null
    // states are handled by the sync panel). This guard narrows the type for TS.
    if (!cfStatus) return null;

    const contestBase = cfStatus.contestBaseUrl || (
        (urlType === 'group' || !!groupId) && groupId
            ? `https://codeforces.com/group/${groupId}/contest/${contestId}`
            : `https://codeforces.com/contest/${contestId}`
    );
    const statusColor = getCFStatusColor(cfStatus);
    const statusBg = getCFStatusBg(cfStatus);

    return (
        <div className="h-full flex flex-col space-y-2 animate-fade-in">
            {/* Login/Captcha Required Warning */}
            {(cfStatus.needsCaptcha || cfStatus.needsLogin) && (
                <div className="flex flex-col gap-3 p-4 rounded-xl border bg-orange-500/10 border-orange-500/20 text-orange-400">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-orange-500/20">
                            {cfStatus.needsLogin ? <AlertTriangle size={18} /> : <XCircle size={18} />}
                        </div>
                        <div className="flex-1">
                            <div className="font-bold text-lg">
                                {cfStatus.needsLogin ? 'Login Required' : 'Captcha Required'}
                            </div>
                            <div className="text-xs opacity-70 mt-0.5">
                                {cfStatus.needsLogin 
                                    ? 'You must be logged into Codeforces to submit directly' 
                                    : 'Codeforces requires you to verify you\'re human'}
                            </div>
                        </div>
                    </div>
                    <div className="bg-orange-500/10 rounded-lg p-3 text-xs text-orange-300">
                        <p className="mb-2">Please follow these steps:</p>
                        <ol className="list-decimal list-inside space-y-1 text-orange-200">
                            <li>Click the button below to open Codeforces</li>
                            <li>{cfStatus.needsLogin ? 'Log in to your account' : 'Complete the captcha verification'}</li>
                            <li>Come back and click Submit again</li>
                        </ol>
                    </div>
                    {cfStatus.captchaUrl && (
                        <a
                            href={cfStatus.captchaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 py-2.5 px-4 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors text-sm"
                        >
                            <img
                                src="/icons/codeforces-favicon.png"
                                alt="CF"
                                className="w-4 h-4"
                            />
                            {cfStatus.needsLogin ? 'Open Codeforces to Login' : 'Open Codeforces & Solve Captcha'}
                            <ExternalLink size={14} />
                        </a>
                    )}
                </div>
            )}

            {/* Duplicate Submission Warning */}
            {cfStatus.isDuplicate && (
                <div className="flex items-center gap-3 p-4 rounded-xl border bg-yellow-500/10 border-yellow-500/20 text-yellow-400">
                    <div className="p-2 rounded-full bg-yellow-500/20">
                        <XCircle size={18} />
                    </div>
                    <div className="flex-1">
                        <div className="font-bold text-lg">Duplicate Submission</div>
                        <div className="text-xs opacity-70 mt-0.5">
                            You have submitted exactly the same code before!
                        </div>
                    </div>
                </div>
            )}

            {/* Status Card */}
            {!cfStatus.isDuplicate && (
                <div className={`flex items-center gap-3 p-4 rounded-xl border ${statusBg} ${statusColor}`}>
                    <div className={`p-2 rounded-full ${statusBg}`}>
                        {cfStatus.status === 'submitting' || cfStatus.status === 'waiting' || cfStatus.status === 'testing' ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : cfStatus.verdict ? (
                            getVerdictIcon(cfStatus.verdict)
                        ) : cfStatus.status === 'error' ? (
                            <XCircle size={18} />
                        ) : (
                            <span className="h-2.5 w-2.5 rounded-full bg-current opacity-70" aria-hidden="true" />
                        )}
                    </div>
                    <div className="flex-1">
                        <div className="font-bold text-lg">
                            {cfStatus.status === 'submitting' && (cfStatus.substatus || 'Submitting to Codeforces...')}
                            {cfStatus.status === 'waiting' && (cfStatus.substatus || 'In Queue...')}
                            {cfStatus.status === 'testing' && `Testing on test ${!!cfStatus.testNumber ? cfStatus.testNumber : '?'}...`}
                            {cfStatus.status === 'done' && (cfStatus.verdict || 'Done')}
                            {cfStatus.status === 'error' && (cfStatus.error || 'Submission Failed')}
                        </div>
                        <div className="text-xs opacity-70 mt-0.5 font-mono">
                            {cfStatus.status === 'done' && cfStatus.verdict === 'Submitted' && cfStatus.substatus && (
                                <span className="font-sans">{cfStatus.substatus}</span>
                            )}
                            {cfStatus.status === 'done' && cfStatus.verdict !== 'Submitted' && cfStatus.time !== undefined && cfStatus.memory !== undefined && (
                                <>{cfStatus.time} ms • {cfStatus.memory} KB</>
                            )}
                            {cfStatus.status === 'testing' && cfStatus.testNumber && (
                                <>Running test {cfStatus.testNumber}...</>
                            )}
                        </div>
                        {cfStatus.status === 'done' && cfStatus.substatus && cfStatus.verdict !== 'Submitted' && (
                            <div className="text-xs opacity-70 mt-1">
                                {cfStatus.substatus}
                            </div>
                        )}
                        {cfStatus.status === 'submitting' && cfStatus.progress !== undefined && (
                            <div className="mt-2 w-full bg-[#333] rounded-full h-1.5 overflow-hidden">
                                <div
                                    className="h-full bg-[#E8C15A] rounded-full transition-all duration-1000 ease-out"
                                    style={{ width: `${cfStatus.progress}%` }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Direct Open Submit Button when submitted from mobile/no extension */}
            {cfStatus.status === 'done' && cfStatus.verdict === 'Submitted' && contestId && problemId && (
                <div className="pt-1">
                    <a
                        href={getSubmitUrl(contestId, problemId, urlType || 'contest', groupId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#E8C15A] hover:bg-[#F0D06A] text-black font-semibold rounded-lg transition-colors text-sm shadow-md"
                    >
                        Open Codeforces Submit Page
                        <ExternalLink size={14} />
                    </a>
                </div>
            )}

            {/* Failed Test Case Info — hide for Compilation Error */}
            {cfStatus.status === 'done' && !!cfStatus.failedTestCase && cfStatus.verdict !== 'Accepted' && cfStatus.verdict !== 'Compilation Error' && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <div className="flex items-center gap-2 text-red-400 mb-2">
                        <XCircle size={16} />
                        <span className="font-semibold text-sm">Failed on Test {cfStatus.failedTestCase}</span>
                    </div>
                    <div className="text-xs text-[#888]">
                        {!!cfStatus.testNumber && cfStatus.testNumber > 0 && (
                            <span>Passed {cfStatus.testNumber} test{cfStatus.testNumber !== 1 ? 's' : ''} before failing</span>
                        )}
                    </div>
                </div>
            )}

            {/* The newest submission failed, but the problem was solved before */}
            {cfStatus.status === 'done' && cfStatus.solvedEarlier && (
                <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm">
                    <CheckCircle2 size={16} />
                    <span><span className="font-semibold">Solved.</span> Your earlier Accepted submission still counts; this is your newest attempt.</span>
                </div>
            )}

            {/* Accepted - All Tests Passed */}
            {cfStatus.status === 'done' && cfStatus.verdict === 'Accepted' && !!cfStatus.testNumber && (
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                    <div className="flex items-center gap-2 text-green-400">
                        <CheckCircle2 size={16} />
                        <span className="font-semibold text-sm">All {cfStatus.testNumber} tests passed!</span>
                    </div>
                </div>
            )}

            {/* Judgement Protocol — Compilation Error */}
            {cfStatus.compilationError && (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl overflow-hidden">
                    <div className="px-3 py-2 text-orange-400 text-sm font-semibold border-b border-orange-500/20">
                        Judgement protocol
                    </div>
                    <pre className="p-3 text-xs text-orange-300 max-h-60 overflow-auto whitespace-pre-wrap font-mono leading-relaxed">
                        {cfStatus.compilationError}
                    </pre>
                </div>
            )}

            {/* Judgement Protocol — Test Details (WA, TLE, RE, etc.) */}
            {cfStatus.details && (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl overflow-hidden">
                    <div className="px-3 py-2 text-orange-400 text-sm font-semibold border-b border-orange-500/20">
                        Judgement protocol
                    </div>
                    <pre className="p-3 text-xs text-orange-300 max-h-60 overflow-auto whitespace-pre-wrap font-mono leading-relaxed">
                        {cfStatus.details}
                    </pre>
                </div>
            )}

            {/* Submission ID & Link */}
            {cfStatus.submissionId && (
                <div className="flex items-center justify-between p-3 bg-[#252526] rounded-lg border border-white/5">
                    <div className="text-xs text-[#888]">
                        Submission ID: <span className="text-white font-mono">#{cfStatus.submissionId}</span>
                    </div>
                    <a
                        href={`${contestBase}/submission/${cfStatus.submissionId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-[#E8C15A] hover:text-[#E8C15A] transition-colors"
                    >
                        View on Codeforces
                        <ExternalLink size={12} />
                    </a>
                </div>
            )}

            {/* Re-check after submitting a fix directly on Codeforces */}
            {cfStatus.status === 'done' && isExtensionInstalled && (
                <button
                    type="button"
                    onClick={() => (window as any).__verdict_verify_cf?.()}
                    className="w-full flex items-center justify-center gap-2 p-2 bg-[#E8C15A]/10 hover:bg-[#E8C15A]/20 rounded-lg border border-[#E8C15A]/30 text-xs font-semibold text-[#E8C15A] transition-colors"
                >
                    Check again
                </button>
            )}

            {/* Quick Links */}
            {contestId && problemId && (
                <div className="flex gap-2">
                    <a
                        href={`${contestBase}/my`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 p-2 bg-[#252526] hover:bg-[#2d2d2d] rounded-lg border border-white/5 text-xs text-[#888] hover:text-white transition-colors"
                    >
                        My Submissions
                        <ExternalLink size={10} />
                    </a>
                    <a
                        href={`${contestBase}/status/${problemId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 p-2 bg-[#252526] hover:bg-[#2d2d2d] rounded-lg border border-white/5 text-xs text-[#888] hover:text-white transition-colors"
                    >
                        All Submissions
                        <ExternalLink size={10} />
                    </a>
                </div>
            )}
        </div>
    );
}
