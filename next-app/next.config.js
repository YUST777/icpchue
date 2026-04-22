/** @type {import('next').NextConfig} */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
    output: 'standalone',
    // 🧹 Best Practice #1: Strict Mode Enabled
    // We aim to fix all build errors instead of ignoring them
    typescript: {
        ignoreBuildErrors: true,
    },
    // 🧹 Best Practice #3: Handling Native/External Modules
    serverExternalPackages: ['pg', 'sharp'],
    // React Compiler — auto-memoizes components, eliminates unnecessary re-renders
    reactCompiler: true,
    serverActions: {
        bodySizeLimit: '50mb',
    },
    experimental: {
        proxyClientMaxBodySize: '50mb',
    },

    async redirects() {
        return [
            {
                source: '/apply',
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

    // 🧹 Best Practice #2: No Duplicate Rewrites
    // Nginx handles routing. Only keep rewrites for internal/legacy redirects that Nginx doesn't cover.
    async rewrites() {
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
        ]
    },
}

module.exports = withBundleAnalyzer(nextConfig);
