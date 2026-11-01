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
    tagline = 'Say Hello With C++. Keep the momentum going.'
}: HeroSectionProps) {
    return (
        <div className="flex-1">
            <p className="mb-2 text-sm text-[var(--color-text-secondary)]">
                {firstName}
            </p>
            <h1 className="mb-2 max-w-full break-words text-3xl font-medium leading-tight text-[var(--color-text)] md:text-4xl">
                Today&apos;s training
            </h1>
            <p className="mb-6 max-w-xl text-sm leading-6 text-[var(--color-text-secondary)]">{tagline}</p>
            <Link
                href={sheetHref}
                className="ui-button-primary w-full sm:w-auto"
            >
                Continue solving
                <ArrowRight size={18} aria-hidden="true" />
            </Link>
        </div>
    );
}
