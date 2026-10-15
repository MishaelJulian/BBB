'use client'

import * as React from 'react'
import { notFound, useParams } from 'next/navigation'
import Link from 'next/link'
import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { Divider } from '@/components/ui/Divider'
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
            <Link href="/library-room" className="hover:text-ink transition-colors">
              The Library Room
            </Link>
            <span className="mx-2">/</span>
            <span className="text-ink">{book.title}</span>
          </nav>

          <div className="flex flex-col md:flex-row gap-8 md:gap-12">
            {/* Book Cover */}
            <div className="w-full md:w-64 shrink-0">
              <div
                className="aspect-2/3 rounded-md shadow-book-hover overflow-hidden relative border border-border/80 bg-neutral-900"
                style={{ backgroundColor: coverColor }}
              >
                {book.cover_url || book.thumbnail_url ? (
                  <img
                    src={book.cover_url || book.thumbnail_url || ''}
                    alt={book.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                ) : null}

                {/* Cloth texture fallback */}
                <div
                  className={`absolute inset-0 ${
                    book.cover_url || book.thumbnail_url ? '-z-10' : 'z-0'
                  }`}
                  style={{ backgroundColor: coverColor }}
                >
                  <div
                    className="absolute inset-0 opacity-15"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='4' height='4' viewBox='0 0 4 4' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 3h1v1H1V3zm2-2h1v1H3V1z' fill='%23000000' fill-opacity='0.4' fill-rule='evenodd'/%3E%3C/svg%3E")`,
                    }}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-between p-6 text-center">
                    <div className="w-12 h-px bg-white/30" />
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
                    <div className="w-12 h-px bg-white/30" />
                  </div>
                  <div className="absolute top-0 left-0 right-0 h-px bg-white/10" />
                  <div className="absolute bottom-0 left-0 right-0 h-px bg-black/20" />
                </div>
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

              <p className="mb-6 text-base text-muted">
                {book.discussion_count} {book.discussion_count === 1 ? 'discussion' : 'discussions'}
                {book.first_discussed_date ? ` · first discussed ${formatDate(book.first_discussed_date)}` : ''}
                {book.last_discussed_date ? ` · last mentioned ${formatDate(book.last_discussed_date)}` : ''}
              </p>
              {/* Spatial 3D Shelf Action */}
              <div className="mb-6">
                <Link
                  href={`/library-room?select=${book.id}`}
                  className="inline-block bg-ink text-paper text-base font-semibold px-5 py-3 rounded-[2px] shadow-[3px_3px_0_0_var(--color-accent)] transition-[transform,box-shadow] hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0_0_var(--color-accent)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
                >
                  Find this book on the shelf
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

          <p className="text-lg text-ink-light mb-8">
            {book.discussion_count} {book.discussion_count === 1 ? 'discussion' : 'discussions'} across {book.meetups.length}{' '}
            {book.meetups.length === 1 ? 'meetup' : 'meetups'}, with {book.members.length} {book.members.length === 1 ? 'reader' : 'readers'}.
          </p>
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

          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-base">
            {book.members.map((member) => (
              <li key={member.id}>
                <Link
                  href={`/members/${member.id}`}
                  className="text-ink underline decoration-border-dark underline-offset-4 hover:decoration-accent hover:text-accent"
                >
                  {member.display_name}
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </Section>
    </>
  )
}
