import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: ['/', '/register', '/sessions', '/devlog', '/login', '/images/', '/logos/', '/videos/', '/3d/'],
            disallow: ['/admin', '/api', '/dashboard', '/profile'],
        },
        sitemap: 'https://icpchue.com/sitemap.xml',
    };
}
