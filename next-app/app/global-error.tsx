'use client';

import { useEffect } from 'react';
import { reportClientError } from '@/lib/observability/report-client-error';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        reportClientError({ kind: 'react', message: `[root] ${error.name}: ${error.message}`, stack: error.stack, digest: error.digest });
    }, [error]);

    return (
        <html lang="en">
            <body style={{ margin: 0, minHeight: '100dvh', display: 'grid', placeItems: 'center', background: '#0A0A0A', color: '#fff', fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
                <title>Something went wrong · ICPC HUE</title>
                <div style={{ maxWidth: 360, padding: 24 }}>
                    <h1 style={{ fontSize: 20, margin: '0 0 8px' }}>Something went wrong</h1>
                    <p style={{ fontSize: 14, color: 'rgba(255,255,255,.55)', margin: '0 0 20px' }}>We logged the problem. Please try again.</p>
                    <button type="button" onClick={() => reset()} style={{ border: 0, borderRadius: 12, padding: '10px 20px', background: '#E8C15A', color: '#000', fontWeight: 700, cursor: 'pointer' }}>
                        Try again
                    </button>
                </div>
            </body>
        </html>
    );
}
