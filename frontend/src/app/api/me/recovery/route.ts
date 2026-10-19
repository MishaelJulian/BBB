import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { apiError, ok, route } from '@/lib/http'
import { caller, readJson } from '@/lib/session'
import { auditAuth, issuePhrase, mayIssueFirst, phraseStatus } from '@/lib/recovery/reset'
import { passwordOk } from '@/lib/recovery/supabaseAuth'

export const dynamic = 'force-dynamic'
const NO_STORE = { 'Cache-Control': 'private, no-store' }

// Do I have a recovery phrase? (Never the words: only a hash is kept.)
export const GET = route(async (req: NextRequest) => {
  const who = await caller(req)
  if (!who) return apiError(401, 'Sign in to continue.', NO_STORE)
  const s = await phraseStatus(sql(), who.id)
  return ok({ has: s.has, created_at: s.created_at }, NO_STORE)
})

// Make a recovery phrase and return its 12 words ONCE. The first phrase of a brand-new session needs no password;
// a replacement (or a phrase for an older session) asks for the password again, checked here against Supabase Auth.
export const POST = route(async (req: NextRequest) => {
  const who = await caller(req)
  if (!who) return apiError(401, 'Sign in to continue.', NO_STORE)
  const body = await readJson(req)
  const db = sql()
  const now = Math.floor(Date.now() / 1000)
  const s = await phraseStatus(db, who.id)
  if (!mayIssueFirst(s.has, who.sessionStart, now)) {
    const [lim] = await db<{ ok: boolean }[]>`select hit_rate_limit(${'phrase:' + who.id}, 600, 5) as ok`
    if (lim && !lim.ok) return apiError(429, 'Too many tries. Wait a few minutes and try again.', { 'Retry-After': '600', ...NO_STORE })
    const password = typeof body?.password === 'string' ? body.password : ''
    if (!password) return apiError(422, 'Enter your password.', NO_STORE)
    if (!who.email || !(await passwordOk(who.email, password))) {
      await auditAuth(db, 'auth.phrase.denied', who.id, null, who.id, { why: 'wrong password' })
      return apiError(403, 'That password is not right.', NO_STORE)
    }
  }
  const words = await issuePhrase(db, who.id, now)
  await auditAuth(db, s.has ? 'auth.phrase.regenerated' : 'auth.phrase.created', who.id, null, who.id, { via: 'account' })
  return ok({ phrase: words }, NO_STORE)
}, 'write')
