import { adminRoute } from '@/lib/handlers'
import { issueResetCode } from '@/lib/recovery/codes'

export const dynamic = 'force-dynamic'

// Admin issues a one-time reset code (24 hours) for a member with a linked account. Returned once; only its hash is stored.
export const POST = adminRoute<{ id: string }>(async (tx, who, p) => {
  const r = await issueResetCode(tx, who, p.id)
  return { code: r.code, expires_at: new Date(r.expires_at * 1000).toISOString(), member: r.member }
}, { body: false })
