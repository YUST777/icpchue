'use client';

import React, { useState } from 'react';
import { ShieldAlert, ShieldCheck, AlertTriangle, GitCompare, ClipboardPaste, Users, Loader2 } from 'lucide-react';
import { CompareModal, Person, reasonText, type PairCase, type PairProblem, type StudentRef } from './shared';

export interface StudentIntegrity {
    verdict: 'likely' | 'suspicious' | 'clean';
    matches: { other: StudentRef; problems: PairProblem[]; level: 'high' | 'medium' | 'low'; score: number }[];
    groupSize: number;
    groupProblems: number;
    pasted: { contestId: string; problem: string; label: string; chars: number; keystrokes: number; activeSeconds: number }[];
    generatedAt: string;
}

/** Code-match verdict for one trainee, shown at the top of the Cheating Flags tab. */
export function CodeMatchesPanel({ me, data, loading }: { me: StudentRef; data: StudentIntegrity | null; loading: boolean }) {
    const [compare, setCompare] = useState<{ pair: PairCase; problem: PairProblem } | null>(null);
    const [showPasted, setShowPasted] = useState(false);

    if (loading && !data) {
        return (
            <div className="bg-[#121214]/90 border border-white/[0.08] rounded-2xl p-6 flex items-center gap-2 text-xs text-white/50">
                <Loader2 size={14} className="animate-spin" /> Comparing this student&apos;s code with everyone else&apos;s…
            </div>
        );
    }
    if (!data) return null;

    const otherCount = data.matches.length;
    const problemCount = new Set(data.matches.flatMap((m) => m.problems.map((p) => `${p.contestId}:${p.problem}`))).size;

    const banner = data.verdict === 'likely'
        ? {
            box: 'bg-red-500/10 border-red-500/30', icon: <ShieldAlert size={20} className="text-red-400" />,
            title: 'This student likely cheated',
            text: `Their code is the same as ${otherCount} other student${otherCount === 1 ? '' : 's'} on ${problemCount} problem${problemCount === 1 ? '' : 's'}${data.groupSize ? `, as part of a group of ${data.groupSize} students sharing code on ${data.groupProblems} problems` : ''}. Matches like these are very unlikely by chance.`,
        }
        : data.verdict === 'suspicious'
            ? {
                box: 'bg-amber-500/10 border-amber-500/30', icon: <AlertTriangle size={20} className="text-amber-400" />,
                title: 'Suspicious: some code matches other students',
                text: `Their code matches ${otherCount} other student${otherCount === 1 ? '' : 's'} on ${problemCount} problem${problemCount === 1 ? '' : 's'} in ways that are rare. Worth a look.`,
            }
            : {
                box: 'bg-emerald-500/10 border-emerald-500/25', icon: <ShieldCheck size={20} className="text-emerald-400" />,
                title: 'No matching code',
                text: 'Their solutions do not match other students beyond the usual obvious solutions.',
            };

    return (
        <div className="bg-[#121214]/90 border border-white/[0.08] rounded-2xl p-4 space-y-4">
            <div className={`flex gap-3 p-4 rounded-xl border ${banner.box}`}>
                <div className="shrink-0 mt-0.5">{banner.icon}</div>
                <div>
                    <div className="text-sm font-bold text-white">{banner.title}</div>
                    <p className="text-xs text-white/70 mt-1 leading-relaxed">{banner.text}</p>
                    {data.verdict !== 'clean' && (
                        <p className="text-[11px] text-white/45 mt-2">Confirm before acting: ask the student to explain their code or solve one of these problems live.</p>
                    )}
                </div>
            </div>

            {data.matches.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-white/80">
                        <Users size={14} className="text-[#E8C15A]" /> Students with the same code
                    </div>
                    {data.matches.map((m) => {
                        const pair: PairCase = { a: me, b: m.other, problems: m.problems, score: m.score, level: m.level };
                        return (
                            <div key={m.other.userId} className="rounded-xl border border-white/[0.08] bg-black/20 overflow-hidden">
                                <div className="flex items-center gap-3 px-3 py-2.5 border-b border-white/[0.06]">
                                    <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase ${m.level === 'high' ? 'bg-red-500/15 text-red-400 border-red-500/30' : 'bg-amber-500/15 text-amber-400 border-amber-500/30'}`}>{m.level}</span>
                                    <div className="flex-1 min-w-0"><Person s={m.other} /></div>
                                    <span className="text-xs text-white/60">same code on <b className="text-white">{m.problems.length}</b> problem{m.problems.length === 1 ? '' : 's'}</span>
                                </div>
                                <div className="divide-y divide-white/[0.04]">
                                    {m.problems.map((pr) => (
                                        <div key={`${pr.contestId}:${pr.problem}`} className="flex flex-col md:flex-row md:items-center gap-2 px-3 py-2.5">
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs text-white/85 truncate">{pr.label}</div>
                                                <div className="flex flex-wrap gap-1.5 mt-1">
                                                    {pr.reasons.map((r) => (
                                                        <span key={r} className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-white/55">{reasonText(pr, r)}</span>
                                                    ))}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setCompare({ pair, problem: pr })}
                                                className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#E8C15A]/10 border border-[#E8C15A]/30 text-[11px] text-[#E8C15A] hover:bg-[#E8C15A]/20"
                                            >
                                                <GitCompare size={12} /> Compare code
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {data.pasted.length > 0 && (
                <div className="rounded-xl border border-white/[0.08] bg-black/20">
                    <button onClick={() => setShowPasted(!showPasted)} className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-xs text-white/75 hover:bg-white/[0.02]">
                        <ClipboardPaste size={14} className="text-[#E8C15A]" />
                        <span className="flex-1">{data.pasted.length} solution{data.pasted.length === 1 ? '' : 's'} pasted into the editor instead of typed</span>
                        <span className="text-white/40">{showPasted ? 'Hide' : 'Show'}</span>
                    </button>
                    {showPasted && (
                        <div className="border-t border-white/[0.06] divide-y divide-white/[0.04]">
                            {data.pasted.map((p) => (
                                <div key={`${p.contestId}:${p.problem}`} className="flex items-center gap-3 px-3 py-2 text-[11px]">
                                    <span className="flex-1 text-white/75 truncate">{p.label}</span>
                                    <span className="text-white/45 font-mono">{p.chars} chars</span>
                                    <span className="text-white/45 font-mono">{p.keystrokes} keys typed</span>
                                    <span className="text-white/45 font-mono w-20 text-right">{Math.round(p.activeSeconds)}s on page</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {compare && <CompareModal pair={compare.pair} problem={compare.problem} onClose={() => setCompare(null)} />}
        </div>
    );
}
