import { useState, useEffect } from 'react';
import {
    CheckCircle2,
    XCircle,
    Loader2,
    ExternalLink,
    Send,
    AlertTriangle
} from 'lucide-react';
import { CFSubmissionStatus } from '../types';
import { getVerdictIcon, getCFStatusColor, getCFStatusBg } from './verdictUtils';

interface CFStatusTabProps {
    cfStatus: CFSubmissionStatus | null;
    contestId?: string;
    problemId?: string;
}

export default function CFStatusTab({ cfStatus, contestId, problemId }: CFStatusTabProps) {
    const [isExtensionInstalled, setIsExtensionInstalled] = useState(true);
    const [handleInput, setHandleInput] = useState('');
    // The handle was auto-resolved from the extension's active CF session,
    // so the user doesn't have to type it (true one-click sync).
    const [handleAutoResolved, setHandleAutoResolved] = useState(false);
    // Lets the user reveal the manual handle field if auto-resolution failed
    // or they want to override it.
    const [showHandleField, setShowHandleField] = useState(false);

    useEffect(() => {
        try {
            const saved = localStorage.getItem('verdict-cf-handle');
            if (saved) setHandleInput(saved);
        } catch {}
    }, []);

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

    // Ask the (unchanged) Verdict Helper extension for the handle of the
    // currently logged-in Codeforces session. This makes the sync one-click:
    // the user is already logged into CF (that's how they submitted), so we
    // can resolve their handle without asking them to type it.
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!document.getElementById('verdict-extension-installed')) return;

        let done = false;
        const handler = (event: MessageEvent) => {
            if (event.source !== window) return;
            if (event.data?.type !== 'VERDICT_HANDLE_RESPONSE') return;
            done = true;
            window.removeEventListener('message', handler);
            const resolved = event.data.handle;
            if (resolved && typeof resolved === 'string') {
                setHandleInput(resolved);
                setHandleAutoResolved(true);
                try { localStorage.setItem('verdict-cf-handle', resolved); } catch {}
            }
        };
        window.addEventListener('message', handler);
        window.postMessage({ type: 'VERDICT_GET_HANDLE' }, '*');

        const timeout = setTimeout(() => {
            if (!done) window.removeEventListener('message', handler);
        }, 4000);
        return () => {
            window.removeEventListener('message', handler);
            clearTimeout(timeout);
        };
    }, []);

    const isVerifyPending = cfStatus?.substatus === 'verify-pending';
    // Show the one-click sync panel both when idle (extension present) and when
    // a submit flow put us into "verify-pending". This makes the CF tab itself a
    // button: open the problem, solve on CF, come back and sync — no Submit needed.
    const showSyncPanel = isExtensionInstalled && (!cfStatus || cfStatus.status === 'idle' || isVerifyPending);

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
        // We can do a true one-click sync when the handle is already known
        // (auto-resolved from the extension's CF session, or remembered).
        const knownHandle = handleInput.trim();
        const canOneClick = !!knownHandle;
        const needsManualHandle = showHandleField || !canOneClick;

        const runVerify = async () => {
            const h = knownHandle;
            if (!h) {
                setShowHandleField(true);
                return;
            }
            const verifyFn = (window as any).__verdict_verify_cf;
            if (verifyFn) {
                await verifyFn(h);
            }
        };

        return (
            <div className="h-full flex flex-col space-y-4 p-4 bg-[#252526]/30 rounded-xl border border-white/5 animate-fade-in text-left">
                <div className="flex items-center gap-3 text-[#E8C15A]">
                    <div className="p-2 rounded-full bg-[#E8C15A]/10 border border-[#E8C15A]/20">
                        <Send size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm text-white">Sync your Codeforces submission</h3>
                        <p className="text-[10px] text-[#888]">Check your latest Codeforces submissions and apply your AC here</p>
                    </div>
                </div>

                <div className="text-[11px] text-[#b8b8b8] bg-white/5 p-3 rounded-lg leading-relaxed space-y-2">
                    <p><strong>1. Submit on Codeforces:</strong> Solve the problem and get <strong>Accepted (AC)</strong> on Codeforces.</p>
                    <p><strong>2. Sync here:</strong> Click the button below — we&apos;ll check your latest submissions for this problem and mark it solved if an AC is found.</p>
                </div>

                {hasError && cfStatus?.error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 flex items-start gap-2 leading-relaxed">
                        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                        <span>{cfStatus.error}</span>
                    </div>
                )}

                {/* Manual handle field — only shown if we couldn't auto-resolve it
                    from the extension, or the user chose to override it. */}
                {needsManualHandle && (
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-bold text-[#888] uppercase tracking-wider">Codeforces Handle</label>
                        <input
                            type="text"
                            value={handleInput}
                            onChange={(e) => {
                                setHandleInput(e.target.value);
                                try {
                                    localStorage.setItem('verdict-cf-handle', e.target.value);
                                } catch {}
                            }}
                            disabled={verifying}
                            placeholder="Enter your CF handle (e.g. tourist)"
                            className="bg-[#1a1a1a] border border-white/10 hover:border-white/20 focus:border-[#E8C15A]/50 rounded-lg px-3 py-2 text-xs text-white placeholder-[#555] focus:outline-none transition-colors"
                        />
                    </div>
                )}

                <button
                    onClick={runVerify}
                    disabled={verifying || (needsManualHandle && !canOneClick)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#E8C15A] hover:bg-[#F0D06A] disabled:bg-[#E8C15A]/20 disabled:text-[#666] text-black font-semibold rounded-lg transition-colors text-sm cursor-pointer"
                >
                    {verifying ? (
                        <>
                            <Loader2 size={14} className="animate-spin" /> Checking your submissions...
                        </>
                    ) : (
                        <>
                            <CheckCircle2 size={14} /> Check &amp; Sync my AC
                        </>
                    )}
                </button>

                {/* Show the resolved handle + a way to change it */}
                {canOneClick && (
                    <div className="flex items-center justify-center gap-1.5 text-[10px] text-[#888]">
                        <span>
                            Checking as <span className="text-[#E8C15A] font-mono">{knownHandle}</span>
                            {handleAutoResolved && ' (from your Codeforces session)'}
                        </span>
                        {!verifying && (
                            <button
                                onClick={() => setShowHandleField(true)}
                                className="text-[#E8C15A] hover:underline cursor-pointer"
                            >
                                change
                            </button>
                        )}
                    </div>
                )}

                {contestId && problemId && (
                    <div className="pt-2 flex items-center justify-between border-t border-white/5">
                        <a
                            href={`https://codeforces.com/contest/${contestId}/submit?problemIndex=${problemId}`}
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
                            <Send size={18} />
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
                        href={`https://codeforces.com/contest/${contestId}/submission/${cfStatus.submissionId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-[#E8C15A] hover:text-[#E8C15A] transition-colors"
                    >
                        View on Codeforces
                        <ExternalLink size={12} />
                    </a>
                </div>
            )}

            {/* Quick Links */}
            {contestId && problemId && (
                <div className="flex gap-2">
                    <a
                        href={`https://codeforces.com/contest/${contestId}/my`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 p-2 bg-[#252526] hover:bg-[#2d2d2d] rounded-lg border border-white/5 text-xs text-[#888] hover:text-white transition-colors"
                    >
                        My Submissions
                        <ExternalLink size={10} />
                    </a>
                    <a
                        href={`https://codeforces.com/contest/${contestId}/status/${problemId}`}
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
