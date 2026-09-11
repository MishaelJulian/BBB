'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface SearchResult {
  type: 'book' | 'meetup'
  id: string
  title: string
  subtitle?: string
}

export function CommandPalette() {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [results, setResults] = React.useState<SearchResult[]>([])
  const [loading, setLoading] = React.useState(false)
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Handle keyboard shortcut
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Focus input when opened
  React.useEffect(() => {
    if (open) {
      inputRef.current?.focus()
      setQuery('')
      setResults([])
      setSelectedIndex(0)
    }
  }, [open])

  // Search with debounce
  React.useEffect(() => {
    if (!query) {
      setResults([])
      return
    }

    const timeout = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          const searchResults: SearchResult[] = []

          // Add books
          data.books?.forEach((book: any) => {
            searchResults.push({
              type: 'book',
              id: book.id,
              title: book.title,
              subtitle: book.author_name,
            })
          })

          // Add meetups
          data.meetups?.forEach((meetup: any) => {
            searchResults.push({
              type: 'meetup',
              id: meetup.number.toString(),
              title: `Meetup #${meetup.number}`,
              subtitle: meetup.venue || 'Unknown venue',
            })
          })

          setResults(searchResults.slice(0, 10))
        }
      } catch (err) {
        console.error('Search failed:', err)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timeout)
  }, [query])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault()
      navigateToResult(results[selectedIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const navigateToResult = (result: SearchResult) => {
    if (result.type === 'book') {
      router.push(`/books/${result.id}`)
    } else if (result.type === 'meetup') {
      router.push(`/meetups/${result.id}`)
    }
    setOpen(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-command-palette">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Dialog */}
      <div className="absolute left-1/2 top-[20%] -translate-x-1/2 w-full max-w-xl">
        <div className="bg-paper rounded-lg shadow-lg border border-border overflow-hidden">
          {/* Search input */}
          <div className="flex items-center border-b border-border px-4">
            <svg
              className="h-5 w-5 text-muted-light shrink-0"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setSelectedIndex(0)
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search books, meetups, authors..."
              className="flex-1 h-12 px-3 bg-transparent text-sm focus:outline-none"
            />
            {loading && (
              <div className="animate-spin h-4 w-4 border-2 border-accent border-t-transparent rounded-full" />
            )}
            <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-paper-dark px-1.5 font-mono text-[10px] text-muted-light">
              esc
            </kbd>
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div className="max-h-80 overflow-y-auto p-2">
              {results.map((result, index) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => navigateToResult(result)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors',
                    index === selectedIndex
                      ? 'bg-paper-dark text-ink'
                      : 'text-ink hover:bg-paper-dark'
                  )}
                >
                  {/* Icon */}
                  <div className="w-8 h-8 rounded flex items-center justify-center bg-paper-dark text-muted-light shrink-0">
                    {result.type === 'book' ? (
                      <svg
                        className="h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                      </svg>
                    ) : (
                      <svg
                        className="h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    )}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{result.title}</div>
                    {result.subtitle && (
                      <div className="text-xs text-muted-light truncate">{result.subtitle}</div>
                    )}
                  </div>

                  {/* Type badge */}
                  <div className="text-xs text-muted-light capitalize">{result.type}</div>
                </button>
              ))}
            </div>
          )}

          {/* Empty state */}
          {query && !loading && results.length === 0 && (
            <div className="p-8 text-center text-muted text-sm">
              No results found for &ldquo;{query}&rdquo;
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-border px-4 py-2 flex items-center gap-4 text-xs text-muted-light">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded border border-border bg-paper-dark">↑</kbd>
              <kbd className="px-1 py-0.5 rounded border border-border bg-paper-dark">↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded border border-border bg-paper-dark">↵</kbd>
              select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded border border-border bg-paper-dark">esc</kbd>
              close
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
