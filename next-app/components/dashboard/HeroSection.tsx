'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface HeroSectionProps {
    firstName: string;
    sheetHref?: string;
    tagline?: string;
}

export function HeroSection({
    firstName,
    sheetHref = '/dashboard/sheets/sheet-1',
    tagline = 'Say Hello With C++ — keep the momentum going!'
}: HeroSectionProps) {
    return (
        <div className="flex-1">
            <p className="text-white/40 text-xs uppercase tracking-widest mb-3">
                Welcome back
            </p>
            <h1 className="text-3xl md:text-4xl lg:text-[2.75rem] font-bold text-white leading-tight mb-2 break-words max-w-full">
                Hey {firstName},<br />
                <span className="text-[#E8C15A]">let&apos;s code.</span>
            </h1>
            <p className="text-white/50 mb-6">{tagline}</p>
            <Link
                href={sheetHref}
                className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#E8C15A] hover:bg-[#D4AF37] text-black font-bold rounded-xl transition-all hover:shadow-[0_0_20px_rgba(232,193,90,0.3)] hover:gap-3"
            >
                Continue Solving
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
        </div>
    );
}
