import { memberRoute } from '@/lib/handlers'
import { removeOwnEntry } from '@/lib/ops'

export const dynamic = 'force-dynamic'

// Remove one of MY entries. The row is matched on both the id and my member record, so nobody else's can be touched.
export const DELETE = memberRoute<{ id: string }>((tx, who, memberId, p) => removeOwnEntry(tx, who, memberId, p.id), { body: false })
