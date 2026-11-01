import Link from 'next/link';

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
                <h2 className="text-2xl font-medium text-white">Session slides</h2>
                <SlideViewer basePath="/sessions/2027/level0/session-01" count={21} title="Welcome to ICPC HUE" />
            </section>

            <section className="space-y-4 pt-8 border-t border-white/10">
                <h2 className="text-2xl font-medium text-white">Assignment</h2>
                <p className="text-white/70">Solve the first 16 problems of <Link href="/dashboard/sheets/level-0/sheet-a" className="font-semibold text-[#E8C15A] hover:underline">Sheet A</Link> (A to P).</p>
                <div className="grid sm:grid-cols-2 gap-2">
                    {ASSIGNMENT.map(([letter, title]) => (
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
