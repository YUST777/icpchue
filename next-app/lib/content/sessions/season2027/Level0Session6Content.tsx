import Link from 'next/link';
import { Presentation, ExternalLink, Code2 } from 'lucide-react';

import SlideViewer from '@/components/sessions/SlideViewer';

const SLIDE_COUNT = 31;

/** Remaining problems from Sheet C (Arrays) to complete the full sheet (A-H, T, V were assigned in Session 04). */
const SHEET_C_REMAINING = [
    ['I', 'Smallest Pair'],
    ['J', 'Lucky Array'],
    ['K', 'Sum Digits'],
    ['L', 'Max Subarray'],
    ['M', 'Replace MinMax'],
    ['N', 'Check Code'],
    ['O', 'Fibonacci'],
    ['P', 'Minimize Number'],
    ['Q', 'Count Subarrays'],
    ['R', 'Permutation with arrays'],
    ['S', 'Search In Matrix'],
    ['U', 'Is B a subsequence of A?'],
    ['W', 'Mirror Array'],
    ['X', '8 Neighbors'],
    ['Y', 'Range sum query'],
    ['Z', 'Binary Search'],
] as const;

const PRACTICE_PROBLEMS = [
    {
        platform: 'HackerRank',
        title: 'Array Manipulation',
        url: 'https://www.hackerrank.com/challenges/crush',
        note: 'Classic difference array range-update problem.',
    },
    {
        platform: 'Codeforces 816B',
        title: 'Karen and Coffee',
        url: 'https://codeforces.com/problemset/problem/816/B',
        note: 'Difference array + prefix sum combined (1200).',
    },
];

export default function Level0Session6Content() {
    return (
        <div className="space-y-12 text-white/90">
            {/* Slide Deck Viewer */}
            <section className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h2 className="text-2xl font-medium text-white">Session slides</h2>
                    <a
                        href="/sessions/2027/level0/session-06/ICPC-HUE-Session-05-Complexity-Adhoc.pptx"
                        download="ICPC-HUE-Session-05-Complexity-Adhoc.pptx"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white/80 hover:text-white transition-colors self-start sm:self-auto"
                    >
                        <Presentation className="w-3.5 h-3.5 text-[#E8C15A]" />
                        <span>Download PowerPoint (PPTX)</span>
                    </a>
                </div>

                <SlideViewer
                    basePath="/sessions/2027/level0/session-06"
                    count={SLIDE_COUNT}
                    title="Session 06: Time Complexity & Ad-hoc"
                />
            </section>

            {/* Problems Discussed */}
            <section className="space-y-4 pt-6 border-t border-white/10">
                <div className="flex items-center gap-2">
                    <Code2 className="w-5 h-5 text-[#E8C15A]" />
                    <h2 className="text-xl font-medium text-white">Problems Covered</h2>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                    {PRACTICE_PROBLEMS.map((prob) => (
                        <a
                            key={prob.url}
                            href={prob.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-[#E8C15A]/40 transition-colors flex items-start justify-between gap-3 group"
                        >
                            <div className="space-y-1">
                                <div className="text-[11px] font-mono uppercase text-[#E8C15A]">{prob.platform}</div>
                                <div className="text-sm font-medium text-white group-hover:text-[#E8C15A] transition-colors">
                                    {prob.title}
                                </div>
                                <div className="text-xs text-white/60">{prob.note}</div>
                            </div>
                            <ExternalLink className="w-4 h-4 text-white/40 group-hover:text-[#E8C15A] shrink-0 mt-1" />
                        </a>
                    ))}
                </div>
            </section>

            {/* Assignment Section (التاسك) */}
            <section className="space-y-6 pt-8 border-t border-white/10">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Code2 className="w-6 h-6 text-[#E8C15A]" />
                        <h2 className="text-2xl font-bold text-white tracking-wide">التاسك &bull; Assignment</h2>
                    </div>
                    <p className="text-sm text-white/70">
                        Complete the rest of{' '}
                        <Link href="/dashboard/sheets/level-0/sheet-c" className="font-semibold text-[#E8C15A] hover:underline">
                            Sheet C (Arrays)
                        </Link>{' '}
                        to finish the full sheet (A&ndash;H, T, and V were assigned in Session 04).
                    </p>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <span>Remaining Problems</span>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#E8C15A]/15 text-[#E8C15A] border border-[#E8C15A]/30">
                                I&ndash;S, U, W&ndash;Z (16 problems)
                            </span>
                        </h3>
                        <Link
                            href="/dashboard/sheets/level-0/sheet-c"
                            className="text-xs text-white/60 hover:text-[#E8C15A] transition-colors"
                        >
                            Open Full Sheet &rarr;
                        </Link>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2">
                        {SHEET_C_REMAINING.map(([letter, title]) => (
                            <Link
                                key={letter}
                                href={`/dashboard/sheets/level-0/sheet-c/${letter}`}
                                className="group flex items-center gap-3 bg-[#121214] px-4 py-3 rounded-xl border border-white/10 hover:border-[#E8C15A]/40 transition-colors"
                            >
                                <span className="w-6 shrink-0 font-mono text-sm font-bold text-[#E8C15A]">{letter}</span>
                                <span className="flex-1 text-sm font-medium text-white/85 group-hover:text-white">{title}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
