import {
    CheckCircle2,
    XCircle,
    CloudUpload,
    Loader2,
    Terminal
} from 'lucide-react';
import { SubmissionResult } from '../types';
import { getVerdictIcon, getVerdictShort } from './verdictUtils';

interface TestResultTabProps {
    result: SubmissionResult | null;
    isRunning?: boolean;
    testCasesCount?: number;
}

export default function TestResultTab({ result, isRunning, testCasesCount = 2 }: TestResultTabProps) {
    if (isRunning) {
        const count = Math.max(1, testCasesCount);
        return (
            <div className="h-full flex flex-col space-y-2.5 animate-fade-in" role="status" aria-label="Evaluating code">
                {/* Active Judging Header Banner */}
                <div className="relative overflow-hidden rounded-xl border border-[#E8C15A]/30 bg-gradient-to-r from-[#E8C15A]/[0.08] via-[#E8C15A]/[0.03] to-transparent p-3">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent animate-shimmer" />
                    <div className="relative flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-[#E8C15A]/15 border border-[#E8C15A]/25 text-[#E8C15A] shadow-[0_0_15px_rgba(232,193,90,0.2)] shrink-0">
                                <Loader2 size={20} className="animate-spin" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm md:text-base text-white tracking-wide">
                                        Evaluating Solution
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#E8C15A]/15 text-[#E8C15A] border border-[#E8C15A]/30 shrink-0">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#E8C15A] animate-ping" />
                                        Judging
                                    </span>
                                </div>
                                <p className="text-[11px] text-white/50 mt-0.5 font-mono truncate">
                                    Testing against {count} {count === 1 ? 'test case' : 'test cases'}...
                                </p>
                            </div>
                        </div>

                        {/* Minimalist progress bar on desktop */}
                        <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
                            <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">Local Judge</span>
                            <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full w-2/3 bg-gradient-to-r from-[#E8C15A] to-amber-300 rounded-full animate-pulse" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Shimmering Test Case Skeletons */}
                <div className="bg-[#252526] rounded-xl border border-white/5 overflow-hidden divide-y divide-white/5">
                    {Array.from({ length: count }).map((_, idx) => (
                        <div key={idx} className="relative overflow-hidden flex items-center justify-between p-3 text-xs">
                            <div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent animate-shimmer"
                                style={{ animationDelay: `${idx * 180}ms` }}
                            />
                            <div className="relative flex items-center gap-3">
                                <div className="w-4 h-4 rounded-full border-2 border-white/15 border-t-[#E8C15A] animate-spin" />
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-[#d4d4d4]">Test Case {idx + 1}</span>
                                    <span className="text-[10px] text-white/30 font-mono">running...</span>
                                </div>
                            </div>
                            <div className="relative flex items-center gap-2 sm:gap-4 font-mono text-white/25">
                                <div className="w-12 h-3.5 bg-white/[0.06] rounded animate-pulse" />
                                <div className="w-12 h-3.5 bg-white/[0.06] rounded animate-pulse" />
                                <div className="w-12 h-4 rounded bg-[#E8C15A]/10 border border-[#E8C15A]/20 flex items-center justify-center">
                                    <span className="text-[9px] font-bold text-[#E8C15A]/70">WAIT</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Sandboxed notice footer */}
                <div className="p-2.5 rounded-lg border border-white/5 bg-[#1f1f20]/50 flex items-center justify-between text-[11px] text-white/40">
                    <div className="flex items-center gap-2">
                        <Terminal size={13} className="text-[#E8C15A]" />
                        <span>Compiling code and evaluating against testcase assertions</span>
                    </div>
                    <span className="font-mono text-[10px] text-white/30 hidden sm:inline">sandboxed</span>
                </div>
            </div>
        );
    }

    if (!result) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-[#666] gap-3">
                <div className="w-12 h-12 rounded-full bg-[#252526] flex items-center justify-center">
                    <CloudUpload size={24} className="opacity-50" />
                </div>
                <p className="text-sm font-medium">Run your code to see results</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col space-y-2 animate-fade-in">
            <div className={`flex items-center gap-3 p-3 rounded-xl border ${result.passed
                ? 'bg-[#E8C15A]/10 border-[#E8C15A]/20 text-green-400'
                : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}>
                <div className={`p-2 rounded-full ${result.passed ? 'bg-[#E8C15A]/20' : 'bg-red-500/20'}`}>
                    {getVerdictIcon(result.verdict)}
                </div>
                <div>
                    <div className="font-bold text-lg">
                        {result.verdict}
                    </div>
                    <div className="text-xs opacity-70 mt-0.5 font-mono">
                        {result.testsPassed}/{result.totalTests} tests passed • {result.time || '0ms'}
                    </div>
                </div>
            </div>

            {/* Compile / Runtime Error */}
            {result.results[0]?.compileError && (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg overflow-hidden">
                    <div className="px-3 py-2 text-orange-400 text-xs font-medium border-b border-orange-500/20">Compilation Error</div>
                    <pre className="p-3 text-[10px] text-orange-300 max-h-32 overflow-auto whitespace-pre-wrap font-mono">
                        {result.results[0].compileError}
                    </pre>
                </div>
            )}
            {result.results[0]?.runtimeError && !result.results[0]?.compileError && (
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg overflow-hidden">
                    <div className="px-3 py-2 text-purple-400 text-xs font-medium border-b border-purple-500/20">Runtime Error</div>
                    <pre className="p-3 text-[10px] text-purple-300 max-h-32 overflow-auto whitespace-pre-wrap font-mono">
                        {result.results[0].runtimeError}
                    </pre>
                </div>
            )}

            <div className="bg-[#252526] rounded-xl border border-white/5 overflow-hidden">
                {result.results.map((r) => (
                    <div key={r.testCase} className={`flex items-center justify-between p-3 text-xs border-b border-white/5 last:border-[#E8C15A] hover:bg-[#252526] transition-colors ${!r.passed ? 'bg-red-500/5' : ''}`}>
                        <div className="flex items-center gap-3">
                            {r.passed ? <CheckCircle2 size={16} className="text-[#E8C15A]" /> : <XCircle size={16} className="text-red-500" />}
                            <span className="font-medium text-[#d4d4d4]">Test Case {r.testCase}</span>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-4 font-mono text-[#888]">
                            <span>{r.time || '0ms'}</span>
                            <span>{r.memory || '0KB'}</span>
                            <span className={`font-bold w-12 text-right ${r.passed ? 'text-green-400' : 'text-red-400'}`}>
                                {getVerdictShort(r.verdict)}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
