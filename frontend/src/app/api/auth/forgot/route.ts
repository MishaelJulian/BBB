import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { apiError, ok, route } from '@/lib/http'
import { readJson } from '@/lib/session'
import { resetPassword } from '@/lib/recovery/reset'
import { dropSupabaseSessions, setPasswordAdmin } from '@/lib/recovery/supabaseAuth'

export const dynamic = 'force-dynamic'
const NO_STORE = { 'Cache-Control': 'private, no-store' }

// Forgot password: email + 12 words (or an admin's reset code) + new password. Answers with the NEW phrase, once.
// Nothing here is cached or logged; the words, code and password only travel in this POST body.
export const POST = route(async (req: NextRequest) => {
  const body = await readJson(req)
  if (!body) return apiError(422, 'Enter your email, the words or code, and a new password.', NO_STORE)
  const ip = req.headers.get('x-real-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const r = await resetPassword(sql(), { email: body.email, phrase: body.phrase, code: body.code, password: body.password }, {
    ip,
    now: Math.floor(Date.now() / 1000),
    setPassword: setPasswordAdmin,
    sessionsGone: dropSupabaseSessions,
  })
  if (!r.ok) return apiError(r.status, r.message, r.status === 429 ? { 'Retry-After': '900', ...NO_STORE } : NO_STORE)
  return ok({ phrase: r.phrase }, NO_STORE)
}, 'write')
