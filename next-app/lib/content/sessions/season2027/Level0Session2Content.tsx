import Link from 'next/link';
import { Presentation, Target, BookOpen, ExternalLink, ChevronRight } from 'lucide-react';
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
                <div className="flex items-center gap-3 text-[#d59928]">
                    <Presentation className="w-6 h-6" />
                    <h2 className="text-2xl sm:text-3xl font-bold">Session slides</h2>
                </div>
                {SLIDE_COUNT > 0 ? (
                    <SlideViewer basePath="/sessions/2027/level0/session-02" count={SLIDE_COUNT} title="Conditions & Loops in C++" />
                ) : (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-[#0f0f0f] p-8 text-center text-sm text-white/50">
                        Session slides will be available here soon.
                    </div>
                )}
            </section>

            <section className="space-y-6 pt-8 border-t border-white/10">
                <div className="flex items-center gap-3 text-[#d59928]">
                    <Target className="w-6 h-6" />
                    <h2 className="text-2xl sm:text-3xl font-bold">Assignment</h2>
                </div>

                <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <span>Part 1: Remaining problems of</span>
                        <Link href="/dashboard/sheets/level-0/sheet-a" className="text-[#d59928] hover:underline">
                            Sheet A (Data Types & Conditions)
                        </Link>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/60 font-normal">Q to Z</span>
                    </h3>
                    <p className="text-sm text-white/70">Finish the remaining 10 problems from Sheet A to complete the sheet.</p>
                    <div className="grid sm:grid-cols-2 gap-2">
                        {SHEET_A_ASSIGNMENT.map(([letter, title]) => (
                            <Link
                                key={letter}
                                href={`/dashboard/sheets/level-0/sheet-a/${letter}`}
                                className="group flex items-center gap-3 bg-[#1a1a1a] px-4 py-3 rounded-xl border border-white/5 hover:border-[#d59928]/40 transition-colors"
                            >
                                <span className="w-8 h-8 shrink-0 rounded-lg bg-[#d59928]/10 border border-[#d59928]/20 flex items-center justify-center font-bold text-[#d59928]">{letter}</span>
                                <span className="flex-1 text-sm font-medium text-white/85 group-hover:text-white">{title}</span>
                                <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-[#d59928]" />
                            </Link>
                        ))}
                    </div>
                </div>

                <div className="space-y-3 pt-6 border-t border-white/5">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <span>Part 2: First 16 problems of</span>
                        <Link href="/dashboard/sheets/level-0/sheet-b" className="text-[#d59928] hover:underline">
                            Sheet B (Loops)
                        </Link>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/60 font-normal">A to P</span>
                    </h3>
                    <p className="text-sm text-white/70">Solve the first 16 problems of Sheet B to practice loop control flow, patterns, and counters.</p>
                    <div className="grid sm:grid-cols-2 gap-2">
                        {SHEET_B_ASSIGNMENT.map(([letter, title]) => (
                            <Link
                                key={letter}
                                href={`/dashboard/sheets/level-0/sheet-b/${letter}`}
                                className="group flex items-center gap-3 bg-[#1a1a1a] px-4 py-3 rounded-xl border border-white/5 hover:border-[#d59928]/40 transition-colors"
                            >
                                <span className="w-8 h-8 shrink-0 rounded-lg bg-[#d59928]/10 border border-[#d59928]/20 flex items-center justify-center font-bold text-[#d59928]">{letter}</span>
                                <span className="flex-1 text-sm font-medium text-white/85 group-hover:text-white">{title}</span>
                                <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-[#d59928]" />
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            <section className="space-y-4 pt-8 border-t border-white/10">
                <div className="flex items-center gap-3 text-[#d59928]">
                    <BookOpen className="w-6 h-6" />
                    <h2 className="text-2xl sm:text-3xl font-bold">Want to study more?</h2>
                </div>
                {STUDY_MORE.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-[#0f0f0f] p-6 text-center text-sm text-white/50">
                        Extra reading and practice for this session will be added here soon.
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {STUDY_MORE.map((item) => (
                            <li key={item.url}>
                                <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-4 bg-[#1a1a1a] p-4 rounded-xl border border-white/5 hover:border-white/15 transition-colors">
                                    <span>
                                        <span className="font-bold text-white">{item.title}</span>
                                        {item.note && <span className="block text-xs text-white/50 mt-0.5">{item.note}</span>}
                                    </span>
                                    <ExternalLink className="w-4 h-4 text-white/40 shrink-0" />
                                </a>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}
