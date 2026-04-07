/** @type {import('next').NextConfig} */
const nextConfig = {
    // Use React strict mode
    reactStrictMode: true,

    // Permanent HTTP 301 redirects for deprecated language routes.
    // /en and /es were used when the portal was multilingual.
    // Now English-only: all language routes redirect to root.
    // This resolves "Duplicate without user-selected canonical" in Google Search Console.
    async redirects() {
        return [
            {
                source: '/en',
                destination: '/',
                permanent: true,
            },
            {
                source: '/es',
                destination: '/',
                permanent: true,
            },
        ];
    },
};

module.exports = nextConfig;
