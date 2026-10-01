'use client'

import * as React from 'react'

export interface MemberSuggestion {
  id?: string
  name: string
  discussions_count?: number
  books_count?: number
  already_read?: boolean
  already_read_meetups?: number[]
}

interface MemberAutocompleteInputProps {
  value: string
  onChange: (val: string) => void
  onSelectMember?: (member: MemberSuggestion) => void
  placeholder?: string
  apiBase?: string
  className?: string
  autoFocus?: boolean
  bookId?: string
}

// Helper to get initials for member avatar
function getInitials(name: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// Deterministic gentle avatar background colors
const AVATAR_COLORS = [
  'bg-amber-100 text-amber-800 border-amber-300',
  'bg-emerald-100 text-emerald-800 border-emerald-300',
  'bg-blue-100 text-blue-800 border-blue-300',
  'bg-purple-100 text-purple-800 border-purple-300',
  'bg-rose-100 text-rose-800 border-rose-300',
  'bg-stone-100 text-stone-800 border-stone-300',
]

function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export function MemberAutocompleteInput({
  value,
  onChange,
  onSelectMember,
  placeholder = 'Type reader name (e.g. Mishael, Avinash, Abhiram)...',
  apiBase = 'http://localhost:8000',
  className = '',
  autoFocus = false,
  bookId,
}: MemberAutocompleteInputProps) {
  const [inputValue, setInputValue] = React.useState('')
  const [suggestions, setSuggestions] = React.useState<MemberSuggestion[]>([])
  const [isOpen, setIsOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [selectedIndex, setSelectedIndex] = React.useState<number>(-1)

  const containerRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const abortControllerRef = React.useRef<AbortController | null>(null)

  // Parse comma-separated value into array of trimmed member names
  const selectedMembers = React.useMemo(() => {
    if (!value) return []
    return value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }, [value])

  const addMember = React.useCallback(
    (name: string) => {
      const trimmed = name.trim()
      if (!trimmed) return
      // Check if already selected (case-insensitive)
      if (selectedMembers.some((m) => m.toLowerCase() === trimmed.toLowerCase())) {
        return
      }
      const updated = [...selectedMembers, trimmed]
      onChange(updated.join(', '))
    },
    [selectedMembers, onChange]
  )

  const removeMember = React.useCallback(
    (indexToRemove: number) => {
      const updated = selectedMembers.filter((_, idx) => idx !== indexToRemove)
      onChange(updated.join(', '))
    },
    [selectedMembers, onChange]
  )

  // Handle click outside to close dropdown
  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  // Fetch suggestions when query changes
  const fetchSuggestions = React.useCallback(
    async (query: string) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      const controller = new AbortController()
      abortControllerRef.current = controller

      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (query.trim()) params.set('q', query.trim())
        if (bookId) params.set('book_id', bookId)
        const url = `${apiBase}/admin/members/suggest?${params.toString()}`

        const res = await fetch(url, { signal: controller.signal })
        if (!res.ok) throw new Error('Search failed')
        const data: MemberSuggestion[] = await res.json()
        setSuggestions(data)
        setIsOpen(true)
        setSelectedIndex(-1)
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('Member suggest error:', err)
          setSuggestions([])
        }
      } finally {
        setLoading(false)
      }
    },
    [apiBase, bookId]
  )

  // Debounced search on input change
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchSuggestions(inputValue)
    }, 160)

    return () => clearTimeout(timeoutId)
  }, [inputValue, fetchSuggestions])

  // Filter suggestions to exclude members who are already selected
  const filteredSuggestions = React.useMemo(() => {
    const selectedSet = new Set(selectedMembers.map((m) => m.toLowerCase()))
    return suggestions.filter((s) => !selectedSet.has(s.name.toLowerCase()))
  }, [suggestions, selectedMembers])

  const handleSelect = (item: MemberSuggestion) => {
    addMember(item.name)
    if (onSelectMember) onSelectMember(item)
    setInputValue('')
    setSelectedIndex(-1)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !inputValue && selectedMembers.length > 0) {
      // Remove last tag when backspacing on empty input
      e.preventDefault()
      removeMember(selectedMembers.length - 1)
      return
    }

    if (!isOpen || filteredSuggestions.length === 0) {
      if (e.key === 'Enter' && inputValue.trim()) {
        e.preventDefault()
        addMember(inputValue.trim())
        setInputValue('')
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < filteredSuggestions.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredSuggestions.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedIndex >= 0 && selectedIndex < filteredSuggestions.length) {
        handleSelect(filteredSuggestions[selectedIndex])
      } else if (inputValue.trim()) {
        addMember(inputValue.trim())
        setInputValue('')
        setIsOpen(false)
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const hasExactMatch = filteredSuggestions.some(
    (s) => s.name.toLowerCase() === inputValue.trim().toLowerCase()
  )

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Interactive Tag Container */}
      <div
        onClick={() => inputRef.current?.focus()}
        className={`w-full min-h-[42px] p-2 rounded-xl border border-[#DDD6C7] bg-white text-neutral-900 text-xs flex flex-wrap items-center gap-1.5 focus-within:border-amber-600 focus-within:ring-2 focus-within:ring-amber-500/15 transition-all cursor-text ${className}`}
      >
        {/* Selected Member Badges */}
        {selectedMembers.map((name, idx) => (
          <span
            key={`${name}-${idx}`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200/80 text-xs text-amber-950 font-medium shadow-2xs group"
          >
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center font-bold text-[9px] border shrink-0 ${getAvatarColor(
                name
              )}`}
            >
              {getInitials(name)}
            </span>
            <span className="font-semibold text-[11px]">{name}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                removeMember(idx)
              }}
              className="ml-0.5 text-amber-700/60 hover:text-amber-900 rounded-full hover:bg-amber-100/80 w-3.5 h-3.5 inline-flex items-center justify-center text-[10px] transition-colors cursor-pointer"
              title={`Remove ${name}`}
            >
              ✕
            </button>
          </span>
        ))}

        {/* Live Input Field */}
        <div className="relative flex-1 min-w-[120px] flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => {
              const val = e.target.value
              if (val.includes(',')) {
                const parts = val.split(',')
                for (const part of parts) {
                  if (part.trim()) addMember(part.trim())
                }
                setInputValue('')
              } else {
                setInputValue(val)
              }
            }}
            onPaste={(e) => {
              const pasteText = e.clipboardData.getData('text')
              if (pasteText.includes(',')) {
                e.preventDefault()
                const parts = pasteText.split(',').map((p) => p.trim()).filter(Boolean)
                for (const p of parts) {
                  addMember(p)
                }
                setInputValue('')
              }
            }}
            onFocus={() => {
              fetchSuggestions(inputValue)
              setIsOpen(true)
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              selectedMembers.length === 0
                ? placeholder
                : '+ Add another reader (or type & press Enter)...'
            }
            autoFocus={autoFocus}
            className="w-full py-1 px-1 text-xs text-neutral-900 bg-transparent focus:outline-none placeholder:text-neutral-400"
          />
          {loading && (
            <div className="absolute right-1 flex items-center pointer-events-none">
              <svg
                className="animate-spin h-3.5 w-3.5 text-amber-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Helper text */}
      <div className="flex items-center justify-between text-[10px] text-neutral-400 mt-1 px-1">
        <span>
          {selectedMembers.length > 0
            ? `${selectedMembers.length} reader${selectedMembers.length > 1 ? 's' : ''} assigned: ${selectedMembers.join(', ')}`
            : 'Select or type one or more readers for this book discussion.'}
        </span>
        <span className="font-mono hidden sm:inline text-neutral-400/80">
          Separate multiple readers with commas or Enter
        </span>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (filteredSuggestions.length > 0 || (inputValue.trim() && !hasExactMatch)) && (
        <div className="absolute left-0 right-0 z-50 mt-1 bg-white border border-[#DDD6C7] rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto divide-y divide-neutral-100 text-xs scrollbar-thin">
          <div className="px-3 py-1.5 bg-[#FAF8F5] border-b border-[#E5E0DB] flex items-center justify-between text-[10px] font-mono text-neutral-500 uppercase tracking-wider">
            <span>👤 BBB Club Readers</span>
            <span>
              {filteredSuggestions.length} available
              {selectedMembers.length > 0 && ` (${selectedMembers.length} selected)`}
            </span>
          </div>

          {filteredSuggestions.map((item, idx) => {
            const isSelected = idx === selectedIndex
            return (
              <button
                key={item.id || item.name}
                type="button"
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`w-full text-left p-2.5 flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                  isSelected ? 'bg-amber-50/80' : 'hover:bg-neutral-50'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] border shrink-0 ${getAvatarColor(
                      item.name
                    )}`}
                  >
                    {getInitials(item.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-neutral-900 truncate text-xs">
                      {item.name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {item.already_read && (
                    <span 
                      className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold flex items-center gap-1"
                      title={item.already_read_meetups && item.already_read_meetups.length > 0 ? `Already discussed this book in Meetup #${item.already_read_meetups.join(', #')}` : 'Already read this book'}
                    >
                      <span>✓ Read</span>
                      {item.already_read_meetups && item.already_read_meetups.length > 0 && (
                        <span>(#{item.already_read_meetups.join(', #')})</span>
                      )}
                    </span>
                  )}
                  {(item.books_count !== undefined ? item.books_count : item.discussions_count) !== undefined && (item.books_count ?? item.discussions_count ?? 0) > 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-100 text-amber-800 font-medium">
                      {item.books_count ?? item.discussions_count} {(item.books_count ?? item.discussions_count) === 1 ? 'book' : 'books'}
                    </span>
                  ) : (
                    <span className="text-[10px] text-neutral-400 font-mono">
                      Member
                    </span>
                  )}
                  <span className="text-amber-600 text-xs font-bold">+</span>
                </div>
              </button>
            )
          })}

          {/* Add custom name option if inputValue doesn't match existing */}
          {inputValue.trim() && !hasExactMatch && (
            <button
              type="button"
              onClick={() => {
                addMember(inputValue.trim())
                setInputValue('')
                setIsOpen(false)
              }}
              className="w-full text-left p-2.5 bg-neutral-50 hover:bg-amber-50 text-[11px] text-neutral-600 hover:text-amber-900 font-medium flex items-center justify-between gap-2 transition-colors border-t border-dashed border-neutral-200 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span>➕</span>
                <span>
                  Add <b className="text-neutral-900 font-bold">&quot;{inputValue.trim()}&quot;</b> as reader
                </span>
              </div>
              <span className="text-[10px] font-mono text-neutral-400">Press Enter</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
