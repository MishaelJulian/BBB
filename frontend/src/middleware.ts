import { NextRequest, NextResponse } from 'next/server'

// Same-origin proxy to the droplet (D1, D35). The browser only ever talks to this site, so login
// cookies stay first-party; the origin secret is added here, server-side, and never reaches the browser.
// Proxy only: authorisation is enforced by the API itself (CVE-2025-29927 showed middleware-only auth fails).
export const config = { matcher: ['/api/:path*', '/assets/:path*'] }

const BACKEND = process.env.BACKEND_INTERNAL_URL || 'http://localhost:8000'
const AUTH = process.env.AUTH_INTERNAL_URL || 'http://localhost:3001'

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl
  let target: URL
  if (pathname.startsWith('/api/auth/')) {
    target = new URL(pathname + search, AUTH) // the auth service serves /api/auth/* itself
  } else if (pathname.startsWith('/api/')) {
    target = new URL(pathname.slice(4) + search, BACKEND) // /api/books -> /books
  } else {
    target = new URL(pathname + search, BACKEND) // /assets/*
  }

  const headers = new Headers(req.headers)
  headers.delete('x-origin-secret') // never trust a client-supplied value
  const secret = process.env.ORIGIN_SECRET
  if (secret) headers.set('x-origin-secret', secret)
  const visitor = req.headers.get('x-real-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  if (visitor) headers.set('x-real-ip', visitor)

  return NextResponse.rewrite(target, { request: { headers } })
}
