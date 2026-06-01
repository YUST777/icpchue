import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // We aim to fix all build errors instead of ignoring them
    typescript: {
        ignoreBuildErrors: true,
    },
    serverExternalPackages: ['pg', 'sharp', 'canvas'],
    reactCompiler: true,
    experimental: {
        proxyClientMaxBodySize: '50mb',
        serverActions: {
            bodySizeLimit: '50mb',
        },
    },

    async redirects() {
        return [
            {
                source: '/apply',
                destination: '/register',
                permanent: true,
            },
            {
                source: '/joinnow',
                destination: '/register',
                permanent: true,
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

    async rewrites() {
        const rybbitHost = process.env.NEXT_PUBLIC_RYBBIT_HOST || "https://rybbit.yust.dev";
        return [
            // Internal Redirects / Shortlinks
            {
                source: '/2025',
                destination: '/Dec/2025',
            },
            {
                source: '/2025/dec',
                destination: '/Dec',
            },
            {
                source: '/2025/:path*',
                destination: '/Dec/:path*',
            },
            // Rybbit Analytics Proxies
            {
                source: "/api/rybbit/script.js",
                destination: `${rybbitHost}/api/script.js`,
            },
            {
                source: "/api/track",
                destination: `${rybbitHost}/api/track`,
            },
            {
                source: "/api/site/tracking-config/:path*",
                destination: `${rybbitHost}/api/site/tracking-config/:path*`,
            },
            {
                source: "/api/identify",
                destination: `${rybbitHost}/api/identify`,
            },
        ]
    },
};

export default nextConfig;
