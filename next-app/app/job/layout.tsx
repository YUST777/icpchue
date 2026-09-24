import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: {
        absolute: 'Join the Team 2027 | ICPC HUE',
    },
    description: 'Apply for a community role in ICPC HUE — Mentor, Instructor, Organizing, and Media.',
    openGraph: {
        title: 'Join the Team 2027 | ICPC HUE',
        description: 'Apply for a community role in ICPC HUE — Mentor, Instructor, Organizing, and Media.',
        url: 'https://icpchue.com/job',
        siteName: 'ICPC HUE',
        locale: 'en_US',
        type: 'website',
        images: [
            {
                url: '/images/ui/banner_job.webp',
                width: 1733,
                height: 907,
                alt: 'ICPC HUE - Join the Team 2027',
                type: 'image/webp',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Join the Team 2027 | ICPC HUE',
        description: 'Apply for a community role in ICPC HUE — Mentor, Instructor, Organizing, and Media.',
        images: ['/images/ui/banner_job.webp'],
    },
    alternates: {
        canonical: 'https://icpchue.com/job',
    },
};

export default function JobLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
