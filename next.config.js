/** @type {import('next').NextConfig} */
const nextConfig = {
  // appDir is now default in Next.js 14, no need for experimental flag
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.sim.dune.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'assets.coingecko.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'tokens.1inch.io',
        port: '',
        pathname: '/**',
      }
    ],
  },
}

module.exports = nextConfig
