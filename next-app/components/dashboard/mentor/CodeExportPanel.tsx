'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, X, FileText, FolderArchive, FileCode2, Check, ChevronDown } from 'lucide-react';
import {
    ExportCodeEntry,
    ExportFormat,
    ExportTrainee,
    entryTitle,
    runExport,
    sheetGroup,
    verdictLabel,
} from '@/lib/mentor/code-export';

/*
 * Design notes (ux-ui-agent-skills rules applied):
 * - globals.css forces 44px min size on every <button>/<input>, so the small
 *   controls are real inputs (sr-only, min-size reset) with a drawn box overlay.
 * - One SVG, two paths (check + dash), same stroke weight.
 * - Every control: default / hover / focus-visible / active / selected / disabled.
 * - One thing leads: the selected-count figure. Mobile is the base layout; the
 *   two-pane split layers on at lg.
 */

interface Props {
    trainee: ExportTrainee;
    catalog: ExportCodeEntry[];
}

type Quick = 'all' | 'ac' | 'not_ac' | 'drafts';

const FORMATS: { id: ExportFormat; title: string; sub: string; icon: React.ReactNode; tag?: string }[] = [
    { id: 'markdown', title: 'Markdown report', sub: 'One readable file grouped by sheet', icon: <FileText size={18} />, tag: 'Reading' },
    { id: 'zip', title: 'ZIP of files', sub: '.cpp / .py in sheet folders + index', icon: <FolderArchive size={18} />, tag: 'Running' },
    { id: 'single', title: 'Single file', sub: 'All code with headers, easy to diff', icon: <FileCode2 size={18} /> },
];

const RING = 'peer-focus-visible:ring-2 peer-focus-visible:ring-[#E8C15A]/70 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[#0F0F11]';

function CheckBox({
    checked,
    indeterminate = false,
    onChange,
    label,
    children,
    className = '',
}: {
    checked: boolean;
    indeterminate?: boolean;
    onChange: () => void;
    label: string;
    children?: React.ReactNode;
    className?: string;
}) {
    const ref = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (ref.current) ref.current.indeterminate = indeterminate;
    }, [indeterminate]);
    const on = checked || indeterminate;
    return (
        <label className={`relative flex items-center gap-3 cursor-pointer select-none ${className}`}>
            <input
                ref={ref}
                type="checkbox"
                checked={checked}
                onChange={onChange}
                aria-label={label}
                className="peer sr-only !min-h-0 !min-w-0"
            />
            <span
                aria-hidden
                className={`w-[18px] h-[18px] rounded-[5px] border-[1.5px] flex items-center justify-center shrink-0 transition-colors peer-active:scale-90 ${RING} ${
                    on ? 'bg-[#E8C15A] border-[#E8C15A] text-black' : 'bg-black/30 border-white/30 hover:border-white/60'
                }`}
            >
                <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    {checked && !indeterminate && <path d="M3.5 8.5l3 3 6-7" />}
                    {indeterminate && <path d="M4 8h8" />}
                </svg>
            </span>
            {children}
        </label>
    );
}

function Switch({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
    return (
        <label className={`relative flex items-center justify-between gap-3 select-none ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer group'}`}>
            <span className={`text-[13px] ${disabled ? 'text-white/50' : 'text-white/75 group-hover:text-white'} transition-colors`}>{label}</span>
            <input
                type="checkbox"
                role="switch"
                checked={on}
                disabled={disabled}
                onChange={(e) => onChange(e.target.checked)}
                className="peer sr-only !min-h-0 !min-w-0"
            />
            <span aria-hidden className={`relative w-9 h-5 rounded-full shrink-0 transition-colors ${RING} ${on ? 'bg-[#E8C15A]' : 'bg-white/15 group-hover:bg-white/25'}`}>
                <span className={`absolute top-[3px] left-[3px] w-[14px] h-[14px] rounded-full transition-transform ${on ? 'translate-x-4 bg-black' : 'bg-white'}`} />
            </span>
        </label>
    );
}

function verdictTone(e: ExportCodeEntry) {
    if (e.status === 'SOLVED') return 'text-[#E8C15A] bg-[#E8C15A]/10 border-[#E8C15A]/25';
    if (e.status === 'DRAFT') return 'text-white/45 bg-white/5 border-white/10';
    if (e.status === 'WRONG_ANSWER') return 'text-red-300 bg-red-500/10 border-red-500/25';
    return 'text-amber-300 bg-amber-500/10 border-amber-500/25';
}

const SMALL_BTN = '!min-h-0 !min-w-0';

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
    const chosenAc = chosen.filter((e) => e.status === 'SOLVED').length;
    const chosenDrafts = chosen.filter((e) => e.status === 'DRAFT').length;

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
                className={`${SMALL_BTN} h-11 sm:h-auto px-2.5 py-1 rounded-lg bg-[#E8C15A]/10 hover:bg-[#E8C15A]/20 active:scale-95 text-[#E8C15A] transition-all text-xs flex items-center gap-1.5 border border-[#E8C15A]/25 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8C15A]/70`}
            >
                <Download size={12} />
                <span>Export code</span>
            </button>

            {open && typeof document !== 'undefined' && createPortal(
                <div
                    className="mentor-ui fixed inset-0 !z-[99999] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-md p-0 sm:p-6"
                    onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Export trainee code"
                >
                    <div className="w-full sm:max-w-5xl max-h-[94dvh] sm:max-h-[86dvh] flex flex-col bg-[#0F0F11] border border-white/[0.09] rounded-t-3xl sm:rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.8)] overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06] shrink-0">
                            <div className="w-10 h-10 rounded-xl bg-[#E8C15A]/10 border border-[#E8C15A]/20 text-[#E8C15A] flex items-center justify-center shrink-0">
                                <Download size={18} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h2 className="text-base font-semibold text-white leading-tight">Export code</h2>
                                <p className="text-xs text-white/50 truncate">
                                    {trainee.name} <span className="text-white/25">/</span> {trainee.studentId}
                                    {trainee.handle ? <span className="text-white/35"> / {trainee.handle}</span> : null}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                aria-label="Close"
                                className={`${SMALL_BTN} w-11 h-11 sm:w-9 sm:h-9 shrink-0 flex items-center justify-center rounded-xl hover:bg-white/[0.07] active:scale-95 text-white/55 hover:text-white transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8C15A]/70`}
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Body: single column on mobile, two panes from lg */}
                        <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)]">
                            {/* Left: format, options, summary */}
                            <div className="p-5 space-y-6 lg:overflow-y-auto lg:border-r border-white/[0.06] [scrollbar-width:thin]">
                                <section>
                                    <h3 className="text-[11px] font-mono uppercase tracking-wider text-white/40 mb-2.5">Format</h3>
                                    <div role="radiogroup" aria-label="Export format" className="space-y-2">
                                        {FORMATS.map((f) => (
                                            <label key={f.id} className="relative block cursor-pointer group">
                                                <input
                                                    type="radio"
                                                    name="export-format"
                                                    checked={format === f.id}
                                                    onChange={() => {
                                                        setFormat(f.id);
                                                        setDone('');
                                                    }}
                                                    className="peer sr-only !min-h-0 !min-w-0"
                                                />
                                                <div
                                                    className={`flex items-center gap-3 p-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] transition-all group-hover:bg-white/[0.05] group-active:scale-[0.99] peer-focus-visible:ring-2 peer-focus-visible:ring-[#E8C15A]/70 peer-checked:border-[#E8C15A]/60 peer-checked:bg-[#E8C15A]/[0.08] ${format === f.id ? 'text-[#E8C15A]' : 'text-white/55'}`}
                                                >
                                                    <span className="shrink-0">{f.icon}</span>
                                                    <span className="min-w-0 flex-1">
                                                        <span className={`block text-[13px] font-semibold ${format === f.id ? 'text-white' : 'text-white/85'}`}>{f.title}</span>
                                                        <span className="block text-[11px] text-white/45 leading-snug">{f.sub}</span>
                                                    </span>
                                                    {f.tag && <span className="text-[9px] font-mono uppercase tracking-wide text-[#E8C15A]/80 shrink-0">{f.tag}</span>}
                                                    <span aria-hidden className={`w-4 h-4 rounded-full border-[1.5px] flex items-center justify-center shrink-0 ${format === f.id ? 'border-[#E8C15A]' : 'border-white/30'}`}>
                                                        {format === f.id && <span className="w-2 h-2 rounded-full bg-[#E8C15A]" />}
                                                    </span>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </section>

                                <section className="space-y-3.5">
                                    <h3 className="text-[11px] font-mono uppercase tracking-wider text-white/40">Options</h3>
                                    <Switch on={includeMeta} onChange={setIncludeMeta} label="Verdict, attempts and date" />
                                    <Switch on={format === 'markdown' && lineNumbers} onChange={setLineNumbers} label="Line numbers (Markdown)" disabled={format !== 'markdown'} />
                                </section>

                                {/* Lead figure */}
                                <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-5xl font-semibold tracking-tight text-white tabular-nums leading-none">{chosen.length}</span>
                                        <span className="text-sm text-white/45">of {catalog.length} selected</span>
                                    </div>
                                    <div className="flex gap-4 mt-3 text-[11px] text-white/50">
                                        <span><span className="text-[#E8C15A] font-semibold">{chosenAc}</span> accepted</span>
                                        <span><span className="text-amber-300 font-semibold">{chosen.length - chosenAc - chosenDrafts}</span> attempted</span>
                                        <span><span className="text-white/70 font-semibold">{chosenDrafts}</span> drafts</span>
                                    </div>
                                </section>
                            </div>

                            {/* Right: problems fill the full height */}
                            <div className="p-5 flex flex-col min-h-0 min-w-0">
                                <div className="flex items-center justify-between mb-3 shrink-0">
                                    <h3 className="text-[11px] font-mono uppercase tracking-wider text-white/40">Problems</h3>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelected(new Set());
                                            setDone('');
                                        }}
                                        className={`${SMALL_BTN} text-xs text-white/50 hover:text-white px-2 py-1 rounded-md hover:bg-white/[0.06] active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8C15A]/70`}
                                    >
                                        Clear
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-1.5 mb-3 shrink-0">
                                    {quickChips.map(([q, label]) => (
                                        <button
                                            key={q}
                                            type="button"
                                            onClick={() => quickPick(q)}
                                            className={`${SMALL_BTN} px-3 py-1.5 rounded-full text-xs text-white/65 hover:text-white bg-white/[0.04] hover:bg-white/[0.09] active:scale-95 border border-white/[0.08] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8C15A]/70`}
                                        >
                                            {label} <span className="text-white/35 ml-1 tabular-nums">{counts[q]}</span>
                                        </button>
                                    ))}
                                </div>

                                <div className="rounded-2xl border border-white/[0.07] bg-black/30 overflow-y-auto max-h-72 lg:max-h-none lg:flex-1 min-h-0 [scrollbar-width:thin]">
                                    {groups.map(([g, list], gi) => {
                                        const n = list.filter((e) => selected.has(e.key)).length;
                                        const all = n === list.length;
                                        const isCollapsed = collapsed.has(g);
                                        return (
                                            <div key={g} className={gi > 0 ? 'border-t border-white/[0.06]' : ''}>
                                                <div className="flex items-center gap-2 px-3 py-2.5 bg-[#141416] sticky top-0 z-10">
                                                    <CheckBox checked={all} indeterminate={!all && n > 0} onChange={() => toggleGroup(list)} label={`Select all in ${g}`} className="flex-1 min-w-0">
                                                        <span className="text-[13px] font-semibold text-white/90 truncate">{g}</span>
                                                        <span className="text-[11px] font-mono text-white/35 tabular-nums">{n}/{list.length}</span>
                                                    </CheckBox>
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleCollapse(g)}
                                                        aria-expanded={!isCollapsed}
                                                        aria-label={isCollapsed ? `Expand ${g}` : `Collapse ${g}`}
                                                        className={`${SMALL_BTN} p-1.5 rounded-md text-white/40 hover:text-white hover:bg-white/[0.07] active:scale-90 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8C15A]/70`}
                                                    >
                                                        <ChevronDown size={15} className={`transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                                                    </button>
                                                </div>
                                                {!isCollapsed &&
                                                    list.map((e) => {
                                                        const on = selected.has(e.key);
                                                        return (
                                                            <CheckBox
                                                                key={e.key}
                                                                checked={on}
                                                                onChange={() => toggle(e.key)}
                                                                label={entryTitle(e)}
                                                                className={`pl-6 pr-3 py-2 hover:bg-white/[0.04] active:bg-white/[0.06] transition-colors ${on ? 'bg-[#E8C15A]/[0.04]' : ''}`}
                                                            >
                                                                <span className={`text-[13px] truncate flex-1 min-w-0 ${on ? 'text-white/90' : 'text-white/50'}`}>
                                                                    <span className="font-mono text-white/40 mr-2">{e.problem_id}</span>
                                                                    {e.problem_title || e.display_label}
                                                                </span>
                                                                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md border shrink-0 ${verdictTone(e)}`}>{verdictLabel(e)}</span>
                                                            </CheckBox>
                                                        );
                                                    })}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex flex-col items-stretch gap-3 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4 border-t border-white/[0.06] bg-black/30 shrink-0">
                            <span className="text-xs truncate" aria-live="polite">
                                {done ? (
                                    <span className="inline-flex items-center gap-1.5 text-[#E8C15A]">
                                        <Check size={13} /> Saved {done}
                                    </span>
                                ) : (
                                    <span className="text-white/50">
                                        {chosen.length} problem{chosen.length === 1 ? '' : 's'} as {FORMATS.find((f) => f.id === format)?.title}
                                    </span>
                                )}
                            </span>
                            <button
                                type="button"
                                disabled={chosen.length === 0}
                                onClick={doExport}
                                className="min-h-11 w-full px-6 py-2.5 rounded-xl text-sm font-semibold bg-[#E8C15A] text-black hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F0F11] sm:w-auto"
                            >
                                <Download size={15} />
                                Export
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
