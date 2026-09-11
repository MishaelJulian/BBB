'use client'

import * as React from 'react'
import { notFound, useParams } from 'next/navigation'
import Link from 'next/link'
import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { Divider } from '@/components/ui/Divider'
import { LoadingState } from '@/components/shared/LoadingState'
import { ErrorState } from '@/components/shared/ErrorState'
import { fetchMember } from '@/lib/api'
import { formatDate, getBookColor } from '@/lib/utils'
import type { MemberDetail } from '@/lib/api'

export default function MemberDossierPage() {
  const params = useParams()
  const [member, setMember] = React.useState<MemberDetail | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function loadMember() {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchMember(params.id as string)
        setMember(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load member dossier')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      loadMember()
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

  if (!member) {
    notFound()
  }

  return (
    <>
      {/* Dossier Header */}
      <Section size="lg">
        <Container size="narrow">
          {/* Breadcrumb Navigation */}
          <nav className="mb-8 text-sm text-muted flex items-center gap-2">
            <Link href="/library-room" className="hover:text-ink transition-colors">
              Library Room
            </Link>
            <span>/</span>
            <Link href="/members" className="hover:text-ink transition-colors">
              Readers Archive
            </Link>
            <span>/</span>
            <span className="text-ink font-medium">{member.display_name}</span>
          </nav>

          <div className="p-8 sm:p-10 rounded-xl border border-border bg-paper-dark/70 shadow-sm relative overflow-hidden">
            {/* Archival seal stamp */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-900/20 border border-amber-800/30 text-amber-900 text-[11px] font-mono tracking-[0.2em] uppercase mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-700" />
              Archival Reader Dossier
            </div>

            <h1 className="font-display text-4xl sm:text-5xl font-bold text-ink mb-3">
              {member.display_name}
            </h1>

            {member.bio && (
              <p className="text-muted text-base max-w-xl mb-6 italic">
                "{member.bio}"
              </p>
            )}

            {/* Dossier Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-border/80">
              <div>
                <div className="text-2xl sm:text-3xl font-display font-bold text-ink">
                  {member.book_count}
                </div>
                <div className="text-xs text-muted font-mono uppercase tracking-wider">
                  {member.book_count === 1 ? 'Book Discussed' : 'Books Discussed'}
                </div>
              </div>

              <div>
                <div className="text-2xl sm:text-3xl font-display font-bold text-ink">
                  {member.meetup_count}
                </div>
                <div className="text-xs text-muted font-mono uppercase tracking-wider">
                  {member.meetup_count === 1 ? 'Meetup Attended' : 'Meetups Attended'}
                </div>
              </div>

              {member.first_active_date && (
                <div>
                  <div className="text-sm font-semibold text-ink mt-1">
                    {formatDate(member.first_active_date)}
                  </div>
                  <div className="text-xs text-muted font-mono uppercase tracking-wider">
                    First Recorded
                  </div>
                </div>
              )}

              {member.last_active_date && (
                <div>
                  <div className="text-sm font-semibold text-ink mt-1">
                    {formatDate(member.last_active_date)}
                  </div>
                  <div className="text-xs text-muted font-mono uppercase tracking-wider">
                    Latest Activity
                  </div>
                </div>
              )}
            </div>
          </div>
        </Container>
      </Section>

      <Divider />

      {/* Books Discussed by this Reader */}
      <Section>
        <Container size="narrow">
          <div className="flex items-center justify-between gap-4 mb-6">
            <h2 className="font-display text-2xl font-bold text-ink">
              Books Discussed & Brought ({member.books.length})
            </h2>
            <span className="text-xs text-muted font-mono">Archive Records</span>
          </div>

          {member.books.length === 0 ? (
            <div className="p-8 rounded-lg border border-dashed border-border text-center text-muted italic">
              No specific book discussion titles recorded in historical meetup notes.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {member.books.map((book) => {
                const coverColor = getBookColor(book.title)
                return (
                  <div
                    key={book.id}
                    className="flex items-start gap-4 p-4 rounded-lg border border-border bg-paper hover:bg-paper-dark hover:border-amber-700/40 transition-all group"
                  >
                    {/* Mini hardcover spine */}
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
                        className="font-display font-semibold text-ink group-hover:text-amber-900 transition-colors line-clamp-2 text-sm leading-snug mb-1"
                      >
                        {book.title}
                      </Link>

                      {book.author_name && (
                        <div className="text-xs text-muted mb-2">
                          by{' '}
                          {book.author_id ? (
                            <Link
                              href={`/authors/${book.author_id}`}
                              className="hover:text-ink underline decoration-border hover:decoration-ink"
                            >
                              {book.author_name}
                            </Link>
                          ) : (
                            book.author_name
                          )}
                        </div>
                      )}

                      {/* Meetup appearances & Locate on Shelf */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2 border-t border-border/40">
                        {book.meetups && book.meetups.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {book.meetups.map((m, idx) => (
                              <Link
                                key={idx}
                                href={`/meetups/${m.meetup_number}`}
                                className="text-[10px] font-mono px-2 py-0.5 rounded bg-paper-dark border border-border/80 text-muted hover:text-amber-900 hover:border-amber-700/40 transition-colors"
                              >
                                Meetup #{m.meetup_number}
                              </Link>
                            ))}
                          </div>
                        )}
                        <Link
                          href={`/library-room?select=${book.id}`}
                          className="text-[11px] font-mono text-amber-900/80 dark:text-amber-300 hover:text-amber-800 hover:underline flex items-center gap-1 shrink-0 ml-auto"
                        >
                          Locate in Library →
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Container>
      </Section>

      <Divider />

      {/* Meetups Attended */}
      <Section>
        <Container size="narrow">
          <h2 className="font-display text-2xl font-bold text-ink mb-6">
            Meetup Participation History ({member.meetups.length})
          </h2>

          <div className="space-y-3">
            {member.meetups.map((m) => (
              <Link
                key={m.id}
                href={`/meetups/${m.number}`}
                className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-amber-700/40 hover:bg-paper-dark transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-amber-950/10 border border-amber-800/20 flex items-center justify-center text-ink font-display font-bold group-hover:text-amber-900 transition-colors">
                    #{m.number}
                  </div>
                  <div>
                    <div className="font-semibold text-ink group-hover:text-amber-900 transition-colors">
                      BBB Meetup #{m.number}
                    </div>
                    <div className="text-xs text-muted">
                      {m.date ? formatDate(m.date) : 'Historical Meetup'} {m.venue && `· ${m.venue}`}
                    </div>
                  </div>
                </div>

                <div className="text-xs font-mono text-muted group-hover:text-amber-900 transition-colors flex items-center gap-1">
                  View Meeting
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </Container>
      </Section>
    </>
  )
}
