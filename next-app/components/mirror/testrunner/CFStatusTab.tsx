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

    if (!cfStatus || cfStatus.status === 'idle') {
        if (!isExtensionInstalled) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-[#666] gap-4 p-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center border border-red-500/20">
                        <AlertTriangle size={28} />
                    </div>
                    <div>
                        <p className="text-base font-bold text-white mb-1">Extension Required</p>
                        <p className="text-sm text-[#888] mb-4">
                            You need the ICPC HUE Helper extension to submit code to Codeforces directly from this page.
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

        return (
            <div className="flex flex-col items-center justify-center h-full text-[#666] gap-3">
                <div className="w-12 h-12 rounded-full bg-[#2d2d2d] flex items-center justify-center">
                    <img
                        src="https://codeforces.org/s/0/favicon-32x32.png"
                        alt="CF"
                        className="w-6 h-6 opacity-50"
                    />
                </div>
                <p className="text-sm font-medium">Submit to Codeforces to see results</p>
                <p className="text-xs text-[#555]">Use the Submit button above</p>
            </div>
        );
    }

    const statusColor = getCFStatusColor(cfStatus);
    const statusBg = getCFStatusBg(cfStatus);

    return (
        <div className="space-y-4 animate-fade-in">
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
                                src="https://codeforces.org/s/0/favicon-32x32.png"
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
                            {cfStatus.status === 'submitting' && 'Submitting to Codeforces...'}
                            {cfStatus.status === 'waiting' && 'In Queue...'}
                            {cfStatus.status === 'testing' && `Testing on test ${!!cfStatus.testNumber ? cfStatus.testNumber : '?'}...`}
                            {cfStatus.status === 'done' && (cfStatus.verdict || 'Done')}
                            {cfStatus.status === 'error' && (cfStatus.error || 'Submission Failed')}
                        </div>
                        <div className="text-xs opacity-70 mt-0.5 font-mono">
                            {cfStatus.status === 'done' && cfStatus.time !== undefined && cfStatus.memory !== undefined && (
                                <>{cfStatus.time} ms • {cfStatus.memory} KB</>
                            )}
                            {cfStatus.status === 'testing' && cfStatus.testNumber && (
                                <>Running test {cfStatus.testNumber}...</>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Failed Test Case Info */}
            {cfStatus.status === 'done' && !!cfStatus.failedTestCase && cfStatus.verdict !== 'Accepted' && (
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

            {/* Compilation Error Details */}
            {cfStatus.compilationError && (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl overflow-hidden">
                    <div className="px-3 py-2 text-orange-400 text-xs font-medium border-b border-orange-500/20">
                        Compilation Error
                    </div>
                    <pre className="p-3 text-[10px] text-orange-300 max-h-40 overflow-auto whitespace-pre-wrap font-mono">
                        {cfStatus.compilationError}
                    </pre>
                </div>
            )}

            {/* Other Details (e.g. Failed Test Case Info) */}
            {cfStatus.details && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl overflow-hidden">
                    <div className="px-3 py-2 text-blue-400 text-xs font-medium border-b border-blue-500/20">
                        Detailed Information
                    </div>
                    <pre className="p-3 text-[10px] text-blue-300 max-h-60 overflow-auto whitespace-pre-wrap font-mono">
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
