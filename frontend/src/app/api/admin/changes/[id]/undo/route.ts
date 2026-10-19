import { adminRoute } from '@/lib/handlers'
import { undoChange } from '@/lib/admin/changes'

export const dynamic = 'force-dynamic'

export const POST = adminRoute<{ id: string }>((tx, who, p) => undoChange(tx, who, p.id), { body: false })
