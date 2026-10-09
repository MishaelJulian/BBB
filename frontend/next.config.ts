import type { NextConfig } from 'next'
import { execSync } from 'node:child_process'
import pkg from './package.json'

// D14: release version is set by hand in package.json; the build ID is the commit it was built from.
function buildId(): string {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA
  if (sha) return sha.slice(0, 7)
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return 'dev'
  }
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
    NEXT_PUBLIC_BUILD_ID: buildId(),
  },
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
