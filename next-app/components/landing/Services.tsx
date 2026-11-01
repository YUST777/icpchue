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
        <section id="services" className="relative overflow-hidden bg-[#0b0b0c] py-16 sm:py-24">
            <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
                <div className="mb-10 max-w-2xl md:mb-14">
                    <p className="mb-3 text-xs font-medium tracking-wide text-white/50">{t.sectionTag}</p>
                    <h2 className="text-3xl font-medium tracking-tight text-white sm:text-4xl lg:text-5xl">{t.title}</h2>
                    <p className="mt-4 text-base leading-7 text-white/60 sm:text-lg">{t.description}</p>
                </div>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    {t.solutions.map((sol, i) => (
                        <Link
                            href={sol.link || '#'}
                            key={i}
                            className="group relative block overflow-hidden rounded-[14px] border border-white/10 bg-[#16181b] transition-colors hover:border-white/20"
                        >
                            <div className="h-48 sm:h-64 overflow-hidden relative">
                                <Image
                                    src={images[i] || images[0]}
                                    alt={sol.title}
                                    fill
                                    sizes="(max-width: 768px) 100vw, 50vw"
                                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                            </div>
                            <div className="p-5 sm:p-6">
                                <h3 className="mb-2 text-lg font-medium text-white sm:text-xl">{sol.title}</h3>
                                <p className="mb-5 text-sm leading-6 text-white/60">{sol.desc}</p>
                                <span className="inline-flex items-center gap-2 text-sm font-medium text-[#E8C15A] transition-colors group-hover:text-[#F0CE76]">
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
