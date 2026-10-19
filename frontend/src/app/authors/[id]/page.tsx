import { notFound } from 'next/navigation'
import { ClubPage } from '@/components/club/ClubPage'
import { BookRows, type RowBook } from '@/components/club/BookRows'
import { sql } from '@/lib/db'
import { BookRow, bookSelect, booksToDicts } from '@/lib/archive'

export const revalidate = 60

type A = { id: string; full_name: string; country: string | null; description: string | null }

// By id, else by full name (case-insensitive), as the author API does.
async function load(id: string) {
  const db = sql()
  let [author] = await db<A[]>`select id, full_name, country, description from authors where id = ${id}`.catch(() => [] as A[])
  if (!author) [author] = await db<A[]>`select id, full_name, country, description from authors where full_name ilike ${id} limit 1`.catch(() => [] as A[])
  if (!author) return null
  const books = await booksToDicts(await db<BookRow[]>`${bookSelect()} where b.author_id = ${author.id} order by b.ctid`)
  books.sort((a, b) => b.discussion_count - a.discussion_count || a.title.localeCompare(b.title))
  return { author, books }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const r = await load((await params).id)
  return { title: r ? `${r.author.full_name} - BBB` : 'Author not found - BBB' }
}

export default async function AuthorPage({ params }: { params: Promise<{ id: string }> }) {
  const r = await load((await params).id)
  if (!r) notFound()
  const { author, books } = r
  const talks = books.reduce((n, b) => n + b.discussion_count, 0)
  const rows: RowBook[] = books.map((b) => ({
    id: b.id,
    title: b.title,
    author: b.discussion_count ? `Discussed ${b.discussion_count === 1 ? 'once' : `${b.discussion_count} times`}` : null,
    cover: b.thumbnail_url || b.cover_url,
    meetups: [...b.meetups].map((m) => m.number).filter((n): n is number => n != null).sort((a, c) => c - a),
  }))
  return (
    <ClubPage kind="crumb" crumbs={[{ href: '/library-room', label: 'Library' }, { label: author.full_name }]} tab="lib">
      <div className="sp24" />
      <h1 className="h1">{author.full_name}</h1>
      <p className="facts">{books.length} {books.length === 1 ? 'book' : 'books'} &middot; {talks} {talks === 1 ? 'discussion' : 'discussions'}{author.country ? ` · ${author.country}` : ''}</p>
      {author.description && <p className="body" style={{ marginTop: 14 }}>{author.description}</p>}
      {rows.length > 0 && (
        <>
          <h2 className="sech">Books discussed <small>({rows.length})</small></h2>
          <BookRows books={rows} step={20} />
        </>
      )}
      <div className="pad" />
    </ClubPage>
  )
}
