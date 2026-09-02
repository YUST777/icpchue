'use client';

import React, { useState } from 'react';
import { Terminal, CheckCircle2, Cpu, HardDrive, FileCode } from 'lucide-react';

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
    language = 'C++',
    lastUpdated = 'Recently',
    testOutput,
    customTestCases = [],
}: CodeInspectorProps) {
    const [activeSubTab, setActiveSubTab] = useState<'draft' | 'last_sub'>('draft');

    const displayedCode = activeSubTab === 'draft' 
        ? (draftCode || lastSubCode || '// No code written in editor yet.')
        : (lastSubCode || draftCode || '// No submission recorded.');

    const codeLines = displayedCode.split('\n');

    return (
        <div className="bg-[#121214] border border-white/[0.08] rounded-2xl p-5 shadow-xl backdrop-blur-md flex flex-col h-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 mb-4 border-b border-white/5 gap-3">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-1.5 rounded-lg bg-[#E8C15A]/10 text-[#E8C15A]">
                            <Terminal size={16} />
                        </div>
                        <h2 className="text-base font-bold text-white tracking-tight">Code Inspector</h2>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-white/50">
                        <span>Problem: <strong className="text-white font-semibold">{problemTitle}</strong></span>
                        <span>•</span>
                        <span>Sheet: <strong className="text-[#E8C15A]">{sheetName}</strong></span>
                        <span>•</span>
                        <span className="text-white/40">{lastUpdated}</span>
                    </div>
                </div>

                {/* Sub-tabs */}
                <div className="flex items-center bg-white/5 rounded-xl p-1 border border-white/10 text-xs self-end sm:self-auto">
                    <button
                        onClick={() => setActiveSubTab('draft')}
                        className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                            activeSubTab === 'draft'
                                ? 'bg-[#E8C15A] text-black shadow-sm'
                                : 'text-white/60 hover:text-white'
                        }`}
                    >
                        Current Draft
                    </button>
                    <button
                        onClick={() => setActiveSubTab('last_sub')}
                        className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                            activeSubTab === 'last_sub'
                                ? 'bg-[#E8C15A] text-black shadow-sm'
                                : 'text-white/60 hover:text-white'
                        }`}
                    >
                        Last Submission
                    </button>
                </div>
            </div>

            {/* Code Body & Diagnostics Split */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
                {/* Code Window */}
                <div className="lg:col-span-8 bg-[#0B0B0C] border border-white/5 rounded-xl p-3.5 font-mono text-xs overflow-x-auto max-h-[360px] scrollbar-thin">
                    <div className="flex text-white/80">
                        {/* Line numbers */}
                        <div className="select-none text-white/20 text-right pr-3.5 border-r border-white/5 space-y-0.5">
                            {codeLines.map((_, i) => (
                                <div key={i}>{i + 1}</div>
                            ))}
                        </div>
                        {/* Code text */}
                        <div className="pl-3.5 space-y-0.5 whitespace-pre flex-1 text-[#E0E0E0]">
                            {codeLines.map((line, i) => (
                                <div key={i} className="hover:bg-white/[0.03] transition-colors">
                                    {line || '\n'}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Compiler / Diagnostics Pane */}
                <div className="lg:col-span-4 flex flex-col gap-3">
                    {/* Status Card */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3.5 space-y-2.5">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-white/40 block">
                            Compiler / Test Output
                        </span>

                        <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg">
                            <CheckCircle2 size={14} />
                            <span>{testOutput?.status || 'Passed All Test Cases'}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                            <div className="bg-white/5 p-2 rounded-lg">
                                <span className="text-white/40 block text-[9px]">Runtime</span>
                                <div className="flex items-center gap-1 font-semibold text-white mt-0.5">
                                    <Cpu size={12} className="text-blue-400" />
                                    <span>{testOutput?.runtime || '28 ms'}</span>
                                </div>
                            </div>
                            <div className="bg-white/5 p-2 rounded-lg">
                                <span className="text-white/40 block text-[9px]">Memory</span>
                                <div className="flex items-center gap-1 font-semibold text-white mt-0.5">
                                    <HardDrive size={12} className="text-purple-400" />
                                    <span>{testOutput?.memory || '18.4 MB'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="text-[11px] text-white/60 bg-white/5 p-2 rounded-lg flex items-center justify-between">
                            <span>Test Cases:</span>
                            <strong className="text-emerald-400">
                                {testOutput?.test_cases_passed ?? 15} / {testOutput?.total_test_cases ?? 15} Passed
                            </strong>
                        </div>
                    </div>

                    {/* Custom Tests Preview */}
                    {customTestCases.length > 0 && (
                        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3.5 flex-1">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-white/40 block mb-2">
                                Custom Test Cases ({customTestCases.length})
                            </span>
                            <div className="space-y-1.5 font-mono text-[10px] text-white/70">
                                {customTestCases.slice(0, 2).map((tc, idx) => (
                                    <div key={idx} className="bg-white/5 p-2 rounded truncate">
                                        {idx + 1}. Input: {tc.input}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
