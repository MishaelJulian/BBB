import { adminRoute } from '@/lib/handlers'
import { removeMemberFull } from '@/lib/admin/members'

export const dynamic = 'force-dynamic'

// Remove a member: the archive row (as before) plus a 7-day copy of their attendance, status and code, so a restore loses nothing.
export const DELETE = adminRoute<{ id: string }>((tx, who, p) => removeMemberFull(tx, who, decodeURIComponent(p.id)), { body: false })
