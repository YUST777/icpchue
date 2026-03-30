'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/lib/utils/translations';

export default function Hero() {
    const { language } = useLanguage();
    const t = translations[language].hero;

    return (
        <section className="relative h-auto min-h-[400px] sm:min-h-[450px] md:min-h-[500px] w-full overflow-hidden bg-black">
            {/* Background Video + Overlay */}
            <div
                className={`absolute ${language === 'ar' ? '-left-32' : '-right-32'
                    } top-1/2 -translate-y-1/2 z-0 w-[min(800px,90vw)] h-[min(800px,90vh)] opacity-60`}
            >
                <video autoPlay loop muted playsInline preload="none" className="w-full h-full object-contain">
                    <source src="/videos/headervid.webm" type="video/webm" />
                </video>
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80 pointer-events-none" />

            {/* Content */}
            <div className="relative z-10 h-full pt-20 sm:pt-24 md:pt-28 lg:pt-32 pb-20">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8 lg:px-8 h-full flex flex-col justify-start">
                    <div className="max-w-2xl w-full">
                        <h1 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
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
