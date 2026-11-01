'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/lib/utils/translations';

export default function Showcase() {
    const { language } = useLanguage();
    const t = translations[language].showcase;
    const [isMobile, setIsMobile] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);

    // Demo images
    const images = [
        '/images/ui/futuristic-library.webp',
        '/images/ui/modern-coding-collaboration.webp',
        '/images/ui/modern-digital-library.webp',
        '/images/ui/coding-dashboard.webp',
    ];
    const slides = t.slides.map((s, i) => ({ ...s, image: images[i] || images[0] }));

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth <= 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Mobile View
    if (isMobile) {
        const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
            const target = e.target as HTMLDivElement;
            const scrollLeft = target.scrollLeft;
            const width = target.offsetWidth;
            const newIndex = Math.round(scrollLeft / width);
            setActiveIndex(newIndex);
        };

        return (
            <section className="relative bg-[#050505] px-0 py-8 text-white sm:py-12">
                <div className="mx-auto max-w-[100vw] overflow-hidden">
                    <p className="text-[10px] xs:text-xs uppercase tracking-[0.3em] text-white/40 mb-6 text-center px-4">
                        {t.sectionTitle}
                    </p>
                    <div
                        className="flex overflow-x-auto snap-x snap-mandatory gap-4 px-4 pb-8 no-scrollbar scroll-smooth scrollbar-hide"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
                        onScroll={handleScroll}
                    >
                        {slides.map((slide) => (
                            <div key={slide.tag} className="relative flex-shrink-0 w-[85vw] snap-center first:pl-2 last:pr-6">
                                <div className="space-y-3">
                                    <div className="relative inline-block w-full overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]">
                                        <Image
                                            src={slide.image}
                                            alt={slide.tag}
                                            width={800}
                                            height={500}
                                            className="w-full h-auto object-contain block"
                                        />
                                    </div>
                                    <div className="space-y-1 px-1">
                                        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#E8C15A]">{slide.tag}</p>
                                        <h3 className="text-lg font-medium leading-tight text-white">{slide.title}</h3>
                                        <p className="line-clamp-3 text-xs leading-relaxed text-white/65">{slide.description}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-center gap-2 mt-4">
                        {slides.map((_, idx) => (
                            <div
                                key={idx}
                                className={`h-1.5 rounded-full transition-colors duration-200 ${idx === activeIndex ? 'w-6 bg-[#E8C15A]' : 'w-1.5 bg-white/20'
                                    }`}
                            />
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    // Desktop View
    return (
        <section className="relative bg-[#050505] px-8 py-16 text-white">
            <div className="max-w-6xl mx-auto grid grid-cols-2 gap-12 items-center min-h-[60vh]">
                <div className="relative flex items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
                    <Image
                        src={slides[activeIndex].image}
                        alt="Showcase"
                        width={800}
                        height={600}
                        className="w-full h-auto max-h-[600px] object-contain"
                    />
                </div>
                <div className="flex flex-col justify-center space-y-6">
                    <p className="text-xs uppercase tracking-[0.4em] text-white/40">{t.sectionTitle}</p>
                    <div className="space-y-4">
                        {slides.map((slide, index) => (
                            <button key={index} onClick={() => setActiveIndex(index)} className="group w-full text-left">
                                <div
                                    className={`rounded-xl border p-4 transition-colors ${index === activeIndex ? 'border-white/10 bg-white/[0.06]' : 'border-transparent hover:border-white/10 hover:bg-white/[0.03]'
                                        }`}
                                >
                                    <h3 className={`text-xl font-medium ${index === activeIndex ? 'text-white' : 'text-white/45'}`}>
                                        {slide.title}
                                    </h3>
                                    {index === activeIndex && <p className="mt-2 text-sm leading-6 text-white/65">{slide.description}</p>}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
