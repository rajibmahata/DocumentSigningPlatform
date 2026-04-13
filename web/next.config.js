/** @type {import('next').NextConfig} */
const nextConfig = {
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
