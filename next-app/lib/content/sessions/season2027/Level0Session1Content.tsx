import Link from 'next/link';
import { Presentation, Target, BookOpen, ExternalLink, ChevronRight } from 'lucide-react';
import SlideViewer from '@/components/sessions/SlideViewer';

/** Assignment: the first 16 problems of Level 0, Sheet A. */
const ASSIGNMENT = [
    ['A', 'Say Hello With C++'],
    ['B', 'Basic Data Types'],
    ['C', 'Simple Calculator'],
    ['D', 'Difference'],
    ['E', 'Area of a Circle'],
    ['F', 'Digits Summation'],
    ['G', 'Summation from 1 to N'],
    ['H', 'Two numbers'],
    ['I', 'Welcome for you with Conditions'],
    ['J', 'Multiples'],
    ['K', 'Max and Min'],
    ['L', 'The Brothers'],
    ['M', 'Capital or Small or Digit'],
    ['N', 'Char'],
    ['O', 'Calculator'],
    ['P', 'First digit !'],
] as const;

/**
 * Extra material for students who want to study more on their own.
 * Add links here; the section shows a "coming soon" note while it is empty.
 */
const STUDY_MORE: { title: string; url: string; note?: string }[] = [
    // { title: 'C++ data types', url: 'https://...', note: 'Short read, 10 min' },
];

export default function Level0Session1Content() {
    return (
        <div className="space-y-12 text-white/90">
            <section className="space-y-4">
                <div className="flex items-center gap-3 text-[#d59928]">
                    <Presentation className="w-6 h-6" />
                    <h2 className="text-2xl sm:text-3xl font-bold">Session slides</h2>
                </div>
                <SlideViewer basePath="/sessions/2027/level0/session-01" count={21} title="Welcome to ICPC HUE" />
            </section>

            <section className="space-y-4 pt-8 border-t border-white/10">
                <div className="flex items-center gap-3 text-[#d59928]">
                    <Target className="w-6 h-6" />
                    <h2 className="text-2xl sm:text-3xl font-bold">Assignment</h2>
                </div>
                <p className="text-white/70">Solve the first 16 problems of <Link href="/dashboard/sheets/level-0/sheet-a" className="font-semibold text-[#d59928] hover:underline">Sheet A</Link> (A to P).</p>
                <div className="grid sm:grid-cols-2 gap-2">
                    {ASSIGNMENT.map(([letter, title]) => (
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
