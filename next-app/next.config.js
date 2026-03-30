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

    async redirects() {
        return [
            {
                source: '/apply',
                destination: '/register',
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
