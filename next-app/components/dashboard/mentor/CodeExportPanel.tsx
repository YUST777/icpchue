'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Download, X, FileText, FolderArchive, Printer, FileCode2, Check } from 'lucide-react';
import {
    ExportCodeEntry,
    ExportFormat,
    ExportTrainee,
    entryTitle,
    runExport,
    sheetGroup,
    verdictLabel,
} from '@/lib/mentor/code-export';

interface Props {
    trainee: ExportTrainee;
    catalog: ExportCodeEntry[];
}

type Quick = 'all' | 'ac' | 'not_ac' | 'drafts';

const FORMATS: { id: ExportFormat; title: string; desc: string; icon: React.ReactNode; tag?: string }[] = [
    { id: 'markdown', title: 'Markdown report', desc: 'One readable file: contents, grouped by sheet, verdicts, syntax-highlighted blocks.', icon: <FileText size={16} />, tag: 'Best for reading' },
    { id: 'html', title: 'Printable HTML', desc: 'Open in browser, print or save as PDF. Clean light theme with line numbers.', icon: <Printer size={16} /> },
    { id: 'zip', title: 'ZIP of source files', desc: 'Real .cpp/.py files in sheet folders plus INDEX.md. Compile and run them.', icon: <FolderArchive size={16} />, tag: 'Best for running' },
    { id: 'single', title: 'Single source file', desc: 'Everything in one file separated by headers. Easy to grep or diff.', icon: <FileCode2 size={16} /> },
];

export function CodeExportPanel({ trainee, catalog }: Props) {
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [format, setFormat] = useState<ExportFormat>('markdown');
    const [includeMeta, setIncludeMeta] = useState(true);
    const [lineNumbers, setLineNumbers] = useState(false);
    const [done, setDone] = useState('');

    const groups = useMemo(() => {
        const map = new Map<string, ExportCodeEntry[]>();
        for (const e of catalog) {
            const g = sheetGroup(e);
            if (!map.has(g)) map.set(g, []);
            map.get(g)!.push(e);
        }
        return [...map.entries()].sort(([a], [b]) => (a === 'Other' ? 1 : b === 'Other' ? -1 : a.localeCompare(b, undefined, { numeric: true })));
    }, [catalog]);

    const openPanel = () => {
        setSelected(new Set(catalog.map((c) => c.key)));
        setDone('');
        setOpen(true);
    };

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
        window.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = prev;
        };
    }, [open]);

    const toggle = (key: string) =>
        setSelected((s) => {
            const n = new Set(s);
            if (n.has(key)) n.delete(key);
            else n.add(key);
            return n;
        });

    const toggleGroup = (list: ExportCodeEntry[]) =>
        setSelected((s) => {
            const n = new Set(s);
            const all = list.every((e) => n.has(e.key));
            list.forEach((e) => (all ? n.delete(e.key) : n.add(e.key)));
            return n;
        });

    const quick = (q: Quick) => {
        const pick = (e: ExportCodeEntry) =>
            q === 'all' ? true : q === 'ac' ? e.status === 'SOLVED' : q === 'drafts' ? e.status === 'DRAFT' : e.status !== 'SOLVED' && e.status !== 'DRAFT';
        setSelected(new Set(catalog.filter(pick).map((e) => e.key)));
    };

    const chosen = useMemo(() => catalog.filter((e) => selected.has(e.key)), [catalog, selected]);
    const lineNumbersApplies = format === 'markdown' || format === 'html';

    const doExport = () => {
        if (chosen.length === 0) return;
        const opts = { format, includeMeta, lineNumbers: lineNumbersApplies && lineNumbers };
        setDone(runExport(trainee, chosen, opts));
    };

    if (catalog.length === 0) return null;

    return (
        <>
            <button
                type="button"
                onClick={openPanel}
                className="px-2.5 py-1 rounded-lg bg-[#E8C15A]/10 hover:bg-[#E8C15A]/20 active:scale-95 text-[#E8C15A] transition-all text-xs flex items-center gap-1.5 border border-[#E8C15A]/25 shrink-0 cursor-pointer"
            >
                <Download size={12} />
                <span>Export code</span>
            </button>

            {open && (
                <div
                    className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
                    onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Export trainee code"
                >
                    <div className="w-full sm:max-w-3xl max-h-[92vh] flex flex-col bg-[#121214] border border-white/[0.1] rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
                        <div className="flex items-start justify-between gap-3 p-4 border-b border-white/[0.06]">
                            <div className="min-w-0">
                                <h2 className="text-sm font-semibold text-white">Export code</h2>
                                <p className="text-[11px] text-white/40 truncate">
                                    {trainee.name} - {trainee.studentId}
                                    {trainee.handle ? ` - ${trainee.handle}` : ''}
                                </p>
                            </div>
                            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/50 hover:text-white cursor-pointer">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-5 [scrollbar-width:thin]">
                            {/* 1. Format */}
                            <section>
                                <h3 className="text-[11px] font-mono uppercase tracking-wider text-white/40 mb-2">1. Format</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {FORMATS.map((f) => {
                                        const active = format === f.id;
                                        return (
                                            <button
                                                key={f.id}
                                                type="button"
                                                onClick={() => setFormat(f.id)}
                                                className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${active ? 'border-[#E8C15A]/50 bg-[#E8C15A]/10' : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04]'}`}
                                            >
                                                <div className={`flex items-center gap-2 text-xs font-semibold ${active ? 'text-[#E8C15A]' : 'text-white/85'}`}>
                                                    {f.icon}
                                                    {f.title}
                                                    {f.tag && <span className="ml-auto text-[9px] font-mono text-[#E8C15A]/80 bg-[#E8C15A]/10 px-1.5 py-0.5 rounded-full">{f.tag}</span>}
                                                </div>
                                                <p className="text-[11px] text-white/45 mt-1 leading-snug">{f.desc}</p>
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>

                            {/* 2. Selection */}
                            <section>
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                    <h3 className="text-[11px] font-mono uppercase tracking-wider text-white/40">2. Problems ({chosen.length}/{catalog.length})</h3>
                                    <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/[0.06]">
                                        {([['all', 'All'], ['ac', 'AC only'], ['not_ac', 'Not AC'], ['drafts', 'Drafts']] as [Quick, string][]).map(([q, label]) => (
                                            <button key={q} type="button" onClick={() => quick(q)} className="px-2 py-0.5 rounded-md text-[11px] font-mono text-white/50 hover:text-white cursor-pointer">
                                                {label}
                                            </button>
                                        ))}
                                        <button type="button" onClick={() => setSelected(new Set())} className="px-2 py-0.5 rounded-md text-[11px] font-mono text-white/50 hover:text-white cursor-pointer">
                                            None
                                        </button>
                                    </div>
                                </div>
                                <div className="border border-white/[0.06] rounded-xl divide-y divide-white/[0.05] max-h-64 overflow-y-auto [scrollbar-width:thin]">
                                    {groups.map(([g, list]) => {
                                        const all = list.every((e) => selected.has(e.key));
                                        const some = !all && list.some((e) => selected.has(e.key));
                                        return (
                                            <div key={g}>
                                                <label className="flex items-center gap-2 px-3 py-2 bg-white/[0.03] cursor-pointer sticky top-0">
                                                    <input
                                                        type="checkbox"
                                                        checked={all}
                                                        ref={(el) => {
                                                            if (el) el.indeterminate = some;
                                                        }}
                                                        onChange={() => toggleGroup(list)}
                                                        className="accent-[#E8C15A]"
                                                    />
                                                    <span className="text-xs font-semibold text-white/80">{g}</span>
                                                    <span className="text-[10px] text-white/30 font-mono">{list.filter((e) => selected.has(e.key)).length}/{list.length}</span>
                                                </label>
                                                {list.map((e) => (
                                                    <label key={e.key} className="flex items-center gap-2 pl-7 pr-3 py-1.5 hover:bg-white/[0.03] cursor-pointer">
                                                        <input type="checkbox" checked={selected.has(e.key)} onChange={() => toggle(e.key)} className="accent-[#E8C15A]" />
                                                        <span className="text-[11px] text-white/70 truncate flex-1">{entryTitle(e)}</span>
                                                        <span className={`text-[10px] font-mono shrink-0 ${e.status === 'SOLVED' ? 'text-[#E8C15A]' : e.status === 'DRAFT' ? 'text-white/30' : 'text-red-300/80'}`}>{verdictLabel(e)}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>

                            {/* 3. Options */}
                            <section>
                                <h3 className="text-[11px] font-mono uppercase tracking-wider text-white/40 mb-2">3. Options</h3>
                                <div className="flex flex-wrap gap-x-5 gap-y-2">
                                    <label className="flex items-center gap-2 text-xs text-white/70 cursor-pointer">
                                        <input type="checkbox" checked={includeMeta} onChange={(e) => setIncludeMeta(e.target.checked)} className="accent-[#E8C15A]" />
                                        Verdict, attempts and date per problem
                                    </label>
                                    <label className={`flex items-center gap-2 text-xs cursor-pointer ${lineNumbersApplies ? 'text-white/70' : 'text-white/25 cursor-not-allowed'}`}>
                                        <input type="checkbox" disabled={!lineNumbersApplies} checked={lineNumbersApplies && lineNumbers} onChange={(e) => setLineNumbers(e.target.checked)} className="accent-[#E8C15A]" />
                                        Line numbers (Markdown / HTML)
                                    </label>
                                </div>
                            </section>
                        </div>

                        <div className="flex items-center justify-between gap-3 p-4 border-t border-white/[0.06] bg-black/20">
                            <span className="text-[11px] text-white/40 truncate">
                                {done ? (
                                    <span className="inline-flex items-center gap-1 text-[#E8C15A]">
                                        <Check size={12} /> Saved {done}
                                    </span>
                                ) : (
                                    `${chosen.length} problem${chosen.length === 1 ? '' : 's'} selected`
                                )}
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                                <button type="button" onClick={() => setOpen(false)} className="px-3 py-1.5 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/[0.05] cursor-pointer">
                                    Close
                                </button>
                                <button
                                    type="button"
                                    disabled={chosen.length === 0}
                                    onClick={doExport}
                                    className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#E8C15A] text-black hover:brightness-110 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 cursor-pointer"
                                >
                                    <Download size={13} />
                                    Export
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
