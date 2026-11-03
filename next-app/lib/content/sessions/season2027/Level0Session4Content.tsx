import Link from 'next/link';
import { Presentation } from 'lucide-react';

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
        </div>
    );
}
