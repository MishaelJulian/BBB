'use client'

import * as React from 'react'
import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { PageHeader } from '@/components/layout/PageHeader'
import { BookGrid } from '@/components/book/BookGrid'
import { ViewToggle } from '@/components/ui/ViewToggle'
import { FilterPanel, type Filters } from '@/components/search/FilterPanel'
import { LoadingState } from '@/components/shared/LoadingState'
import { ErrorState } from '@/components/shared/ErrorState'
import { fetchBooks, fetchStats } from '@/lib/api'
import type { Book, ArchiveStats } from '@/lib/api'

export default function LibraryPage() {
  const [view, setView] = React.useState<'grid' | 'list'>('grid')
  const [filters, setFilters] = React.useState<Filters>({
    search: '',
    author: '',
    year: '',
    sortBy: 'title',
    sortOrder: 'asc',
  })
  const [books, setBooks] = React.useState<Book[]>([])
  const [stats, setStats] = React.useState<ArchiveStats | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Fetch data
  React.useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)

        const [booksData, statsData] = await Promise.all([
          fetchBooks({
            search: filters.search || undefined,
            author: filters.author || undefined,
            year: filters.year ? parseInt(filters.year, 10) : undefined,
            sortBy: filters.sortBy,
            sortOrder: filters.sortOrder,
          }),
          fetchStats(),
        ])

        setBooks(booksData)
        setStats(statsData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [filters])

  return (
    <Section>
      <Container>
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <PageHeader
            title="Library"
            description={stats ? `${stats.canonical_books.toLocaleString()} canonical books` : 'Loading...'}
          />
          <ViewToggle view={view} onChange={setView} />
        </div>

        {/* Filters */}
        <div className="mb-8">
          <FilterPanel filters={filters} onFiltersChange={setFilters} />
        </div>

        {/* Content */}
        {loading && <LoadingState count={8} />}

        {error && (
          <ErrorState
            message={error}
            onRetry={() => window.location.reload()}
          />
        )}

        {!loading && !error && (
          <>
            {/* Results count */}
            <div className="mb-6 text-sm text-muted">
              Showing {books.length} of {stats?.canonical_books.toLocaleString() || '...'} books
            </div>

            {/* Book grid/list */}
            <BookGrid books={books} view={view} />
          </>
        )}
      </Container>
    </Section>
  )
}
