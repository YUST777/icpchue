'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/lib/translations';

export default function Contact() {
    const { language } = useLanguage();
    const t = translations[language].contact;

    return (
        <section id="contact" className="relative py-20 bg-black text-center overflow-hidden">
            {/* Background Video */}
            <div className="absolute inset-0 z-0">
                <video autoPlay loop muted playsInline className="w-full h-full object-cover opacity-20">
                    <source src="/videos/applynow.webm" type="video/webm" />
                </video>
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
            </div>

            <div className="max-w-4xl mx-auto px-4 relative z-10">
                <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">{t.ctaTitle}</h2>
                <p className="text-lg text-white/70 mb-8">{t.ctaDescription}</p>
                <Link
                    href="/apply"
                    className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-[#d59928] to-[#e6b04a] text-white font-bold text-lg hover:scale-105 transition-transform"
                >
                    {t.ctaButton} <ArrowRight className="h-5 w-5" />
                </Link>
            </div>
        </section>
    );
}
