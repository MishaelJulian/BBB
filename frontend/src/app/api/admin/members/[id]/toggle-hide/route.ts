import { adminRoute } from '@/lib/handlers'
import { setMemberHidden } from '@/lib/ops'

export const dynamic = 'force-dynamic'

// An empty body toggles; {"is_hidden": true|false} sets it.
export const POST = adminRoute<{ id: string }>((tx, who, p, body) => setMemberHidden(tx, who, decodeURIComponent(p.id), typeof body.is_hidden === 'boolean' ? body.is_hidden : undefined), { body: false })
