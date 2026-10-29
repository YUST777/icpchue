import Link from 'next/link';
import Image from 'next/image';
import { ExternalLink, ChevronRight, BookOpen } from 'lucide-react';

const CONTEST_URL = 'https://codeforces.com/group/lEfcMyt0UC/contest/728330';

export default function Level0Contest1Content() {
    return (
        <div className="space-y-10 text-white/90">
            {/* Minimalist Contest Card */}
            <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-[#0f0f0f] border border-white/10">
                <div className="space-y-1">
                    <h2 className="text-xl sm:text-2xl font-bold text-white">
                        Contest #1 &bull; Level 0 (2027)
                    </h2>
                    <p className="text-sm text-white/60">
                        رابط المسابقة على كودفورسيز لمتابعة وحل المسائل (Upsolve).
                    </p>
                </div>
                <a
                    href={CONTEST_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#E8C15A] hover:bg-[#d59928] text-black text-sm font-semibold transition-colors shrink-0"
                >
                    <span>Open Contest</span>
                    <ExternalLink className="w-4 h-4" />
                </a>
            </section>

            {/* How to Join Section with Desktop & Mobile Guides */}
            <section className="space-y-6 pt-4 border-t border-white/10">
                <div className="space-y-1.5">
                    <h3 className="text-lg sm:text-xl font-bold text-white">
                        طريقة الانضمام والتسجيل في المسابقة
                    </h3>
                    <p className="text-sm text-white/60 leading-relaxed">
                        1. اطلب الانضمام للجروب أولاً من <span className="text-white font-medium">Member management</span> واضغط <span className="text-[#E8C15A] font-medium">Join</span>.
                        <br />
                        2. بعد قبول الانضمام، ادخل على صفحة <span className="text-white font-medium">Contests</span> واضغط <span className="text-[#E8C15A] font-medium">Register</span> للدخول والتسجيل في المسابقة.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* Desktop Guide */}
                    <div className="space-y-2.5">
                        <span className="text-xs font-semibold text-white/50 uppercase tracking-wider block">
                            Desktop &bull; الكمبيوتر واللابتوب
                        </span>
                        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0f0f0f]">
                            <Image
                                src="/images/lessons/levels_camp/level0-2027/contest-join-desktop.webp"
                                alt="How to join contest on Desktop"
                                width={1024}
                                height={688}
                                className="w-full h-auto object-contain block"
                                priority
                            />
                        </div>
                    </div>

                    {/* Mobile Guide */}
                    <div className="space-y-2.5">
                        <span className="text-xs font-semibold text-white/50 uppercase tracking-wider block">
                            Mobile &bull; الموبايل
                        </span>
                        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0f0f0f]">
                            <Image
                                src="/images/lessons/levels_camp/level0-2027/contest-join-mobile.webp"
                                alt="How to join contest on Mobile"
                                width={1024}
                                height={802}
                                className="w-full h-auto object-contain block"
                                priority
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Practice Sheets */}
            <section className="space-y-4 pt-6 border-t border-white/10">
                <div className="flex items-center gap-2.5 text-white/80">
                    <BookOpen className="w-5 h-5 text-[#E8C15A]" />
                    <h3 className="text-base sm:text-lg font-bold text-white">شيتات التدريب المرتبطة</h3>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                    <Link
                        href="/dashboard/sheets/level-0/sheet-a"
                        className="group flex items-center justify-between p-4 rounded-xl bg-[#0f0f0f] border border-white/10 hover:border-white/20 transition-colors"
                    >
                        <div>
                            <span className="font-semibold text-sm text-white group-hover:text-[#E8C15A] transition-colors">Sheet A &bull; Data Types & Conditions</span>
                            <span className="block text-xs text-white/40 mt-0.5">26 problems covering basic I/O and branching</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-[#E8C15A] transition-colors shrink-0" />
                    </Link>
                    <Link
                        href="/dashboard/sheets/level-0/sheet-b"
                        className="group flex items-center justify-between p-4 rounded-xl bg-[#0f0f0f] border border-white/10 hover:border-white/20 transition-colors"
                    >
                        <div>
                            <span className="font-semibold text-sm text-white group-hover:text-[#E8C15A] transition-colors">Sheet B &bull; Loops</span>
                            <span className="block text-xs text-white/40 mt-0.5">26 problems covering loops and iterations</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-[#E8C15A] transition-colors shrink-0" />
                    </Link>
                </div>
            </section>
        </div>
    );
}
