import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * Daily Vercel cron: a real query so Supabase's free plan does not pause the project for inactivity,
 * plus trimming old rate-limit counters. Vercel sends "Authorization: Bearer $CRON_SECRET"; anything else is refused.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ detail: 'Not allowed.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
  }
  try {
    const trimmed = await sql()`delete from rate_limits where window_start < now() - interval '1 day'`
    return NextResponse.json({ status: 'ok', rate_limit_rows_trimmed: trimmed.count }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error('cron/daily failed', e)
    return NextResponse.json({ status: 'error' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}
