'use client'

import * as React from 'react'
import { authFetch } from '@/lib/auth'

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
  isbn?: string | null
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
  className?: string
}

const MEDIA_TYPES: { id: MediaTypeOption; label: string; placeholder: string }[] = [
  { id: 'book', label: 'Book', placeholder: 'Search Goodreads & BBB Archive (e.g. Dune, Misery, Klara and the Sun)...' },
  { id: 'movie', label: 'Film / TV', placeholder: 'e.g. The Last Emperor, Succession, Inception...' },
  { id: 'youtube', label: 'YouTube', placeholder: 'Paste YouTube link or enter channel / video name...' },
  { id: 'podcast', label: 'Podcast', placeholder: 'e.g. Huberman Lab, Hardcore History...' },
  { id: 'tangent', label: 'Tangent / Web', placeholder: 'e.g. Wondrium, Substack, cultural topic...' },
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

  React.useEffect(() => {
    if (mediaType && mediaType !== currentMediaType) {
      setCurrentMediaType(mediaType)
    }
  }, [mediaType, currentMediaType])

  const handleMediaTypeSelect = (type: MediaTypeOption) => {
    setCurrentMediaType(type)
    onMediaTypeChange?.(type)
    if (value.trim().length >= 2) {
      setHasInteracted(true)
    }
  }

  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const isUrl = (str: string) => {
    const trimmed = str.trim()
    return (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('www.') ||
      /^(m\.)?(youtube\.com|youtu\.be)\//i.test(trimmed)
    )
  }

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

    if (isUrl(query)) {
      setIsUrlResolving(true)
      setLoading(true)
      const timeoutId = setTimeout(async () => {
        try {
          const res = await authFetch(
            `/api/media/resolve-url?url=${encodeURIComponent(query)}`,
            { signal: controller.signal }
          )
          if (!res.ok) throw new Error('URL resolution failed')
          const data = (await res.json()) as BookSuggestion
          if (data && data.title) {
            const detectedType: MediaTypeOption = (data.media_type as MediaTypeOption) || 'tangent'
            if (detectedType !== currentMediaType) {
              setCurrentMediaType(detectedType)
              onMediaTypeChange?.(detectedType)
            }
            setSuggestions([data])
            setIsOpen(true)
            setSelectedIndex(0)
          }
        } catch (err: unknown) {
          if ((err as Error)?.name !== 'AbortError') {
            console.warn('URL resolution error:', err)
          }
        } finally {
          setIsUrlResolving(false)
          setLoading(false)
        }
      }, 280)

      return () => {
        clearTimeout(timeoutId)
        controller.abort()
      }
    }

    setLoading(true)
    const timeoutId = setTimeout(async () => {
      try {
        const res = await authFetch(
          `/api/media/suggest?q=${encodeURIComponent(query)}&media_type=${currentMediaType}`,
          { signal: controller.signal }
        )
        if (!res.ok) throw new Error('Search failed')
        const data = (await res.json()) as BookSuggestion[]
        setSuggestions(data)
        setIsOpen(data.length > 0 || query.length >= 2)
        setSelectedIndex(-1)
      } catch (err: unknown) {
        if ((err as Error)?.name !== 'AbortError') {
          setSuggestions([])
        }
      } finally {
        setLoading(false)
      }
    }, 240)

    return () => {
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [value, currentMediaType, hasInteracted, onMediaTypeChange])

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
      source_label: 'Custom Entry',
    }
    handleSelect(customItem)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return
    const totalItems = suggestions.length + (value.trim() ? 1 : 0)
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
    placeholder || MEDIA_TYPES.find((m) => m.id === currentMediaType)?.placeholder || 'Search Goodreads...'

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {showMediaTypeSelector && (
        <div
          role="group"
          aria-label="Media type"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            marginBottom: 10,
          }}
        >
          {MEDIA_TYPES.map((t) => {
            const isSelected = currentMediaType === t.id
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => handleMediaTypeSelect(t.id)}
                style={{
                  padding: '5px 11px',
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: 'var(--sans)',
                  cursor: 'pointer',
                  border: isSelected ? '1.5px solid #1a1a1a' : '1px solid #d4cfc9',
                  background: isSelected ? '#1a1a1a' : '#faf8f5',
                  color: isSelected ? '#faf8f5' : '#555',
                  transition: 'all 0.12s ease',
                }}
              >
                {t.label}
              </button>
            )
          })}
        </div>
      )}

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
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
          className={className}
          style={
            className
              ? undefined
              : {
                  width: '100%',
                  height: 44,
                  padding: '0 34px 0 12px',
                  fontSize: 15,
                  fontFamily: 'var(--sans)',
                  color: '#1a1a1a',
                  background: '#fff',
                  border: '1.5px solid #1a1a1a',
                  borderRadius: 0,
                  outline: 'none',
                }
          }
        />

        <div style={{ position: 'absolute', right: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          {loading && (
            <span
              style={{
                width: 14,
                height: 14,
                border: '2px solid #c93a14',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                display: 'inline-block',
                animation: 'spin 0.7s linear infinite',
              }}
            />
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
              style={{
                all: 'unset',
                cursor: 'pointer',
                fontSize: 14,
                color: '#64748b',
                padding: '2px 4px',
              }}
              title="Clear title"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {isUrlResolving && (
        <p style={{ margin: '6px 0 0', fontSize: 12, color: '#c93a14', fontFamily: 'var(--sans)' }}>
          Resolving link metadata...
        </p>
      )}

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '100%',
            marginTop: 4,
            zIndex: 80,
            background: '#faf8f5',
            border: '2px solid #1a1a1a',
            boxShadow: '4px 4px 0 #1a1a1a',
            maxHeight: 330,
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              padding: '6px 12px',
              background: '#f2ede4',
              borderBottom: '1px solid #d4cfc9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: '#555',
            }}
          >
            <span>
              {currentMediaType === 'book' && 'Goodreads API & BBB Archive'}
              {currentMediaType === 'movie' && 'Film & TV Series (DuckDuckGo & TVMaze)'}
              {currentMediaType === 'youtube' && 'YouTube Channels & Videos'}
              {currentMediaType === 'podcast' && 'Apple Podcasts Search'}
              {currentMediaType === 'tangent' && 'General Discussion & Web Tangents'}
            </span>
            <span>↑↓ · Enter</span>
          </div>

          <div>
            {suggestions.map((item, idx) => {
              const isSelected = idx === selectedIndex
              const cover = item.thumbnail_url || item.cover_url
              return (
                <div
                  key={`${item.title}-${item.author || item.creator}-${idx}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: '10px 12px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #e6e1d8',
                    background: isSelected ? 'rgba(201, 58, 20, 0.09)' : 'transparent',
                    borderLeft: isSelected ? '3px solid #c93a14' : '3px solid transparent',
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 52,
                      flexShrink: 0,
                      background: '#e9e4db',
                      border: '1px solid #1a1a1a',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      color: '#666',
                    }}
                  >
                    {cover ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={cover}
                        alt=""
                        referrerPolicy="no-referrer"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    ) : (
                      <span>Bk</span>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontFamily: 'var(--serif)',
                          fontWeight: 600,
                          fontSize: 15,
                          color: '#1a1a1a',
                          lineHeight: 1.25,
                        }}
                      >
                        {item.title}
                      </span>
                      {item.in_archive && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            padding: '1px 5px',
                            background: '#e6f4ea',
                            color: '#137333',
                            border: '1px solid #ceead6',
                          }}
                        >
                          In Archive
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: 13, color: '#555', marginTop: 2 }}>
                      {item.author || item.creator ? `by ${item.author || item.creator}` : 'Author not listed'}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        marginTop: 4,
                        fontSize: 11,
                        color: '#64748b',
                      }}
                    >
                      {item.rating ? (
                        <span style={{ color: '#c93a14', fontWeight: 600 }}>★ {Number(item.rating).toFixed(2)}</span>
                      ) : null}
                      {item.num_pages ? <span>{item.num_pages} pp</span> : null}
                      {item.publication_year ? <span>{item.publication_year}</span> : null}
                      <span
                        style={{
                          fontSize: 10,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          padding: '1px 5px',
                          background: '#ede8df',
                          color: '#444',
                        }}
                      >
                        {item.source_label || 'Goodreads'}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}

            {value.trim() && (
              <div
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleCustomAdd}
                onMouseEnter={() => setSelectedIndex(suggestions.length)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  padding: '10px 12px',
                  cursor: 'pointer',
                  background: selectedIndex === suggestions.length ? 'rgba(201, 58, 20, 0.12)' : '#f2ede4',
                  fontSize: 13,
                  color: '#1a1a1a',
                }}
              >
                <span>
                  Use <b>&ldquo;{value.trim()}&rdquo;</b> as typed ({currentMediaType})
                </span>
                <span style={{ fontSize: 11, color: '#c93a14', fontWeight: 600 }}>Enter ↵</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
