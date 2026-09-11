'use client'

import * as React from 'react'
import { notFound, useParams } from 'next/navigation'
import Link from 'next/link'
import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { Divider } from '@/components/ui/Divider'
import { Badge } from '@/components/ui/Badge'
import { LoadingState } from '@/components/shared/LoadingState'
import { ErrorState } from '@/components/shared/ErrorState'
import { fetchBook } from '@/lib/api'
import { getBookColor, formatDate } from '@/lib/utils'
import type { Book } from '@/lib/api'

export default function BookPage() {
  const params = useParams()
  const [book, setBook] = React.useState<Book | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function fetchBookData() {
      try {
        setLoading(true)
        setError(null)

        const data = await fetchBook(params.id as string)
        setBook(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchBookData()
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

  if (!book) {
    notFound()
  }

  const coverColor = getBookColor(book.title)

  return (
    <>
      {/* Hero Section */}
      <Section size="lg">
        <Container size="narrow">
          {/* Breadcrumb */}
          <nav className="mb-8 text-sm text-muted">
            <Link href="/library" className="hover:text-ink transition-colors">
              Library
            </Link>
            <span className="mx-2">/</span>
            <span className="text-ink">{book.title}</span>
          </nav>

          <div className="flex flex-col md:flex-row gap-8 md:gap-12">
            {/* Book Cover */}
            <div className="w-full md:w-64 shrink-0">
              <div
                className="aspect-[2/3] rounded-sm shadow-book-hover overflow-hidden relative"
                style={{ backgroundColor: coverColor }}
              >
                {/* Cloth texture */}
                <div
                  className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='4' height='4' viewBox='0 0 4 4' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 3h1v1H1V3zm2-2h1v1H3V1z' fill='%23000000' fill-opacity='0.4' fill-rule='evenodd'/%3E%3C/svg%3E")`,
                  }}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-between p-6 text-center">
                  {/* Top line */}
                  <div className="w-12 h-px bg-white/30" />

                  {/* Content */}
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <h1 className="font-display font-bold text-xl md:text-2xl text-white leading-tight mb-2">
                      {book.title}
                    </h1>
                    {book.author_name && (
                      <p className="text-sm text-white/70 tracking-wider uppercase">
                        {book.author_name}
                      </p>
                    )}
                  </div>

                  {/* Bottom line */}
                  <div className="w-12 h-px bg-white/30" />
                </div>
                {/* Edge highlights */}
                <div className="absolute top-0 left-0 right-0 h-px bg-white/10" />
                <div className="absolute bottom-0 left-0 right-0 h-px bg-black/20" />
              </div>
            </div>

            {/* Book Info */}
            <div className="flex-1">
              <h1 className="font-display text-3xl md:text-4xl font-bold text-ink mb-2">
                {book.title}
              </h1>
              {book.author_name && (
                <p className="text-xl text-muted mb-4">
                  by{' '}
                  {book.author_id ? (
                    <Link
                      href={`/authors/${book.author_id}`}
                      className="text-ink hover:text-amber-900 underline decoration-border hover:decoration-amber-900 transition-colors"
                    >
                      {book.author_name}
                    </Link>
                  ) : (
                    book.author_name
                  )}
                </p>
              )}

              {/* Quick stats & Spatial Action */}
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <Badge variant="secondary">
                  {book.discussion_count} discussions
                </Badge>
                {book.first_discussed_date && (
                  <Badge variant="secondary">
                    First discussed {formatDate(book.first_discussed_date)}
                  </Badge>
                )}
                {book.last_discussed_date && (
                  <Badge variant="secondary">
                    Last mentioned {formatDate(book.last_discussed_date)}
                  </Badge>
                )}
              </div>

              {/* Spatial 3D Shelf Action */}
              <div className="mb-6">
                <Link
                  href={`/library-room?select=${book.id}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-800 hover:bg-amber-700 text-paper font-medium text-xs tracking-wider uppercase shadow-md hover:shadow-lg transition-all"
                >
                  <svg className="w-4 h-4 text-amber-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                  <span>View on 3D Shelf</span>
                  <span className="text-amber-200">→</span>
                </Link>
              </div>

              {/* Synopsis placeholder */}
              <div className="prose prose-ink max-w-none">
                <p className="text-muted italic">
                  Synopsis will be added from external sources in a future update.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      <Divider />

      {/* BBB History */}
      <Section>
        <Container size="narrow">
          <h2 className="font-display text-2xl font-bold text-ink mb-6">
            BBB History
          </h2>

          <div className="grid grid-cols-3 gap-8 mb-8">
            <div className="text-center">
              <div className="text-3xl font-display font-bold text-ink">
                {book.discussion_count}
              </div>
              <div className="text-sm text-muted">Discussions</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-display font-bold text-ink">
                {book.meetups.length}
              </div>
              <div className="text-sm text-muted">Meetups</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-display font-bold text-ink">
                {book.members.length}
              </div>
              <div className="text-sm text-muted">Readers</div>
            </div>
          </div>
        </Container>
      </Section>

      <Divider />

      {/* Discussion Timeline */}
      <Section>
        <Container size="narrow">
          <h2 className="font-display text-2xl font-bold text-ink mb-6">
            Discussion Timeline
          </h2>

          <div className="space-y-4">
            {book.meetups.map((meetup) => (
              <Link
                key={meetup.id}
                href={`/meetups/${meetup.number}`}
                className="flex items-center gap-4 p-4 rounded-lg border border-border hover:border-accent hover:bg-paper-dark transition-all group"
              >
                <div className="w-16 text-center">
                  <div className="font-display font-bold text-ink group-hover:text-accent">
                    #{meetup.number}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-sm text-muted">
                    {formatDate(meetup.date)}
                  </div>
                  <div className="text-sm text-muted-light">
                    {meetup.venue}
                  </div>
                </div>
                <svg
                  className="h-4 w-4 text-muted-light group-hover:text-accent transition-colors"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </Link>
            ))}
          </div>
        </Container>
      </Section>

      <Divider />

      {/* Readers */}
      <Section>
        <Container size="narrow">
          <h2 className="font-display text-2xl font-bold text-ink mb-6">
            Readers & Discussants
          </h2>

          <div className="flex flex-wrap gap-3">
            {book.members.map((member) => (
              <Link
                key={member.id}
                href={`/members/${member.id}`}
                className="px-4 py-2 rounded-full border border-border bg-paper hover:bg-paper-dark hover:border-amber-700/50 hover:text-amber-900 text-sm text-ink transition-all shadow-sm flex items-center gap-1.5"
              >
                <span>{member.display_name}</span>
                <span className="text-xs text-muted/60">→</span>
              </Link>
            ))}
          </div>
        </Container>
      </Section>
    </>
  )
}
