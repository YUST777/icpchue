import {
    CheckCircle2,
    XCircle,
    CloudUpload
} from 'lucide-react';
import { SubmissionResult } from '../types';
import { getVerdictIcon, getVerdictShort } from './verdictUtils';

interface TestResultTabProps {
    result: SubmissionResult | null;
}

export default function TestResultTab({ result }: TestResultTabProps) {
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
                        <div className="flex items-center gap-4 font-mono text-[#888]">
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
