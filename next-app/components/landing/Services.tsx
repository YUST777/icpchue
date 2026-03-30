'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/lib/utils/translations';

export default function Services() {
    const { language } = useLanguage();
    const t = translations[language].services;
    const images = [
        '/images/ui/modern-digital-library.webp',
        '/images/ui/sleek-coding.webp',
        '/images/ui/coding-dashboard.webp',
        '/images/ui/modern-coding-collaboration.webp',
    ];

    return (
        <section id="services" className="relative py-12 sm:py-20 bg-gradient-to-b from-black to-[#0b0b0b] overflow-hidden">
            <div className="relative mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
                <div className="mb-6 sm:mb-12 text-center md:text-left">
                    <p className="text-xs uppercase tracking-[0.4em] text-white/40 mb-2">{t.sectionTag}</p>
                    <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white">{t.title}</h2>
                    <p className="mt-3 text-sm sm:text-lg text-white/70 max-w-2xl">{t.description}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {t.solutions.map((sol, i) => (
                        <Link
                            href={sol.link || '#'}
                            key={i}
                            className="group relative rounded-2xl border border-white/10 bg-[#050505] overflow-hidden hover:border-white/20 hover:-translate-y-1 transition-all block"
                        >
                            <div className="h-48 sm:h-64 overflow-hidden relative">
                                <Image
                                    src={images[i] || images[0]}
                                    alt={sol.title}
                                    fill
                                    sizes="(max-width: 768px) 100vw, 50vw"
                                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                            </div>
                            <div className="p-6">
                                <h3 className="text-xl font-bold text-white mb-2">{sol.title}</h3>
                                <p className="text-sm text-white/70 mb-4">{sol.desc}</p>
                                <span className="inline-flex items-center gap-2 text-sm text-[#d59928] group-hover:text-white transition-colors">
                                    {t.learnMore} <ArrowRight className="h-4 w-4" />
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
