import { camps } from '@/lib/sessionData';
import { Metadata } from 'next';
import React from 'react';

export async function generateMetadata({ params }: { params: Promise<{ campSlug: string, sessionNumber: string }> }): Promise<Metadata> {
    const { campSlug, sessionNumber } = await params;
    const camp = camps.find(c => c.slug === campSlug);
    const session = camp?.sessions.find(s => s.number === sessionNumber);

    if (!session) return { title: 'Session Not Found' };

    const title = `Session ${session.number}: ${session.title}`;
    const description = session.description || session.desc;

    return {
        title,
        description,
        alternates: {
            canonical: `https://icpchue.com/sessions/${campSlug}/${sessionNumber}`,
        },
        openGraph: {
            title: `${title} | ${camp?.title}`,
            description,
            images: [session.thumbnail || camp?.image || ''],
        }
    };
}

export default function SessionLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
