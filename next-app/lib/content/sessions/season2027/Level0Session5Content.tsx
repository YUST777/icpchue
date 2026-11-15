import Link from 'next/link';
import { Presentation, ExternalLink, Code2, Clock } from 'lucide-react';

import SlideViewer from '@/components/sessions/SlideViewer';

const SLIDE_COUNT = 24;

/** Assignment: Sheet D (Strings) - From A to J (10 problems). */
const SHEET_D_ASSIGNMENT = [
    ['A', 'Create A New String'],
    ['B', "Let's use Getline"],
    ['C', 'Compare'],
    ['D', 'Strings'],
    ['E', 'Count'],
    ['F', 'Way Too Long Words'],
    ['G', 'Conversion'],
    ['H', 'Good or Bad'],
    ['I', 'Palindrome'],
    ['J', 'Count Letters'],
] as const;

/** Assignment: Sheet E (Functions) - From A to J (10 problems). */
const SHEET_E_ASSIGNMENT = [
    ['A', 'Add'],
    ['B', 'Print'],
    ['C', 'Wonderful Number'],
    ['D', 'Prime Function'],
    ['E', 'Swap'],
    ['F', 'Equation'],
    ['G', 'Max and MIN'],
    ['H', 'N Times'],
    ['I', 'Swapping With Matrix'],
    ['J', 'Average'],
] as const;

/** Extra study materials for trainees. */
const STUDY_MORE: { title: string; url: string; note?: string }[] = [
    {
        title: 'cppreference: std::string Documentation & Methods',
        url: 'https://en.cppreference.com/w/cpp/string/basic_string',
        note: 'Complete reference for string capacity, operations, and iterators.',
    },
    {
        title: 'LearnCpp: Passing Arguments by Value and Reference',
        url: 'https://www.learncpp.com/cpp-tutorial/pass-by-lvalue-reference/',
        note: 'Intuitive diagrams and explanations for references in C++.',
    },
];

export default function Level0Session5Content() {
    return (
        <div className="space-y-12 text-white/90">
            {/* Slide Deck Viewer */}
            <section className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h2 className="text-2xl font-medium text-white">Session slides</h2>
                    <a
                        href="/sessions/2027/level0/session-05/ICPC-HUE-Session-04-Strings-Functions.pptx"
                        download="ICPC-HUE-Session-04-Strings-Functions.pptx"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white/80 hover:text-white transition-colors self-start sm:self-auto"
                    >
                        <Presentation className="w-3.5 h-3.5 text-[#E8C15A]" />
                        <span>Download PowerPoint (PPTX)</span>
                    </a>
                </div>

                <SlideViewer
                    basePath="/sessions/2027/level0/session-05"
                    count={SLIDE_COUNT}
                    title="Session 05: Strings & Functions"
                />
            </section>

            {/* Assignment Section (التاسك) */}
            <section className="space-y-6 pt-8 border-t border-white/10">
                {/* Header & Deadline Banner */}
                <div className="p-6 rounded-2xl bg-gradient-to-r from-[#161618] via-[#1a1813] to-[#161618] border border-[#E8C15A]/30 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Code2 className="w-6 h-6 text-[#E8C15A]" />
                                <h2 className="text-2xl font-bold text-white tracking-wide">التاسك &bull; Assignment</h2>
                            </div>
                            <p className="text-xs text-white/60">
                                حل المسائل المطلوبة من Sheet D و Sheet E على Codeforces قبل انتهاء الموعد النهائي.
                            </p>
                        </div>

                        {/* Deadline Pill */}
                        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#E8C15A]/10 border border-[#E8C15A]/30 text-right self-start sm:self-auto shrink-0">
                            <Clock className="w-5 h-5 text-[#E8C15A] shrink-0" />
                            <div>
                                <div className="text-[11px] font-mono uppercase text-[#E8C15A] font-bold">
                                    Deadline: 21 Nov at 16:00:00
                                </div>
                                <div className="text-xs text-white/80" dir="rtl">
                                    الموعد النهائي: 21 نوفمبر الساعة 4:00 عصراً
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sheet D: Strings (From A to J) */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <span>Sheet D:</span>
                            <Link href="/dashboard/sheets/level-0/sheet-d" className="text-[#E8C15A] hover:underline">
                                Strings
                            </Link>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#E8C15A]/15 text-[#E8C15A] border border-[#E8C15A]/30">
                                From A to J (10 problems)
                            </span>
                        </h3>
                        <Link
                            href="/dashboard/sheets/level-0/sheet-d"
                            className="text-xs text-[#E8C15A] hover:underline flex items-center gap-1"
                        >
                            <span>Open Sheet D</span>
                            <ExternalLink className="w-3 h-3" />
                        </Link>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2">
                        {SHEET_D_ASSIGNMENT.map(([letter, title]) => (
                            <Link
                                key={letter}
                                href={`/dashboard/sheets/level-0/sheet-d/${letter}`}
                                className="group flex items-center gap-3 bg-[#121214] px-4 py-3 rounded-xl border border-white/10 hover:border-[#E8C15A]/40 transition-colors"
                            >
                                <span className="w-6 shrink-0 font-mono text-sm font-bold text-[#E8C15A]">{letter}</span>
                                <span className="flex-1 text-sm font-medium text-white/85 group-hover:text-white">{title}</span>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Sheet E: Functions (From A to J) */}
                <div className="space-y-3 pt-6 border-t border-white/10">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <span>Sheet E:</span>
                            <Link href="/dashboard/sheets/level-0/sheet-e" className="text-[#E8C15A] hover:underline">
                                Functions
                            </Link>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#E8C15A]/15 text-[#E8C15A] border border-[#E8C15A]/30">
                                From A to J (10 problems)
                            </span>
                        </h3>
                        <Link
                            href="/dashboard/sheets/level-0/sheet-e"
                            className="text-xs text-[#E8C15A] hover:underline flex items-center gap-1"
                        >
                            <span>Open Sheet E</span>
                            <ExternalLink className="w-3 h-3" />
                        </Link>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2">
                        {SHEET_E_ASSIGNMENT.map(([letter, title]) => (
                            <Link
                                key={letter}
                                href={`/dashboard/sheets/level-0/sheet-e/${letter}`}
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
