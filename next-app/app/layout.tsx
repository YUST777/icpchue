import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import ClientVersionManager from '@/components/core/ClientVersionManager';
import "./globals.css";
import Providers from "@/components/core/Providers";
import InstallBanner from "@/components/landing/InstallBanner";
import AchievementToast from "@/components/achievements/AchievementToast";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL('https://icpchue.com'),
  title: {
    default: "ICPC HUE - First ICPC Community in Horus University",
    template: "%s | ICPC HUE"
  },
  description:
    "Join the first ICPC community at Horus University. Access comprehensive training sessions, technical devlogs, and competitive programming resources to master algorithms.",
  keywords: [
    "ICPC",
    "competitive programming",
    "Hours University",
    "coding",
    "algorithms",
    "Codeforces",
    "LeetCode",
  ],
  authors: [{ name: "ICPC HUE Team" }],
  creator: "ICPC HUE",
  publisher: "ICPC HUE",
  openGraph: {
    title: "ICPC HUE - First ICPC Community in Hours University",
    description:
      "Join our competitive programming community at Hours University",
    url: "https://icpchue.com",
    siteName: "ICPC HUE",
    images: [
      {
        url: "/images/ui/metadata.webp",
        width: 1200,
        height: 630,
        alt: "ICPC HUE",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ICPC HUE",
    description: "First ICPC Community in Hours University",
    images: ["/images/ui/metadata.webp"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code', // User can replace this easily
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any', type: 'image/x-icon' },
      { url: '/favicon-16x16.webp', sizes: '16x16', type: 'image/webp' },
      { url: '/favicon-32x32.webp', sizes: '32x32', type: 'image/webp' },
      { url: '/favicon-48x48.webp', sizes: '48x48', type: 'image/webp' },
      { url: '/favicon-64x64.webp', sizes: '64x64', type: 'image/webp' },
      { url: '/icons/icpchue.svg', sizes: '192x192', type: 'image/svg+xml' },
      { url: '/icons/icpchue.svg', sizes: '512x512', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-touch-icon.webp', sizes: '180x180', type: 'image/webp' },
    ],
    shortcut: ['/favicon.ico'],
  },
  manifest: "/manifest.json",
  alternates: {
    languages: {
      'en-US': 'https://icpchue.com',
    },
  },
};

// Multiple JSON-LD schemas for rich snippets
const jsonLdOrganization = {
  '@context': 'https://schema.org',
  '@type': 'EducationalOrganization',
  '@id': 'https://icpchue.com/#organization',
  name: 'ICPC HUE',
  alternateName: 'ICPC Horus University Egypt',
  url: 'https://icpchue.com',
  logo: {
    '@type': 'ImageObject',
    url: 'https://icpchue.com/icons/icpchue.svg',
    width: 512,
    height: 512,
  },
  image: 'https://icpchue.com/images/ui/metadata.webp',
  description: 'First ICPC community at Horus University, Egypt. Training competitive programmers for ACM-ICPC contests.',
  sameAs: [
    'https://www.facebook.com/ICPC.HUE',
    'https://www.linkedin.com/company/icpc-hue',
    'https://www.instagram.com/icpchue',
    'https://x.com/ICPCHUE',
    'https://www.tiktok.com/@icpchue',
    'https://t.me/ICPCHUE'
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'icpchue@hours.edu',
    contactType: 'customer support',
    availableLanguage: ['English', 'Arabic']
  },
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Damietta',
    addressCountry: 'EG'
  }
};

const jsonLdWebsite = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': 'https://icpchue.com/#website',
  name: 'ICPC HUE',
  url: 'https://icpchue.com',
  publisher: { '@id': 'https://icpchue.com/#organization' },
  inLanguage: ['en', 'ar'],
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: 'https://icpchue.com/sessions?q={search_term_string}'
    },
    'query-input': 'required name=search_term_string'
  }
};

const jsonLdCourse = {
  '@context': 'https://schema.org',
  '@type': 'Course',
  name: 'Competitive Programming Training',
  description: 'Comprehensive training program for ACM-ICPC covering algorithms, data structures, and problem-solving techniques.',
  provider: { '@id': 'https://icpchue.com/#organization' },
  educationalLevel: 'Beginner to Advanced',
  teaches: ['C++', 'Algorithms', 'Data Structures', 'Problem Solving', 'Competitive Programming'],
  availableLanguage: ['en', 'ar'],
  isAccessibleForFree: true,
  hasCourseInstance: {
    '@type': 'CourseInstance',
    courseMode: 'online',
    instructor: {
      '@type': 'Person',
      name: 'ICPC HUE Team'
    }
  }
};

const jsonLdBreadcrumb = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: 'https://icpchue.com'
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Sessions',
      item: 'https://icpchue.com/sessions'
    }
  ]
};

const allJsonLd = [jsonLdOrganization, jsonLdWebsite, jsonLdCourse, jsonLdBreadcrumb];

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#E8C15A",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning data-scroll-behavior="smooth">
      <body className="antialiased bg-black text-white" suppressHydrationWarning>
        <Providers>
          <InstallBanner />
          {allJsonLd.map((schema, index) => (
            <script
              key={index}
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
            />
          ))}
          <ClientVersionManager />
          <AchievementToast />

          {children}
        </Providers>
      </body>
    </html>
  );
}
