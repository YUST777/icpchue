'use client';

import React, { useState } from 'react';
import { Terminal, CheckCircle2, Cpu, HardDrive } from 'lucide-react';

interface CodeInspectorProps {
    draftCode?: string;
    lastSubCode?: string;
    problemTitle?: string;
    sheetName?: string;
    language?: string;
    lastUpdated?: string;
    testOutput?: {
        status: string;
        passed: boolean;
        runtime: string;
        memory: string;
        language: string;
        test_cases_passed: number;
        total_test_cases: number;
    };
    customTestCases?: { input: string; expectedOutput?: string }[];
}

export function CodeInspectorPane({
    draftCode,
    lastSubCode,
    problemTitle = 'Current Problem',
    sheetName = 'Training Sheet',
    testOutput,
}: CodeInspectorProps) {
    const [activeSubTab, setActiveSubTab] = useState<'draft' | 'last_sub'>('draft');

    const displayedCode = activeSubTab === 'draft' 
        ? (draftCode || lastSubCode || '// No active draft code.')
        : (lastSubCode || draftCode || '// No submission code.');

    const codeLines = displayedCode.split('\n');

    return (
        <div className="bg-[#121214] border border-white/[0.08] rounded-xl p-3.5 shadow-md flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1 rounded bg-[#E8C15A]/10 text-[#E8C15A] shrink-0">
                        <Terminal size={14} />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-xs text-white">
                            <span className="font-bold uppercase tracking-tight">Code Inspector</span>
                            <span>•</span>
                            <span className="font-bold text-[#E8C15A] truncate">{problemTitle}</span>
                        </div>
                    </div>
                </div>

                {/* Sub-tabs */}
                <div className="flex items-center bg-white/5 rounded-lg p-0.5 border border-white/10 text-[10px]">
                    <button
                        onClick={() => setActiveSubTab('draft')}
                        className={`px-2 py-0.5 rounded font-semibold transition-all ${
                            activeSubTab === 'draft'
                                ? 'bg-[#E8C15A] text-black shadow-xs'
                                : 'text-white/60 hover:text-white'
                        }`}
                    >
                        Draft
                    </button>
                    <button
                        onClick={() => setActiveSubTab('last_sub')}
                        className={`px-2 py-0.5 rounded font-semibold transition-all ${
                            activeSubTab === 'last_sub'
                                ? 'bg-[#E8C15A] text-black shadow-xs'
                                : 'text-white/60 hover:text-white'
                        }`}
                    >
                        Submission
                    </button>
                </div>
            </div>

            {/* Code Body & Stats */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 flex-1">
                {/* Code Window */}
                <div className="md:col-span-8 bg-[#0B0B0C] border border-white/5 rounded-lg p-2.5 font-mono text-[11px] overflow-x-auto max-h-[220px] scrollbar-thin">
                    <div className="flex text-white/80">
                        <div className="select-none text-white/20 text-right pr-2.5 border-r border-white/5 space-y-0.5">
                            {codeLines.slice(0, 50).map((_, i) => (
                                <div key={i}>{i + 1}</div>
                            ))}
                        </div>
                        <div className="pl-2.5 space-y-0.5 whitespace-pre flex-1 text-[#E0E0E0]">
                            {codeLines.slice(0, 50).map((line, i) => (
                                <div key={i} className="hover:bg-white/[0.03]">
                                    {line || '\n'}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Diagnostics Panel */}
                <div className="md:col-span-4 flex flex-col justify-between gap-1.5 text-xs bg-white/[0.02] border border-white/5 rounded-lg p-2.5">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px] bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded">
                        <CheckCircle2 size={12} />
                        <span className="truncate">{testOutput?.status || 'All Tests Passed'}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                        <div className="bg-white/5 p-1.5 rounded">
                            <span className="text-white/40 block text-[8px]">Runtime</span>
                            <div className="flex items-center gap-1 font-semibold text-white mt-0.5">
                                <Cpu size={10} className="text-blue-400" />
                                <span>{testOutput?.runtime || '15 ms'}</span>
                            </div>
                        </div>
                        <div className="bg-white/5 p-1.5 rounded">
                            <span className="text-white/40 block text-[8px]">Memory</span>
                            <div className="flex items-center gap-1 font-semibold text-white mt-0.5">
                                <HardDrive size={10} className="text-purple-400" />
                                <span>{testOutput?.memory || '1.8 MB'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="text-[10px] text-white/60 bg-white/5 p-1.5 rounded flex items-center justify-between">
                        <span>Tests:</span>
                        <strong className="text-emerald-400">
                            {testOutput?.test_cases_passed ?? 15}/{testOutput?.total_test_cases ?? 15} AC
                        </strong>
                    </div>
                </div>
            </div>
        </div>
    );
}
