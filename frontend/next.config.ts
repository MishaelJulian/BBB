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
  // /api/* and /assets/* are proxied by src/middleware.ts (adds the origin secret server-side).
  async headers() {
    const isDev = process.env.NODE_ENV !== 'production'
    const csp = [
      "default-src 'self'",
      // Next.js inlines its bootstrap scripts; no third-party scripts are allowed (D29).
      // Development mode (Fast Refresh / sourcemaps) requires 'unsafe-eval'.
      isDev ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" : "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      // Cover images come from these hosts (see app/services/pdf_generator.py COVER_HOSTS, DOMAINS.txt).
      "img-src 'self' data: blob: https://*.gr-assets.com https://*.mzstatic.com https://m.media-amazon.com https://duckduckgo.com https://static.tvmaze.com https://i.ytimg.com https://i.scdn.co",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
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
