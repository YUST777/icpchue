'use client';

import React, { useState, useMemo } from 'react';
import { Copy, Check, Search, ChevronRight } from 'lucide-react';

interface CodeEntry {
    key: string;
    contest_id: string;
    problem_id: string;
    code: string;
    language?: string;
    updated_at: string;
}

interface CodeWorkspaceInspectorProps {
    codeCatalog: CodeEntry[];
}

export function CodeWorkspaceInspector({ codeCatalog = [] }: CodeWorkspaceInspectorProps) {
    const [selectedKey, setSelectedKey] = useState<string>(codeCatalog[0]?.key || '');
    const [copied, setCopied] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const activeEntry = useMemo(() => {
        return codeCatalog.find(c => c.key === selectedKey) || codeCatalog[0];
    }, [codeCatalog, selectedKey]);

    const displayedCode = activeEntry?.code || '// No code recorded for this problem.';
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
                        Problem Code
                    </span>
                    {activeEntry && (
                        <span className="text-xs font-mono text-[#E8C15A] font-semibold">
                            ({activeEntry.contest_id} {activeEntry.problem_id})
                        </span>
                    )}
                </div>

                {activeEntry && (
                    <span className="text-[11px] text-white/40 font-mono">
                        {activeEntry.language || 'C++'}
                    </span>
                )}
            </div>

            {/* Clean 2-Column Layout: Problem Selector + Full Code View */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-[400px]">
                {/* Problems List (4 cols) */}
                <div className="lg:col-span-4 bg-white/[0.02] border border-white/5 rounded-lg p-2.5 flex flex-col space-y-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30 w-3.5 h-3.5" />
                        <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search problem..."
                            className="w-full bg-white/5 border border-white/10 rounded-md pl-8 pr-2 py-1 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#E8C15A]"
                        />
                    </div>

                    <div className="space-y-1 overflow-y-auto max-h-[340px] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex-1">
                        {filteredCatalog.length === 0 ? (
                            <div className="text-center py-6 text-xs text-white/30">
                                No problems found
                            </div>
                        ) : (
                            filteredCatalog.map((item) => {
                                const isSelected = (activeEntry?.key === item.key);
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
                                        <span className="font-mono font-semibold">
                                            {item.contest_id} {item.problem_id}
                                        </span>
                                        <ChevronRight size={11} className={isSelected ? 'text-[#E8C15A]' : 'text-white/20'} />
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Code Window (8 cols) */}
                <div className="lg:col-span-8 bg-[#0B0B0C] border border-white/5 rounded-lg p-3 flex flex-col justify-between">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5 text-xs">
                        <span className="font-mono text-white/70 text-[11px]">
                            {activeEntry ? `${activeEntry.contest_id} ${activeEntry.problem_id}` : 'Code Preview'}
                        </span>
                        <button
                            onClick={handleCopy}
                            className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all text-[10px] flex items-center gap-1"
                        >
                            {copied ? <Check size={11} className="text-[#E8C15A]" /> : <Copy size={11} />}
                            <span>{copied ? 'Copied' : 'Copy'}</span>
                        </button>
                    </div>

                    <div className="font-mono text-[11px] overflow-x-auto max-h-[320px] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex-1">
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
            </div>
        </div>
    );
}
