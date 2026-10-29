import Link from 'next/link';
import { Trophy, ExternalLink, Target, Lightbulb, CheckCircle2, BookOpen, ChevronRight } from 'lucide-react';

const CONTEST_URL = 'https://codeforces.com/group/lEfcMyt0UC/contest/728330';

const TOPICS = [
    { title: 'Data Types & Fast I/O', desc: 'cin / cout, fast I/O setup, choosing between int and long long to prevent integer overflow.' },
    { title: 'Conditions & Decisions', desc: 'if-else logic, comparison operators, boundary checking, and handling multiple branches.' },
    { title: 'Loops & Iterations', desc: 'for and while loops, calculating summations, counting conditions, and early loop breaks.' },
    { title: 'Corner Cases & Modulo', desc: 'Negative numbers, zero edge cases, and integer division precision.' },
];

const UPSOLVE_STEPS = [
    {
        step: '1',
        title: 'جرب بنفسك أولاً (Try by yourself)',
        desc: 'افتح المسألة على كودفورسيز واقرأ الـ statement كويس. فكر فيها لمدة 20-30 دقيقة واكتب على ورقة قبل ما تشوف الحل.',
    },
    {
        step: '2',
        title: 'شوف شرح المسألة بالفيديو (Watch the explanation)',
        desc: 'لو وقفت أو جالك Wrong Answer، اتفرج على جزء المسألة في فيديو الأبسولف وافهم الفكرة والـ edge cases.',
    },
    {
        step: '3',
        title: 'اكتب الكود واعمل Submit (Code & Submit)',
        desc: 'اقفل الفيديو واكتب الحل بنفسك من الصفر بـ C++، واعمل Submit على كودفورسيز لحد ما تجيب Accepted (AC).',
    },
    {
        step: '4',
        title: 'ماتنسخ الكود أبداً (Understand, don’t copy)',
        desc: 'الهدف من المسابقة والأبسولف إنك تطور طريقة تفكيرك البرمجية، مش إنك مجرد تسلّم كود جاهز.',
    },
];

export default function Level0Contest1Content() {
    return (
        <div className="space-y-12 text-white/90">
            {/* Contest Banner & Primary Action */}
            <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1c1708] via-[#14120c] to-[#0f0f0f] border border-[#d59928]/30 p-6 sm:p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-3 max-w-xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#d59928]/15 border border-[#d59928]/30 text-[#d59928] text-xs font-bold uppercase tracking-wider">
                            <Trophy className="w-3.5 h-3.5" />
                            <span>Codeforces Group Contest</span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                            Contest #1 &bull; Level 0 (2027)
                        </h2>
                        <p className="text-white/70 text-sm sm:text-base leading-relaxed">
                            المسابقة الأولى لترايني ليفل 0 لموسم 2027 على جروب كودفورسيز الرسمي. ادخل على لينك المسابقة، حل المسائل، واعمل أبسولف للمسائل اللي وقفت معاك.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
                        <a
                            href={CONTEST_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#d59928] hover:bg-[#e0a83b] text-black font-bold text-sm transition-all duration-200 shadow-lg shadow-[#d59928]/20 hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <span>Open Contest on Codeforces</span>
                            <ExternalLink className="w-4 h-4" />
                        </a>
                        <span className="text-center text-xs text-white/40 font-mono">
                            Contest ID: 728330 &bull; Group: lEfcMyt0UC
                        </span>
                    </div>
                </div>
            </section>

            {/* Upsolve Strategy / Steps */}
            <section className="space-y-6 pt-2">
                <div className="flex items-center gap-3 text-[#d59928]">
                    <Target className="w-6 h-6" />
                    <h2 className="text-2xl sm:text-3xl font-bold">إزاي تعمل Upsolve صح؟</h2>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                    {UPSOLVE_STEPS.map((item) => (
                        <div
                            key={item.step}
                            className="flex gap-4 p-5 rounded-xl bg-[#141414] border border-white/5 hover:border-white/15 transition-colors"
                        >
                            <span className="w-8 h-8 shrink-0 rounded-lg bg-[#d59928]/15 border border-[#d59928]/30 flex items-center justify-center font-bold text-[#d59928] text-sm">
                                {item.step}
                            </span>
                            <div className="space-y-1">
                                <h3 className="text-base font-bold text-white">{item.title}</h3>
                                <p className="text-sm text-white/60 leading-relaxed">{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Contest Topics */}
            <section className="space-y-6 pt-8 border-t border-white/10">
                <div className="flex items-center gap-3 text-[#d59928]">
                    <Lightbulb className="w-6 h-6" />
                    <h2 className="text-2xl sm:text-3xl font-bold">Topics Tested in Contest #1</h2>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                    {TOPICS.map((topic) => (
                        <div
                            key={topic.title}
                            className="p-5 rounded-xl bg-[#141414] border border-white/5 space-y-1.5"
                        >
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-[#d59928] shrink-0" />
                                <h3 className="font-semibold text-white text-base">{topic.title}</h3>
                            </div>
                            <p className="text-sm text-white/60 pl-6 leading-relaxed">{topic.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Relevant Practice Sheets */}
            <section className="space-y-4 pt-8 border-t border-white/10">
                <div className="flex items-center gap-3 text-[#d59928]">
                    <BookOpen className="w-6 h-6" />
                    <h2 className="text-2xl sm:text-3xl font-bold">Relevant Practice Sheets</h2>
                </div>
                <p className="text-white/70 text-sm">
                    لو حسيت إنك محتاج تدريب إضافي على أساسيات المسائل دي، راجع وحل من الشيتات الأساسية:
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                    <Link
                        href="/dashboard/sheets/level-0/sheet-a"
                        className="group flex items-center justify-between p-4 rounded-xl bg-[#1a1a1a] border border-white/5 hover:border-[#d59928]/40 transition-colors"
                    >
                        <div>
                            <span className="font-bold text-white group-hover:text-[#d59928] transition-colors">Sheet A &bull; Data Types & Conditions</span>
                            <span className="block text-xs text-white/50 mt-0.5">26 problems covering basic I/O and branching</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-[#d59928] group-hover:translate-x-1 transition-all shrink-0" />
                    </Link>
                    <Link
                        href="/dashboard/sheets/level-0/sheet-b"
                        className="group flex items-center justify-between p-4 rounded-xl bg-[#1a1a1a] border border-white/5 hover:border-[#d59928]/40 transition-colors"
                    >
                        <div>
                            <span className="font-bold text-white group-hover:text-[#d59928] transition-colors">Sheet B &bull; Loops</span>
                            <span className="block text-xs text-white/50 mt-0.5">26 problems covering while, for, nested loops and patterns</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-[#d59928] group-hover:translate-x-1 transition-all shrink-0" />
                    </Link>
                </div>
            </section>
        </div>
    );
}
