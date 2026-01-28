/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  serverExternalPackages: [
    '@stacks/connect',
    '@stacks/transactions',
    '@stacks/network',
    'pino',
    'thread-stream',
  ],
  experimental: {
    serverComponentsExternalPackages: [
      '@stacks/connect',
      '@stacks/transactions', 
      '@stacks/network',
    ],
  },
}

export default nextConfig
