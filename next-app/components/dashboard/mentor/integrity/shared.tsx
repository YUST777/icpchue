'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { GitCompare, X, Loader2 } from 'lucide-react';

export type Reason = 'identical' | 'rare_names' | 'rare_solution';
export interface StudentRef { userId: number; name: string; studentId: string; group: string | null }
export interface PairProblem { contestId: string; problem: string; label: string; similarity: number; reasons: Reason[]; rareNames: string[]; solvers: number; sameCount: number }
export interface PairCase { a: StudentRef; b: StudentRef; problems: PairProblem[]; score: number; level: 'high' | 'medium' | 'low' }
export interface BehaviourCase { student: StudentRef; pastedProblems: { contestId: string; problem: string; label: string; chars: number; keystrokes: number; activeSeconds: number }[] }
export interface Report {
    generatedAt: string;
    stats: { codes: number; problems: number; students: number };
    pairs: PairCase[];
    rings: { members: StudentRef[]; problems: number }[];
    behaviour: BehaviourCase[];
}

export function reasonText(p: PairProblem, r: Reason): string {
    if (r === 'identical') return 'Identical code (names and layout)';
    if (r === 'rare_names') return `Same rare variable names: ${p.rareNames.join(', ')}`;
    return `Unusual solution: only ${p.sameCount} of ${p.solvers} students wrote it`;
}

export function Person({ s }: { s: StudentRef }) {
    const masked = !s.studentId && s.name === 'Another student';
    const body = (
        <span className="inline-flex flex-col min-w-0">
            <span className={`text-sm font-semibold truncate ${masked ? 'text-white/50 italic' : 'text-white'}`}>{s.name}</span>
            <span className="text-[11px] text-white/40 font-mono truncate">
                {s.studentId || '—'}{s.group ? ` · ${s.group}` : ''}
            </span>
        </span>
    );
    return masked ? body : <Link href={`/dashboard/mentor/${s.userId}`} className="hover:underline min-w-0">{body}</Link>;
}

export function CompareModal({ pair, problem, onClose }: { pair: PairCase; problem: PairProblem; onClose: () => void }) {
    const [codes, setCodes] = useState<{ a: string | null; b: string | null } | null>(null);
    const [failed, setFailed] = useState(false);
    useEffect(() => {
        const params = new URLSearchParams({ a: String(pair.a.userId), b: String(pair.b.userId), contest: problem.contestId, p: problem.problem });
        fetch(`/api/mentor/integrity/code?${params}`, { credentials: 'include' })
            .then((r) => (r.ok ? r.json() : Promise.reject()))
            .then(setCodes)
            .catch(() => setFailed(true));
    }, [pair, problem]);

    // Lines present in both versions (ignoring spacing) are highlighted.
    const shared = useMemo(() => {
        if (!codes?.a || !codes?.b) return new Set<string>();
        const bLines = new Set(codes.b.split('\n').map(norm).filter((l) => l.length > 3));
        return new Set(codes.a.split('\n').map(norm).filter((l) => l.length > 3 && bLines.has(l)));
    }, [codes]);

    return (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3" onClick={onClose}>
            <div className="w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl bg-[#0F0F10] border border-white/10 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
                    <GitCompare size={16} className="text-[#E8C15A]" />
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{problem.label}</div>
                        <div className="text-[11px] text-white/40">Highlighted lines appear in both solutions · {Math.round(problem.similarity * 100)}% same structure</div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10"><X size={16} /></button>
                </div>
                {failed && <div className="p-6 text-sm text-red-400">Could not load the code.</div>}
                {!codes && !failed && <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-white/40" /></div>}
                {codes && (
                    <div className="flex-1 min-h-0 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-white/10 overflow-hidden">
                        <Pane who={pair.a} code={codes.a} shared={shared} />
                        <Pane who={pair.b} code={codes.b} shared={shared} />
                    </div>
                )}
            </div>
        </div>
    );
}

const norm = (l: string) => l.replace(/\s+/g, '');

function Pane({ who, code, shared }: { who: StudentRef; code: string | null | undefined; shared: Set<string> }) {
    return (
        <div className="flex-1 min-w-0 flex flex-col">
            <div className="px-3 py-2 border-b border-white/10 bg-[#161618]"><Person s={who} /></div>
            <pre className="flex-1 overflow-auto p-3 text-[12px] leading-5 font-mono">
                {code == null ? <span className="text-white/40">No saved code for this problem.</span> : code.split('\n').map((line, i) => (
                    <div key={i} className={shared.has(norm(line)) && norm(line).length > 3 ? 'bg-red-500/10 text-red-100' : 'text-white/70'}>{line || ' '}</div>
                ))}
            </pre>
        </div>
    );
}
