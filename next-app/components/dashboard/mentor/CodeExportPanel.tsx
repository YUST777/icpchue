'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Download, X, FileText, FolderArchive, FileCode2, Check, Minus, ChevronDown } from 'lucide-react';
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

const FORMATS: { id: ExportFormat; title: string; sub: string; ext: string; icon: React.ReactNode; tag?: string }[] = [
    { id: 'markdown', title: 'Markdown', sub: 'Readable report, grouped by sheet', ext: '.md', icon: <FileText size={18} />, tag: 'Reading' },
    { id: 'zip', title: 'ZIP', sub: 'Real source files in folders', ext: '.zip', icon: <FolderArchive size={18} />, tag: 'Running' },
    { id: 'single', title: 'One file', sub: 'All code with headers, easy to diff', ext: '.cpp', icon: <FileCode2 size={18} /> },
];

function Box({ state, onClick, label }: { state: 'on' | 'off' | 'mixed'; onClick: () => void; label: string }) {
    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={state === 'mixed' ? 'mixed' : state === 'on'}
            aria-label={label}
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            className={`w-[18px] h-[18px] rounded-[5px] border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                state === 'off' ? 'border-white/25 bg-black/30 hover:border-white/50' : 'border-[#E8C15A] bg-[#E8C15A] text-black'
            }`}
        >
            {state === 'on' && <Check size={12} strokeWidth={3.5} />}
            {state === 'mixed' && <Minus size={12} strokeWidth={3.5} />}
        </button>
    );
}

function Switch({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={on}
            disabled={disabled}
            onClick={() => onChange(!on)}
            className={`flex items-center gap-2.5 text-xs transition-colors ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer text-white/75 hover:text-white'}`}
        >
            <span className={`relative w-8 h-[18px] rounded-full transition-colors ${on ? 'bg-[#E8C15A]' : 'bg-white/15'}`}>
                <span className={`absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full bg-white transition-transform ${on ? 'translate-x-[14px] !bg-black' : ''}`} />
            </span>
            {label}
        </button>
    );
}

function verdictTone(e: ExportCodeEntry) {
    if (e.status === 'SOLVED') return 'text-[#E8C15A] bg-[#E8C15A]/10 border-[#E8C15A]/25';
    if (e.status === 'DRAFT') return 'text-white/40 bg-white/5 border-white/10';
    if (e.status === 'WRONG_ANSWER') return 'text-red-300 bg-red-500/10 border-red-500/25';
    return 'text-amber-300 bg-amber-500/10 border-amber-500/25';
}

export function CodeExportPanel({ trainee, catalog }: Props) {
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
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

    const counts = useMemo(() => {
        const ac = catalog.filter((e) => e.status === 'SOLVED').length;
        const drafts = catalog.filter((e) => e.status === 'DRAFT').length;
        return { all: catalog.length, ac, drafts, not_ac: catalog.length - ac - drafts };
    }, [catalog]);

    const openPanel = () => {
        setSelected(new Set(catalog.map((c) => c.key)));
        setCollapsed(new Set());
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

    const toggle = (key: string) => {
        setDone('');
        setSelected((s) => {
            const n = new Set(s);
            if (n.has(key)) n.delete(key);
            else n.add(key);
            return n;
        });
    };

    const toggleGroup = (list: ExportCodeEntry[]) => {
        setDone('');
        setSelected((s) => {
            const n = new Set(s);
            const all = list.every((e) => n.has(e.key));
            list.forEach((e) => (all ? n.delete(e.key) : n.add(e.key)));
            return n;
        });
    };

    const toggleCollapse = (g: string) =>
        setCollapsed((s) => {
            const n = new Set(s);
            if (n.has(g)) n.delete(g);
            else n.add(g);
            return n;
        });

    const quickPick = (q: Quick) => {
        setDone('');
        const pick = (e: ExportCodeEntry) =>
            q === 'all' ? true : q === 'ac' ? e.status === 'SOLVED' : q === 'drafts' ? e.status === 'DRAFT' : e.status !== 'SOLVED' && e.status !== 'DRAFT';
        setSelected(new Set(catalog.filter(pick).map((e) => e.key)));
    };

    const chosen = useMemo(() => catalog.filter((e) => selected.has(e.key)), [catalog, selected]);

    const doExport = () => {
        if (chosen.length === 0) return;
        setDone(runExport(trainee, chosen, { format, includeMeta, lineNumbers: format === 'markdown' && lineNumbers }));
    };

    if (catalog.length === 0) return null;

    const quickChips: [Quick, string][] = [
        ['all', 'All'],
        ['ac', 'Accepted'],
        ['not_ac', 'Not accepted'],
        ['drafts', 'Drafts'],
    ];

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
                    className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-md p-0 sm:p-4"
                    onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Export trainee code"
                >
                    <div className="w-full sm:max-w-xl max-h-[92vh] flex flex-col bg-[#0F0F11] border border-white/[0.09] rounded-t-3xl sm:rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.8)] overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center gap-3 px-5 pt-5 pb-4">
                            <div className="w-10 h-10 rounded-xl bg-[#E8C15A]/10 border border-[#E8C15A]/20 text-[#E8C15A] flex items-center justify-center shrink-0">
                                <Download size={18} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h2 className="text-base font-semibold text-white leading-tight">Export code</h2>
                                <p className="text-xs text-white/45 truncate">
                                    {trainee.name} <span className="text-white/25">/</span> {trainee.studentId}
                                    {trainee.handle ? <span className="text-white/25"> / {trainee.handle}</span> : null}
                                </p>
                            </div>
                            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="p-2 rounded-xl hover:bg-white/[0.06] text-white/50 hover:text-white transition-colors cursor-pointer">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-5 [scrollbar-width:thin]">
                            {/* Format */}
                            <div className="grid grid-cols-3 gap-2">
                                {FORMATS.map((f) => {
                                    const active = format === f.id;
                                    return (
                                        <button
                                            key={f.id}
                                            type="button"
                                            onClick={() => {
                                                setFormat(f.id);
                                                setDone('');
                                            }}
                                            className={`relative text-left p-3 rounded-2xl border transition-all cursor-pointer ${
                                                active ? 'border-[#E8C15A]/60 bg-[#E8C15A]/[0.08] shadow-[0_0_0_1px_rgba(232,193,90,0.15)]' : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04]'
                                            }`}
                                        >
                                            <div className={active ? 'text-[#E8C15A]' : 'text-white/55'}>{f.icon}</div>
                                            <div className={`mt-2 text-[13px] font-semibold ${active ? 'text-white' : 'text-white/80'}`}>{f.title}</div>
                                            <div className="text-[11px] text-white/40 leading-snug mt-0.5">{f.sub}</div>
                                            {f.tag && <span className="absolute top-2.5 right-2.5 text-[9px] font-mono uppercase tracking-wide text-[#E8C15A]/80">{f.tag}</span>}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Problems */}
                            <div>
                                <div className="flex items-center justify-between mb-2.5">
                                    <span className="text-xs font-semibold text-white/80">
                                        Problems <span className="text-white/35 font-normal">{chosen.length} of {catalog.length}</span>
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelected(new Set());
                                            setDone('');
                                        }}
                                        className="text-[11px] text-white/40 hover:text-white cursor-pointer"
                                    >
                                        Clear
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-1.5 mb-2.5">
                                    {quickChips.map(([q, label]) => (
                                        <button
                                            key={q}
                                            type="button"
                                            onClick={() => quickPick(q)}
                                            className="px-2.5 py-1 rounded-full text-[11px] text-white/60 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] transition-colors cursor-pointer"
                                        >
                                            {label} <span className="text-white/30 ml-0.5">{counts[q]}</span>
                                        </button>
                                    ))}
                                </div>

                                <div className="rounded-2xl border border-white/[0.07] bg-black/30 max-h-[260px] overflow-y-auto [scrollbar-width:thin]">
                                    {groups.map(([g, list], gi) => {
                                        const n = list.filter((e) => selected.has(e.key)).length;
                                        const state = n === list.length ? 'on' : n === 0 ? 'off' : 'mixed';
                                        const isCollapsed = collapsed.has(g);
                                        return (
                                            <div key={g} className={gi > 0 ? 'border-t border-white/[0.06]' : ''}>
                                                <div
                                                    onClick={() => toggleCollapse(g)}
                                                    className="flex items-center gap-2.5 px-3 py-2 bg-[#141416] sticky top-0 z-10 cursor-pointer select-none"
                                                >
                                                    <Box state={state} onClick={() => toggleGroup(list)} label={`Select ${g}`} />
                                                    <span className="text-xs font-semibold text-white/85 flex-1 truncate">{g}</span>
                                                    <span className="text-[10px] font-mono text-white/35">{n}/{list.length}</span>
                                                    <ChevronDown size={14} className={`text-white/30 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                                                </div>
                                                {!isCollapsed &&
                                                    list.map((e) => {
                                                        const on = selected.has(e.key);
                                                        return (
                                                            <div
                                                                key={e.key}
                                                                onClick={() => toggle(e.key)}
                                                                className="flex items-center gap-2.5 pl-4 pr-3 py-1.5 hover:bg-white/[0.03] cursor-pointer"
                                                            >
                                                                <Box state={on ? 'on' : 'off'} onClick={() => toggle(e.key)} label={`Select ${entryTitle(e)}`} />
                                                                <span className={`text-xs truncate flex-1 ${on ? 'text-white/85' : 'text-white/45'}`}>
                                                                    <span className="font-mono text-white/40 mr-1.5">{e.problem_id}</span>
                                                                    {e.problem_title || e.display_label}
                                                                </span>
                                                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md border shrink-0 ${verdictTone(e)}`}>{verdictLabel(e)}</span>
                                                            </div>
                                                        );
                                                    })}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Options */}
                            <div className="flex flex-wrap gap-x-6 gap-y-3 pt-1">
                                <Switch on={includeMeta} onChange={setIncludeMeta} label="Verdict, attempts and date" />
                                <Switch on={format === 'markdown' && lineNumbers} onChange={setLineNumbers} label="Line numbers" disabled={format !== 'markdown'} />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-white/[0.06] bg-black/30">
                            <span className="text-xs truncate">
                                {done ? (
                                    <span className="inline-flex items-center gap-1.5 text-[#E8C15A]">
                                        <Check size={13} /> Saved {done}
                                    </span>
                                ) : (
                                    <span className="text-white/45">
                                        {chosen.length} problem{chosen.length === 1 ? '' : 's'} as {FORMATS.find((f) => f.id === format)?.title}
                                    </span>
                                )}
                            </span>
                            <button
                                type="button"
                                disabled={chosen.length === 0}
                                onClick={doExport}
                                className="px-5 py-2 rounded-xl text-[13px] font-semibold bg-[#E8C15A] text-black hover:brightness-110 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-2 cursor-pointer shrink-0"
                            >
                                <Download size={14} />
                                Export
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
