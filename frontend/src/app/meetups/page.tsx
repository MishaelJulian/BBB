'use client'

import * as React from 'react'
import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { PageHeader } from '@/components/layout/PageHeader'
import { MeetupCard } from '@/components/meetup/MeetupCard'
import { Input } from '@/components/ui/Input'
import { LoadingState } from '@/components/shared/LoadingState'
import { ErrorState } from '@/components/shared/ErrorState'
import { fetchMeetups } from '@/lib/api'
import type { Meetup } from '@/lib/api'

export default function MeetupsPage() {
  const [search, setSearch] = React.useState('')
  const [year, setYear] = React.useState<string>('')
  const [meetups, setMeetups] = React.useState<Meetup[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Fetch meetups
  React.useEffect(() => {
    async function fetchMeetupsData() {
      try {
        setLoading(true)
        setError(null)

        const data = await fetchMeetups({
          search: search || undefined,
          year: year ? parseInt(year, 10) : undefined,
        })

        setMeetups(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchMeetupsData()
  }, [search, year])

  // Get unique years for filter
  const years = React.useMemo(() => {
    const yearSet = new Set(
      meetups.map(m => new Date(m.date).getFullYear())
    )
    return Array.from(yearSet).sort((a, b) => b - a)
  }, [meetups])

  return (
    <Section>
      <Container>
        {/* Header */}
        <PageHeader
          title="Meetups"
          description="Chronological record of all BBB meetups"
        />

        {/* Filters */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <Input
            placeholder="Search by meetup number (e.g., #97)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="flex h-10 rounded-md border border-border bg-paper px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">All years</option>
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* Content */}
        {loading && <LoadingState count={6} />}

        {error && (
          <ErrorState
            message={error}
            onRetry={() => window.location.reload()}
          />
        )}

        {!loading && !error && (
          <>
            {/* Results count */}
            <div className="mt-6 mb-6 text-sm text-muted">
              Showing {meetups.length} meetups
            </div>

            {/* Meetup grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {meetups.map((meetup) => (
                <MeetupCard
                  key={meetup.id}
                  id={meetup.id}
                  number={meetup.number}
                  date={meetup.date}
                  venue={meetup.venue || 'Unknown'}
                  bookCount={meetup.book_count}
                  memberCount={meetup.member_count}
                />
              ))}
            </div>

            {meetups.length === 0 && (
              <div className="text-center py-12 text-muted">
                No meetups found matching your search.
              </div>
            )}
          </>
        )}
      </Container>
    </Section>
  )
}
