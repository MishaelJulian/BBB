'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export interface Filters {
  search: string
  author: string
  year: string
  sortBy: 'title' | 'discussionCount' | 'firstDiscussedYear'
  sortOrder: 'asc' | 'desc'
}

interface FilterPanelProps {
  filters: Filters
  onFiltersChange: (filters: Filters) => void
  className?: string
}

export function FilterPanel({ filters, onFiltersChange, className }: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = React.useState(false)

  const updateFilter = (key: keyof Filters, value: string) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      author: '',
      year: '',
      sortBy: 'title',
      sortOrder: 'asc',
    })
  }

  const hasActiveFilters = filters.author || filters.year

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search and toggle */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Search books or authors..."
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          className="flex-1"
        />
        <Button
          variant="outline"
          onClick={() => setIsExpanded(!isExpanded)}
          className="sm:w-auto"
        >
          <svg
            className="h-4 w-4 mr-2"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          Filters
          {hasActiveFilters && (
            <span className="ml-2 h-5 w-5 rounded-full bg-accent text-white text-xs flex items-center justify-center">
              {(filters.author ? 1 : 0) + (filters.year ? 1 : 0)}
            </span>
          )}
        </Button>
      </div>

      {/* Expanded filters */}
      {isExpanded && (
        <div className="p-4 rounded-lg border border-border bg-paper-dark space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Author filter */}
            <div>
              <label className="block text-sm font-medium text-ink mb-1">
                Author
              </label>
              <Input
                placeholder="Filter by author..."
                value={filters.author}
                onChange={(e) => updateFilter('author', e.target.value)}
              />
            </div>

            {/* Year filter */}
            <div>
              <label className="block text-sm font-medium text-ink mb-1">
                Year
              </label>
              <Input
                type="number"
                placeholder="e.g., 2022"
                min="2017"
                max="2026"
                value={filters.year}
                onChange={(e) => updateFilter('year', e.target.value)}
              />
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-medium text-ink mb-1">
                Sort by
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => updateFilter('sortBy', e.target.value)}
                className="flex h-10 w-full rounded-md border border-border bg-paper px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="title">Title</option>
                <option value="discussionCount">Most Discussed</option>
                <option value="firstDiscussedYear">First Discussed</option>
              </select>
            </div>
          </div>

          {/* Sort order and clear */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
              className="text-sm text-muted hover:text-ink flex items-center gap-1"
            >
              {filters.sortOrder === 'asc' ? '↑' : '↓'}
              {filters.sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            </button>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
