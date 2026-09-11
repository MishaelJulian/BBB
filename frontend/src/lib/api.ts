/**
 * BBB Library API Client
 *
 * This module provides fetch-based functions to interact with the FastAPI backend.
 * It replaces the previous better-sqlite3 direct database access.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ============================================
// Types
// ============================================

export interface ArchiveStats {
  total_meetups: number
  canonical_books: number
  imported_books: number
  authors: number
  members: number
  venues: number
  discussions: number
  resources: number
}

export interface Book {
  id: string
  title: string
  normalized_title: string
  author_id: string | null
  author_name: string | null
  discussion_count: number
  first_discussed_date: string | null
  last_discussed_date: string | null
  meetups: MeetupReference[]
  members: MemberReference[]
}

export interface MeetupReference {
  id: string
  number: number
  date: string
  venue: string
}

export interface MemberReference {
  id: string
  display_name: string
}

export interface Meetup {
  id: string
  number: number
  date: string
  venue: string | null
  title: string | null
  format: string
  book_count: number
  member_count: number
  books: BookReference[]
  members: MemberReference[]
}

export interface BookReference {
  id: string
  title: string
  author: string | null
  member: string | null
  is_discussion_mention: boolean
}

// ============================================
// API Functions
// ============================================

/**
 * Fetch archive statistics
 */
export async function fetchStats(): Promise<ArchiveStats> {
  const res = await fetch(`${API_BASE}/stats`, {
    next: { revalidate: 3600 },
  })

  if (!res.ok) {
    throw new Error('Failed to fetch archive stats')
  }

  return res.json()
}

/**
 * Fetch books with filtering
 */
export async function fetchBooks(options?: {
  search?: string
  author?: string
  year?: number
  sortBy?: string
  sortOrder?: string
  limit?: number
  offset?: number
}): Promise<Book[]> {
  const params = new URLSearchParams()

  if (options?.search) params.set('search', options.search)
  if (options?.author) params.set('author', options.author)
  if (options?.year) params.set('year', options.year.toString())
  if (options?.sortBy) params.set('sort_by', options.sortBy)
  if (options?.sortOrder) params.set('sort_order', options.sortOrder)
  if (options?.limit) params.set('limit', options.limit.toString())
  if (options?.offset) params.set('offset', options.offset.toString())

  const res = await fetch(`${API_BASE}/books?${params.toString()}`, {
    next: { revalidate: 3600 },
  })

  if (!res.ok) {
    throw new Error('Failed to fetch books')
  }

  return res.json()
}

/**
 * Fetch a single book
 */
export async function fetchBook(id: string): Promise<Book | null> {
  const res = await fetch(`${API_BASE}/books/${id}`, {
    next: { revalidate: 3600 },
  })

  if (res.status === 404) {
    return null
  }

  if (!res.ok) {
    throw new Error('Failed to fetch book')
  }

  return res.json()
}

/**
 * Fetch meetups
 */
export async function fetchMeetups(options?: {
  search?: string
  year?: number
}): Promise<Meetup[]> {
  const params = new URLSearchParams()

  if (options?.search) params.set('search', options.search)
  if (options?.year) params.set('year', options.year.toString())

  const res = await fetch(`${API_BASE}/meetups?${params.toString()}`, {
    next: { revalidate: 3600 },
  })

  if (!res.ok) {
    throw new Error('Failed to fetch meetups')
  }

  return res.json()
}

/**
 * Fetch a single meetup
 */
export async function fetchMeetup(id: string): Promise<Meetup | null> {
  const res = await fetch(`${API_BASE}/meetups/${id}`, {
    next: { revalidate: 3600 },
  })

  if (res.status === 404) {
    return null
  }

  if (!res.ok) {
    throw new Error('Failed to fetch meetup')
  }

  return res.json()
}

/**
 * Search across books and meetups
 */
export async function fetchSearch(query: string): Promise<{
  books: Book[]
  meetups: Meetup[]
}> {
  const params = new URLSearchParams({ q: query })

  const res = await fetch(`${API_BASE}/search?${params.toString()}`, {
    next: { revalidate: 60 },
  })

  if (!res.ok) {
    throw new Error('Search failed')
  }

  return res.json()
}

/**
 * Get featured books (most discussed)
 */
export async function fetchFeaturedBooks(limit: number = 6): Promise<Book[]> {
  return fetchBooks({
    sortBy: 'discussionCount',
    sortOrder: 'desc',
    limit,
  })
}

/**
 * Get latest meetups
 */
export async function fetchLatestMeetups(limit: number = 3): Promise<Meetup[]> {
  const meetups = await fetchMeetups()
  return meetups.slice(0, limit)
}

// ============================================
// Member & Author Types & Fetchers
// ============================================

export interface MemberSummary {
  id: string
  display_name: string
  book_count: number
  meetup_count: number
  first_active_date: string | null
  last_active_date: string | null
}

export interface MemberBookRecord {
  id: string
  title: string
  author_id: string | null
  author_name: string | null
  meetups: {
    meetup_number: number
    date: string | null
    venue: string | null
  }[]
}

export interface MemberDetail {
  id: string
  display_name: string
  bio: string | null
  book_count: number
  meetup_count: number
  first_active_date: string | null
  last_active_date: string | null
  books: MemberBookRecord[]
  meetups: MeetupReference[]
}

export interface AuthorDetail {
  id: string
  full_name: string
  country: string | null
  description: string | null
  book_count: number
  discussion_count: number
  books: Book[]
}

/**
 * Fetch all members
 */
export async function fetchMembers(options?: {
  search?: string
  sortBy?: 'books' | 'name' | 'meetups'
}): Promise<MemberSummary[]> {
  const params = new URLSearchParams()
  if (options?.search) params.set('search', options.search)
  if (options?.sortBy) params.set('sort_by', options.sortBy)

  const res = await fetch(`${API_BASE}/members?${params.toString()}`, {
    next: { revalidate: 3600 },
  })

  if (!res.ok) {
    throw new Error('Failed to fetch members directory')
  }

  return res.json()
}

/**
 * Fetch a single member dossier
 */
export async function fetchMember(id: string): Promise<MemberDetail | null> {
  const res = await fetch(`${API_BASE}/members/${id}`, {
    next: { revalidate: 3600 },
  })

  if (res.status === 404) {
    return null
  }

  if (!res.ok) {
    throw new Error('Failed to fetch member dossier')
  }

  return res.json()
}

/**
 * Fetch an author archival record
 */
export async function fetchAuthor(id: string): Promise<AuthorDetail | null> {
  const res = await fetch(`${API_BASE}/authors/${id}`, {
    next: { revalidate: 3600 },
  })

  if (res.status === 404) {
    return null
  }

  if (!res.ok) {
    throw new Error('Failed to fetch author record')
  }

  return res.json()
}

