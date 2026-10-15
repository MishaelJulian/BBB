'use client'

import * as React from 'react'
import { notFound, useParams } from 'next/navigation'
import Link from 'next/link'
import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { LoadingState } from '@/components/shared/LoadingState'
import { ErrorState } from '@/components/shared/ErrorState'
import { fetchMeetup, getCachedData } from '@/lib/api'
import { getSession } from '@/lib/auth'
import { formatDate, getBookColor } from '@/lib/utils'
import type { BookReference, Meetup } from '@/lib/api'

const FORMATS: Record<string, string> = { IN_PERSON: 'In person', ONLINE: 'Online', HYBRID: 'Hybrid' }

// Editorial layout (docs/ux/ADR-ui-revamp.md section 5): no cards, no pills, no icon emoji, no KPI numerals;
// hierarchy comes from type size, weight and hairlines; the one hard-offset shadow belongs to the primary button.
function BookRow({ book, small = false }: { book: BookReference; small?: boolean }) {
  const coverSrc = book.cover_url || book.thumbnail_url
  return (
    <li className="flex items-start gap-4 py-4">
      <Link
        href={`/books/${book.id}`}
        aria-hidden="true"
        tabIndex={-1}
        className={`${small ? 'w-10' : 'w-12'} aspect-2/3 shrink-0 overflow-hidden relative bg-paper-dark`}
      >
        {coverSrc ? (
          <img
            src={coverSrc}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        ) : null}
        <div
          className={`absolute inset-0 p-1 flex items-center justify-center text-center ${coverSrc ? '-z-10' : 'z-0'}`}
          style={{ backgroundColor: getBookColor(book.title) }}
        >
          <span className="text-[7px] font-display font-bold text-white line-clamp-3 leading-tight">{book.title}</span>
        </div>
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          href={`/books/${book.id}`}
          className="font-display text-lg leading-snug text-ink underline decoration-border-dark underline-offset-4 hover:decoration-accent hover:text-accent"
        >
          {book.title}
        </Link>
        {book.author && <p className="text-sm text-ink-light mt-0.5">{book.author}</p>}
        <p className="text-sm text-muted mt-0.5">
          {book.member ? `Read by ${book.member} · ` : ''}
          <Link href={`/library-room?select=${book.id}`} className="underline underline-offset-4 hover:text-accent">
            Find on the shelf
          </Link>
        </p>
      </div>
    </li>
  )
}

export default function MeetupPage() {
  const params = useParams()
  const meetupId = params?.id as string

  // Zero-flicker synchronous hydration: load from cache on frame 1
  const [meetup, setMeetup] = React.useState<Meetup | null>(() => {
    if (typeof window === 'undefined' || !meetupId) return null
    return getCachedData<Meetup>(`meetup_${meetupId}`)
  })
  const [loading, setLoading] = React.useState<boolean>(() => meetup === null)
  const [error, setError] = React.useState<string | null>(null)
  const [isAdmin, setIsAdmin] = React.useState(false)

  React.useEffect(() => {
    getSession()
      .then((u) => setIsAdmin(u?.role === 'admin'))
      .catch(() => setIsAdmin(false))
  }, [])

  React.useEffect(() => {
    async function fetchMeetupData() {
      try {
        if (!meetup) setLoading(true)
        setError(null)

        const data = await fetchMeetup(meetupId)
        setMeetup(data)
      } catch (err) {
        if (!meetup) {
          setError(err instanceof Error ? err.message : 'An error occurred')
        }
      } finally {
        setLoading(false)
      }
    }

    if (meetupId) fetchMeetupData()
  }, [meetupId])

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
          <ErrorState message={error} onRetry={() => window.location.reload()} />
        </Container>
      </Section>
    )
  }

  if (!meetup) {
    notFound()
  }

  // Separate regular books from discussion mentions
  const regularBooks = meetup.books.filter((b) => !b.is_discussion_mention)
  const discussionMentions = meetup.books.filter((b) => b.is_discussion_mention)
  const facts = [formatDate(meetup.date), meetup.venue || 'Venue unknown', FORMATS[meetup.format] ?? null].filter(Boolean)
  const h2 = 'font-display text-xl font-semibold text-ink border-b border-border pb-2 mb-2'

  return (
    <>
      <Section size="lg">
        <Container size="narrow">
          <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted">
            <Link href="/meetups" className="underline underline-offset-4 hover:text-accent">
              Meetups
            </Link>
            <span className="mx-2" aria-hidden="true">/</span>
            <span className="text-ink" aria-current="page">#{meetup.number}</span>
          </nav>

          <h1 className="font-display text-4xl md:text-5xl font-bold text-ink leading-tight">
            {meetup.title || `BBB Meetup #${meetup.number}`}
          </h1>
          <p className="mt-3 text-lg text-ink-light">{facts.join(' · ')}</p>
          <p className="mt-1 text-base text-muted">
            {meetup.member_count} members · {meetup.book_count} books ({regularBooks.length} discussed
            {discussionMentions.length > 0 ? `, ${discussionMentions.length} mentioned in the general discussion` : ''})
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            {meetup.pdf_url && (
              <a
                href={meetup.pdf_url}
                target="_blank"
                rel="noreferrer"
                className="inline-block bg-ink text-paper text-base font-semibold px-5 py-3 rounded-[2px] shadow-[3px_3px_0_0_var(--color-accent)] transition-[transform,box-shadow] hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0_0_var(--color-accent)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
              >
                Download the publication (PDF)
              </a>
            )}
            {isAdmin && (
              <Link href="/admin" className="text-sm text-muted underline underline-offset-4 hover:text-accent">
                Edit this meetup in admin
              </Link>
            )}
          </div>
        </Container>
      </Section>

      {meetup.photo_url && (
        <Section>
          <Container size="narrow">
            <figure>
              <img
                src={meetup.photo_url}
                alt={`Group photo from BBB Meetup #${meetup.number}`}
                className="w-full max-h-[480px] object-cover bg-paper-dark"
              />
              <figcaption className="mt-2 text-sm text-muted">
                The group at meetup #{meetup.number}, {meetup.venue || 'Bookworm'}.
              </figcaption>
            </figure>
          </Container>
        </Section>
      )}

      <Section>
        <Container size="narrow">
          <h2 className={h2}>Attendees and discussants</h2>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-base">
            {meetup.members.map((member) => (
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

      {regularBooks.length > 0 && (
        <Section>
          <Container size="narrow">
            <h2 className={h2}>Books discussed ({regularBooks.length})</h2>
            <ul className="divide-y divide-border">
              {regularBooks.map((book) => (
                <BookRow key={book.id} book={book} />
              ))}
            </ul>
          </Container>
        </Section>
      )}

      {discussionMentions.length > 0 && (
        <Section>
          <Container size="narrow">
            <h2 className={h2}>General discussion ({discussionMentions.length})</h2>
            <p className="text-ink-light mb-2">Books mentioned during the general discussion session.</p>
            <ul className="divide-y divide-border">
              {discussionMentions.map((book) => (
                <BookRow key={book.id} book={book} small />
              ))}
            </ul>
          </Container>
        </Section>
      )}
    </>
  )
}
