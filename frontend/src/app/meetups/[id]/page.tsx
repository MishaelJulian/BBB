'use client'

import * as React from 'react'
import { notFound, useParams } from 'next/navigation'
import Link from 'next/link'
import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { Divider } from '@/components/ui/Divider'
import { LoadingState } from '@/components/shared/LoadingState'
import { ErrorState } from '@/components/shared/ErrorState'
import { fetchMeetup, getApiBase } from '@/lib/api'
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

          {/* Action links */}
          <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
            <a
              href={`/api/meetups/${meetup.number}/pdf`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-sm font-semibold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <span>📑</span>
              <span>Download Publication PDF</span>
            </a>
            <Link
              href="/admin"
              className="px-4 py-2 rounded-xl border border-border bg-paper hover:bg-paper-dark text-sm font-medium text-ink transition-all shadow-xs flex items-center gap-1.5"
            >
              <span>⚙️</span>
              <span>Admin: Manage Meetup</span>
            </Link>
          </div>
        </Container>
      </Section>

      {/* Group Photo Section */}
      {meetup.photo_url && (
        <>
          <Divider />
          <Section>
            <Container size="narrow">
              <div className="text-center mb-6">
                <h2 className="font-display text-2xl font-bold text-ink mb-2">
                  Meetup Group Photo
                </h2>
                <p className="text-sm text-muted">
                  The Bengaluru Book Club gathering for Meetup #{meetup.number}
                </p>
              </div>
              <div className="max-w-2xl mx-auto p-4 pb-6 bg-paper rounded-2xl border border-border shadow-md">
                <div className="overflow-hidden rounded-xl bg-paper-dark">
                  <img
                    src={`${getApiBase()}${meetup.photo_url}`}
                    alt={`BBB Meetup #${meetup.number} Group Photo`}
                    className="w-full max-h-[480px] object-cover"
                  />
                </div>
                <div className="mt-3 text-center font-mono text-xs text-muted">
                  Bengaluru Book Club · Meetup #{meetup.number} · {meetup.venue || 'Bookworm'}
                </div>
              </div>
            </Container>
          </Section>
        </>
      )}

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
              {regularBooks.map((book) => {
                const coverSrc = book.cover_url || book.thumbnail_url
                return (
                  <div
                    key={book.id}
                    className="flex items-start gap-3.5 p-3.5 rounded-xl border border-border bg-paper hover:bg-paper-dark hover:border-amber-700/40 transition-all group shadow-xs hover:shadow-sm"
                  >
                    {/* Book Cover Artwork */}
                    <Link
                      href={`/books/${book.id}`}
                      className="w-14 sm:w-16 aspect-[2/3] rounded-md shrink-0 shadow-sm overflow-hidden relative border border-border/80 bg-neutral-900 group-hover:scale-[1.03] transition-transform"
                    >
                      {coverSrc ? (
                        <img
                          src={coverSrc}
                          alt={book.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : null}
                      <div
                        className={`absolute inset-0 p-1 flex flex-col justify-between text-center ${
                          coverSrc ? '-z-10' : 'z-0'
                        }`}
                        style={{ backgroundColor: getBookColor(book.title) }}
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
                      {book.author && (
                        <div className="text-xs text-muted truncate">
                          {book.author}
                        </div>
                      )}
                      {book.member && (
                        <div className="text-[11px] text-muted-light mt-0.5">
                          Read by {book.member}
                        </div>
                      )}
                      <div className="pt-2 mt-2 border-t border-border/40 flex items-center justify-between">
                        <Link
                          href={`/library-room?select=${book.id}`}
                          className="text-[10px] font-mono text-amber-900/80 dark:text-amber-300 hover:text-amber-800 hover:underline flex items-center gap-1"
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
                {discussionMentions.map((book) => {
                  const coverSrc = book.cover_url || book.thumbnail_url
                  return (
                    <Link
                      key={book.id}
                      href={`/books/${book.id}`}
                      className="flex items-center gap-3.5 p-3 rounded-xl border border-border bg-paper hover:bg-paper-dark hover:border-amber-700/40 transition-all group"
                    >
                      <div className="w-12 aspect-[2/3] rounded shrink-0 shadow-sm overflow-hidden relative border border-border/80 bg-neutral-900">
                        {coverSrc ? (
                          <img
                            src={coverSrc}
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
                            coverSrc ? '-z-10' : 'z-0'
                          }`}
                          style={{ backgroundColor: getBookColor(book.title) }}
                        >
                          <span className="text-[6.5px] font-serif font-bold text-white line-clamp-3 leading-tight my-auto">
                            {book.title}
                          </span>
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-display font-medium text-ink group-hover:text-amber-900 transition-colors line-clamp-1 text-sm">
                          {book.title}
                        </div>
                        {book.author && (
                          <div className="text-xs text-muted truncate mt-0.5">
                            {book.author}
                          </div>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </Container>
          </Section>
        </>
      )}
    </>
  )
}
