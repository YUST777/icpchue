'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Copy, Check, Search, ChevronRight, Terminal, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';

interface CodeEntry {
    key: string;
    display_label?: string;
    sheet_name?: string;
    problem_title?: string;
    contest_id: string;
    problem_id: string;
    code: string;
    language?: string;
    verdict?: string;
    status?: string;
    attempts?: number;
    updated_at: string;
}

interface CodeWorkspaceInspectorProps {
    codeCatalog: CodeEntry[];
}

export function CodeWorkspaceInspector({ codeCatalog = [] }: CodeWorkspaceInspectorProps) {
    const [selectedKey, setSelectedKey] = useState<string>(codeCatalog[0]?.key || '');
    const [copied, setCopied] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (codeCatalog.length > 0) {
            if (!selectedKey || !codeCatalog.some(c => c.key === selectedKey)) {
                setSelectedKey(codeCatalog[0].key);
            }
        }
    }, [codeCatalog]);

    const activeEntry = useMemo(() => {
        return codeCatalog.find(c => c.key === selectedKey) || codeCatalog[0];
    }, [codeCatalog, selectedKey]);

    const displayedCode = activeEntry?.code || '// No code recorded for this problem.';
    const codeLines = displayedCode.split('\n');

    const handleCopy = () => {
        navigator.clipboard.writeText(displayedCode).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }).catch((err) => {
            console.warn('Clipboard write failed:', err);
        });
    };

    const getVerdictMiniBadge = (entry?: CodeEntry) => {
        if (!entry) return null;
        const v = (entry.verdict || '').toLowerCase();
        const st = entry.status || '';

        if (st === 'SOLVED' || v.includes('accepted') || v === 'ok' || v === 'ac') {
            return (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#E8C15A] bg-[#E8C15A]/15 px-1.5 py-0.5 rounded border border-[#E8C15A]/25">
                    <CheckCircle2 size={10} /> AC
                </span>
            );
        }
        if (st === 'WRONG_ANSWER' || v.includes('wrong') || v.includes('wa')) {
            return (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-400 bg-red-500/15 px-1.5 py-0.5 rounded border border-red-500/25">
                    <XCircle size={10} /> WA
                </span>
            );
        }
        if (st === 'TIME_LIMIT' || v.includes('time') || v.includes('tle')) {
            return (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/25">
                    <Clock size={10} /> TLE
                </span>
            );
        }
        if (st === 'DRAFT') {
            return (
                <span className="text-[10px] font-semibold text-white/40 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
                    Draft
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-300 bg-purple-500/15 px-1.5 py-0.5 rounded border border-purple-500/25">
                <AlertTriangle size={10} /> {entry.verdict || 'Attempted'}
            </span>
        );
    };

    const filteredCatalog = useMemo(() => {
        if (!searchQuery.trim()) return codeCatalog;
        const q = searchQuery.toLowerCase();
        return codeCatalog.filter(c => {
            return (c.display_label || '').toLowerCase().includes(q) ||
                   (c.problem_title || '').toLowerCase().includes(q) ||
                   (c.sheet_name || '').toLowerCase().includes(q) ||
                   (c.verdict || '').toLowerCase().includes(q) ||
                   (c.key || '').toLowerCase().includes(q) ||
                   (c.contest_id || '').toLowerCase().includes(q) ||
                   (c.problem_id || '').toLowerCase().includes(q);
        });
    }, [codeCatalog, searchQuery]);

    return (
        <div className="bg-[#121214]/90 border border-white/[0.08] rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl flex flex-col space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-lg bg-[#E8C15A]/10 text-[#E8C15A] flex items-center justify-center shrink-0">
                        <Terminal size={13} />
                    </div>
                    <span className="text-xs font-semibold text-white/90 tracking-tight">
                        Problem Code Inspector
                    </span>
                    {activeEntry && (
                        <div className="flex items-center gap-1.5 truncate">
                            <span className="text-[11px] font-mono text-[#E8C15A] font-semibold bg-[#E8C15A]/10 px-2 py-0.5 rounded-full border border-[#E8C15A]/20">
                                {activeEntry.display_label || `${activeEntry.contest_id} ${activeEntry.problem_id}`}
                            </span>
                            {getVerdictMiniBadge(activeEntry)}
                        </div>
                    )}
                </div>

                {activeEntry && (
                    <span className="text-[11px] text-white/40 font-mono shrink-0">
                        {activeEntry.language || 'C++'}
                    </span>
                )}
            </div>

            {/* 2-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-[420px]">
                {/* Problems List (4 cols) */}
                <div className="lg:col-span-4 bg-white/[0.02] border border-white/[0.06] rounded-xl p-2.5 flex flex-col space-y-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30 w-3.5 h-3.5" />
                        <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Filter (e.g. Loops, Lv 1, AC)..."
                            className="w-full bg-black/40 border border-white/[0.08] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#E8C15A] transition-colors"
                        />
                    </div>

                    <div className="space-y-1 overflow-y-auto max-h-[350px] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex-1">
                        {filteredCatalog.length === 0 ? (
                            <div className="text-center py-8 text-xs text-white/30 font-mono">
                                No problems found
                            </div>
                        ) : (
                            filteredCatalog.map((item) => {
                                const isSelected = (activeEntry?.key === item.key);
                                return (
                                    <button
                                        key={item.key}
                                        type="button"
                                        onClick={() => setSelectedKey(item.key)}
                                        className={`relative w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all active:scale-[0.98] cursor-pointer ${
                                            isSelected
                                                ? 'text-[#E8C15A] font-semibold bg-[#E8C15A]/10 border border-[#E8C15A]/25 shadow-xs'
                                                : 'text-white/70 hover:text-white hover:bg-white/[0.03] border border-transparent'
                                        }`}
                                    >
                                        <div className="truncate pr-2">
                                            <span className="font-mono block text-xs">
                                                {item.display_label || `${item.contest_id} ${item.problem_id}`}
                                            </span>
                                            {item.problem_title && (
                                                <span className="text-[10px] text-white/40 block truncate mt-0.5">
                                                    {item.problem_title}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {getVerdictMiniBadge(item)}
                                            <ChevronRight size={12} className={isSelected ? 'text-[#E8C15A]' : 'text-white/20'} />
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Code Window (8 cols) */}
                <div className="lg:col-span-8 bg-[#0A0A0C] border border-white/[0.06] rounded-xl p-3.5 flex flex-col justify-between shadow-inner">
                    <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/[0.06] text-xs">
                        <div className="flex items-center gap-2 truncate pr-2">
                            <span className="font-mono text-white/90 text-xs font-semibold truncate">
                                {activeEntry ? (activeEntry.display_label || `${activeEntry.contest_id} ${activeEntry.problem_id}`) : 'Code Preview'}
                            </span>
                            {activeEntry?.problem_title && (
                                <span className="text-white/40 text-[11px] truncate">
                                    • {activeEntry.problem_title}
                                </span>
                            )}
                            {activeEntry && getVerdictMiniBadge(activeEntry)}
                            {activeEntry?.attempts !== undefined && activeEntry.attempts > 0 && (
                                <span className="text-[10px] text-white/40 font-mono">
                                    (Attempt #{activeEntry.attempts})
                                </span>
                            )}
                        </div>

                        <button
                            onClick={handleCopy}
                            className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 text-white/70 hover:text-white transition-all text-xs flex items-center gap-1.5 border border-white/[0.06] shrink-0 cursor-pointer"
                        >
                            {copied ? <Check size={12} className="text-[#E8C15A]" /> : <Copy size={12} />}
                            <span>{copied ? 'Copied' : 'Copy'}</span>
                        </button>
                    </div>

                    <div className="font-mono text-xs overflow-x-auto max-h-[340px] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex-1 leading-relaxed">
                        <div className="flex text-white/85">
                            <div className="select-none text-white/20 text-right pr-3.5 border-r border-white/[0.08] space-y-0.5 shrink-0 font-mono text-[11px]">
                                {codeLines.map((_, i) => (
                                    <div key={i}>{i + 1}</div>
                                ))}
                            </div>
                            <div className="pl-3.5 space-y-0.5 whitespace-pre flex-1 text-[#E2E2E5]">
                                {codeLines.map((line, i) => (
                                    <div key={i} className="hover:bg-white/[0.02] rounded-xs px-1">
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
