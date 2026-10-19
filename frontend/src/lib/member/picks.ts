import type { Sql, TransactionSql } from 'postgres'

export const MAX_PICKS = 4
export const TAGS = ['Favourite', 'Want to read'] as const
export type Tag = (typeof TAGS)[number]
export const isTag = (v: unknown): v is Tag => typeof v === 'string' && (TAGS as readonly string[]).includes(v)

export interface PickRow {
  book_id: string
  title: string
  author_name: string | null
  cover_url: string | null
  thumbnail_url: string | null
  tag: Tag
  created_at: string
}

/** A member's picks, oldest first. */
export async function listPicks(db: Sql | TransactionSql, memberId: string): Promise<PickRow[]> {
  return db<PickRow[]>`
    select p.book_id, b.title, a.full_name as author_name, b.cover_url, b.thumbnail_url, p.tag, p.created_at::text as created_at
    from member_picks p join canonical_books b on b.id = p.book_id left join authors a on a.id = b.author_id
    where p.member_id = ${memberId} order by p.created_at, p.book_id`
}
