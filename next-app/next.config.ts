import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    serverExternalPackages: ['pg', 'sharp', 'canvas'],
    images: {
        // Keep story images sharp on high-density screens while retaining
        // Next's responsive resizing and lazy-loading behavior.
        qualities: [75, 90],
    },
    reactCompiler: true,
    experimental: {
        proxyClientMaxBodySize: '50mb',
        serverActions: {
            bodySizeLimit: '50mb',
        },
    },

    // Static files in public/ were revalidated on every visit (max-age=0). Keep them a day and
    // refresh in the background for a week: repeat visits skip the network for models and images.
    async headers() {
        const assetCache = [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }];
        return ['/3d', '/images', '/draco', '/icpchue_2026', '/sessions', '/devlog', '/fonts', '/icons', '/videos', '/News']
            .map(dir => ({ source: `${dir}/:path*`, headers: assetCache }));
    },

    async redirects() {
        return [
            // The 2025 recap pages are retired.
            { source: '/2025/:path*', destination: '/', permanent: false },
            { source: '/2025', destination: '/', permanent: false },
            { source: '/Dec/:path*', destination: '/', permanent: false },
            { source: '/Dec', destination: '/', permanent: false },
            { source: '/card', destination: '/', permanent: false },
            { source: '/fq', destination: '/', permanent: false },
            {
                source: '/joinnow',
                destination: '/register',
                permanent: true,
            },
            // Team News is temporarily offline while it is being refreshed.
            {
                source: '/dashboard/news',
                destination: '/dashboard',
                permanent: false,
            },
            {
                source: '/dashboard/news/:path*',
                destination: '/dashboard',
                permanent: false,
            },
            // Specific Legacy Moves (Safety Net)
            {
                source: '/dashboard/sessions/wintercamp/2',
                destination: '/dashboard/sessions/level0/functions',
                permanent: true,
            },
            {
                source: '/sessions/wintercamp/2',
                destination: '/sessions/level0/functions',
                permanent: true,
            },
            {
                source: '/dashboard/sessions/level1/2',
                destination: '/dashboard/sessions/level0/functions',
                permanent: true,
            },
            {
                source: '/sessions/level1/2',
                destination: '/sessions/level0/functions',
                permanent: true,
            },
            // Legacy Camp Redirects
            {
                source: '/sessions/approvalcamp',
                destination: '/sessions/level0',
                permanent: true,
            },
            {
                source: '/sessions/wintercamp',
                destination: '/sessions/level1',
                permanent: true,
            },
            {
                source: '/dashboard/sessions/approvalcamp',
                destination: '/dashboard/sessions/level0',
                permanent: true,
            },
            {
                source: '/dashboard/sessions/wintercamp',
                destination: '/dashboard/sessions/level1',
                permanent: true,
            },
            // Catch-all for deep links (e.g., /sessions/approvalcamp/1)
            {
                source: '/sessions/approvalcamp/:path*',
                destination: '/sessions/level0/:path*',
                permanent: true,
            },
            {
                source: '/sessions/wintercamp/:path*',
                destination: '/sessions/level1/:path*',
                permanent: true,
            },
            {
                source: '/dashboard/sessions/approvalcamp/:path*',
                destination: '/dashboard/sessions/level0/:path*',
                permanent: true,
            },
            {
                source: '/dashboard/sessions/wintercamp/:path*',
                destination: '/dashboard/sessions/level1/:path*',
                permanent: true,
            },
        ];
    },

};

export default nextConfig;
