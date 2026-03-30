import { getDevLog } from '@/lib/content/devlog';
import { Metadata } from 'next';
import React from 'react';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    const logId = parseInt(id);
    const entry = getDevLog(logId);

    if (!entry) return { title: 'Log Entry Not Found' };

    return {
        title: entry.title,
        description: entry.subtitle || entry.description,
        alternates: {
            canonical: `https://icpchue.com/devlog/${id}`,
        },
        openGraph: {
            title: `${entry.title} | ICPC HUE DevLog`,
            description: entry.subtitle || entry.description,
            images: entry.media?.[0]?.type === 'image' ? [entry.media[0].src] : ['/images/ui/metadata.webp'],
        }
    };
}

export default function DevLogLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
