'use client'

import * as React from 'react'
import { notFound, useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { Divider } from '@/components/ui/Divider'
import { LoadingState } from '@/components/shared/LoadingState'
import { ErrorState } from '@/components/shared/ErrorState'
import { fetchMember, deleteMember, getCachedData } from '@/lib/api'
import { authFetch, getSession } from '@/lib/auth'
import { formatDate, getBookColor } from '@/lib/utils'
import type { MemberDetail } from '@/lib/api'

export default function MemberDossierPage() {
  const params = useParams()
  const memberId = params?.id as string

  // Zero-flicker synchronous hydration: load from cache on frame 1
  const [member, setMember] = React.useState<MemberDetail | null>(() => {
    if (typeof window === 'undefined' || !memberId) return null
    return getCachedData<MemberDetail>(`member_${memberId}`)
  })
  const [loading, setLoading] = React.useState<boolean>(() => member === null)
  const [error, setError] = React.useState<string | null>(null)
  const [isAdmin, setIsAdmin] = React.useState(false)
  const [invite, setInvite] = React.useState<{ code: string; expires_at: string } | { error: string } | null>(null)
  const [inviteBusy, setInviteBusy] = React.useState(false)
  const createInvite = async () => {
    setInviteBusy(true)
    setInvite(null)
    try {
      const res = await authFetch(`/api/admin/members/${member?.id}/invite`, { method: 'POST' })
      const d = await res.json().catch(() => null)
      setInvite(res.ok ? { code: d.code, expires_at: d.expires_at } : { error: d?.detail || 'Could not create a code.' })
    } finally {
      setInviteBusy(false)
    }
  }
  const [isUpdating, setIsUpdating] = React.useState(false)
  const [toast, setToast] = React.useState<string | null>(null)

  // Chronologically sort reader's books: latest meetup discussed -> oldest meetup discussed
  const sortedBooks = React.useMemo(() => {
    if (!member?.books) return []
    return [...member.books].sort((a, b) => {
      const getLatestScore = (bk: typeof a) => {
        let maxNum = -1
        let maxDate = ''
        if (bk.meetups && bk.meetups.length > 0) {
          for (const m of bk.meetups) {
            const num = typeof m.meetup_number === 'number' ? m.meetup_number : Number(m.meetup_number) || 0
            if (num > maxNum) maxNum = num
            if (m.date && m.date > maxDate) maxDate = m.date
          }
        }
        return { maxNum, maxDate }
      }
      const scoreA = getLatestScore(a)
      const scoreB = getLatestScore(b)
      if (scoreB.maxNum !== scoreA.maxNum) {
        return scoreB.maxNum - scoreA.maxNum
      }
      if (scoreB.maxDate !== scoreA.maxDate) {
        return scoreB.maxDate.localeCompare(scoreA.maxDate)
      }
      return a.title.localeCompare(b.title)
    })
  }, [member?.books])

  React.useEffect(() => {
    async function checkAdmin() {
      try {
        const u = await getSession()
        if (u && u.role === 'admin') setIsAdmin(true)
      } catch (e) {}
    }
    checkAdmin()
  }, [])

  React.useEffect(() => {
    async function loadMember() {
      try {
        if (!member) setLoading(true)
        setError(null)
        const data = await fetchMember(memberId)
        setMember(data)
      } catch (err) {
        if (!member) {
          setError(err instanceof Error ? err.message : 'Failed to load member dossier')
        }
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

  const router = useRouter()

  const handleRemove = async () => {
    if (!member) return
    if (!confirm(`Are you sure you want to remove "${member.display_name}"?\n\nThis will remove them from the Readers Archive. Past book discussions remain preserved in the meetups.`)) {
      return
    }
    setIsUpdating(true)
    try {
      await deleteMember(member.id)
      alert(`✓ "${member.display_name}" removed from database.`)
      router.push('/members')
    } catch (err: any) {
      alert(`Failed to remove member: ${err.message || 'Error'}`)
      setIsUpdating(false)
    }
  }

  return (
    <>
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 px-5 py-3 rounded-[2px] bg-[#14130F] text-white text-xs font-mono animate-fade-in border border-white/20">
          {toast}
        </div>
      )}

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

          <header>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-ink leading-tight">
              {member.display_name}
            </h1>
            <p className="mt-3 text-base text-muted">
              {member.book_count} {member.book_count === 1 ? 'book' : 'books'} discussed · {member.meetup_count}{' '}
              {member.meetup_count === 1 ? 'meetup' : 'meetups'} attended
              {member.first_active_date ? ` · first recorded ${formatDate(member.first_active_date)}` : ''}
              {member.last_active_date ? ` · latest ${formatDate(member.last_active_date)}` : ''}
            </p>
            {member.bio && <p className="mt-4 max-w-prose text-ink-light">{member.bio}</p>}
            {isAdmin && (
              <div className="mt-6 flex flex-wrap items-baseline gap-x-6 gap-y-2 text-sm">
                <button type="button" onClick={createInvite} disabled={inviteBusy} className="text-ink underline underline-offset-4 hover:text-accent disabled:opacity-60">
                  {inviteBusy ? 'Creating…' : 'Create invite code'}
                </button>
                <button type="button" disabled={isUpdating} onClick={handleRemove} className="text-[#a8442a] underline underline-offset-4 hover:text-ink disabled:opacity-60">
                  {isUpdating ? 'Removing…' : 'Remove member from archive'}
                </button>
                {invite && 'code' in invite && (
                  <p role="status" className="basis-full text-ink">
                    Code: <strong className="font-mono text-base select-all">{invite.code}</strong> <span className="text-muted">(shown once; expires {new Date(invite.expires_at).toLocaleDateString()}). Send it to {member?.display_name}.</span>
                  </p>
                )}
                {invite && 'error' in invite && <p role="alert" className="basis-full text-[#a8442a]">{invite.error}</p>}
              </div>
            )}
          </header>
        </Container>
      </Section>

      <Divider />

      {/* Books Discussed by this Reader */}
      <Section>
        <Container size="narrow">
          <div className="flex items-center justify-between gap-4 mb-6">
            <h2 className="font-display text-2xl font-bold text-ink">
              Books Discussed & Brought ({sortedBooks.length})
            </h2>
          </div>

          {sortedBooks.length === 0 ? (
            <div className="p-8 rounded-[2px] border border-dashed border-border text-center text-muted italic">
              No specific book discussion titles recorded in historical meetup notes.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sortedBooks.map((book) => {
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
                          referrerPolicy="no-referrer"
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
                            {[...book.meetups]
                              .sort((m1, m2) => (Number(m2.meetup_number) || 0) - (Number(m1.meetup_number) || 0))
                              .map((m, idx) => (
                                <Link
                                  key={idx}
                                  href={`/meetups/${m.meetup_number}`}
                                  className="text-sm underline underline-offset-4 text-ink-light hover:text-accent"
                                >
                                  Meetup #{m.meetup_number}
                                </Link>
                              ))}
                          </div>
                        )}
                        <Link
                          href={`/library-room?select=${book.id}`}
                          className="text-sm underline underline-offset-4 text-ink-light hover:text-accent shrink-0 ml-auto"
                        >
                          Find on the shelf
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
                className="flex items-center justify-between py-4 border-b border-border hover:bg-paper-dark/60 -mx-2 px-2 group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 shrink-0 text-ink font-display font-semibold group-hover:text-accent">
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
