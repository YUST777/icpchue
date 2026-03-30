'use client';

import { Globe2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/lib/utils/translations';

export default function Network() {
    const { language } = useLanguage();
    const t = translations[language].network;
    const regionColors = [
        'from-[#d59928]/20 to-[#e6b04a]/20',
        'from-[#b8811f]/20 to-[#d59928]/20',
        'from-[#d59928]/20 to-[#f5d078]/20',
    ];

    return (
        <section id="network" className="relative py-12 sm:py-20 bg-[#0b0b0b] overflow-hidden">
            <div className="relative mx-auto max-w-7xl px-4">
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-[#d59928] to-[#e6b04a] flex items-center justify-center">
                            <Globe2 className="h-5 w-5 text-white" />
                        </div>
                        <p className="text-xs uppercase tracking-[0.4em] text-white/40">{t.sectionTag}</p>
                    </div>
                    <h2 className="text-3xl sm:text-5xl font-black text-white mb-4">{t.title}</h2>
                    <p className="text-sm sm:text-lg text-white/70 max-w-2xl">{t.description}</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8 md:mb-10">
                    {Object.keys(t.stats).map((key, i) => (
                        <div key={key} className="p-3 md:p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl">
                            <div className="flex items-end gap-1 md:gap-2 text-xl md:text-2xl font-bold text-white mb-1">
                                {i === 0 ? 45 : i === 1 ? 120 : i === 2 ? 5 : 70}+
                            </div>
                            <p className="text-[10px] md:text-xs uppercase tracking-wide text-white/60 truncate">{t.stats[key as keyof typeof t.stats]}</p>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    {t.regions.map((r, i) => (
                        <div
                            key={r.name}
                            className="group relative rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition-all"
                        >
                            <div
                                className={`absolute inset-0 bg-gradient-to-br ${regionColors[i]} opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl`}
                            />
                            <div className="relative">
                                <h3 className="text-lg font-bold text-white mb-4">{r.name}</h3>
                                <div className="flex flex-wrap gap-2">
                                    {r.hubs.map((h) => (
                                        <span key={h} className="text-xs text-white/80 bg-white/10 px-2 py-1 rounded-lg">
                                            {h}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
