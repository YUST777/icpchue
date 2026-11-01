'use client';

import { Globe2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/lib/utils/translations';

export default function Network() {
    const { language } = useLanguage();
    const t = translations[language].network;
    return (
        <section id="network" className="relative overflow-hidden bg-[#101113] py-16 sm:py-24">
            <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
                <div className="mb-10 max-w-2xl sm:mb-12">
                    <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#E8C15A]/30 bg-[#E8C15A]/10">
                            <Globe2 className="h-4 w-4 text-[#E8C15A]" />
                        </div>
                        <p className="text-xs font-medium tracking-wide text-white/50">{t.sectionTag}</p>
                    </div>
                    <h2 className="mb-4 text-3xl font-medium tracking-tight text-white sm:text-4xl lg:text-5xl">{t.title}</h2>
                    <p className="text-base leading-7 text-white/60 sm:text-lg">{t.description}</p>
                </div>

                <div className="mb-10 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
                    {Object.keys(t.stats).map((key, i) => (
                        <div key={key} className="rounded-[14px] border border-white/10 bg-[#16181b] p-4 md:p-5">
                            <div className="mb-1 flex items-end gap-1 text-2xl font-medium tabular-nums text-white">
                                {i === 0 ? 45 : i === 1 ? 120 : i === 2 ? 5 : 70}+
                            </div>
                            <p className="truncate text-xs text-white/50">{t.stats[key as keyof typeof t.stats]}</p>
                        </div>
                    ))}
                </div>

                <div className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-3">
                    {t.regions.map((r) => (
                        <div
                            key={r.name}
                            className="group rounded-[14px] border border-white/10 bg-[#16181b] p-5 transition-colors hover:border-white/20 sm:p-6"
                        >
                            <h3 className="mb-4 text-lg font-medium text-white">{r.name}</h3>
                            <div className="flex flex-wrap gap-2">
                                    {r.hubs.map((h) => (
                                        <span key={h} className="rounded-[8px] border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs text-white/70">
                                            {h}
                                        </span>
                                    ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
