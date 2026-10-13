import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export const dynamic = 'force-dynamic'

/** Liveness plus database reachability, for uptime checks. Deliberately outside the rate limiter so it tests the database on its own. */
export async function GET() {
  try {
    try {
      await sql()`select 1`
    } catch {
      await new Promise((r) => setTimeout(r, 150)) // one retry: a fresh pooler connection can fail once
      await sql()`select 1`
    }
    return NextResponse.json({ status: 'ok', database: 'ok' }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error('health: database unreachable', e)
    return NextResponse.json({ status: 'error', database: 'unreachable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
