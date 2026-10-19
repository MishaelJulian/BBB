import { adminRoute } from '@/lib/handlers'
import { HttpError } from '@/lib/http'
import { restoreBook, restoreMeetup } from '@/lib/admin/trash'

export const dynamic = 'force-dynamic'

export const POST = adminRoute<{ id: string }>(async (tx, who, p) => {
  const [t] = await tx<{ kind: string }[]>`select kind from admin_trash where id = ${p.id}`
  if (!t) throw new HttpError(404, 'Nothing to restore.')
  return t.kind === 'book' ? restoreBook(tx, who, p.id) : restoreMeetup(tx, who, p.id)
}, { body: false })
