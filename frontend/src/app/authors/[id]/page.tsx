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
            <Link href="/library" className="hover:text-ink transition-colors">
              Archive
            </Link>
            <span>/</span>
            <span className="text-ink font-medium">{author.full_name}</span>
          </nav>

          <div className="p-8 sm:p-10 rounded-xl border border-border bg-paper-dark/70 shadow-sm relative overflow-hidden">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-900/20 border border-amber-800/30 text-amber-900 text-[11px] font-mono tracking-[0.2em] uppercase mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-700" />
              Author Archive Record
            </div>

            <h1 className="font-display text-4xl sm:text-5xl font-bold text-ink mb-2">
              {author.full_name}
            </h1>

            {author.country && (
              <p className="text-sm font-mono text-muted mb-4">
                Origin: {author.country}
              </p>
            )}

            {author.description && (
              <p className="text-muted text-base max-w-xl mb-6 italic">
                "{author.description}"
              </p>
            )}

            {/* Quick stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 pt-6 border-t border-border/80">
              <div>
                <div className="text-2xl sm:text-3xl font-display font-bold text-ink">
                  {author.book_count}
                </div>
                <div className="text-xs text-muted font-mono uppercase tracking-wider">
                  {author.book_count === 1 ? 'Volume in Collection' : 'Volumes in Collection'}
                </div>
              </div>

              <div>
                <div className="text-2xl sm:text-3xl font-display font-bold text-ink">
                  {author.discussion_count}
                </div>
                <div className="text-xs text-muted font-mono uppercase tracking-wider">
                  {author.discussion_count === 1 ? 'Discussion Recorded' : 'Discussions Recorded'}
                </div>
              </div>
            </div>
          </div>
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
                  className="flex items-start gap-4 p-4 rounded-lg border border-border bg-paper hover:bg-paper-dark hover:border-amber-700/40 transition-all group"
                >
                  <div
                    className="w-10 h-16 rounded-sm shrink-0 shadow-sm flex items-center justify-center relative overflow-hidden"
                    style={{ backgroundColor: coverColor }}
                  >
                    <div className="absolute inset-0 opacity-15 bg-black" />
                    <span className="text-[7px] font-mono text-white/70 rotate-90 truncate max-w-[50px]">
                      {book.title.slice(0, 10)}
                    </span>
                  </div>

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
