'use client';

import React, { useState, useMemo } from 'react';
import { Terminal, FileText, Copy, Check, Search, ChevronRight } from 'lucide-react';

interface CodeEntry {
    key: string;
    contest_id: string;
    problem_id: string;
    draft_code: string;
    submission_code?: string;
    language?: string;
    updated_at: string;
    notes?: string;
}

interface CodeWorkspaceInspectorProps {
    codeCatalog: CodeEntry[];
    userNotes: { id: number; contest_id?: string; problem_index?: string; content: string; updated_at: string }[];
}

export function CodeWorkspaceInspector({ codeCatalog = [], userNotes = [] }: CodeWorkspaceInspectorProps) {
    const notesMap = useMemo(() => {
        const map = new Map<string, string>();
        userNotes.forEach((n) => {
            const key = `${n.contest_id || ''}-${n.problem_index || ''}`.trim();
            if (key) map.set(key, n.content);
        });
        return map;
    }, [userNotes]);

    const [selectedKey, setSelectedKey] = useState<string>(codeCatalog[0]?.key || '');
    const [viewMode, setViewMode] = useState<'draft' | 'submission'>('draft');
    const [copied, setCopied] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const activeEntry = useMemo(() => {
        return codeCatalog.find(c => c.key === selectedKey) || codeCatalog[0];
    }, [codeCatalog, selectedKey]);

    const activeNotes = activeEntry ? (notesMap.get(activeEntry.key) || activeEntry.notes || '') : '';

    const displayedCode = activeEntry 
        ? (viewMode === 'draft' ? (activeEntry.draft_code || activeEntry.submission_code || '// No active draft code.') : (activeEntry.submission_code || activeEntry.draft_code || '// No submission recorded.'))
        : '// No code found.';

    const codeLines = displayedCode.split('\n');

    const handleCopy = () => {
        navigator.clipboard.writeText(displayedCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const filteredCatalog = codeCatalog.filter(c => {
        if (!searchQuery) return true;
        return c.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
               c.contest_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
               c.problem_id?.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return (
        <div className="bg-[#121214] border border-white/[0.08] rounded-xl p-3.5 shadow-md flex flex-col space-y-3">
            {/* Minimalist Header */}
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Problem Code & Student Notes
                    </span>
                    {activeEntry && (
                        <span className="text-xs font-mono text-[#E8C15A] font-semibold">
                            ({activeEntry.contest_id} {activeEntry.problem_id})
                        </span>
                    )}
                </div>

                {/* Minimalist Switcher Pill */}
                <div className="flex items-center bg-[#0B0B0C] rounded-lg p-0.5 border border-white/10 text-xs">
                    <button
                        onClick={() => setViewMode('draft')}
                        className={`px-3 py-1 rounded-md font-semibold transition-all ${
                            viewMode === 'draft'
                                ? 'bg-[#E8C15A] text-black shadow-xs'
                                : 'text-white/60 hover:text-white'
                        }`}
                    >
                        Editor Draft
                    </button>
                    <button
                        onClick={() => setViewMode('submission')}
                        className={`px-3 py-1 rounded-md font-semibold transition-all ${
                            viewMode === 'submission'
                                ? 'bg-[#E8C15A] text-black shadow-xs'
                                : 'text-white/60 hover:text-white'
                        }`}
                    >
                        Last Submission
                    </button>
                </div>
            </div>

            {/* 3-Column Minimalist Bento Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-[380px]">
                {/* Problems List (3 cols) */}
                <div className="lg:col-span-3 bg-white/[0.02] border border-white/5 rounded-lg p-2.5 flex flex-col space-y-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30 w-3.5 h-3.5" />
                        <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search problem..."
                            className="w-full bg-white/5 border border-white/10 rounded-md pl-8 pr-2 py-1 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#E8C15A]"
                        />
                    </div>

                    <div className="space-y-1 overflow-y-auto max-h-[320px] scrollbar-thin flex-1">
                        {filteredCatalog.length === 0 ? (
                            <div className="text-center py-6 text-xs text-white/30">
                                No problems found
                            </div>
                        ) : (
                            filteredCatalog.map((item) => {
                                const isSelected = (activeEntry?.key === item.key);
                                const hasNotes = Boolean(notesMap.get(item.key));
                                return (
                                    <button
                                        key={item.key}
                                        onClick={() => setSelectedKey(item.key)}
                                        className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs flex items-center justify-between transition-all ${
                                            isSelected
                                                ? 'bg-[#E8C15A]/15 text-[#E8C15A] border border-[#E8C15A]/30 font-bold'
                                                : 'hover:bg-white/5 text-white/70 hover:text-white'
                                        }`}
                                    >
                                        <div className="truncate">
                                            <span className="font-mono font-semibold mr-1">
                                                {item.contest_id} {item.problem_id}
                                            </span>
                                            {hasNotes && (
                                                <span className="px-1 py-0.2 rounded text-[8px] bg-amber-500/20 text-amber-300 font-semibold">
                                                    Notes
                                                </span>
                                            )}
                                        </div>
                                        <ChevronRight size={11} className={isSelected ? 'text-[#E8C15A]' : 'text-white/20'} />
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Code Window (5 cols) */}
                <div className="lg:col-span-5 bg-[#0B0B0C] border border-white/5 rounded-lg p-2.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/5 text-xs">
                        <span className="font-mono text-white/70 text-[11px]">
                            {activeEntry ? `${activeEntry.contest_id} ${activeEntry.problem_id} (${activeEntry.language || 'C++'})` : 'Code'}
                        </span>
                        <button
                            onClick={handleCopy}
                            className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all text-[10px] flex items-center gap-1"
                        >
                            {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                            <span>{copied ? 'Copied' : 'Copy'}</span>
                        </button>
                    </div>

                    <div className="font-mono text-[11px] overflow-x-auto max-h-[300px] scrollbar-thin flex-1">
                        <div className="flex text-white/80">
                            <div className="select-none text-white/20 text-right pr-2.5 border-r border-white/5 space-y-0.5 shrink-0">
                                {codeLines.map((_, i) => (
                                    <div key={i}>{i + 1}</div>
                                ))}
                            </div>
                            <div className="pl-2.5 space-y-0.5 whitespace-pre flex-1 text-[#E0E0E0]">
                                {codeLines.map((line, i) => (
                                    <div key={i} className="hover:bg-white/[0.03]">
                                        {line || '\n'}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Student Thinking Notes (4 cols) */}
                <div className="lg:col-span-4 bg-white/[0.02] border border-white/5 rounded-lg p-2.5 flex flex-col justify-between">
                    <div className="flex items-center gap-1.5 pb-1.5 mb-1.5 border-b border-white/5 text-xs text-[#E8C15A] font-bold">
                        <FileText size={13} />
                        <span>Student Thinking Notes</span>
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-[300px] scrollbar-thin text-xs text-white/80">
                        {activeNotes ? (
                            <div className="bg-white/[0.02] border border-white/5 rounded-md p-2.5 whitespace-pre-wrap font-sans leading-relaxed text-[11px] text-white/90">
                                {activeNotes}
                            </div>
                        ) : (
                            <div className="text-center py-10 text-white/30 text-xs">
                                No notes recorded for this problem.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
