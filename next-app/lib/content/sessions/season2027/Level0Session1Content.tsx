import type { ReactNode } from 'react';
import { CalendarDays, Wrench, Terminal, AlertTriangle, FileText, Download, BookOpen, ExternalLink, Target } from 'lucide-react';

const SLIDES_PDF = '/sessions/2027/level0/session-01-welcome-cpp-basics.pdf';
const SLIDES_PPTX = '/sessions/2027/level0/session-01-welcome-cpp-basics.pptx';

/**
 * Extra material for students who want to study more on their own.
 * Add links here; the section shows a "coming soon" note while it is empty.
 */
const STUDY_MORE: { title: string; url: string; note?: string }[] = [
    // { title: 'C++ data types', url: 'https://...', note: 'Short read, 10 min' },
];

function Code({ children }: { children: string }) {
    return (
        <div className="bg-black/50 rounded-xl p-4 font-mono text-sm border border-white/5 overflow-x-auto">
            <pre className="text-green-400">{children}</pre>
        </div>
    );
}

function SectionTitle({ icon, children }: { icon: ReactNode; children: ReactNode }) {
    return (
        <div className="flex items-center gap-3 text-[#d59928] mb-6">
            {icon}
            <h2 className="text-2xl sm:text-3xl font-bold">{children}</h2>
        </div>
    );
}

export default function Level0Session1Content() {
    return (
        <div className="space-y-12 text-white/90">
            {/* Slides */}
            <section className="bg-[#111] rounded-2xl border border-white/10 p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-3">
                    <FileText className="w-5 h-5 text-[#d59928]" />
                    <h3 className="text-xl font-bold text-white">Session slides</h3>
                </div>
                <p className="text-white/60 text-sm mb-5">All 21 slides from the session, to review the code and examples at your own pace.</p>
                <div className="flex flex-wrap gap-3">
                    <a href={SLIDES_PDF} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#d59928] text-black text-sm font-bold hover:bg-[#e6b04a] transition-colors">
                        <FileText className="w-4 h-4" /> View slides (PDF)
                    </a>
                    <a href={SLIDES_PPTX} download className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm font-bold text-white/90 hover:bg-white/10 transition-colors">
                        <Download className="w-4 h-4" /> Download PowerPoint
                    </a>
                </div>
            </section>

            {/* How the week works */}
            <section className="space-y-6">
                <SectionTitle icon={<CalendarDays className="w-6 h-6" />}>How our week works</SectionTitle>
                <div className="grid md:grid-cols-3 gap-4">
                    {[
                        ['Saturday', 'Session', 'Live training on a new topic.'],
                        ['Wednesday', 'Contest', 'Weekly contest on Codeforces.'],
                        ['Friday', 'Upsolve', 'Solve what you missed, with a recorded walkthrough.'],
                    ].map(([day, title, desc]) => (
                        <div key={day} className="bg-[#1a1a1a] p-5 rounded-xl border border-white/5">
                            <p className="text-xs font-bold uppercase tracking-wider text-[#d59928] mb-1">{day}</p>
                            <h4 className="font-bold text-white mb-1">{title}</h4>
                            <p className="text-sm text-white/60">{desc}</p>
                        </div>
                    ))}
                </div>
                <p className="text-sm text-white/50">Missing 3 contests or 3 sessions means removal from the season.</p>
            </section>

            {/* Tools */}
            <section className="space-y-6 pt-8 border-t border-white/10">
                <SectionTitle icon={<Wrench className="w-6 h-6" />}>Our tools</SectionTitle>
                <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-[#1a1a1a] p-5 rounded-xl border border-white/5">
                        <h4 className="font-bold text-white mb-1">icpchue.com</h4>
                        <p className="text-sm text-white/60">Sheets, recordings and your progress, all in one place.</p>
                    </div>
                    <div className="bg-[#1a1a1a] p-5 rounded-xl border border-white/5">
                        <h4 className="font-bold text-white mb-1">VS Code</h4>
                        <p className="text-sm text-white/60">Free editor from code.visualstudio.com, MinGW (g++) as the compiler on Windows, and the C/C++ and Code Runner extensions.</p>
                    </div>
                    <div className="bg-[#1a1a1a] p-5 rounded-xl border border-white/5">
                        <h4 className="font-bold text-white mb-1">Codeforces</h4>
                        <p className="text-sm text-white/60">The online judge for our sheets and weekly contests.</p>
                    </div>
                </div>
            </section>

            {/* C++ basics */}
            <section className="space-y-6 pt-8 border-t border-white/10">
                <SectionTitle icon={<Terminal className="w-6 h-6" />}>C++ basics</SectionTitle>

                <div className="bg-[#111] rounded-2xl border border-white/10 p-6 sm:p-8 space-y-4">
                    <h3 className="text-xl font-bold text-white">Input &amp; output</h3>
                    <p className="text-white/70">Read with <code className="text-[#d59928]">cin</code>, print with <code className="text-[#d59928]">cout</code>. Use <code className="text-[#d59928]">&apos;\n&apos;</code> for a new line: it is faster than <code className="text-[#d59928]">endl</code>.</p>
                    <Code>{`#include <bits/stdc++.h>
using namespace std;

int main() {
    int a, b;
    cin >> a >> b;          // read
    cout << a + b << '\\n';  // print
    return 0;
}`}</Code>
                </div>

                <div className="bg-[#111] rounded-2xl border border-white/10 p-6 sm:p-8 space-y-4">
                    <h3 className="text-xl font-bold text-white">Variables &amp; data types</h3>
                    <p className="text-white/70">Every variable has a type, a name and a value. Pick the type that fits the biggest value you will store.</p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-[#d59928] border-b border-white/10">
                                    <th className="py-2 pr-4">Type</th><th className="py-2 pr-4">Size</th><th className="py-2 pr-4">Holds</th><th className="py-2">Example</th>
                                </tr>
                            </thead>
                            <tbody className="text-white/75 font-mono">
                                {[
                                    ['int', '4 bytes', '±2·10⁹', 'int n = 100;'],
                                    ['long long', '8 bytes', '±9·10¹⁸', 'long long x = 1e15;'],
                                    ['double', '8 bytes', 'decimals', 'double pi = 3.14;'],
                                    ['char', '1 byte', 'one character', "char c = 'A';"],
                                    ['string', 'any', 'text', 'string s = "HUE";'],
                                ].map((row) => (
                                    <tr key={row[0]} className="border-b border-white/5">
                                        {row.map((cell, i) => <td key={i} className="py-2 pr-4">{cell}</td>)}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-[#111] rounded-2xl border border-white/10 p-6 sm:p-8 space-y-4">
                    <h3 className="text-xl font-bold text-white">Decimal output</h3>
                    <p className="text-white/70">When a problem says &quot;print exactly 2 digits after the decimal point&quot;:</p>
                    <Code>{`double pi = 3.14159265;
cout << fixed << setprecision(2);
cout << pi << '\\n';               // 3.14

cout << setprecision(4) << pi;    // 3.1416`}</Code>
                </div>

                <div className="bg-[#111] rounded-2xl border border-white/10 p-6 sm:p-8 space-y-4">
                    <h3 className="text-xl font-bold text-white">Operators &amp; conditions</h3>
                    <p className="text-white/70">Watch out for integer division: <code className="text-[#d59928]">7 / 2 = 3</code> and <code className="text-[#d59928]">7 % 2 = 1</code>. Combine checks with <code className="text-[#d59928]">&amp;&amp;</code> and <code className="text-[#d59928]">||</code>, and branch with <code className="text-[#d59928]">if / else</code>.</p>
                    <Code>{`int n;  cin >> n;

if (n % 2 == 0 && n > 0) {
    cout << "positive even";
} else if (n < 0 || n == 0) {
    cout << "not positive";
} else {
    cout << "positive odd";
}`}</Code>
                </div>
            </section>

            {/* Common mistakes */}
            <section className="space-y-6 pt-8 border-t border-white/10">
                <SectionTitle icon={<AlertTriangle className="w-6 h-6" />}>Two classic Wrong Answers</SectionTitle>
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-[#1a1a1a] p-5 rounded-xl border border-white/5 space-y-3">
                        <h4 className="font-bold text-red-400">Integer overflow</h4>
                        <p className="text-sm text-white/60">An int holds up to 2,147,483,647. Go past it and it wraps to a negative number.</p>
                        <Code>{`int a = 100000;
int bad = a * a;           // ✗ overflow
long long ok = 1LL * a * a; // ✓`}</Code>
                    </div>
                    <div className="bg-[#1a1a1a] p-5 rounded-xl border border-white/5 space-y-3">
                        <h4 className="font-bold text-blue-400">Characters are numbers (ASCII)</h4>
                        <p className="text-sm text-white/60">&apos;A&apos; = 65, &apos;a&apos; = 97, &apos;0&apos; = 48.</p>
                        <Code>{`char c = 'a';
cout << (int)c;      // 97
char up = c - 32;    // 'A'`}</Code>
                    </div>
                </div>
            </section>

            {/* Homework */}
            <section className="bg-[#d59928]/10 border border-[#d59928]/30 rounded-2xl p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-2">
                    <Target className="w-5 h-5 text-[#d59928]" />
                    <h3 className="text-xl font-bold text-white">Your task</h3>
                </div>
                <p className="text-white/80">Five problems on icpchue.com. Start tonight.</p>
            </section>

            {/* Study more: filled in later */}
            <section className="space-y-4 pt-8 border-t border-white/10">
                <SectionTitle icon={<BookOpen className="w-6 h-6" />}>Want to study more?</SectionTitle>
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
