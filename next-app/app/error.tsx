'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { reportClientError } from '@/lib/observability/report-client-error';

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        reportClientError({ kind: 'react', message: `${error.name}: ${error.message}`, stack: error.stack, digest: error.digest });
    }, [error]);

    return (
        <div dir="ltr" className="flex min-h-[100dvh] w-full items-center justify-center bg-[#0A0A0A] px-6 text-center">
            <div className="max-w-sm">
                <h1 className="mb-2 text-xl font-bold text-white">Something went wrong</h1>
                <p className="mb-6 text-sm text-white/50">We logged the problem and will look into it. Please try again.</p>
                <div className="flex items-center justify-center gap-3">
                    <button type="button" onClick={() => reset()} className="rounded-xl bg-[#E8C15A] px-5 py-2.5 text-sm font-bold text-black hover:bg-[#D59928]">
                        Try again
                    </button>
                    <Link href="/" className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-white/70 hover:text-white">
                        Home
                    </Link>
                </div>
            </div>
        </div>
    );
}
