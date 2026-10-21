'use client'

import * as React from 'react'
import { authFetch } from '@/lib/auth'

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
  className?: string
  autoFocus?: boolean
  bookId?: string
}

function getInitials(name: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function MemberAutocompleteInput({
  value,
  onChange,
  onSelectMember,
  placeholder = 'Type reader name (e.g. Mishael, Avinash, Abhiram)...',
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

  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

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
        const res = await authFetch(`/api/admin/members/suggest?${params.toString()}`, {
          signal: controller.signal,
        })
        if (!res.ok) throw new Error('Search failed')
        const data = (await res.json()) as MemberSuggestion[]
        setSuggestions(data)
        setSelectedIndex(-1)
      } catch (err: unknown) {
        if ((err as Error)?.name !== 'AbortError') {
          setSuggestions([])
        }
      } finally {
        setLoading(false)
      }
    },
    [bookId]
  )

  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      void fetchSuggestions(inputValue)
    }, 160)
    return () => clearTimeout(timeoutId)
  }, [inputValue, fetchSuggestions])

  const filteredSuggestions = React.useMemo(() => {
    const selectedSet = new Set(selectedMembers.map((m) => m.toLowerCase()))
    return suggestions.filter((s) => !selectedSet.has(s.name.toLowerCase()))
  }, [suggestions, selectedMembers])

  const handleSelect = (item: MemberSuggestion) => {
    addMember(item.name)
    onSelectMember?.(item)
    setInputValue('')
    setSelectedIndex(-1)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !inputValue && selectedMembers.length > 0) {
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
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div
        onClick={() => inputRef.current?.focus()}
        className={className}
        style={{
          minHeight: 44,
          padding: '6px 10px',
          background: '#fff',
          border: '1.5px solid #1a1a1a',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 6,
          cursor: 'text',
        }}
      >
        {selectedMembers.map((name, idx) => (
          <span
            key={`${name}-${idx}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 8px',
              background: '#f2ede4',
              border: '1px solid #1a1a1a',
              fontSize: 13,
              fontWeight: 600,
              color: '#1a1a1a',
            }}
          >
            <span
              style={{
                width: 18,
                height: 18,
                background: '#1a1a1a',
                color: '#faf8f5',
                fontSize: 10,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {getInitials(name)}
            </span>
            <span>{name}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                removeMember(idx)
              }}
              style={{
                all: 'unset',
                cursor: 'pointer',
                fontSize: 12,
                color: '#c93a14',
                padding: '0 2px',
              }}
              title={`Remove ${name}`}
            >
              ✕
            </button>
          </span>
        ))}

        <div style={{ flex: 1, minWidth: 140, display: 'flex', alignItems: 'center' }}>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => {
              const val = e.target.value
              if (val.includes(',')) {
                for (const part of val.split(',')) {
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
                for (const p of pasteText.split(',').map((s) => s.trim()).filter(Boolean)) {
                  addMember(p)
                }
                setInputValue('')
              }
            }}
            onFocus={() => {
              void fetchSuggestions(inputValue)
              setIsOpen(true)
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              selectedMembers.length === 0
                ? placeholder
                : '+ Add another reader (or press Enter)...'
            }
            autoFocus={autoFocus}
            style={{
              width: '100%',
              border: 0,
              outline: 'none',
              background: 'transparent',
              fontSize: 14,
              fontFamily: 'var(--sans)',
              color: '#1a1a1a',
              padding: '4px 2px',
            }}
          />
          {loading && <span style={{ fontSize: 11, color: '#64748b' }}>...</span>}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 11,
          color: '#64748b',
          marginTop: 4,
        }}
      >
        <span>
          {selectedMembers.length > 0
            ? `${selectedMembers.length} reader${selectedMembers.length > 1 ? 's' : ''}: ${selectedMembers.join(', ')}`
            : 'Select or type one or more readers for this discussion.'}
        </span>
        <span>Separate with commas or Enter</span>
      </div>

      {isOpen && (filteredSuggestions.length > 0 || (inputValue.trim() && !hasExactMatch)) && (
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
            maxHeight: 240,
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
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: '#555',
            }}
          >
            <span>BBB Club Readers</span>
            <span>{filteredSuggestions.length} shown</span>
          </div>

          {filteredSuggestions.map((item, idx) => {
            const isSelected = idx === selectedIndex
            const cnt = item.books_count ?? item.discussions_count ?? 0
            return (
              <button
                key={item.id || item.name}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(idx)}
                style={{
                  all: 'unset',
                  boxSizing: 'border-box',
                  width: '100%',
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  cursor: 'pointer',
                  borderBottom: '1px solid #e6e1d8',
                  background: isSelected ? 'rgba(201, 58, 20, 0.09)' : 'transparent',
                }}
              >
                <span style={{ fontWeight: 600, fontSize: 14, color: '#1a1a1a' }}>{item.name}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#64748b' }}>
                  {item.already_read && (
                    <span style={{ color: '#137333', fontWeight: 600 }}>
                      ✓ Read{item.already_read_meetups?.length ? ` (#${item.already_read_meetups.join(', #')})` : ''}
                    </span>
                  )}
                  <span>{cnt > 0 ? `${cnt} book${cnt === 1 ? '' : 's'}` : 'Member'}</span>
                  <span style={{ color: '#c93a14', fontWeight: 700 }}>+</span>
                </span>
              </button>
            )
          })}

          {inputValue.trim() && !hasExactMatch && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                addMember(inputValue.trim())
                setInputValue('')
                setIsOpen(false)
              }}
              style={{
                all: 'unset',
                boxSizing: 'border-box',
                width: '100%',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                background: '#f2ede4',
                fontSize: 13,
                color: '#1a1a1a',
              }}
            >
              <span>
                + Add <b>&ldquo;{inputValue.trim()}&rdquo;</b> as reader
              </span>
              <span style={{ fontSize: 11, color: '#c93a14', fontWeight: 600 }}>Enter ↵</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
