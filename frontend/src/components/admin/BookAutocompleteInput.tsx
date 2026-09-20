'use client'

import * as React from 'react'

export interface BookSuggestion {
  id?: string
  title: string
  author: string | null
  cover_url?: string | null
  thumbnail_url?: string | null
  publication_year?: number | null
  goodreads_id?: string | null
  rating?: number | null
  ratings_count?: number | null
  num_pages?: number | null
  in_archive?: boolean
  source?: string
  source_label?: string
  description?: string | null
}

interface BookAutocompleteInputProps {
  value: string
  onChange: (val: string) => void
  onSelectBook: (book: BookSuggestion) => void
  placeholder?: string
  required?: boolean
  autoFocus?: boolean
  apiBase?: string
  className?: string
}

export function BookAutocompleteInput({
  value,
  onChange,
  onSelectBook,
  placeholder = 'e.g. Misery, Klara and the Sun, Dune...',
  required = false,
  autoFocus = false,
  apiBase = 'http://localhost:8000',
  className = '',
}: BookAutocompleteInputProps) {
  const [suggestions, setSuggestions] = React.useState<BookSuggestion[]>([])
  const [isOpen, setIsOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [selectedIndex, setSelectedIndex] = React.useState<number>(-1)
  const [hasInteracted, setHasInteracted] = React.useState(false)

  const containerRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const abortControllerRef = React.useRef<AbortController | null>(null)

  // Handle outside click to close suggestions
  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  // Debounced search when value changes
  React.useEffect(() => {
    const query = value.trim()
    if (query.length < 2 || !hasInteracted) {
      setSuggestions([])
      setIsOpen(false)
      setLoading(false)
      return
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const controller = new AbortController()
    abortControllerRef.current = controller

    setLoading(true)
    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(
          `${apiBase}/admin/books/suggest?q=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        )
        if (!res.ok) throw new Error('Search failed')
        const data: BookSuggestion[] = await res.json()
        setSuggestions(data)
        setIsOpen(data.length > 0)
        setSelectedIndex(-1)
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('Goodreads suggest error:', err)
          setSuggestions([])
        }
      } finally {
        setLoading(false)
      }
    }, 280) // 280ms debounce for responsive typing

    return () => {
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [value, hasInteracted, apiBase])

  const handleSelect = (item: BookSuggestion) => {
    onChange(item.title)
    onSelectBook(item)
    setIsOpen(false)
    setSuggestions([])
    setSelectedIndex(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1))
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        e.preventDefault()
        handleSelect(suggestions[selectedIndex])
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            setHasInteracted(true)
            onChange(e.target.value)
          }}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          autoFocus={autoFocus}
          autoComplete="off"
          className={
            className ||
            'w-full p-2.5 pr-10 rounded-xl border border-[#DDD6C7] bg-white focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-500 text-xs font-medium text-neutral-900 transition-all'
          }
        />

        {/* Loading Spinner or Clear Button */}
        <div className="absolute right-3 flex items-center gap-1.5 pointer-events-none">
          {loading && (
            <div className="w-3.5 h-3.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          )}
          {!loading && value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onChange('')
                setSuggestions([])
                setIsOpen(false)
                inputRef.current?.focus()
              }}
              className="pointer-events-auto p-0.5 text-neutral-400 hover:text-neutral-700 transition-colors"
              title="Clear title"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Autocomplete Dropdown List */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-xl shadow-2xl border border-[#DDD6C7] overflow-hidden max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Header */}
          <div className="px-3 py-1.5 bg-[#FAF8F5] border-b border-[#EEE8DE] flex items-center justify-between text-[10px] text-neutral-500 font-mono font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Goodreads & Archive Suggestions
            </span>
            <span>Use ↑↓ and Enter</span>
          </div>

          {/* Suggestions Items */}
          <div className="p-1 space-y-0.5">
            {suggestions.map((item, idx) => {
              const isSelected = idx === selectedIndex
              const cover = item.thumbnail_url || item.cover_url

              return (
                <div
                  key={`${item.title}-${item.author}-${idx}`}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-amber-50/90 text-neutral-900 ring-1 ring-amber-300'
                      : 'hover:bg-neutral-50 text-neutral-800'
                  }`}
                >
                  {/* Book Cover / Icon Thumbnail */}
                  <div className="w-9 h-12 flex-shrink-0 bg-neutral-100 rounded border border-neutral-200 overflow-hidden shadow-xs relative flex items-center justify-center">
                    {cover ? (
                      <img
                        src={cover}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Hide broken image and show fallback icon
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    ) : (
                      <svg
                        className="w-4 h-4 text-neutral-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.5"
                          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                        />
                      </svg>
                    )}
                  </div>

                  {/* Book Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="font-semibold text-xs text-neutral-900 truncate">
                        {item.title}
                      </span>
                      {item.in_archive && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                          In Archive
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-neutral-600 truncate">
                      {item.author ? `by ${item.author}` : 'Author unknown'}
                    </p>

                    <div className="flex items-center gap-2 mt-1 text-[10px] text-neutral-400">
                      {item.rating && (
                        <span className="flex items-center text-amber-600 font-semibold">
                          ★ {item.rating.toFixed(2)}
                        </span>
                      )}
                      {item.num_pages && <span>{item.num_pages} pp</span>}
                      {item.publication_year && <span>{item.publication_year}</span>}
                      <span className="text-[9px] uppercase tracking-wider text-neutral-400 bg-neutral-100 px-1 rounded">
                        {item.source_label || 'Goodreads'}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
