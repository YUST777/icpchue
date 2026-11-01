import Link from 'next/link';

import SlideViewer from '@/components/sessions/SlideViewer';

/** Set this to the total number of slides once PPTX is converted. */
const SLIDE_COUNT = 22;

/** Assignment Part 1: The remaining 10 problems of Level 0, Sheet A (Q to Z). */
const SHEET_A_ASSIGNMENT = [
    ['Q', 'Coordinates of a Point'],
    ['R', 'Age in Days'],
    ['S', 'Interval'],
    ['T', 'Sort Numbers'],
    ['U', 'Float or int'],
    ['V', 'Comparison'],
    ['W', 'Mathematical Expression'],
    ['X', 'Two intervals'],
    ['Y', 'The last 2 digits'],
    ['Z', 'Hard Compare'],
] as const;

/** Assignment Part 2: The first 16 problems of Level 0, Sheet B (A to P). */
const SHEET_B_ASSIGNMENT = [
    ['A', '1 to N'],
    ['B', 'Even Numbers'],
    ['C', 'Even, Odd, Positive and Negative'],
    ['D', 'Fixed Password'],
    ['E', 'Max'],
    ['F', 'Multiplication table'],
    ['G', 'Factorial'],
    ['H', 'One Prime'],
    ['I', 'Palindrome'],
    ['J', 'Primes from 1 to n'],
    ['K', 'Divisors'],
    ['L', 'GCD'],
    ['M', 'Lucky Numbers'],
    ['N', 'Numbers Histogram'],
    ['O', 'Pyramid'],
    ['P', 'Shape1'],
] as const;

/**
 * Extra material for students who want to study more on their own.
 * Add links here; the section shows a "coming soon" note while it is empty.
 */
const STUDY_MORE: { title: string; url: string; note?: string }[] = [];

export default function Level0Session2Content() {
    return (
        <div className="space-y-12 text-white/90">
            <section className="space-y-4">
                <h2 className="text-2xl font-medium text-white">Session slides</h2>
                {SLIDE_COUNT > 0 ? (
                    <SlideViewer basePath="/sessions/2027/level0/session-02" count={SLIDE_COUNT} title="Conditions & Loops in C++" />
                ) : (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-[#121214] p-8 text-center text-sm text-white/50">
                        Session slides will be available here soon.
                    </div>
                )}
            </section>

            <section className="space-y-6 pt-8 border-t border-white/10">
                <h2 className="text-2xl font-medium text-white">Assignment</h2>

                <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <span>Part 1: Remaining problems of</span>
                        <Link href="/dashboard/sheets/level-0/sheet-a" className="text-[#E8C15A] hover:underline">
                            Sheet A (Data Types & Conditions)
                        </Link>
                        <span className="text-xs font-normal text-white/50">Q to Z</span>
                    </h3>
                    <p className="text-sm text-white/70">Finish the remaining 10 problems from Sheet A to complete the sheet.</p>
                    <div className="grid sm:grid-cols-2 gap-2">
                        {SHEET_A_ASSIGNMENT.map(([letter, title]) => (
                            <Link
                                key={letter}
                                href={`/dashboard/sheets/level-0/sheet-a/${letter}`}
                                className="group flex items-center gap-3 bg-[#121214] px-4 py-3 rounded-xl border border-white/10 hover:border-[#E8C15A]/40 transition-colors"
                            >
                                <span className="w-6 shrink-0 font-mono text-sm text-white/50">{letter}</span>
                                <span className="flex-1 text-sm font-medium text-white/85 group-hover:text-white">{title}</span>
                            </Link>
                        ))}
                    </div>
                </div>

                <div className="space-y-3 pt-6 border-t border-white/10">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <span>Part 2: First 16 problems of</span>
                        <Link href="/dashboard/sheets/level-0/sheet-b" className="text-[#E8C15A] hover:underline">
                            Sheet B (Loops)
                        </Link>
                        <span className="text-xs font-normal text-white/50">A to P</span>
                    </h3>
                    <p className="text-sm text-white/70">Solve the first 16 problems of Sheet B to practice loop control flow, patterns, and counters.</p>
                    <div className="grid sm:grid-cols-2 gap-2">
                        {SHEET_B_ASSIGNMENT.map(([letter, title]) => (
                            <Link
                                key={letter}
                                href={`/dashboard/sheets/level-0/sheet-b/${letter}`}
                                className="group flex items-center gap-3 bg-[#121214] px-4 py-3 rounded-xl border border-white/10 hover:border-[#E8C15A]/40 transition-colors"
                            >
                                <span className="w-6 shrink-0 font-mono text-sm text-white/50">{letter}</span>
                                <span className="flex-1 text-sm font-medium text-white/85 group-hover:text-white">{title}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            <section className="space-y-4 pt-8 border-t border-white/10">
                <h2 className="text-2xl font-medium text-white">Want to study more?</h2>
                {STUDY_MORE.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-[#121214] p-6 text-center text-sm text-white/50">
                        Extra reading and practice for this session will be added here soon.
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {STUDY_MORE.map((item) => (
                            <li key={item.url}>
                                <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-4 bg-[#121214] p-4 rounded-xl border border-white/10 hover:border-white/20 transition-colors">
                                    <span>
                                        <span className="font-semibold text-white">{item.title}</span>
                                        {item.note && <span className="block text-xs text-white/50 mt-0.5">{item.note}</span>}
                                    </span>
                                </a>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}
