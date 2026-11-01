'use client';

import { cdn } from '@/lib/cdn';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/lib/utils/translations';

export default function Contact() {
    const { language } = useLanguage();
    const t = translations[language].contact;

    return (
        <section id="contact" className="relative overflow-hidden bg-[#0b0b0c] py-20 text-center sm:py-28">
            {/* Background Video */}
            <div className="absolute inset-0 z-0">
                <video autoPlay loop muted playsInline className="w-full h-full object-cover opacity-20">
                    <source src={cdn("/videos/applynow.webm")} type="video/webm" />
                </video>
                <div className="absolute inset-0 bg-[#0b0b0c]/80" />
            </div>

            <div className="max-w-4xl mx-auto px-4 relative z-10">
                <h2 className="mb-4 text-3xl font-medium tracking-tight text-white sm:text-5xl">{t.ctaTitle}</h2>
                <p className="mb-8 text-base leading-7 text-white/60 sm:text-lg">{t.ctaDescription}</p>
                <Link
                    href="/apply"
                    className="inline-flex items-center gap-2 rounded-[10px] bg-[#E8C15A] px-7 py-3.5 text-base font-medium text-[#17140c] transition-colors hover:bg-[#F0CE76] sm:text-lg"
                >
                    {t.ctaButton} <ArrowRight className="h-5 w-5" />
                </Link>
            </div>
        </section>
    );
}
