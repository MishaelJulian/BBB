import { adminRoute } from '@/lib/handlers'
import { updateBook } from '@/lib/ops'

export const dynamic = 'force-dynamic'

export const PUT = adminRoute<{ id: string }>((tx, who, p, body) => updateBook(tx, who, p.id, body))
