import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const previewImage = '/icpchue_2026/apply/slides/ecpc-feature.webp';

export const metadata: Metadata = {
    title: 'Apply for ICPC HUE Level 0 Training',
    description: 'Join ICPC HUE Level 0 training and prepare for competitive programming with the Horus University community.',
    openGraph: {
        title: 'Apply for ICPC HUE Level 0 Training',
        description: 'Join ICPC HUE Level 0 training and prepare for competitive programming with the Horus University community.',
        url: '/apply',
        siteName: 'ICPC HUE',
        images: [
            {
                url: previewImage,
                width: 1920,
                height: 1080,
                alt: 'ICPC HUE community at the ECPC qualification',
            },
        ],
        locale: 'en_US',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Apply for ICPC HUE Level 0 Training',
        description: 'Join ICPC HUE Level 0 training and prepare for competitive programming with the Horus University community.',
        images: [previewImage],
    },
};

export default function ApplyLayout({ children }: Readonly<{ children: ReactNode }>) {
    return children;
}
