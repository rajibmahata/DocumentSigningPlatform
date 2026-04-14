/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';

const nextConfig = {
  // Produce a self-contained build in .next/standalone — no full node_modules needed on server.
  output: 'standalone',

  // Canonical HTTPS domain — ensures /_next/static asset URLs use HTTPS in production.
  ...(isProd && {
    assetPrefix: 'https://docsignerhub.com',
  }),

  // Expose react-pdf worker from pdfjs-dist
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },

  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5163';
    return [
      {
        source: '/backend/:path*',
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
