import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { apiError, ok, route } from '@/lib/http'
import { caller, readJson } from '@/lib/session'
import { startSession } from '@/lib/sessionDb'
import { jwtFacts } from '@/lib/sessionPolicy'

export const dynamic = 'force-dynamic'
const NO_STORE = { 'Cache-Control': 'private, no-store' }

// Sign-in reports itself: { keep } is the "Keep me signed in" choice (members 90 days instead of 30; admins are always 24 hours).
// It only counts in the first minutes of a session, so a stolen token cannot upgrade itself later.
export const POST = route(async (req: NextRequest) => {
  const who = await caller(req)
  if (!who) return apiError(401, 'Sign in to continue.', NO_STORE)
  const body = await readJson(req)
  const token = (req.headers.get('authorization') ?? '').slice(7).trim()
  const r = await startSession(sql(), { userId: who.id, role: who.role, facts: jwtFacts(token), keep: body?.keep === true, now: Math.floor(Date.now() / 1000) })
  return ok({ keep: r.keep, role: who.role }, NO_STORE)
}, 'write')
