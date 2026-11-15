import Link from 'next/link';
import { Presentation, ExternalLink, AlertTriangle, Code2, Type, Wrench } from 'lucide-react';

import SlideViewer from '@/components/sessions/SlideViewer';

const SLIDE_COUNT = 24;

/** Key problems from Sheet D (Strings) for practice. */
const STRINGS_PRACTICE = [
    ['A', 'Create A New String'],
    ['B', "Let's use Getline"],
    ['C', 'Compare'],
    ['D', 'Strings'],
    ['E', 'Count'],
    ['F', 'Way Too Long Words'],
    ['I', 'Palindrome'],
    ['J', 'Count Letters'],
    ['L', 'String Functions'],
    ['P', 'Count Words'],
    ['Q', 'Reverse Words'],
    ['V', 'Replace Word'],
] as const;

/** Key problems from Sheet E (Functions) for practice. */
const FUNCTIONS_PRACTICE = [
    ['A', 'Add'],
    ['B', 'Print'],
    ['C', 'Wonderful Number'],
    ['D', 'Prime Function'],
    ['E', 'Swap'],
    ['F', 'Equation'],
    ['G', 'Max and MIN'],
    ['H', 'N Times'],
    ['J', 'Average'],
    ['L', 'New Array'],
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

            {/* Core Concepts Breakdown */}
            <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-white/10">
                {/* Strings Card */}
                <div className="p-5 rounded-2xl bg-[#121214] border border-white/10 space-y-4">
                    <div className="flex items-center gap-2 text-[#E8C15A]">
                        <Type className="w-5 h-5" />
                        <h3 className="text-lg font-semibold text-white">Strings in C++</h3>
                    </div>
                    <ul className="space-y-2.5 text-xs text-white/80 leading-relaxed">
                        <li>
                            <strong className="text-white">Array of Characters:</strong> A string is indexed like an array (<code className="text-[#E8C15A]">s[0]</code> to <code className="text-[#E8C15A]">s[s.size() - 1]</code>). Each element is a <code className="text-[#E8C15A]">char</code> in single quotes.
                        </li>
                        <li>
                            <strong className="text-white">Reading with getline:</strong> <code className="text-[#E8C15A]">cin &gt;&gt;</code> stops at spaces. Use <code className="text-[#E8C15A]">getline(cin, line)</code> to read full lines with spaces. Always call <code className="text-[#E8C15A]">cin.ignore()</code> after <code className="text-[#E8C15A]">cin &gt;&gt;</code> to consume the trailing newline!
                        </li>
                        <li>
                            <strong className="text-white">Built-in Methods:</strong> <code className="text-[#E8C15A]">s.size()</code>, <code className="text-[#E8C15A]">s.substr(pos, len)</code>, <code className="text-[#E8C15A]">s.find(str)</code>, <code className="text-[#E8C15A]">s.insert(pos, str)</code>, <code className="text-[#E8C15A]">s.erase(pos, len)</code>, <code className="text-[#E8C15A]">s.push_back(ch)</code>, <code className="text-[#E8C15A]">s.pop_back()</code>.
                        </li>
                        <li>
                            <strong className="text-white">Algorithms:</strong> <code className="text-[#E8C15A]">sort(s.begin(), s.end())</code> sorts characters; <code className="text-[#E8C15A]">reverse(s.begin(), s.end())</code> flips the string.
                        </li>
                        <li>
                            <strong className="text-white">Concatenation:</strong> Join strings with <code className="text-[#E8C15A]">+</code> and <code className="text-[#E8C15A]">+=</code>. At least one operand must be a string variable (not two string literals directly).
                        </li>
                    </ul>
                </div>

                {/* Functions Card */}
                <div className="p-5 rounded-2xl bg-[#121214] border border-white/10 space-y-4">
                    <div className="flex items-center gap-2 text-[#E8C15A]">
                        <Wrench className="w-5 h-5" />
                        <h3 className="text-lg font-semibold text-white">Functions in C++</h3>
                    </div>
                    <ul className="space-y-2.5 text-xs text-white/80 leading-relaxed">
                        <li>
                            <strong className="text-white">Why Functions?</strong> Write logic once, call it from anywhere. Avoid copy-paste errors and make code clean and testable.
                        </li>
                        <li>
                            <strong className="text-white">Syntax:</strong> <code className="text-[#E8C15A]">return_type name(parameters) &#123; return value; &#125;</code>. Use <code className="text-[#E8C15A]">void</code> when nothing is returned.
                        </li>
                        <li>
                            <strong className="text-white">Pass by Value vs Reference:</strong> <code className="text-[#E8C15A]">void add(int x)</code> gets a copy. <code className="text-[#E8C15A]">void add(int &amp;x)</code> gets a reference to the original variable so changes stick!
                        </li>
                        <li>
                            <strong className="text-white">Passing Arrays:</strong> Arrays decay to pointers (<code className="text-[#E8C15A]">int a[], int n</code>) and are modified in place without needing <code className="text-[#E8C15A]">&amp;</code>. Always pass array size <code className="text-[#E8C15A]">n</code>!
                        </li>
                        <li>
                            <strong className="text-white">Multiple Return Values:</strong> Return a <code className="text-[#E8C15A]">vector&lt;int&gt;&#123;mn, mx&#125;</code> or <code className="text-[#E8C15A]">pair</code> to return multiple results easily.
                        </li>
                        <li>
                            <strong className="text-white">Overloading:</strong> You can define functions with the same name as long as their parameter types or counts differ.
                        </li>
                    </ul>
                </div>
            </div>

            {/* Critical Traps Callout */}
            <section className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-medium text-sm">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Watch Out for These Classic Traps:</span>
                </div>
                <div className="grid sm:grid-cols-3 gap-4 text-xs text-white/75">
                    <div className="space-y-1">
                        <span className="font-semibold text-white">1. The cin &gt;&gt; Newline Trap:</span>
                        <p>
                            <code className="text-[#E8C15A]">cin &gt;&gt; n</code> leaves the <code className="text-[#E8C15A]">\n</code> in the input stream.
                            If followed by <code className="text-[#E8C15A]">getline()</code> without <code className="text-[#E8C15A]">cin.ignore()</code>, it reads an empty line!
                        </p>
                    </div>
                    <div className="space-y-1">
                        <span className="font-semibold text-white">2. Forgetting &amp; in Functions:</span>
                        <p>
                            If your function modifies a variable (like <code className="text-[#E8C15A]">swap(a, b)</code>) and you forget <code className="text-[#E8C15A]">&amp;</code>, it changes a local copy and the caller sees no change.
                        </p>
                    </div>
                    <div className="space-y-1">
                        <span className="font-semibold text-white">3. Checking find() Result:</span>
                        <p>
                            If a substring is not found, <code className="text-[#E8C15A]">s.find()</code> returns <code className="text-[#E8C15A]">string::npos</code> (not -1).
                            Always compare: <code className="text-[#E8C15A]">if (pos != string::npos)</code>.
                        </p>
                    </div>
                </div>
            </section>

            {/* Practice Sheets Section */}
            <section className="space-y-6 pt-8 border-t border-white/10">
                <div className="space-y-1">
                    <h2 className="text-2xl font-medium text-white flex items-center gap-2">
                        <Code2 className="w-6 h-6 text-[#E8C15A]" />
                        <span>Practice & Assignments</span>
                    </h2>
                    <p className="text-sm text-white/70">
                        Practice solving string manipulation and functional programming problems on Codeforces:
                    </p>
                </div>

                {/* Sheet D: Strings */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <span>Sheet D:</span>
                            <Link href="/dashboard/sheets/level-0/sheet-d" className="text-[#E8C15A] hover:underline">
                                Strings
                            </Link>
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
                        {STRINGS_PRACTICE.map(([letter, title]) => (
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

                {/* Sheet E: Functions */}
                <div className="space-y-3 pt-6 border-t border-white/10">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <span>Sheet E:</span>
                            <Link href="/dashboard/sheets/level-0/sheet-e" className="text-[#E8C15A] hover:underline">
                                Functions
                            </Link>
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
                        {FUNCTIONS_PRACTICE.map(([letter, title]) => (
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
