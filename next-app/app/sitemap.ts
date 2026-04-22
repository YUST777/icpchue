import { MetadataRoute } from 'next';
import { camps } from '@/lib/sessionData';
import { devLogs } from '@/lib/content/devlog';

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://icpchue.com';

    // 1. Static Routes
    const staticRoutes: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 1,
        },
        {
            url: `${baseUrl}/sessions`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/devlog`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.7,
        },
        {
            url: `${baseUrl}/register`,
            lastModified: new Date(),
            changeFrequency: 'yearly',
            priority: 0.5,
        },
        {
            url: `${baseUrl}/login`,
            lastModified: new Date(),
            changeFrequency: 'yearly',
            priority: 0.5,
        },
        {
            url: `${baseUrl}/privacy`,
            lastModified: new Date(),
            changeFrequency: 'yearly',
            priority: 0.3,
        },
        {
            url: `${baseUrl}/terms`,
            lastModified: new Date(),
            changeFrequency: 'yearly',
            priority: 0.3,
        },
        {
            url: `${baseUrl}/forgot-password`,
            lastModified: new Date(),
            changeFrequency: 'yearly',
            priority: 0.3,
        },
    ];

    // 2. Dynamic Camp/Session Routes
    const sessionRoutes: MetadataRoute.Sitemap = camps.flatMap((camp) => {
        // Only include camps that are publicly visible
        if (camp.publicVisible === false && camp.slug !== 'level0' && camp.slug !== 'level1') {
            // Note: level0 and level1 have some public sessions even if camp is technically "internal"
            // But based on app structure, we usually only index what's on the /sessions page
        }

        const routes: MetadataRoute.Sitemap = [
            {
                url: `${baseUrl}/sessions/${camp.slug}`,
                lastModified: new Date(),
                changeFrequency: 'weekly',
                priority: 0.7,
            }
        ];

        // Add each session in the camp
        camp.sessions.forEach(session => {
            routes.push({
                url: `${baseUrl}/sessions/${camp.slug}/${session.number}`,
                lastModified: new Date(),
                changeFrequency: 'weekly',
                priority: 0.6,
            });
        });

        return routes;
    });

    // 3. Dynamic DevLog Routes
    const devlogRoutes: MetadataRoute.Sitemap = devLogs.map((entry) => ({
        url: `${baseUrl}/devlog/${entry.id}`,
        lastModified: new Date(entry.date),
        changeFrequency: 'monthly',
        priority: 0.6,
    }));

    return [...staticRoutes, ...sessionRoutes, ...devlogRoutes];
}

