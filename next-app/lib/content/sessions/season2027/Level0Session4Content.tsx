import Link from 'next/link';
import { Download, FileText, Presentation, ExternalLink, AlertTriangle, Code2 } from 'lucide-react';

import SlideViewer from '@/components/sessions/SlideViewer';

const SLIDE_COUNT = 25;

/** Required Assignment: Level 0, Sheet C (Arrays) - Problems A to H, plus T and V. */
const REQUIRED_ASSIGNMENT = [
    ['A', 'Summation'],
    ['B', 'Searching'],
    ['C', 'Replacement'],
    ['D', 'Positions in array'],
    ['E', 'Lowest Number'],
    ['F', 'Reversing'],
    ['G', 'Palindrome Array'],
    ['H', 'Sorting'],
    ['T', 'Matrix'],
    ['V', 'Frequency Array'],
] as const;

/** Problems solved live in the session with direct Codeforces links. */
const LIVE_PROBLEMS = [
    {
        letter: 'V',
        title: 'Frequency Array',
        contest: 'Sheet C (Arrays)',
        url: 'https://codeforces.com/group/MWSDmqGsZm/contest/219774/problem/V',
        technique: 'Frequency Array (Index = Value) in O(N + M)',
    },
    {
        letter: 'F',
        title: 'ICPC Balloons',
        contest: 'Contest 728697',
        url: 'https://codeforces.com/group/lEfcMyt0UC/contest/728697/problem/F',
        technique: 'Character mapping c - \'A\' + 1 with frequency table',
    },
    {
        letter: 'S',
        title: 'Search In Matrix',
        contest: 'Sheet C (Arrays)',
        url: 'https://codeforces.com/group/MWSDmqGsZm/contest/219774/problem/S',
        technique: '2D Arrays / Nested loops & early exit (return 0)',
    },
];

/** Extra study materials for trainees. */
const STUDY_MORE: { title: string; url: string; note?: string }[] = [
    {
        title: 'CP-Algorithms: Fundamentals of Arrays & Dynamic Allocation',
        url: 'https://cp-algorithms.com/',
        note: 'Deep dive into memory alignment, cache friendliness, and STL array wrappers.',
    },
    {
        title: 'USACO Guide: Basic Data Structures (Arrays & Vectors)',
        url: 'https://usaco.guide/bronze/intro-ds',
        note: 'Clear beginner guide with visual diagrams and practice problems.',
    },
];

export default function Level0Session4Content() {
    return (
        <div className="space-y-12 text-white/90">
            {/* Slide Deck Viewer */}
            <section className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h2 className="text-2xl font-medium text-white">Session slides</h2>
                    <a
                        href="/sessions/2027/level0/session-04/ICPC-HUE-Session-04-Arrays.pptx"
                        download="ICPC-HUE-Session-04-Arrays.pptx"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white/80 hover:text-white transition-colors self-start sm:self-auto"
                    >
                        <Presentation className="w-3.5 h-3.5 text-[#E8C15A]" />
                        <span>Download PowerPoint (PPTX)</span>
                    </a>
                </div>

                <SlideViewer
                    basePath="/sessions/2027/level0/session-04"
                    count={SLIDE_COUNT}
                    title="Session 04: Arrays & Frequency Arrays"
                />
            </section>

            {/* Live Problems Walkthrough */}
            <section className="space-y-4 pt-8 border-t border-white/10">
                <div className="space-y-1">
                    <h2 className="text-2xl font-medium text-white flex items-center gap-2">
                        <Code2 className="w-6 h-6 text-[#E8C15A]" />
                        <span>Problems Solved Live</span>
                    </h2>
                    <p className="text-sm text-white/60">
                        Problems solved and analyzed step-by-step during this session:
                    </p>
                </div>

                <div className="grid sm:grid-cols-3 gap-3">
                    {LIVE_PROBLEMS.map((prob) => (
                        <a
                            key={prob.title}
                            href={prob.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group p-4 rounded-xl bg-[#121214] border border-white/10 hover:border-[#E8C15A]/40 transition-colors flex flex-col justify-between"
                        >
                            <div>
                                <div className="flex items-center justify-between text-xs text-white/50 mb-1">
                                    <span className="font-mono">{prob.contest}</span>
                                    <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-[#E8C15A]" />
                                </div>
                                <h3 className="text-base font-semibold text-white group-hover:text-[#E8C15A] transition-colors">
                                    {prob.letter}. {prob.title}
                                </h3>
                            </div>
                            <p className="text-xs text-white/60 mt-3 font-mono">
                                {prob.technique}
                            </p>
                        </a>
                    ))}
                </div>
            </section>

            {/* Critical Traps Callout */}
            <section className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-medium text-sm">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Two Critical Traps Every Beginner Falls Into:</span>
                </div>
                <div className="grid sm:grid-cols-2 gap-4 text-xs text-white/75">
                    <div className="space-y-1">
                        <span className="font-semibold text-white">1. Out of Bounds Access:</span>
                        <p>
                            Valid indices for an array of size <code className="text-[#E8C15A]">n</code> are{' '}
                            <code className="text-[#E8C15A]">0</code> to <code className="text-[#E8C15A]">n - 1</code>.
                            Accessing <code className="text-[#E8C15A]">a[n]</code> is memory you don&apos;t own and causes Runtime Error or undefined behavior.
                        </p>
                    </div>
                    <div className="space-y-1">
                        <span className="font-semibold text-white">2. Frequency Array Sizing:</span>
                        <p>
                            If numbers can reach value <code className="text-[#E8C15A]">M</code>, your frequency array size must be{' '}
                            <code className="text-[#E8C15A]">M + 1</code> (or global <code className="text-[#E8C15A]">const int N = 1e5 + 5;</code>) so index <code className="text-[#E8C15A]">M</code> actually exists!
                        </p>
                    </div>
                </div>
            </section>

            {/* Assignment Section */}
            <section className="space-y-6 pt-8 border-t border-white/10">
                <div className="space-y-1">
                    <h2 className="text-2xl font-medium text-white">Session Assignment</h2>
                    <p className="text-sm text-white/70">
                        Solve the assigned 10 problems from{' '}
                        <Link href="/dashboard/sheets/level-0/sheet-c" className="font-semibold text-[#E8C15A] hover:underline">
                            Sheet C (Arrays)
                        </Link>{' '}
                        on Codeforces to solidify 1D arrays, frequency counting, and 2D matrices.
                    </p>
                </div>

                <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <span>Required Problems</span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#E8C15A]/15 text-[#E8C15A] border border-[#E8C15A]/30">
                            A to H, T, V (10 problems)
                        </span>
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-2">
                        {REQUIRED_ASSIGNMENT.map(([letter, title]) => (
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

            {/* Want to Study More */}
            <section className="space-y-4 pt-8 border-t border-white/10">
                <h2 className="text-2xl font-medium text-white">Want to study more?</h2>
                <ul className="space-y-3">
                    {STUDY_MORE.map((item) => (
                        <li key={item.url}>
                            <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between gap-4 bg-[#121214] p-4 rounded-xl border border-white/10 hover:border-white/20 transition-colors"
                            >
                                <span>
                                    <span className="font-semibold text-white">{item.title}</span>
                                    {item.note && <span className="block text-xs text-white/50 mt-0.5">{item.note}</span>}
                                </span>
                                <ExternalLink className="w-4 h-4 text-white/40 shrink-0" />
                            </a>
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    );
}
