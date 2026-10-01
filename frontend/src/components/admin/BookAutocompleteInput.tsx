'use client'

import * as React from 'react'

export interface BookSuggestion {
  id?: string
  title: string
  author: string | null
  creator?: string | null
  media_type?: string
  url?: string | null
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

export type MediaTypeOption = 'book' | 'movie' | 'youtube' | 'podcast' | 'tangent'

interface BookAutocompleteInputProps {
  value: string
  onChange: (val: string) => void
  onSelectBook: (book: BookSuggestion) => void
  mediaType?: MediaTypeOption
  onMediaTypeChange?: (type: MediaTypeOption) => void
  showMediaTypeSelector?: boolean
  placeholder?: string
  required?: boolean
  autoFocus?: boolean
  apiBase?: string
  className?: string
}

const MEDIA_TYPES: { id: MediaTypeOption; label: string; icon: string; placeholder: string }[] = [
  { id: 'book', label: 'Book', icon: '📚', placeholder: 'e.g. Misery, Klara and the Sun, Dune...' },
  { id: 'movie', label: 'Movie / TV', icon: '🎬', placeholder: 'e.g. The Last Emperor, Succession, Inception...' },
  { id: 'youtube', label: 'YouTube', icon: '▶️', placeholder: 'Paste YouTube link or enter channel / video name...' },
  { id: 'podcast', label: 'Podcast', icon: '🎙️', placeholder: 'e.g. Huberman Lab, Hardcore History...' },
  { id: 'tangent', label: 'Tangent / Web', icon: '🌐', placeholder: 'e.g. Wondrium, Substack, cultural topic...' },
]

export function BookAutocompleteInput({
  value,
  onChange,
  onSelectBook,
  mediaType = 'book',
  onMediaTypeChange,
  showMediaTypeSelector = true,
  placeholder,
  required = false,
  autoFocus = false,
  apiBase = 'http://localhost:8000',
  className = '',
}: BookAutocompleteInputProps) {
  const [currentMediaType, setCurrentMediaType] = React.useState<MediaTypeOption>(mediaType)
  const [suggestions, setSuggestions] = React.useState<BookSuggestion[]>([])
  const [isOpen, setIsOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [isUrlResolving, setIsUrlResolving] = React.useState(false)
  const [selectedIndex, setSelectedIndex] = React.useState<number>(-1)
  const [hasInteracted, setHasInteracted] = React.useState(false)

  const containerRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const abortControllerRef = React.useRef<AbortController | null>(null)

  // Keep internal state in sync with prop
  React.useEffect(() => {
    if (mediaType && mediaType !== currentMediaType) {
      setCurrentMediaType(mediaType)
    }
  }, [mediaType])

  const handleMediaTypeSelect = (type: MediaTypeOption) => {
    setCurrentMediaType(type)
    if (onMediaTypeChange) {
      onMediaTypeChange(type)
    }
    // Re-trigger search with new media type if query is active
    if (value.trim().length >= 2) {
      setHasInteracted(true)
    }
  }

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

  // Check if string looks like a URL
  const isUrl = (str: string) => {
    const trimmed = str.trim()
    return (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('www.') ||
      trimmed.includes('youtube.com/') ||
      trimmed.includes('youtu.be/')
    )
  }

  // Debounced search / URL resolution when value or mediaType changes
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

    // 1. If user typed or pasted a URL: auto-resolve link metadata
    if (isUrl(query)) {
      setIsUrlResolving(true)
      setLoading(true)
      const timeoutId = setTimeout(async () => {
        try {
          const res = await fetch(
            `${apiBase}/api/media/resolve-url?url=${encodeURIComponent(query)}`,
            { signal: controller.signal }
          )
          if (!res.ok) throw new Error('URL resolution failed')
          const data = await res.json()
          if (data && data.title) {
            const detectedType: MediaTypeOption = (data.media_type as MediaTypeOption) || 'tangent'
            if (detectedType !== currentMediaType) {
              setCurrentMediaType(detectedType)
              if (onMediaTypeChange) onMediaTypeChange(detectedType)
            }
            setSuggestions([data])
            setIsOpen(true)
            setSelectedIndex(0)
          }
        } catch (err: any) {
          if (err.name !== 'AbortError') {
            console.warn('URL resolution error:', err)
          }
        } finally {
          setIsUrlResolving(false)
          setLoading(false)
        }
      }, 300)

      return () => {
        clearTimeout(timeoutId)
        controller.abort()
      }
    }

    // 2. Multi-source autocomplete search
    setLoading(true)
    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(
          `${apiBase}/api/media/suggest?q=${encodeURIComponent(query)}&media_type=${currentMediaType}`,
          { signal: controller.signal }
        )
        if (!res.ok) throw new Error('Search failed')
        const data: BookSuggestion[] = await res.json()
        setSuggestions(data)
        setIsOpen(data.length > 0 || query.length >= 2)
        setSelectedIndex(-1)
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('Media suggest error:', err)
          setSuggestions([])
        }
      } finally {
        setLoading(false)
      }
    }, 280)

    return () => {
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [value, currentMediaType, hasInteracted, apiBase])

  const handleSelect = (item: BookSuggestion) => {
    onChange(item.title)
    onSelectBook(item)
    setIsOpen(false)
    setSuggestions([])
    setSelectedIndex(-1)
  }

  const handleCustomAdd = () => {
    const customItem: BookSuggestion = {
      title: value.trim(),
      author: null,
      creator: null,
      media_type: currentMediaType,
      source: 'custom',
      source_label: 'Custom Tangent',
    }
    handleSelect(customItem)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return

    const totalItems = suggestions.length + (value.trim() ? 1 : 0) // include custom entry option
    if (totalItems === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        handleSelect(suggestions[selectedIndex])
      } else if (selectedIndex === suggestions.length || suggestions.length === 0) {
        handleCustomAdd()
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const activePlaceholder =
    placeholder || MEDIA_TYPES.find((m) => m.id === currentMediaType)?.placeholder || 'Search...'

  const getMediaBadge = (itemType?: string) => {
    switch (itemType) {
      case 'movie':
      case 'show':
        return { label: '🎬 Film / TV', cls: 'bg-purple-100 text-purple-800 border-purple-200' }
      case 'youtube':
        return { label: '▶️ YouTube', cls: 'bg-rose-100 text-rose-800 border-rose-200' }
      case 'podcast':
        return { label: '🎙️ Podcast', cls: 'bg-sky-100 text-sky-800 border-sky-200' }
      case 'tangent':
        return { label: '🌐 Tangent', cls: 'bg-teal-100 text-teal-800 border-teal-200' }
      default:
        return { label: '📚 Book', cls: 'bg-amber-100 text-amber-800 border-amber-200' }
    }
  }

  return (
    <div ref={containerRef} className="relative w-full space-y-2">
      {/* Media Type Selector Pills */}
      {showMediaTypeSelector && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          {MEDIA_TYPES.map((t) => {
            const isSelected = currentMediaType === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleMediaTypeSelect(t.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'bg-[#FAF8F5] text-neutral-600 hover:bg-[#F0ECE1] border border-[#DDD6C7]'
                }`}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Input Box */}
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
            if (suggestions.length > 0 || value.trim().length >= 2) setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
          placeholder={activePlaceholder}
          required={required}
          autoFocus={autoFocus}
          autoComplete="off"
          className={
            className ||
            'w-full p-2.5 pr-10 rounded-xl border border-[#DDD6C7] bg-white focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-500 text-xs font-medium text-neutral-900 transition-all shadow-xs'
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

      {/* URL resolving status pill */}
      {isUrlResolving && (
        <div className="flex items-center gap-1.5 text-[10px] text-amber-700 font-mono animate-pulse">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span>Auto-detecting and resolving link metadata...</span>
        </div>
      )}

      {/* Autocomplete Dropdown List */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-xl shadow-2xl border border-[#DDD6C7] overflow-hidden max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Header */}
          <div className="px-3 py-1.5 bg-[#FAF8F5] border-b border-[#EEE8DE] flex items-center justify-between text-[10px] text-neutral-500 font-mono font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              {currentMediaType === 'book' && 'Goodreads & BBB Archive'}
              {currentMediaType === 'movie' && 'Film & TV Series (DuckDuckGo & TVMaze)'}
              {currentMediaType === 'youtube' && 'YouTube Channels & Videos'}
              {currentMediaType === 'podcast' && 'Apple Podcasts Search'}
              {currentMediaType === 'tangent' && 'General Discussion & Web Tangents'}
            </span>
            <span>Use ↑↓ and Enter</span>
          </div>

          {/* Suggestions Items */}
          <div className="p-1 space-y-0.5">
            {suggestions.map((item, idx) => {
              const isSelected = idx === selectedIndex
              const cover = item.thumbnail_url || item.cover_url
              const badge = getMediaBadge(item.media_type || currentMediaType)

              return (
                <div
                  key={`${item.title}-${item.author || item.creator}-${idx}`}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-amber-50/90 text-neutral-900 ring-1 ring-amber-300'
                      : 'hover:bg-neutral-50 text-neutral-800'
                  }`}
                >
                  {/* Thumbnail / Cover */}
                  <div className="w-9 h-12 flex-shrink-0 bg-neutral-100 rounded border border-neutral-200 overflow-hidden shadow-xs relative flex items-center justify-center">
                    {cover ? (
                      <img
                        src={cover}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    ) : (
                      <span className="text-sm">
                        {item.media_type === 'movie'
                          ? '🎬'
                          : item.media_type === 'youtube'
                          ? '▶️'
                          : item.media_type === 'podcast'
                          ? '🎙️'
                          : item.media_type === 'tangent'
                          ? '🌐'
                          : '📖'}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="font-semibold text-xs text-neutral-900 truncate">
                        {item.title}
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-medium border ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                      {item.in_archive && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                          In Archive
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-neutral-600 truncate">
                      {item.author || item.creator
                        ? `by ${item.author || item.creator}`
                        : currentMediaType === 'movie'
                        ? 'Film / Cinema'
                        : 'Creator unknown'}
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
                        {item.source_label || 'Direct'}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Custom Fallback Item (Always allows adding non-standard items like "Wondrium") */}
            {value.trim() && (
              <div
                onClick={handleCustomAdd}
                onMouseEnter={() => setSelectedIndex(suggestions.length)}
                className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-colors border-t border-[#EEE8DE] mt-1 ${
                  selectedIndex === suggestions.length
                    ? 'bg-amber-100 text-amber-950 font-medium ring-1 ring-amber-300'
                    : 'bg-[#FAF8F5] hover:bg-amber-50 text-neutral-700'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-amber-200/80 flex items-center justify-center text-amber-800 text-xs shrink-0 font-bold">
                  +
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-neutral-900 truncate">
                    Add &quot;<span className="text-amber-800 font-bold">{value.trim()}</span>&quot; as custom {currentMediaType.toUpperCase()}
                  </p>
                  <p className="text-[10px] text-neutral-500">
                    Saves topic/tangent directly without requiring an external database match
                  </p>
                </div>
                <span className="text-[10px] text-amber-700 font-mono bg-white px-2 py-0.5 rounded border border-amber-200 shrink-0">
                  Enter ↵
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
