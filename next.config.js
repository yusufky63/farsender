/** @type {import('next').NextConfig} */
const nextConfig = {
  // appDir is now default in Next.js 14, no need for experimental flag
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      }
    ],
  },
}

module.exports = nextConfig
