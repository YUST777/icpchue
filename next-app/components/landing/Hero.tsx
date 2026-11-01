'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/lib/utils/translations';

export default function Hero() {
    const { language } = useLanguage();
    const t = translations[language].hero;

    return (
        <section className="relative flex min-h-[560px] w-full items-center overflow-hidden bg-[#0b0b0c] md:min-h-[640px]">
            {/* Background Video + Overlay */}
            <div
                className={`absolute ${language === 'ar' ? '-left-32' : '-right-32'
                    } top-1/2 -translate-y-1/2 z-0 h-[min(720px,90vh)] w-[min(720px,90vw)] opacity-45`}
            >
                <video autoPlay loop muted playsInline preload="none" className="w-full h-full object-contain">
                    <source src="/videos/headervid.webm" type="video/webm" />
                </video>
            </div>
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,#0b0b0c_0%,rgb(11_11_12_/_0.82)_42%,rgb(11_11_12_/_0.22)_100%)]" />

            {/* Content */}
            <div className="relative z-10 w-full py-28 sm:py-32">
                <div className="mx-auto flex h-full max-w-7xl flex-col justify-center px-5 sm:px-8">
                    <div className="max-w-2xl w-full">
                        <h1 className="text-3xl font-semibold leading-[1.08] tracking-[-0.03em] text-white sm:text-5xl lg:text-6xl">
                            {t.title}
                        </h1>
                        <p className="mt-3 sm:mt-4 md:mt-6 text-sm sm:text-base md:text-lg text-white/80 max-w-xl leading-relaxed">
                            {t.description}
                        </p>

                    </div>
                </div>
            </div>
        </section>
    );
}
