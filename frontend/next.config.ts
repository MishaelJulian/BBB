import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  allowedDevOrigins: ['192.168.1.*', '192.168.1.5', '192.168.1.5:3000', 'localhost:3000'],
  async rewrites() {
    const backendUrl = process.env.BACKEND_INTERNAL_URL || 'http://localhost:8000'
    const authUrl = process.env.AUTH_INTERNAL_URL || 'http://localhost:3001'
    return [
      {
        // Login service (Better Auth). Listed first so it wins over the general /api rule.
        source: '/api/auth/:path*',
        destination: `${authUrl}/api/auth/:path*`,
      },
      {
        source: '/api/admin/:path*',
        destination: `${backendUrl}/admin/:path*`,
      },
      {
        source: '/api/:path*',
        destination: `${backendUrl}/:path*`,
      },
      {
        source: '/assets/:path*',
        destination: `${backendUrl}/assets/:path*`,
      },
    ]
  },
  async redirects() {
    return [
      {
        source: '/library',
        destination: '/library-room',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
