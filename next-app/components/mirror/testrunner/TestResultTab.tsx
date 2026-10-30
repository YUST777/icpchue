'use client';

import {
    CheckCircle2,
    XCircle,
    CloudUpload,
    Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
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
            <motion.div
                className="h-full flex flex-col gap-3"
                role="status"
                aria-label="Running tests"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            >
                <div className="flex items-center gap-2 text-sm text-white/70">
                    <Loader2 size={14} className="animate-spin text-[#E8C15A]" />
                    <span>Running {count} {count === 1 ? 'test' : 'tests'}</span>
                </div>
                <div className="rounded-xl border border-white/5 bg-[#252526] overflow-hidden divide-y divide-white/5">
                    {Array.from({ length: count }).map((_, idx) => (
                        <motion.div
                            key={idx}
                            className="relative overflow-hidden flex items-center justify-between px-3 py-3 text-xs"
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.06 * idx, duration: 0.25, ease: 'easeOut' }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent animate-shimmer" style={{ animationDelay: `${idx * 150}ms` }} />
                            <span className="relative text-white/60">Test Case {idx + 1}</span>
                            <div className="relative h-3 w-16 rounded bg-white/[0.06]" />
                        </motion.div>
                    ))}
                </div>
            </motion.div>
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
                ? 'bg-emerald-400/[0.08] border-emerald-400/20'
                : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}>
                <div className={`p-2 rounded-full ${result.passed ? 'bg-emerald-400/15' : 'bg-red-500/20'}`}>
                    {getVerdictIcon(result.verdict)}
                </div>
                <div>
                    <div className={`font-bold text-lg ${result.passed ? 'text-emerald-300' : 'text-red-300'}`}>
                        {result.verdict}
                    </div>
                    <div className="text-xs text-white/55 mt-0.5 font-mono">
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
                    <div key={r.testCase} className={`flex items-center justify-between px-3.5 py-3 text-xs border-b border-white/5 last:border-b-0 transition-colors ${!r.passed ? 'bg-red-500/5' : ''}`}>
                        <div className="flex items-center gap-3">
                            {r.passed ? <CheckCircle2 size={16} className="text-[#E8C15A]" /> : <XCircle size={16} className="text-red-500" />}
                            <span className="font-medium text-[#d4d4d4]">Test Case {r.testCase}</span>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-4 font-mono text-[#888]">
                            <span>{r.time || '0ms'}</span>
                            <span>{r.memory || '0KB'}</span>
                            <span className={`font-bold min-w-10 text-center rounded-md border px-1.5 py-0.5 ${r.passed ? 'text-emerald-300 border-emerald-400/20 bg-emerald-400/5' : 'text-red-300 border-red-400/20 bg-red-400/5'}`}>
                                {getVerdictShort(r.verdict)}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
