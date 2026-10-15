'use client'

import * as React from 'react'
import { notFound, useParams } from 'next/navigation'
import Link from 'next/link'
import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { Divider } from '@/components/ui/Divider'
import { LoadingState } from '@/components/shared/LoadingState'
import { ErrorState } from '@/components/shared/ErrorState'
import { fetchAuthor } from '@/lib/api'
import { formatDate, getBookColor } from '@/lib/utils'
import type { AuthorDetail } from '@/lib/api'

export default function AuthorRecordPage() {
  const params = useParams()
  const [author, setAuthor] = React.useState<AuthorDetail | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function loadAuthor() {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchAuthor(params.id as string)
        setAuthor(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load author record')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      loadAuthor()
    }
  }, [params.id])

  if (loading) {
    return (
      <Section>
        <Container size="narrow">
          <LoadingState count={3} />
        </Container>
      </Section>
    )
  }

  if (error) {
    return (
      <Section>
        <Container size="narrow">
          <ErrorState
            message={error}
            onRetry={() => window.location.reload()}
          />
        </Container>
      </Section>
    )
  }

  if (!author) {
    notFound()
  }

  return (
    <>
      <Section size="lg">
        <Container size="narrow">
          {/* Breadcrumb */}
          <nav className="mb-8 text-sm text-muted flex items-center gap-2">
            <Link href="/library-room" className="hover:text-ink transition-colors">
              Library Room
            </Link>
            <span>/</span>
            <Link href="/library-room#list" className="hover:text-ink transition-colors">
              Archive List
            </Link>
            <span>/</span>
            <span className="text-ink font-medium">{author.full_name}</span>
          </nav>

          <header>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-ink leading-tight">{author.full_name}</h1>
            <p className="mt-3 text-base text-muted">
              {author.country ? `${author.country} · ` : ''}
              {author.book_count} {author.book_count === 1 ? 'volume' : 'volumes'} in the collection · {author.discussion_count}{' '}
              {author.discussion_count === 1 ? 'discussion' : 'discussions'} recorded
            </p>
            {author.description && <p className="mt-4 max-w-prose text-ink-light">{author.description}</p>}
          </header>
        </Container>
      </Section>

      <Divider />

      {/* Works in BBB Archive */}
      <Section>
        <Container size="narrow">
          <div className="flex items-center justify-between gap-4 mb-6">
            <h2 className="font-display text-2xl font-bold text-ink">
              Works Discussed at BBB ({author.books.length})
            </h2>
            <span className="text-xs text-muted font-mono">Catalog Volumes</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {author.books.map((book) => {
              const coverColor = getBookColor(book.title)
              return (
                <div
                  key={book.id}
                  className="flex items-start gap-4 py-4 border-b border-border hover:bg-paper-dark/60 -mx-2 px-2 group"
                >
                  {/* Book Cover Artwork */}
                  <Link
                    href={`/books/${book.id}`}
                    className="w-14 sm:w-16 aspect-2/3 shrink-0 overflow-hidden relative border border-border/80 bg-neutral-900"
                  >
                    {book.cover_url || book.thumbnail_url ? (
                      <img
                        src={book.cover_url || book.thumbnail_url || ''}
                        alt={book.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : null}
                    <div
                      className={`absolute inset-0 p-1 flex flex-col justify-between text-center ${
                        book.cover_url || book.thumbnail_url ? '-z-10' : 'z-0'
                      }`}
                      style={{ backgroundColor: coverColor }}
                    >
                      <div className="w-3 h-px mx-auto bg-white/40" />
                      <span className="text-[7.5px] font-serif font-bold text-white line-clamp-3 leading-tight">
                        {book.title}
                      </span>
                      <div className="w-3 h-px mx-auto bg-white/40" />
                    </div>
                  </Link>

                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/books/${book.id}`}
                      className="font-display font-semibold text-ink group-hover:text-amber-900 transition-colors line-clamp-2 text-sm leading-snug mb-1 block"
                    >
                      {book.title}
                    </Link>

                    <div className="text-xs text-muted font-mono mb-2">
                      {book.discussion_count} {book.discussion_count === 1 ? 'discussion' : 'discussions'}
                      {book.first_discussed_date && (
                        <span> · First {new Date(book.first_discussed_date).getFullYear()}</span>
                      )}
                    </div>

                    {book.members && book.members.length > 0 && (
                      <div className="text-[11px] text-muted-light line-clamp-1 mb-2">
                        Discussed by {book.members.map((m) => m.display_name).join(', ')}
                      </div>
                    )}

                    <div className="pt-2 border-t border-border/40 flex justify-end">
                      <Link
                        href={`/library-room?select=${book.id}`}
                        className="text-[11px] font-mono text-amber-900/80 dark:text-amber-300 hover:text-amber-800 hover:underline flex items-center gap-1"
                      >
                        Locate in Library →
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Container>
      </Section>
    </>
  )
}
