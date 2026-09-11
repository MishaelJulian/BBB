'use client'

import * as React from 'react'
import { notFound, useParams } from 'next/navigation'
import Link from 'next/link'
import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { Divider } from '@/components/ui/Divider'
import { LoadingState } from '@/components/shared/LoadingState'
import { ErrorState } from '@/components/shared/ErrorState'
import { fetchMeetup } from '@/lib/api'
import { formatDate, getBookColor } from '@/lib/utils'
import type { Meetup } from '@/lib/api'

export default function MeetupPage() {
  const params = useParams()
  const [meetup, setMeetup] = React.useState<Meetup | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function fetchMeetupData() {
      try {
        setLoading(true)
        setError(null)

        const data = await fetchMeetup(params.id as string)
        setMeetup(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchMeetupData()
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

  if (!meetup) {
    notFound()
  }

  // Separate regular books from discussion mentions
  const regularBooks = meetup.books.filter(b => !b.is_discussion_mention)
  const discussionMentions = meetup.books.filter(b => b.is_discussion_mention)

  return (
    <>
      {/* Hero */}
      <Section size="lg">
        <Container size="narrow">
          {/* Breadcrumb */}
          <nav className="mb-8 text-sm text-muted">
            <Link href="/meetups" className="hover:text-ink transition-colors">
              Meetups
            </Link>
            <span className="mx-2">/</span>
            <span className="text-ink">#{meetup.number}</span>
          </nav>

          {/* Meetup header */}
          <div className="text-center">
            <div className="font-display text-6xl md:text-7xl font-bold text-ink mb-4">
              #{meetup.number}
            </div>
            <h1 className="font-display text-2xl md:text-3xl text-ink mb-2">
              BBB Meetup #{meetup.number}
            </h1>
            <p className="text-xl text-muted">
              {formatDate(meetup.date)}
            </p>
            <p className="text-lg text-muted-light mt-1">
              {meetup.venue || 'Venue unknown'}
            </p>
          </div>

          {/* Stats */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-display font-bold text-ink">
                {meetup.member_count}
              </div>
              <div className="text-sm text-muted">Members</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-display font-bold text-ink">
                {meetup.book_count}
              </div>
              <div className="text-sm text-muted">Books</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-display font-bold text-ink">
                {regularBooks.length}
              </div>
              <div className="text-sm text-muted">Discussed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-display font-bold text-ink">
                {discussionMentions.length || '-'}
              </div>
              <div className="text-sm text-muted">Mentions</div>
            </div>
          </div>
        </Container>
      </Section>

      <Divider />

      {/* Attendees */}
      <Section>
        <Container size="narrow">
          <h2 className="font-display text-2xl font-bold text-ink mb-6">
            Attendees & Discussants
          </h2>
          <div className="flex flex-wrap gap-3">
            {meetup.members.map((member) => (
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

      <Divider />

      {/* Books by Member */}
      {regularBooks.length > 0 && (
        <Section>
          <Container size="narrow">
            <h2 className="font-display text-2xl font-bold text-ink mb-6">
              Books Discussed
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {regularBooks.map((book) => (
                <div
                  key={book.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border bg-paper hover:bg-paper-dark hover:border-amber-700/40 transition-all group"
                >
                  <div
                    className="w-10 h-14 rounded-sm shrink-0 shadow-sm flex items-center justify-center relative overflow-hidden"
                    style={{ backgroundColor: getBookColor(book.title) }}
                  >
                    <span className="text-[6px] font-mono text-white/50 rotate-90 truncate max-w-[45px]">
                      {book.title.slice(0, 3).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/books/${book.id}`}
                      className="font-medium text-ink truncate group-hover:text-amber-900 transition-colors block"
                    >
                      {book.title}
                    </Link>
                    {book.author && (
                      <div className="text-xs text-muted truncate">
                        {book.author}
                      </div>
                    )}
                    {book.member && (
                      <div className="text-[11px] text-muted-light">
                        Read by {book.member}
                      </div>
                    )}
                    <div className="pt-1.5 mt-1 border-t border-border/40 flex justify-end">
                      <Link
                        href={`/library-room?select=${book.id}`}
                        className="text-[10px] font-mono text-amber-900/80 dark:text-amber-300 hover:text-amber-800 hover:underline flex items-center gap-1"
                      >
                        Locate in Library →
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Container>
        </Section>
      )}

      {/* General Discussion */}
      {discussionMentions.length > 0 && (
        <>
          <Divider />
          <Section>
            <Container size="narrow">
              <h2 className="font-display text-2xl font-bold text-ink mb-2">
                General Discussion
              </h2>
              <p className="text-muted mb-6">
                Books mentioned during the general discussion session
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {discussionMentions.map((book) => (
                  <Link
                    key={book.id}
                    href={`/books/${book.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-paper-dark transition-colors"
                  >
                    <div
                      className="w-10 h-14 rounded-sm shrink-0 shadow-sm opacity-70"
                      style={{ backgroundColor: getBookColor(book.title) }}
                    />
                    <div className="min-w-0">
                      <div className="font-medium text-ink truncate">
                        {book.title}
                      </div>
                      {book.author && (
                        <div className="text-sm text-muted truncate">
                          {book.author}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </Container>
          </Section>
        </>
      )}
    </>
  )
}
