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
            <section className="relative bg-[#050505] text-white py-8 sm:py-12 px-0">
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
                                    <div className="relative inline-block w-full rounded-xl bg-white/5 border border-white/10 overflow-hidden shadow-lg">
                                        <Image
                                            src={slide.image}
                                            alt={slide.tag}
                                            width={800}
                                            height={500}
                                            className="w-full h-auto object-contain block"
                                        />
                                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                                            <p className="text-[10px] tracking-[0.2em] text-[#d59928] font-bold uppercase mb-1">
                                                {slide.tag}
                                            </p>
                                            <h3 className="text-lg font-bold text-white leading-tight">{slide.title}</h3>
                                        </div>
                                    </div>
                                    <p className="px-1 text-xs text-white/70 leading-relaxed line-clamp-3">{slide.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-center gap-2 mt-4">
                        {slides.map((_, idx) => (
                            <div
                                key={idx}
                                className={`h-1.5 rounded-full transition-all duration-300 ${idx === activeIndex ? 'w-6 bg-[#d59928]' : 'w-1.5 bg-white/20'
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
        <section className="relative bg-[#050505] text-white py-16 px-8">
            <div className="max-w-6xl mx-auto grid grid-cols-2 gap-12 items-center min-h-[60vh]">
                <div className="relative rounded-2xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center">
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
                            <button key={index} onClick={() => setActiveIndex(index)} className="text-left w-full group">
                                <div
                                    className={`p-4 rounded-xl transition-all ${index === activeIndex ? 'bg-white/10' : 'hover:bg-white/5'
                                        }`}
                                >
                                    <h3 className={`text-xl font-bold ${index === activeIndex ? 'text-white' : 'text-white/40'}`}>
                                        {slide.title}
                                    </h3>
                                    {index === activeIndex && <p className="mt-2 text-sm text-white/70">{slide.description}</p>}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
