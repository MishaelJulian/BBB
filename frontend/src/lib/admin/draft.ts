// The unfinished-meetup draft lives on the admin's phone (localStorage), never on the server (founder, round 29).
export const DRAFT_KEY = 'bbb_draft_meetup'

export interface DraftBook {
  title: string
  author: string
  translator: string
  showTr: boolean
  isbn: string
  year: string
  edit: boolean
  src: string
  srcText?: string
  looked: string
  cover_url?: string | null
  thumbnail_url?: string | null
  rating?: number | null
  goodreads_id?: string | null
  description?: string | null
}
export interface DraftReader { id: string | null; name: string; code?: string | null; status?: string; m: number; isNew: boolean; books: DraftBook[] }
export interface Draft {
  date: string; venue: string; venueOther: string; presenter: string
  readers: DraftReader[]; make: Record<string, boolean>
  step: string; who: number | null; updated?: number
}

export const emptyDraft = (): Draft => ({ date: '', venue: '', venueOther: '', presenter: '', readers: [], make: {}, step: '1', who: null })
export const hasDraft = (d: Draft | null): d is Draft => !!d && !!(d.date || d.venue || d.presenter || d.readers?.length)

export function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    return raw ? ({ ...emptyDraft(), ...JSON.parse(raw) } as Draft) : null
  } catch {
    return null
  }
}
export function saveDraft(d: Draft) {
  try {
    d.updated = Date.now()
    localStorage.setItem(DRAFT_KEY, JSON.stringify(d))
  } catch { /* private window or full storage: the form still works, it just cannot keep a draft */ }
}
export function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ }
}
