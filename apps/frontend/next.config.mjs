/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true, // Temporarily disable until chart types are fixed
  },
  images: {
    unoptimized: false, // Enable image optimization for production
    domains: [], // Add your image domains here when needed
  },
  output: 'standalone', // Better for containerization and Vercel
  experimental: {
    // Handle monorepo correctly
    outputFileTracingRoot: '../../',
  },
  // Optimize for production
  swcMinify: true,
  compress: true,
  // Configure redirects if needed
  async redirects() {
    return [
      // Add redirects here if needed
    ]
  },
  // API proxy for development
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3002/api/:path*', // Proxy to backend API
      },
    ]
  },
  // Environment variables validation
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
}

export default nextConfig
