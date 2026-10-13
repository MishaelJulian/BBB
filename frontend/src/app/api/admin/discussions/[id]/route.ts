import { adminRoute } from '@/lib/handlers'
import { deleteDiscussion } from '@/lib/ops'

export const dynamic = 'force-dynamic'

export const DELETE = adminRoute<{ id: string }>((tx, who, p) => deleteDiscussion(tx, who, p.id), { body: false })
