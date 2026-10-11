/**
 * BBB Library API Client
 *
 * This module provides fetch-based functions to interact with the FastAPI backend.
 * It replaces the previous better-sqlite3 direct database access.
 */

export function getApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL
  }
  // Browser: same origin. Next.js (locally) or Vercel (production) rewrites /api/* to the backend,
  // so login cookies stay first-party and no backend port is exposed (D1, D35).
  if (typeof window !== 'undefined') {
    return '/api'
  }
  return process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:8000'
}

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' ? '/api' : 'http://127.0.0.1:8000')

// ============================================
// Types
// ============================================

export interface ArchiveStats {
  total_meetups: number
  meetups_expected: number
  canonical_books: number
  books_discussed: number
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
  cover_url?: string | null
  thumbnail_url?: string | null
  description?: string | null
  goodreads_id?: string | null
  publication_year?: number | null
  rating?: number | null
  page_count?: number | null
  media_type?: string | null
  discussion_count: number
  first_discussed_date: string | null
  last_discussed_date: string | null
  meetups: MeetupReference[]
  members: MemberReference[]
  is_general_discussion?: boolean
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
  photo_url?: string | null
  pdf_url?: string | null
  books: BookReference[]
  members: MemberReference[]
}

export interface BookReference {
  id: string
  title: string
  author: string | null
  member: string | null
  cover_url?: string | null
  thumbnail_url?: string | null
  is_discussion_mention: boolean
}

// ============================================
// Persistent IndexedDB & SWR Cache
// ============================================

export interface CacheEntry<T> {
  data: T
  timestamp: number
}

const memoryCache = new Map<string, CacheEntry<any>>()
const CACHE_TTL_MS = 15 * 60 * 1000 // 15 minutes fresh window

const IDB_NAME = 'bbb_cache_v1'
const IDB_STORE = 'api_cache'

function openIDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) return Promise.resolve(null)
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(IDB_NAME, 1)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE)
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

export async function getPersistentData<T>(key: string): Promise<T | null> {
  if (typeof window === 'undefined') return null
  try {
    const db = await openIDB()
    if (db) {
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(IDB_STORE, 'readonly')
          const store = tx.objectStore(IDB_STORE)
          const req = store.get(key)
          req.onsuccess = () => {
            const res = req.result as CacheEntry<T> | undefined
            resolve(res?.data ?? null)
          }
          req.onerror = () => resolve(null)
        } catch {
          resolve(null)
        }
      })
    }
  } catch {}
  return null
}

export async function setPersistentData<T>(key: string, data: T, timestamp: number = Date.now()): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    const db = await openIDB()
    if (db) {
      const tx = db.transaction(IDB_STORE, 'readwrite')
      const store = tx.objectStore(IDB_STORE)
      store.put({ data, timestamp }, key)
    }
  } catch {}
}

async function getPersistentEntry<T>(key: string): Promise<CacheEntry<T> | null> {
  if (typeof window === 'undefined') return null
  try {
    const db = await openIDB()
    if (db) {
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(IDB_STORE, 'readonly')
          const store = tx.objectStore(IDB_STORE)
          const req = store.get(key)
          req.onsuccess = () => resolve((req.result as CacheEntry<T>) || null)
          req.onerror = () => resolve(null)
        } catch {
          resolve(null)
        }
      })
    }
  } catch {}
  return null
}

async function clearPersistentData(prefix?: string): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    const db = await openIDB()
    if (db) {
      const tx = db.transaction(IDB_STORE, 'readwrite')
      const store = tx.objectStore(IDB_STORE)
      if (!prefix) {
        store.clear()
      } else {
        const req = store.openKeyCursor()
        req.onsuccess = () => {
          const cursor = req.result
          if (cursor) {
            const keyStr = String(cursor.key)
            if (keyStr.includes(prefix)) {
              store.delete(cursor.key)
            }
            cursor.continue()
          }
        }
      }
    }
  } catch {}
}

export function getCachedData<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  const entry = memoryCache.get(key)
  if (entry) return entry.data as T
  try {
    const raw = sessionStorage.getItem(`swr_${key}`) || localStorage.getItem(`swr_${key}`)
    if (raw) {
      const parsed = JSON.parse(raw)
      const data = parsed && typeof parsed === 'object' && 'data' in parsed ? parsed.data : parsed
      const timestamp = parsed && typeof parsed === 'object' && 'timestamp' in parsed ? parsed.timestamp : Date.now()
      memoryCache.set(key, { data, timestamp })
      return data as T
    }
  } catch {}
  return null
}

export function setCachedData<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return
  const now = Date.now()
  const entry = { data, timestamp: now }
  memoryCache.set(key, entry)
  try {
    const serialized = JSON.stringify(entry)
    sessionStorage.setItem(`swr_${key}`, serialized)
    // Save to localStorage if under 500KB to prevent QuotaExceededError
    if (serialized.length < 500000) {
      localStorage.setItem(`swr_${key}`, serialized)
    }
  } catch {}
  setPersistentData(key, data, now).catch(() => {})
}

export function invalidateApiCache(prefix?: string): void {
  if (typeof window === 'undefined') return
  if (!prefix) {
    memoryCache.clear()
    try {
      const sKeys = Object.keys(sessionStorage)
      for (const k of sKeys) {
        if (k.startsWith('swr_') || k.startsWith('bbb_archive_')) sessionStorage.removeItem(k)
      }
      const lKeys = Object.keys(localStorage)
      for (const k of lKeys) {
        if (k.startsWith('swr_') || k.startsWith('bbb_archive_')) localStorage.removeItem(k)
      }
    } catch {}
    clearPersistentData().catch(() => {})
    return
  }
  for (const k of Array.from(memoryCache.keys())) {
    if (k.includes(prefix)) memoryCache.delete(k)
  }
  try {
    const sKeys = Object.keys(sessionStorage)
    for (const k of sKeys) {
      if (k.includes(prefix)) sessionStorage.removeItem(k)
    }
    const lKeys = Object.keys(localStorage)
    for (const k of lKeys) {
      if (k.includes(prefix)) localStorage.removeItem(k)
    }
  } catch {}
  clearPersistentData(prefix).catch(() => {})
}

async function fetchWithSWR<T>(
  key: string,
  fetcher: () => Promise<T>,
  forceRefresh: boolean = false
): Promise<T> {
  if (typeof window === 'undefined') {
    return fetcher()
  }

  if (forceRefresh) {
    const fresh = await fetcher()
    setCachedData(key, fresh)
    return fresh
  }

  // 1. Instant synchronous check (memory & storage)
  let cached = getCachedData<T>(key)
  let entry = memoryCache.get(key)

  // 2. Check async persistent IndexedDB if not found in memory
  if (cached === null) {
    const persistent = await getPersistentEntry<T>(key)
    if (persistent) {
      cached = persistent.data
      entry = persistent
      memoryCache.set(key, persistent)
    }
  }

  if (cached !== null && entry) {
    const isFresh = Date.now() - entry.timestamp < CACHE_TTL_MS
    // If cache is older than TTL, silently revalidate in the background without blocking UI
    if (!isFresh) {
      fetcher()
        .then((fresh) => {
          if (fresh !== null && fresh !== undefined) setCachedData(key, fresh)
        })
        .catch(() => {})
    }
    return cached
  }

  // Cold fetch if no cache exists yet
  const fresh = await fetcher()
  if (fresh !== null && fresh !== undefined) {
    setCachedData(key, fresh)
  }
  return fresh
}

// ============================================
// API Functions
// ============================================

/**
 * Fetch archive statistics
 */
export async function fetchStats(): Promise<ArchiveStats> {
  return fetchWithSWR('stats', async () => {
    const res = await fetch(`${API_BASE}/stats`)
    if (!res.ok) throw new Error('Failed to fetch archive stats')
    return res.json()
  })
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
  onlyDiscussed?: boolean
  excludeGeneral?: boolean
  forceRefresh?: boolean
}): Promise<Book[]> {
  const params = new URLSearchParams()

  if (options?.search) params.set('search', options.search)
  if (options?.author) params.set('author', options.author)
  if (options?.year) params.set('year', options.year.toString())
  if (options?.sortBy) params.set('sort_by', options.sortBy)
  if (options?.sortOrder) params.set('sort_order', options.sortOrder)
  if (options?.limit) params.set('limit', options.limit.toString())
  if (options?.offset) params.set('offset', options.offset.toString())
  if (options?.onlyDiscussed) params.set('only_discussed', 'true')
  if (options?.excludeGeneral) params.set('exclude_general', 'true')
  if (options?.forceRefresh) params.set('_t', Date.now().toString())

  const cacheKey = `books_${params.toString()}`

  return fetchWithSWR(
    cacheKey,
    async () => {
      const res = await fetch(`${API_BASE}/books?${params.toString()}`, {
        cache: options?.forceRefresh ? 'no-store' : 'default',
      })
      if (!res.ok) throw new Error('Failed to fetch books')
      return res.json()
    },
    Boolean(options?.forceRefresh)
  )
}

/**
 * Fetch a single book
 */
export async function fetchBook(id: string): Promise<Book | null> {
  return fetchWithSWR(`book_${id}`, async () => {
    const res = await fetch(`${API_BASE}/books/${id}`)
    if (res.status === 404) return null
    if (!res.ok) throw new Error('Failed to fetch book')
    return res.json()
  })
}

/**
 * Fetch meetups
 */
export async function fetchMeetups(options?: {
  search?: string
  year?: number
  forceRefresh?: boolean
}): Promise<Meetup[]> {
  const params = new URLSearchParams()

  if (options?.search) params.set('search', options.search)
  if (options?.year) params.set('year', options.year.toString())
  if (options?.forceRefresh) params.set('_t', Date.now().toString())

  const cacheKey = `meetups_${params.toString()}`

  return fetchWithSWR(
    cacheKey,
    async () => {
      const res = await fetch(`${API_BASE}/meetups?${params.toString()}`, {
        cache: options?.forceRefresh ? 'no-store' : 'default',
      })
      if (!res.ok) throw new Error('Failed to fetch meetups')
      return res.json()
    },
    Boolean(options?.forceRefresh)
  )
}

/**
 * Fetch a single meetup
 */
export async function fetchMeetup(id: string): Promise<Meetup | null> {
  return fetchWithSWR(`meetup_${id}`, async () => {
    const res = await fetch(`${API_BASE}/meetups/${id}`)
    if (res.status === 404) return null
    if (!res.ok) throw new Error('Failed to fetch meetup')
    return res.json()
  })
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

/**
 * Fetch book synopsis from backend (with Goodreads / Apple Books dynamic lookup)
 */
export async function fetchBookSynopsis(bookId: string): Promise<{ 
  description: string | null
  page_count?: number | null
  rating?: number | null
  cover_url?: string | null
  source?: string 
}> {
  try {
    const res = await fetch(`${API_BASE}/books/${bookId}/synopsis`)
    if (res.ok) {
      return res.json()
    }
  } catch (err) {
    console.warn('Failed to fetch book synopsis:', err)
  }
  return { description: null }
}

// ============================================
// Member & Author Types & Fetchers
// ============================================

export interface MemberSummary {
  id: string
  display_name: string
  is_hidden?: boolean
  book_count: number
  meetup_count: number
  first_active_date: string | null
  last_active_date: string | null
  covers?: string[]
}

export interface MemberBookRecord {
  id: string
  title: string
  author_id: string | null
  author_name: string | null
  cover_url?: string | null
  thumbnail_url?: string | null
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
  is_hidden?: boolean
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
  sortBy?: 'books' | 'name' | 'meetups' | 'recent'
  includeHidden?: boolean
  forceRefresh?: boolean
}): Promise<MemberSummary[]> {
  const params = new URLSearchParams()
  if (options?.search) params.set('search', options.search)
  if (options?.sortBy) params.set('sort_by', options.sortBy)
  if (options?.includeHidden) params.set('include_hidden', 'true')
  if (options?.forceRefresh) params.set('_t', Date.now().toString())

  const cacheKey = `members_${params.toString()}`

  return fetchWithSWR(
    cacheKey,
    async () => {
      const res = await fetch(`${API_BASE}/members?${params.toString()}`, {
        cache: options?.forceRefresh ? 'no-store' : 'default',
      })
      if (!res.ok) throw new Error('Failed to fetch members directory')
      return res.json()
    },
    Boolean(options?.forceRefresh)
  )
}

/**
 * Temporarily remove a member from the database (Admin only)
 */
export async function deleteMember(memberId: string): Promise<{ success: boolean; id: string; display_name: string; message: string }> {
  const res = await fetch(`${API_BASE}/admin/members/${encodeURIComponent(memberId)}`, {
    method: 'DELETE',
    credentials: 'include',
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Failed to remove member')
  }

  invalidateApiCache('member')
  return res.json()
}

export interface RemovedMember {
  id: string
  display_name: string
  removed_at: string | null
  book_count: number
}

/**
 * Fetch list of removed members eligible for restoration (Admin only)
 */
export async function fetchRemovedMembers(): Promise<RemovedMember[]> {
  const res = await fetch(`${API_BASE}/admin/removed-members`, {
    cache: 'no-store',
    credentials: 'include',
  })

  if (!res.ok) {
    throw new Error('Failed to fetch removed members')
  }

  return res.json()
}

/**
 * Restore a previously removed member back into the database (Admin only)
 */
export async function restoreMember(memberId: string): Promise<{ success: boolean; id: string; display_name: string; message: string }> {
  const res = await fetch(`${API_BASE}/admin/members/${encodeURIComponent(memberId)}/restore`, {
    method: 'POST',
    credentials: 'include',
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Failed to restore member')
  }

  invalidateApiCache('member')
  return res.json()
}

/**
 * Fetch a single member dossier
 */
export async function fetchMember(id: string): Promise<MemberDetail | null> {
  return fetchWithSWR(`member_${id}`, async () => {
    const res = await fetch(`${API_BASE}/members/${id}`)
    if (res.status === 404) return null
    if (!res.ok) throw new Error('Failed to fetch member dossier')
    return res.json()
  })
}

/**
 * Fetch an author archival record
 */
export async function fetchAuthor(id: string): Promise<AuthorDetail | null> {
  return fetchWithSWR(`author_${id}`, async () => {
    const res = await fetch(`${API_BASE}/authors/${id}`)
    if (res.status === 404) return null
    if (!res.ok) throw new Error('Failed to fetch author record')
    return res.json()
  })
}

