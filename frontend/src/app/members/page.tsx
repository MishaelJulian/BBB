'use client'

import * as React from 'react'
import Link from 'next/link'
import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { PageHeader } from '@/components/layout/PageHeader'
import { Input } from '@/components/ui/Input'
import { LoadingState } from '@/components/shared/LoadingState'
import { ErrorState } from '@/components/shared/ErrorState'
import { fetchMembers } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import type { MemberSummary } from '@/lib/api'

export default function MembersPage() {
  const [members, setMembers] = React.useState<MemberSummary[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState('')
  const [sortBy, setSortBy] = React.useState<'books' | 'meetups' | 'name'>('books')

  React.useEffect(() => {
    async function loadMembers() {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchMembers({
          search: search || undefined,
          sortBy,
        })
        setMembers(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load members directory')
      } finally {
        setLoading(false)
      }
    }

    const timer = setTimeout(() => {
      loadMembers()
    }, 200)

    return () => clearTimeout(timer)
  }, [search, sortBy])

  return (
    <Section>
      <Container>
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <PageHeader
            title="The Readers Archive"
            description="The members, discussants, and readers of Broke Bibliophiles Bangalore"
          />
          <div className="flex items-center gap-3">
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
                {members.map((member) => (
                  <Link
                    key={member.id}
                    href={`/members/${member.id}`}
                    className="group block p-5 rounded-lg border border-border/80 bg-paper-dark/60 hover:bg-paper-dark hover:border-amber-700/40 hover:shadow-md transition-all relative overflow-hidden"
                  >
                    {/* Archival corner marker */}
                    <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none">
                      <div className="absolute top-0 right-0 w-0 h-0 border-t-8 border-r-8 border-t-amber-800/40 border-r-amber-800/40" />
                    </div>

                    <h3 className="font-display font-bold text-lg text-ink group-hover:text-amber-900 transition-colors truncate mb-1">
                      {member.display_name}
                    </h3>

                    <div className="flex items-center gap-3 text-xs text-muted font-mono mb-4">
                      <span>{member.book_count} {member.book_count === 1 ? 'book' : 'books'}</span>
                      <span>·</span>
                      <span>{member.meetup_count} {member.meetup_count === 1 ? 'meetup' : 'meetups'}</span>
                    </div>

                    {member.first_active_date && (
                      <div className="text-[11px] text-muted/70 italic border-t border-border/50 pt-3">
                        Active {formatDate(member.first_active_date)}
                        {member.last_active_date && member.last_active_date !== member.first_active_date && (
                          <> – {formatDate(member.last_active_date)}</>
                        )}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </Container>
    </Section>
  )
}
