import { sql } from '@/lib/db'
import { adminRoute } from '@/lib/handlers'
import { updateBook } from '@/lib/ops'
import { editBook, getBook } from '@/lib/admin/books'
import { trashBook } from '@/lib/admin/trash'
import { adminGet } from '@/lib/admin/route'

export const dynamic = 'force-dynamic'

export const GET = adminGet<{ id: string }>((_req, _who, p) => sql().begin((tx) => getBook(tx, p.id)))

// Old callers (a discussion row with readers and notes) keep the old behaviour; a plain book edit takes every column the schema has.
export const PUT = adminRoute<{ id: string }>((tx, who, p, body) =>
  'discussion_id' in body || 'member' in body ? updateBook(tx, who, p.id, body) : editBook(tx, who, p.id, body),
)

// Delete a book: a 7-day copy is kept. Blocked while it has discussions.
export const DELETE = adminRoute<{ id: string }>((tx, who, p) => trashBook(tx, who, p.id), { body: false })
