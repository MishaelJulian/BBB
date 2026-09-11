/**
 * Archive Data Adapters
 *
 * These adapters fetch data from the API routes.
 * The API routes query the SQLite database directly.
 */

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
// Server-side fetchers (for Server Components)
// ============================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''

/**
 * Fetch archive statistics
 */
export async function getArchiveStats(): Promise<ArchiveStats> {
  const res = await fetch(`${API_BASE}/api/stats`, {
    next: { revalidate: 3600 }, // Cache for 1 hour
  })

  if (!res.ok) {
    throw new Error('Failed to fetch archive stats')
  }

  return res.json()
}

/**
 * Fetch books with filtering
 */
export async function getBooks(options?: {
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
  if (options?.sortBy) params.set('sortBy', options.sortBy)
  if (options?.sortOrder) params.set('sortOrder', options.sortOrder)
  if (options?.limit) params.set('limit', options.limit.toString())
  if (options?.offset) params.set('offset', options.offset.toString())

  const res = await fetch(`${API_BASE}/api/books?${params.toString()}`, {
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
export async function getBook(id: string): Promise<Book | null> {
  const res = await fetch(`${API_BASE}/api/books/${id}`, {
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
export async function getMeetups(options?: {
  search?: string
  year?: number
}): Promise<Meetup[]> {
  const params = new URLSearchParams()

  if (options?.search) params.set('search', options.search)
  if (options?.year) params.set('year', options.year.toString())

  const res = await fetch(`${API_BASE}/api/meetups?${params.toString()}`, {
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
export async function getMeetup(id: string): Promise<Meetup | null> {
  const res = await fetch(`${API_BASE}/api/meetups/${id}`, {
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
export async function search(query: string): Promise<{
  books: Book[]
  meetups: Meetup[]
}> {
  const params = new URLSearchParams({ q: query })

  const res = await fetch(`${API_BASE}/api/search?${params.toString()}`, {
    next: { revalidate: 60 }, // Cache for 1 minute
  })

  if (!res.ok) {
    throw new Error('Search failed')
  }

  return res.json()
}

/**
 * Get featured books (most discussed)
 */
export async function getFeaturedBooks(limit: number = 6): Promise<Book[]> {
  return getBooks({
    sortBy: 'discussionCount',
    sortOrder: 'desc',
    limit,
  })
}

/**
 * Get latest meetups
 */
export async function getLatestMeetups(limit: number = 3): Promise<Meetup[]> {
  const meetups = await getMeetups()
  return meetups.slice(0, limit)
}
