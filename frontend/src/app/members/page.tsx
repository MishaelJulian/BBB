'use client'

import * as React from 'react'
import Link from 'next/link'
import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { PageHeader } from '@/components/layout/PageHeader'
import { Input } from '@/components/ui/Input'
import { LoadingState } from '@/components/shared/LoadingState'
import { ErrorState } from '@/components/shared/ErrorState'
import { fetchMembers, deleteMember, fetchRemovedMembers, restoreMember } from '@/lib/api'
import { getSession } from '@/lib/auth'
import { formatDate } from '@/lib/utils'
import type { MemberSummary, RemovedMember } from '@/lib/api'

export default function MembersPage() {
  const [members, setMembers] = React.useState<MemberSummary[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState('')
  const [sortBy, setSortBy] = React.useState<'books' | 'meetups' | 'name'>('books')
  
  // Admin & removal state
  const [isAdmin, setIsAdmin] = React.useState(false)
  const [removedList, setRemovedList] = React.useState<RemovedMember[]>([])
  const [isRemovedModalOpen, setIsRemovedModalOpen] = React.useState(false)
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null)
  const [toast, setToast] = React.useState<string | null>(null)

  // Check admin session
  React.useEffect(() => {
    async function checkAuth() {
      try {
        const user = await getSession()
        if (user && user.role === 'admin') {
          setIsAdmin(true)
          loadRemovedList()
        }
      } catch (err) {
        // Guest user
      }
    }
    checkAuth()
  }, [])

  const loadRemovedList = async () => {
    try {
      const data = await fetchRemovedMembers()
      setRemovedList(data)
    } catch (err) {
      // ignore
    }
  }

  // Show toast notification
  const showNotification = (msg: string) => {
    setToast(msg)
    setTimeout(() => {
      setToast(null)
    }, 4000)
  }

  // Load cached members immediately on mount for 0ms instant display!
  React.useEffect(() => {
    try {
      const cached = sessionStorage.getItem('bbb_archive_members')
      if (cached) {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMembers(parsed)
          setLoading(false)
        }
      }
    } catch {}
  }, [])

  // Load members
  React.useEffect(() => {
    async function loadMembers() {
      try {
        if (members.length === 0) {
          setLoading(true)
        }
        setError(null)
        const data = await fetchMembers({
          search: search || undefined,
          sortBy,
        })
        setMembers(data)
        if (!search) {
          try {
            sessionStorage.setItem('bbb_archive_members', JSON.stringify(data))
          } catch {}
        }
      } catch (err) {
        if (members.length === 0) {
          setError(err instanceof Error ? err.message : 'Failed to load members directory')
        }
      } finally {
        setLoading(false)
      }
    }

    const timer = setTimeout(() => {
      loadMembers()
    }, search ? 250 : 0)

    return () => clearTimeout(timer)
  }, [search, sortBy])

  // Handle removing a member
  const handleRemoveMember = async (e: React.MouseEvent, member: MemberSummary) => {
    e.preventDefault()
    e.stopPropagation()

    if (!confirm(`Are you sure you want to remove "${member.display_name}"?\n\nThis will remove them from the Readers Archive. Past book discussions remain preserved in the meetups.`)) {
      return
    }

    setActionLoadingId(member.id)
    try {
      await deleteMember(member.id)
      try {
        sessionStorage.removeItem('bbb_archive_members')
      } catch {}
      showNotification(`✓ "${member.display_name}" removed from archive.`)
      setMembers((prev) => prev.filter((m) => m.id !== member.id))
      loadRemovedList()
    } catch (err: any) {
      alert(`Failed to remove member: ${err.message || 'Error'}`)
    } finally {
      setActionLoadingId(null)
    }
  }

  // Handle restoring a previously removed member
  const handleRestoreMember = async (removed: RemovedMember) => {
    setActionLoadingId(removed.id)
    try {
      await restoreMember(removed.id)
      try {
        sessionStorage.removeItem('bbb_archive_members')
      } catch {}
      showNotification(`✓ "${removed.display_name}" restored to archive!`)
      setRemovedList((prev) => prev.filter((r) => r.id !== removed.id))
      // Refresh active members list
      const data = await fetchMembers({ search: search || undefined, sortBy, forceRefresh: true })
      setMembers(data)
      try {
        sessionStorage.setItem('bbb_archive_members', JSON.stringify(data))
      } catch {}
    } catch (err: any) {
      alert(`Failed to restore member: ${err.message || 'Error'}`)
    } finally {
      setActionLoadingId(null)
    }
  }

  return (
    <Section>
      <Container>
        {/* Toast Notification */}
        {toast && (
          <div className="fixed top-5 right-5 z-50 px-5 py-3 rounded-xl bg-[#14130F] text-white text-xs font-mono shadow-2xl animate-fade-in border border-white/20">
            {toast}
          </div>
        )}

        {/* Removed Members Modal */}
        {isRemovedModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
            <div className="bg-paper border border-border rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-paper-dark/40">
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-bold text-lg text-ink">
                    Removed Readers Archive
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-700 text-[11px] font-mono">
                    {removedList.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRemovedModalOpen(false)}
                  className="p-1 rounded-lg text-muted hover:text-ink hover:bg-paper-dark transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 divide-y divide-border/60">
                {removedList.length === 0 ? (
                  <div className="py-12 text-center text-muted text-sm italic">
                    No removed readers in archive.
                  </div>
                ) : (
                  removedList.map((rm) => (
                    <div key={rm.id} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                      <div>
                        <div className="font-bold text-ink text-sm">
                          {rm.display_name}
                        </div>
                        <div className="text-xs text-muted font-mono mt-0.5">
                          {rm.book_count} past {rm.book_count === 1 ? 'book' : 'books'}
                          {rm.removed_at && (
                            <> · Removed {formatDate(rm.removed_at)}</>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={actionLoadingId === rm.id}
                        onClick={() => handleRestoreMember(rm)}
                        className="px-3 py-1.5 rounded-lg text-xs font-mono bg-amber-700 hover:bg-amber-800 text-white font-medium transition-colors disabled:opacity-50"
                      >
                        {actionLoadingId === rm.id ? 'Restoring…' : 'Restore Reader'}
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="px-6 py-3 border-t border-border bg-paper-dark/30 text-right">
                <button
                  type="button"
                  onClick={() => setIsRemovedModalOpen(false)}
                  className="px-4 py-1.5 rounded-lg border border-border bg-paper text-xs font-mono text-ink hover:bg-paper-dark transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <PageHeader
            title="The Readers Archive"
            description="The members, discussants, and readers of Broke Bibliophiles Bangalore"
          />
          <div className="flex flex-wrap items-center gap-3">
            {isAdmin && removedList.length > 0 && (
              <button
                type="button"
                onClick={() => setIsRemovedModalOpen(true)}
                className="px-3 py-2 text-xs font-mono tracking-wider rounded-lg border border-neutral-300 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 transition-colors flex items-center gap-2"
                title="View removed readers eligible for restoration"
              >
                <span>Restorable Readers</span>
                <span className="px-1.5 py-0.2 bg-neutral-300 rounded text-[10px] font-bold">
                  {removedList.length}
                </span>
              </button>
            )}

            <Link
              href="/library-room"
              className="px-4 py-2 text-xs font-mono tracking-wider rounded-lg border border-border bg-paper hover:bg-paper-dark text-ink transition-colors"
            >
              ← Library Room
            </Link>
          </div>
        </div>

        {/* Filter / Search Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-10 pb-6 border-b border-border">
          <div className="flex-1">
            <Input
              placeholder="Search readers by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-paper"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-muted whitespace-nowrap">
              Sort by:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'books' | 'meetups' | 'name')}
              className="h-10 rounded-md border border-border bg-paper px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-amber-700/50"
            >
              <option value="books">Most Books Discussed</option>
              <option value="meetups">Most Meetups Attended</option>
              <option value="name">Alphabetical Name</option>
            </select>
          </div>
        </div>

        {/* Loading State */}
        {loading && <LoadingState count={3} />}

        {/* Error State */}
        {error && (
          <ErrorState
            message={error}
            onRetry={() => window.location.reload()}
          />
        )}

        {/* Members Directory Grid */}
        {!loading && !error && (
          <>
            {members.length === 0 ? (
              <div className="text-center py-16 text-muted font-display italic">
                No readers found matching "{search}".
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {members.map((member) => {
                  const isBusy = actionLoadingId === member.id

                  return (
                    <Link
                      key={member.id}
                      href={`/members/${member.id}`}
                      className="group block p-5 rounded-lg border border-border/80 bg-paper-dark/60 hover:bg-paper-dark hover:border-amber-700/40 hover:shadow-md transition-all relative overflow-hidden"
                    >
                      {/* Archival corner marker */}
                      <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none">
                        <div className="absolute top-0 right-0 w-0 h-0 border-t-8 border-r-8 border-t-amber-800/40 border-r-amber-800/40" />
                      </div>

                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-display font-bold text-lg text-ink group-hover:text-amber-900 transition-colors truncate">
                          {member.display_name}
                        </h3>

                        {/* Admin Remove Button */}
                        {isAdmin && (
                          <div className="shrink-0 z-10" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={(e) => handleRemoveMember(e, member)}
                              className="opacity-0 group-hover:opacity-100 px-2 py-0.5 rounded text-[10px] font-mono tracking-wider bg-red-50 hover:bg-red-600 hover:text-white text-red-700 border border-red-200 transition-all disabled:opacity-50"
                              title="Remove member from database"
                            >
                              {isBusy ? '…' : '✕ Remove'}
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted font-mono mb-2">
                        <span>{member.book_count} {member.book_count === 1 ? 'book' : 'books'}</span>
                        <span>·</span>
                        <span>{member.meetup_count} {member.meetup_count === 1 ? 'meetup' : 'meetups'}</span>
                      </div>

                      {/* Book Cover Thumbnails Preview */}
                      {member.covers && member.covers.length > 0 && (
                        <div className="flex items-center gap-1.5 my-2.5 overflow-hidden py-0.5">
                          {member.covers.map((cUrl, idx) => (
                            <div
                              key={idx}
                              className="w-8 aspect-[2/3] rounded-[2px] shadow-xs overflow-hidden border border-border/70 shrink-0 bg-neutral-900 group-hover:scale-105 transition-transform"
                            >
                              <img
                                src={cUrl}
                                alt="Book cover preview"
                                className="w-full h-full object-cover"
                                loading="lazy"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                }}
                              />
                            </div>
                          ))}
                          {member.book_count > member.covers.length && (
                            <span className="text-[10px] font-mono text-muted/60 pl-1">
                              +{member.book_count - member.covers.length}
                            </span>
                          )}
                        </div>
                      )}

                      {member.first_active_date && (
                        <div className="text-[11px] text-muted/70 italic border-t border-border/50 pt-2.5">
                          Active {formatDate(member.first_active_date)}
                          {member.last_active_date && member.last_active_date !== member.first_active_date && (
                            <> – {formatDate(member.last_active_date)}</>
                          )}
                        </div>
                      )}
                    </Link>
                  )
                })}
              </div>
            )}
          </>
        )}
      </Container>
    </Section>
  )
}
