import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Development Log | ICPC HUE',
    description: 'Follow the evolution of ICPC HUE platform from v0.1 to v2.0. 11 versions, 35 days of development - complete changelog and feature history.',
    keywords: ['ICPC HUE', 'development log', 'changelog', 'version history', 'competitive programming platform'],
    openGraph: {
        title: 'Development Log | ICPC HUE',
        description: 'Follow the evolution of ICPC HUE platform from genesis to the fully-featured judge system.',
        url: 'https://icpchue.com/devlog',
        type: 'article',
        images: [
            {
                url: '/News/devlog.webp',
                width: 1200,
                height: 630,
                alt: 'ICPC HUE Development Log',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Development Log | ICPC HUE',
        description: 'Follow the evolution of ICPC HUE platform.',
        images: ['/News/devlog.webp'],
    },
    alternates: {
        canonical: 'https://icpchue.com/devlog',
    },
};

export default function DevlogLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
