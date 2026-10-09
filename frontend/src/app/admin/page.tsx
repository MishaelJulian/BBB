'use client'

import * as React from 'react'
import Link from 'next/link'
import { BookAutocompleteInput, BookSuggestion, MediaTypeOption } from '@/components/admin/BookAutocompleteInput'
import { MemberAutocompleteInput } from '@/components/admin/MemberAutocompleteInput'
import { getApiBase } from '@/lib/api'

// Only http(s) links are rendered, so a stored javascript:/data: URL can't run on click.
const safeHttpUrl = (u: string) => (/^https?:\/\//i.test(u.trim()) ? u.trim() : null)
// Photo previews may only be local blobs, http(s) URLs or same-origin paths.
const safeImageUrl = (u: string | null) => (u && /^(blob:|https?:\/\/|\/(?!\/))/i.test(u) ? u : undefined)

interface BookItem {
  discussion_id: string
  book_id: string
  title: string
  author: string | null
  member: string | null
  notes: string | null
  is_general_discussion?: boolean
  media_type?: string
  url?: string | null
  cover_url?: string | null
  thumbnail_url?: string | null
  rating?: number | null
  publication_year?: number | null
  goodreads_id?: string | null
}

interface MeetupAdminItem {
  id: string
  number: number
  date: string | null
  venue: string | null
  title: string | null
  photo_url?: string | null
  pdf_url?: string | null
  books_count: number
  books: BookItem[]
}

// Helper to normalize titles for duplicate detection
function normalizeBookTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/['’"“”:,.-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export default function AdminDatabasePage() {
  const [meetups, setMeetups] = React.useState<MeetupAdminItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedMeetupNumber, setSelectedMeetupNumber] = React.useState<number | null>(null)
  
  // Feedback notification
  const [toast, setToast] = React.useState<string | null>(null)

  // Enrichment state
  const [isEnrichingMeetup, setIsEnrichingMeetup] = React.useState(false)
  const [enrichingBookId, setEnrichingBookId] = React.useState<string | null>(null)

  // Edit Meetup Modal state
  const [isEditMeetupOpen, setIsEditMeetupOpen] = React.useState(false)
  const [editDate, setEditDate] = React.useState('')
  const [editVenue, setEditVenue] = React.useState('')
  const [editTitle, setEditTitle] = React.useState('')

  // Add Book / Media Modal state
  const [isAddBookOpen, setIsAddBookOpen] = React.useState(false)
  const [newMediaType, setNewMediaType] = React.useState<MediaTypeOption>('book')
  const [newBookTitle, setNewBookTitle] = React.useState('')
  const [newBookAuthor, setNewBookAuthor] = React.useState('')
  const [newBookMember, setNewBookMember] = React.useState('')
  const [newBookNotes, setNewBookNotes] = React.useState('')
  const [newBookUrl, setNewBookUrl] = React.useState('')
  const [newBookMeta, setNewBookMeta] = React.useState<BookSuggestion | null>(null)
  const [newIsGeneralDiscussion, setNewIsGeneralDiscussion] = React.useState(false)

  // Edit Book / Media Modal state
  const [editingBook, setEditingBook] = React.useState<BookItem | null>(null)
  const [editMediaType, setEditMediaType] = React.useState<MediaTypeOption>('book')
  const [editBookTitle, setEditBookTitle] = React.useState('')
  const [editBookAuthor, setEditBookAuthor] = React.useState('')
  const [editBookMember, setEditBookMember] = React.useState('')
  const [editBookNotes, setEditBookNotes] = React.useState('')
  const [editBookUrl, setEditBookUrl] = React.useState('')
  const [editBookMeta, setEditBookMeta] = React.useState<BookSuggestion | null>(null)
  const [editIsGeneralDiscussion, setEditIsGeneralDiscussion] = React.useState(false)

  // Media & PDF state
  const [isGeneratingPdf, setIsGeneratingPdf] = React.useState(false)
  const [isPhotoModalOpen, setIsPhotoModalOpen] = React.useState(false)
  const [isUploadingPhoto, setIsUploadingPhoto] = React.useState(false)
  const [selectedPhotoFile, setSelectedPhotoFile] = React.useState<File | null>(null)
  const [photoPreviewUrl, setPhotoPreviewUrl] = React.useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // Resilient fetch helper: tries direct backend port first, falls back to Next.js reverse-proxy
  const apiFetch = React.useCallback(async (path: string, init?: RequestInit): Promise<Response> => {
    const base = getApiBase()
    const cleanPath = path.startsWith('/') ? path : `/${path}`
    try {
      const res = await fetch(`${base}${cleanPath}`, init)
      if (res.ok) return res
    } catch {}

    // Fallback through Next.js rewrite proxy (/api/admin/... or /api/...)
    const proxyPath = cleanPath.startsWith('/admin')
      ? `/api${cleanPath}`
      : cleanPath.startsWith('/api')
      ? cleanPath
      : `/api${cleanPath}`
    return fetch(proxyPath, init)
  }, [])

  // Load all meetups with full book discussions
  const loadData = async () => {
    try {
      setLoading(true)
      const res = await apiFetch('/admin/meetups')
      if (!res.ok) throw new Error('Failed to fetch meetups')
      const data: MeetupAdminItem[] = await res.json()
      setMeetups(data)
      if (data.length > 0 && selectedMeetupNumber === null) {
        setSelectedMeetupNumber(data[0].number)
      }
    } catch (err) {
      console.error(err)
      showToast('Error connecting to backend API')
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    loadData()
  }, [])

  // Filtered meetups list
  const filteredMeetups = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return meetups
    return meetups.filter((m) => {
      const matchNumber = `meetup #${m.number}`.includes(q) || `${m.number}`.includes(q)
      const matchVenue = (m.venue || '').toLowerCase().includes(q)
      const matchBooks = m.books.some(
        (b) =>
          (b.title || '').toLowerCase().includes(q) ||
          (b.author || '').toLowerCase().includes(q) ||
          (b.member || '').toLowerCase().includes(q)
      )
      return matchNumber || matchVenue || matchBooks
    })
  }, [meetups, searchQuery])

  const currentMeetup = React.useMemo(() => {
    return meetups.find((m) => m.number === selectedMeetupNumber) || null
  }, [meetups, selectedMeetupNumber])

  // Open Edit Meetup
  const handleOpenEditMeetup = () => {
    if (!currentMeetup) return
    setEditDate(currentMeetup.date || '')
    setEditVenue(currentMeetup.venue || 'Bookworm')
    setEditTitle(currentMeetup.title || `BBB Meetup #${currentMeetup.number}`)
    setIsEditMeetupOpen(true)
  }

  // Save Meetup Edit
  const handleSaveMeetup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentMeetup) return
    try {
      const res = await apiFetch(`/admin/meetups/${currentMeetup.number}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: editDate,
          venue: editVenue,
          title: editTitle,
        }),
      })
      if (!res.ok) throw new Error('Failed to update meetup')
      showToast(`✓ Updated Meetup #${currentMeetup.number} in SQLite database`)
      setIsEditMeetupOpen(false)
      loadData()
    } catch (err) {
      console.error(err)
      showToast('Failed to save changes')
    }
  }

  // Handle autocomplete selection for Add Book
  const handleSelectAddBook = (book: BookSuggestion) => {
    setNewBookTitle(book.title)
    if (book.author || book.creator) setNewBookAuthor(book.author || book.creator || '')
    if (book.url) setNewBookUrl(book.url)
    if (book.media_type) {
      setNewMediaType(book.media_type as MediaTypeOption)
      if (book.media_type !== 'book') {
        setNewIsGeneralDiscussion(true)
      }
    }
    setNewBookMeta(book)
  }

  // Handle autocomplete selection for Edit Book
  const handleSelectEditBook = (book: BookSuggestion) => {
    setEditBookTitle(book.title)
    if (book.author || book.creator) setEditBookAuthor(book.author || book.creator || '')
    if (book.url) setEditBookUrl(book.url)
    if (book.media_type) setEditMediaType(book.media_type as MediaTypeOption)
    setEditBookMeta(book)
  }

  // Detect if the book being added already exists in the selected meetup
  const existingDuplicateBook = React.useMemo(() => {
    if (!currentMeetup || !newBookTitle.trim()) return null
    const normNew = normalizeBookTitle(newBookTitle)
    if (!normNew) return null

    return (
      currentMeetup.books.find((b) => {
        if (normalizeBookTitle(b.title) === normNew) return true
        if (
          b.goodreads_id &&
          newBookMeta?.goodreads_id &&
          b.goodreads_id === newBookMeta.goodreads_id
        ) {
          return true
        }
        return false
      }) || null
    )
  }, [currentMeetup, newBookTitle, newBookMeta])

  // Add Book to Current Meetup
  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentMeetup || !newBookTitle.trim()) return

    if (existingDuplicateBook) {
      showToast(`⚠️ "${existingDuplicateBook.title}" is already in this meetup's list!`)
      return
    }

    try {
      const res = await apiFetch(`/admin/meetups/${currentMeetup.number}/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newBookTitle.trim(),
          author: newBookAuthor.trim() || undefined,
          member: newBookMember.trim() || undefined,
          notes: newBookNotes.trim() || (newIsGeneralDiscussion ? 'General Discussion' : undefined),
          cover_url: newBookMeta?.cover_url || undefined,
          thumbnail_url: newBookMeta?.thumbnail_url || undefined,
          publication_year: newBookMeta?.publication_year || undefined,
          rating: newBookMeta?.rating || undefined,
          goodreads_id: newBookMeta?.goodreads_id || undefined,
          description: newBookMeta?.description || undefined,
          is_general_discussion: newIsGeneralDiscussion,
          media_type: newMediaType,
          url: newBookUrl.trim() || newBookMeta?.url || undefined,
        }),
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.detail || 'Failed to add item')
      }
      showToast(`✓ Added "${newBookTitle}" to Meetup #${currentMeetup.number}`)
      setNewBookTitle('')
      setNewBookAuthor('')
      setNewBookMember('')
      setNewBookNotes('')
      setNewBookUrl('')
      setNewBookMeta(null)
      setNewMediaType('book')
      setNewIsGeneralDiscussion(false)
      setIsAddBookOpen(false)
      loadData()
    } catch (err: any) {
      console.error(err)
      showToast(err.message || 'Failed to add item')
    }
  }

  // Delete Book Discussion from Meetup
  const handleDeleteBook = async (book: BookItem) => {
    if (!confirm(`Are you sure you want to remove "${book.title}" from Meetup #${selectedMeetupNumber}?`)) {
      return
    }
    try {
      const res = await apiFetch(`/admin/discussions/${book.discussion_id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete book entry')
      showToast(`✓ Removed "${book.title}" from Meetup #${selectedMeetupNumber}`)
      loadData()
    } catch (err) {
      console.error(err)
      showToast('Failed to remove book')
    }
  }

  // Toggle General Discussion flag directly in table
  const handleToggleGeneralDiscussion = async (book: BookItem) => {
    const nextState = !book.is_general_discussion
    // Optimistically update currentMeetup and meetups state
    setMeetups((prev) =>
      prev.map((m) => {
        if (m.number !== selectedMeetupNumber) return m
        const updatedBooks = m.books.map((b) =>
          b.discussion_id === book.discussion_id
            ? {
                ...b,
                is_general_discussion: nextState,
                notes: nextState
                  ? b.notes || 'General Discussion'
                  : b.notes?.toLowerCase().includes('general')
                  ? null
                  : b.notes,
              }
            : b
        )
        // Keep general discussion books down of the list
        updatedBooks.sort((a, b) => {
          const aGen = a.is_general_discussion ? 1 : 0
          const bGen = b.is_general_discussion ? 1 : 0
          if (aGen !== bGen) return aGen - bGen
          return a.title.localeCompare(b.title)
        })
        return { ...m, books: updatedBooks }
      })
    )

    try {
      const res = await apiFetch(`/admin/discussions/${book.discussion_id}/general`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_general_discussion: nextState }),
      })
      if (!res.ok) throw new Error('Failed to toggle')
      showToast(
        nextState
          ? `✓ Moved "${book.title}" to General Discussion (at the bottom)`
          : `✓ Moved "${book.title}" to Regular Discussion`
      )
    } catch (err) {
      console.error(err)
      showToast('Failed to update General Discussion status')
      loadData()
    }
  }

  // Open Edit Book Modal
  const handleOpenEditBook = (book: BookItem) => {
    setEditingBook(book)
    setEditMediaType((book.media_type as MediaTypeOption) || 'book')
    setEditBookTitle(book.title)
    setEditBookAuthor(book.author || '')
    setEditBookMember(book.member || '')
    setEditBookNotes(book.notes || '')
    setEditBookUrl(book.url || '')
    setEditBookMeta(null)
    setEditIsGeneralDiscussion(Boolean(book.is_general_discussion || (book.notes && book.notes.toLowerCase().includes('general'))))
  }

  // Save Book Edit
  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingBook || !editBookTitle.trim()) return
    try {
      const res = await apiFetch(`/admin/books/${editingBook.book_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editBookTitle.trim(),
          author: editBookAuthor.trim() || undefined,
          member: editBookMember.trim(),
          discussion_id: editingBook.discussion_id,
          notes: editBookNotes.trim() || (editIsGeneralDiscussion ? 'General Discussion' : undefined),
          cover_url: editBookMeta?.cover_url || undefined,
          thumbnail_url: editBookMeta?.thumbnail_url || undefined,
          publication_year: editBookMeta?.publication_year || undefined,
          goodreads_id: editBookMeta?.goodreads_id || undefined,
          is_general_discussion: editIsGeneralDiscussion,
          media_type: editMediaType,
          url: editBookUrl.trim() || editBookMeta?.url || undefined,
        }),
      })
      if (!res.ok) throw new Error('Failed to update item')
      showToast(`✓ Updated "${editBookTitle}" in SQLite database`)
      setEditingBook(null)
      setEditBookMeta(null)
      loadData()
    } catch (err) {
      console.error(err)
      showToast('Failed to update item')
    }
  }

  // Batch enrich all books in current meetup from Goodreads
  const handleEnrichMeetup = async () => {
    if (!currentMeetup) return
    setIsEnrichingMeetup(true)
    showToast(`⚡ Querying Goodreads API for Meetup #${currentMeetup.number} books...`)
    try {
      const res = await apiFetch(`/admin/meetups/${currentMeetup.number}/enrich-goodreads`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Enrichment failed')
      const data = await res.json()
      showToast(`✓ ${data.message || `Enriched ${data.enriched_count} books!`}`)
      loadData()
    } catch (err) {
      console.error(err)
      showToast('Enrichment from Goodreads encountered an error')
    } finally {
      setIsEnrichingMeetup(false)
    }
  }

  // Enrich single book from Goodreads
  const handleEnrichBook = async (book: BookItem) => {
    setEnrichingBookId(book.book_id)
    showToast(`⚡ Querying Goodreads for "${book.title}"...`)
    try {
      const res = await apiFetch(`/admin/books/${book.book_id}/enrich-goodreads`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Book enrichment failed')
      const data = await res.json()
      if (data.success) {
        showToast(`✓ Matched "${data.matched_title || book.title}" on Goodreads!`)
        loadData()
      } else {
        showToast(`No Goodreads match found for "${book.title}"`)
      }
    } catch (err) {
      console.error(err)
      showToast(`Failed to enrich "${book.title}"`)
    } finally {
      setEnrichingBookId(null)
    }
  }

  // Generate Publication PDF (Canva Zine style)
  const handleGeneratePdf = async () => {
    if (!currentMeetup) return
    setIsGeneratingPdf(true)
    showToast(`📑 Generating Canva-style zine PDF for Meetup #${currentMeetup.number}...`)
    try {
      const res = await apiFetch(`/admin/meetups/${currentMeetup.number}/generate-pdf`, {
        method: 'POST',
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.detail || 'Failed to generate PDF')
      }
      const data = await res.json()
      showToast(`✓ Generated publication PDF for Meetup #${currentMeetup.number}! (${data.total_pages} pages)`)
      await loadData()
    } catch (err: any) {
      console.error(err)
      showToast(`Failed to generate PDF: ${err.message || 'Error'}`)
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  // Upload Group Photo
  const handleUploadPhoto = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentMeetup || !selectedPhotoFile) return
    setIsUploadingPhoto(true)
    showToast(`📷 Uploading group photo for Meetup #${currentMeetup.number}...`)
    try {
      const formData = new FormData()
      formData.append('file', selectedPhotoFile)
      const res = await apiFetch(`/admin/meetups/${currentMeetup.number}/photo`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.detail || 'Failed to upload photo')
      }
      showToast(`✓ Group photo uploaded for Meetup #${currentMeetup.number}!`)
      setSelectedPhotoFile(null)
      setPhotoPreviewUrl(null)
      setIsPhotoModalOpen(false)
      await loadData()
    } catch (err: any) {
      console.error(err)
      showToast(`Photo upload failed: ${err.message || 'Error'}`)
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  // Remove Group Photo
  const handleRemovePhoto = async () => {
    if (!currentMeetup) return
    if (!confirm(`Are you sure you want to remove the group photo for Meetup #${currentMeetup.number}?`)) return
    try {
      const res = await apiFetch(`/admin/meetups/${currentMeetup.number}/photo`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to remove photo')
      showToast(`✓ Group photo removed for Meetup #${currentMeetup.number}`)
      setSelectedPhotoFile(null)
      setPhotoPreviewUrl(null)
      await loadData()
    } catch (err: any) {
      console.error(err)
      showToast(`Failed to remove photo: ${err.message || 'Error'}`)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#14130F] font-sans antialiased pb-16">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 px-5 py-2.5 rounded-xl bg-[#14130F] text-white text-xs font-mono shadow-2xl animate-fade-in border border-white/20">
          {toast}
        </div>
      )}

      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/95 border-b border-[#E5E0DB] px-6 py-3.5 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-3 py-1.5 rounded-lg border border-[#DDD6C7] text-xs font-mono text-neutral-600 hover:text-black hover:bg-neutral-50 transition-colors"
            >
              ← Back to The Closet
            </Link>
            <h1 className="font-display font-bold text-lg text-[#14130F]">
              BBB Archive Database Manager
            </h1>
            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-mono text-[10px] font-semibold">
              SQLite 3 · Live
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Export hidden until a live GET /export/meetups.csv endpoint exists; the old static CSV is in archive/. */}
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Search & Stats Bar */}
        <div className="bg-white rounded-2xl border border-[#E5E0DB] p-4 shadow-sm mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search meetups, book titles, authors…"
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-[#DDD6C7] text-xs bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-amber-600 transition-all"
            />
            <svg
              className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <circle cx="11" cy="11" r="8" strokeWidth="2" />
              <path d="m21 21-4.3-4.3" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>

          <div className="flex items-center gap-6 text-xs font-mono text-neutral-600">
            <div>
              <span className="text-neutral-400 uppercase text-[10px] block">Total Meetups</span>
              <b className="text-sm text-neutral-900">{meetups.length}</b>
            </div>
            <div className="h-6 w-px bg-neutral-200" />
            <div>
              <span className="text-neutral-400 uppercase text-[10px] block">Database File</span>
              <span className="font-mono text-neutral-800">book_club_archivist.db</span>
            </div>
            <div className="h-6 w-px bg-neutral-200" />
            <div>
              <span className="text-neutral-400 uppercase text-[10px] block">Status</span>
              <span className="text-emerald-700 font-bold">● Connected</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-neutral-500 font-mono text-xs">
            <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Reading SQLite database records…
          </div>
        ) : (
          /* 2-Column Master-Detail Layout */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: All Meetups List */}
            <div className="lg:col-span-4 bg-white rounded-2xl border border-[#E5E0DB] shadow-sm flex flex-col h-[750px] overflow-hidden">
              <div className="p-3.5 border-b border-[#E5E0DB] bg-[#FAF8F5] flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-600">
                  Select Meetup ({filteredMeetups.length})
                </span>
                <span className="text-[11px] font-mono text-neutral-400">Click to inspect</span>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-[#F0EDE8] scrollbar-thin">
                {filteredMeetups.map((m) => {
                  const isSelected = m.number === selectedMeetupNumber
                  return (
                    <button
                      key={`meetup-${m.number}`}
                      onClick={() => setSelectedMeetupNumber(m.number)}
                      className={`w-full p-3.5 text-left transition-colors flex items-center justify-between ${
                        isSelected
                          ? 'bg-amber-50 border-l-4 border-amber-600 text-neutral-900'
                          : 'hover:bg-neutral-50 text-neutral-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-display font-bold text-sm text-[#14130F]">
                            Meetup #{m.number}
                          </span>
                          <span className="text-[11px] text-neutral-500 font-sans">
                            {m.date || 'Undated'}
                          </span>
                        </div>
                        <span className="text-[11px] text-neutral-500 truncate block mt-0.5">
                          {m.venue || 'Bookworm'}
                        </span>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                          isSelected ? 'bg-amber-600 text-white' : 'bg-neutral-100 text-neutral-700'
                        }`}
                      >
                        {m.books_count} books
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Right Column: Selected Meetup Books & Actions */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-[#E5E0DB] shadow-sm flex flex-col h-[750px] overflow-hidden">
              {currentMeetup ? (
                <>
                  {/* Meetup Header */}
                  <div className="p-5 border-b border-[#E5E0DB] bg-[#FAF8F5] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded bg-amber-600 text-white font-mono font-bold text-xs">
                          MEETUP #{currentMeetup.number}
                        </span>
                        <h2 className="font-display font-bold text-lg text-[#14130F]">
                          {currentMeetup.title || `BBB Meetup #${currentMeetup.number}`}
                        </h2>
                      </div>
                      <p className="text-xs text-neutral-500 mt-1 flex items-center gap-2 flex-wrap">
                        <span>Date: <b className="text-neutral-800">{currentMeetup.date || 'Not set'}</b></span>
                        <span>·</span>
                        <span>Venue: <b className="text-neutral-800">{currentMeetup.venue || 'Bookworm'}</b></span>
                        <span>·</span>
                        <span>Total Books: <b className="text-amber-700">{currentMeetup.books.length}</b></span>
                        {currentMeetup.photo_url && (
                          <>
                            <span>·</span>
                            <span className="text-emerald-700 font-semibold inline-flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              📷 Photo Attached
                            </span>
                          </>
                        )}
                        {currentMeetup.pdf_url && (
                          <>
                            <span>·</span>
                            <span className="text-amber-800 font-semibold inline-flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              📑 PDF Magazine Ready
                            </span>
                          </>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={handleEnrichMeetup}
                        disabled={isEnrichingMeetup}
                        className="px-2.5 py-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                        title="Search and select Goodreads covers and ratings for all books in this meetup"
                      >
                        {isEnrichingMeetup ? (
                          <>
                            <span className="animate-spin text-xs">⚡</span>
                            <span>Enriching...</span>
                          </>
                        ) : (
                          <>
                            <span>⚡</span>
                            <span>Enrich All</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          setSelectedPhotoFile(null)
                          setPhotoPreviewUrl(currentMeetup.photo_url ? `${getApiBase()}${currentMeetup.photo_url}` : null)
                          setIsPhotoModalOpen(true)
                        }}
                        className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer ${
                          currentMeetup.photo_url
                            ? 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900'
                            : 'border-[#DDD6C7] bg-white hover:bg-neutral-50 text-neutral-800'
                        }`}
                        title="Upload, view or replace the group photo for this meetup"
                      >
                        <span>📷</span>
                        <span>{currentMeetup.photo_url ? 'Group Photo ✓' : 'Group Photo'}</span>
                      </button>

                      <button
                        onClick={handleGeneratePdf}
                        disabled={isGeneratingPdf}
                        className="px-2.5 py-1.5 rounded-xl border border-amber-600 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                        title="Generate Canva-styled 4:5 zine PDF for this meetup"
                      >
                        {isGeneratingPdf ? (
                          <>
                            <span className="animate-spin text-xs">📑</span>
                            <span>Generating PDF...</span>
                          </>
                        ) : (
                          <>
                            <span>📑</span>
                            <span>{currentMeetup.pdf_url ? 'Re-gen PDF' : 'Generate PDF'}</span>
                          </>
                        )}
                      </button>

                      <a
                        href={`${getApiBase()}/admin/meetups/${currentMeetup.number}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1.5 rounded-xl border border-neutral-800 bg-[#14130F] hover:bg-neutral-800 text-white text-xs font-semibold transition-colors shadow-xs flex items-center gap-1.5"
                        title="View or download the publication PDF magazine for this meetup"
                      >
                        <span>⬇️</span>
                        <span>PDF</span>
                      </a>

                      <button
                        onClick={handleOpenEditMeetup}
                        className="px-2.5 py-1.5 rounded-xl border border-[#DDD6C7] bg-white hover:bg-neutral-50 text-xs font-semibold text-neutral-800 transition-colors shadow-xs cursor-pointer"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => setIsAddBookOpen(true)}
                        className="px-3 py-1.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-semibold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>+ Add Book</span>
                      </button>
                    </div>
                  </div>

                  {/* Books Table */}
                  <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
                    {currentMeetup.books.length === 0 ? (
                      <div className="py-20 text-center text-neutral-400 font-serif">
                        <p className="text-base mb-2">No books currently linked to Meetup #{currentMeetup.number}.</p>
                        <button
                          onClick={() => setIsAddBookOpen(true)}
                          className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-semibold"
                        >
                          + Add the first book
                        </button>
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs">
                        <thead className="sticky top-0 bg-white border-b border-[#E5E0DB] text-neutral-500 font-mono uppercase text-[10px] z-10">
                          <tr>
                            <th className="pb-2.5 pl-2 font-semibold">#</th>
                            <th className="pb-2.5 font-semibold">Item Title & Media</th>
                            <th className="pb-2.5 font-semibold">Author / Creator</th>
                            <th className="pb-2.5 font-semibold">Discussed By</th>
                            <th className="pb-2.5 font-semibold">Discussion Type</th>
                            <th className="pb-2.5 pr-2 text-right font-semibold">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F0EDE8]">
                          {currentMeetup.books.map((book, idx) => {
                            const isFirstGeneral =
                              Boolean(book.is_general_discussion) &&
                              (idx === 0 || !currentMeetup.books[idx - 1].is_general_discussion)
                            const generalCount = currentMeetup.books.filter((b) => b.is_general_discussion).length

                            const isFilm = book.media_type === 'movie' || book.media_type === 'show'
                            const isYouTube = book.media_type === 'youtube'
                            const isPodcast = book.media_type === 'podcast'
                            const isTangent = book.media_type === 'tangent'

                            return (
                              <React.Fragment key={book.discussion_id}>
                                {isFirstGeneral && (
                                  <tr className="bg-amber-50/80 border-y border-amber-200">
                                    <td colSpan={6} className="py-2.5 px-3 text-[11px] font-mono font-bold text-amber-900 tracking-wide">
                                      💬 GENERAL DISCUSSION & TANGENTS ({generalCount}) — Kept down at bottom of meetup list
                                    </td>
                                  </tr>
                                )}
                                <tr className={`transition-colors group ${book.is_general_discussion ? 'bg-amber-50/20 hover:bg-amber-50/50' : 'hover:bg-[#FAF8F5]'}`}>
                                  <td className="py-3 pl-2 text-neutral-400 font-mono">{idx + 1}</td>
                                  <td className="py-2 font-medium text-neutral-900 font-serif text-sm">
                                    <div className="flex items-center gap-2.5">
                                      {book.cover_url || book.thumbnail_url ? (
                                        <img
                                          src={book.cover_url || book.thumbnail_url || ''}
                                          alt={book.title}
                                          className="w-7 h-10 object-cover rounded shadow-xs border border-[#E5E0DB] shrink-0"
                                          loading="lazy"
                                        />
                                      ) : (
                                        <div
                                          className="w-7 h-10 bg-neutral-100 rounded border border-dashed border-neutral-300 flex items-center justify-center text-neutral-400 text-xs shrink-0"
                                          title={book.media_type || 'Media item'}
                                        >
                                          {isFilm ? '🎬' : isYouTube ? '▶️' : isPodcast ? '🎙️' : isTangent ? '🌐' : '📖'}
                                        </div>
                                      )}
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="font-serif font-medium text-neutral-900 leading-snug">
                                            {book.title}
                                          </span>
                                          {isFilm && (
                                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-medium bg-purple-100 text-purple-800 border border-purple-200">
                                              🎬 Film/TV
                                            </span>
                                          )}
                                          {isYouTube && (
                                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-medium bg-rose-100 text-rose-800 border border-rose-200">
                                              ▶️ YouTube
                                            </span>
                                          )}
                                          {isPodcast && (
                                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-medium bg-sky-100 text-sky-800 border border-sky-200">
                                              🎙️ Podcast
                                            </span>
                                          )}
                                          {isTangent && (
                                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-medium bg-teal-100 text-teal-800 border border-teal-200">
                                              🌐 Tangent
                                            </span>
                                          )}
                                          {book.url && safeHttpUrl(book.url) && (
                                            <a
                                              href={book.url}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="text-[9px] font-mono text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-1 py-0.2 rounded font-medium inline-flex items-center gap-0.5"
                                              title={book.url}
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <span>Link</span>
                                              <span>↗</span>
                                            </a>
                                          )}
                                          {book.rating && (
                                            <span className="text-[10px] font-mono text-amber-800 bg-amber-50 border border-amber-200 px-1 rounded font-bold">
                                              ★ {book.rating.toFixed(2)}
                                            </span>
                                          )}
                                        </div>
                                        {book.publication_year && (
                                          <span className="text-[10px] text-neutral-400 font-sans block">
                                            {isFilm ? 'Released' : 'Published'} {book.publication_year}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3 text-neutral-600 font-sans">
                                    {book.author || <span className="text-neutral-300 italic">Unknown</span>}
                                  </td>
                                  <td className="py-3 text-neutral-500">
                                    {book.member ? (
                                      <button
                                        onClick={() => handleOpenEditBook(book)}
                                        className="inline-flex items-center gap-1.5 flex-wrap text-left group/m p-1 rounded-lg hover:bg-neutral-100 transition-colors"
                                        title="Click to edit discussants"
                                      >
                                        {book.member.split(',').map((mName, i) => (
                                          <span
                                            key={i}
                                            className="px-2 py-0.5 rounded-full bg-neutral-100 group-hover/m:bg-white text-[11px] font-sans font-medium text-neutral-800 border border-neutral-200/80 inline-flex items-center gap-1"
                                          >
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600/70" />
                                            {mName.trim()}
                                          </span>
                                        ))}
                                        <span className="opacity-0 group-hover/m:opacity-100 text-[9px] text-neutral-400">✏️</span>
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleOpenEditBook(book)}
                                        className="px-2 py-0.5 rounded border border-dashed border-neutral-300 hover:border-amber-600 text-neutral-400 hover:text-amber-800 text-[11px] transition-colors"
                                        title="Assign discussant to this book"
                                      >
                                        + Add Discussant
                                      </button>
                                    )}
                                  </td>
                                  <td className="py-3">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleGeneralDiscussion(book)}
                                      className={`px-2.5 py-1 rounded-full text-[11px] font-sans font-medium transition-all inline-flex items-center gap-1.5 border cursor-pointer ${
                                        book.is_general_discussion
                                          ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200 shadow-xs'
                                          : 'bg-neutral-100 text-neutral-600 border-neutral-200 hover:bg-neutral-200 hover:text-neutral-900'
                                      }`}
                                      title={
                                        book.is_general_discussion
                                          ? 'Marked as General Discussion (kept down at bottom of list). Click to switch to Regular.'
                                          : 'Regular discussion. Click to mark as General Discussion (moves to bottom of list).'
                                      }
                                    >
                                      <span
                                        className={`w-2 h-2 rounded-full ${
                                          book.is_general_discussion ? 'bg-amber-600' : 'bg-neutral-400'
                                        }`}
                                      />
                                      <span>{book.is_general_discussion ? 'General Discussion' : 'Regular'}</span>
                                    </button>
                                  </td>
                                  <td className="py-3 pr-2 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      {!book.cover_url && (
                                        <button
                                          onClick={() => handleEnrichBook(book)}
                                          disabled={enrichingBookId === book.book_id}
                                          className="p-1.5 rounded hover:bg-amber-100 text-amber-700 hover:text-amber-900 transition-colors"
                                          title="Quick-enrich from Goodreads"
                                        >
                                          {enrichingBookId === book.book_id ? '⏳' : '⚡'}
                                        </button>
                                      )}
                                      <button
                                        onClick={() => handleOpenEditBook(book)}
                                        className="p-1.5 rounded hover:bg-neutral-200 text-neutral-600 hover:text-neutral-900 transition-colors"
                                        title="Edit Book Details"
                                      >
                                        ✏️
                                      </button>
                                      <button
                                        onClick={() => handleDeleteBook(book)}
                                        className="p-1.5 rounded hover:bg-red-100 text-neutral-400 hover:text-red-700 transition-colors"
                                        title="Remove from this Meetup"
                                      >
                                        🗑️
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              </React.Fragment>
                            )
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </>
              ) : (
                <div className="m-auto text-neutral-400 font-mono text-xs">
                  Select a meetup from the left panel to inspect and edit.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: Edit Meetup Info */}
      {isEditMeetupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsEditMeetupOpen(false)} />
          <div className="relative z-10 w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-[#DDD6C7]">
            <h3 className="font-display font-bold text-lg text-neutral-900 mb-1">
              Edit Meetup #{currentMeetup?.number}
            </h3>
            <p className="text-xs text-neutral-500 mb-4">
              Update date, venue, or title in the SQLite database.
            </p>

            <form onSubmit={handleSaveMeetup} className="space-y-4 text-xs">
              <div>
                <label className="block text-neutral-700 font-semibold mb-1">Meetup Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#DDD6C7] focus:outline-none focus:border-amber-600"
                  required
                />
              </div>

              <div>
                <label className="block text-neutral-700 font-semibold mb-1">Date (YYYY-MM-DD)</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#DDD6C7] focus:outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block text-neutral-700 font-semibold mb-1">Venue</label>
                <input
                  type="text"
                  value={editVenue}
                  onChange={(e) => setEditVenue(e.target.value)}
                  placeholder="e.g. Bookworm, Atta Galatta, Online"
                  className="w-full p-2.5 rounded-xl border border-[#DDD6C7] focus:outline-none focus:border-amber-600"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditMeetupOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#DDD6C7] text-neutral-600 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Add Book / Media to Meetup */}
      {isAddBookOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsAddBookOpen(false)} />
          <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl border border-[#DDD6C7] max-h-[92vh] overflow-y-auto">
            <h3 className="font-display font-bold text-lg text-neutral-900 mb-1">
              Add Item to Meetup #{currentMeetup?.number}
            </h3>
            <p className="text-xs text-neutral-500 mb-4">
              Add a book, movie, YouTube channel, podcast, or tangent to this meetup&apos;s record.
            </p>

            <form onSubmit={handleAddBook} className="space-y-4 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-neutral-700 font-semibold">
                    {newMediaType === 'movie' ? 'Movie / TV Show Title *' : newMediaType === 'youtube' ? 'Video / Channel Title *' : newMediaType === 'podcast' ? 'Podcast Title *' : newMediaType === 'tangent' ? 'Topic / Platform Title *' : 'Book Title *'}
                  </label>
                  <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    ⚡ Multi-Source Search
                  </span>
                </div>
                <BookAutocompleteInput
                  value={newBookTitle}
                  onChange={setNewBookTitle}
                  onSelectBook={handleSelectAddBook}
                  mediaType={newMediaType}
                  onMediaTypeChange={setNewMediaType}
                  required
                  autoFocus
                  apiBase={getApiBase()}
                />
              </div>

              {/* Selected preview pill */}
              {newBookMeta && (
                <div className="flex items-center gap-2.5 p-2 bg-amber-50/70 border border-amber-200/80 rounded-xl">
                  {newBookMeta.thumbnail_url || newBookMeta.cover_url ? (
                    <img
                      src={newBookMeta.thumbnail_url || newBookMeta.cover_url || ''}
                      alt={newBookMeta.title}
                      className="w-8 h-10 object-cover rounded shadow-xs border border-amber-300 shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-10 bg-amber-200/60 rounded flex items-center justify-center text-amber-800 text-xs font-bold shrink-0">
                      {newMediaType === 'movie' ? '🎬' : newMediaType === 'youtube' ? '▶️' : newMediaType === 'podcast' ? '🎙️' : newMediaType === 'tangent' ? '🌐' : '📖'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-amber-950 truncate">
                      {newBookMeta.title}
                    </p>
                    <p className="text-[10px] text-amber-800 truncate">
                      {newBookMeta.author || newBookMeta.creator ? `by ${newBookMeta.author || newBookMeta.creator}` : ''}
                      {newBookMeta.rating ? ` · ★ ${newBookMeta.rating.toFixed(2)}` : ''}
                      {newBookMeta.publication_year ? ` · ${newBookMeta.publication_year}` : ''}
                      {newBookMeta.source_label ? ` · [${newBookMeta.source_label}]` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewBookMeta(null)}
                    className="text-neutral-400 hover:text-neutral-600 text-xs p-1"
                    title="Clear linked metadata"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Resource / External Web Link */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-neutral-700 font-semibold">
                    Resource / Web Link (YouTube, IMDb, Website)
                  </label>
                  {safeHttpUrl(newBookUrl) && (
                    <a
                      href={safeHttpUrl(newBookUrl) ?? undefined}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-amber-700 hover:text-amber-900 underline flex items-center gap-0.5"
                    >
                      Test Link ↗
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newBookUrl}
                    onChange={(e) => setNewBookUrl(e.target.value)}
                    placeholder="https://youtube.com/@channel or https://..."
                    className="w-full p-2.5 rounded-xl border border-[#DDD6C7] focus:outline-none focus:border-amber-600 text-xs"
                  />
                  {newBookUrl.trim() && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          showToast('⚡ Resolving link metadata...')
                          const res = await apiFetch(`/api/media/resolve-url?url=${encodeURIComponent(newBookUrl.trim())}`)
                          if (res.ok) {
                            const data = await res.json()
                            if (data.title && !newBookTitle) setNewBookTitle(data.title)
                            if ((data.author || data.creator) && !newBookAuthor) setNewBookAuthor(data.author || data.creator)
                            if (data.media_type) setNewMediaType(data.media_type)
                            setNewBookMeta(data)
                            showToast('✓ Link resolved successfully')
                          }
                        } catch (e) {
                          showToast('Failed to resolve URL')
                        }
                      }}
                      className="px-3 py-2.5 rounded-xl bg-neutral-900 text-white font-semibold text-xs whitespace-nowrap hover:bg-neutral-800 transition-colors shrink-0"
                    >
                      Auto-Fill
                    </button>
                  )}
                </div>
              </div>

              {/* Duplicate Book Warning Alert Banner */}
              {existingDuplicateBook && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 flex flex-col gap-2.5 animate-in fade-in duration-200">
                  <div className="flex items-start gap-2.5">
                    <span className="text-base leading-none mt-0.5">⚠️</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-xs text-amber-900">
                        Item already in this meetup&apos;s list!
                      </p>
                      <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                        &quot;<b className="text-amber-950 font-bold">{existingDuplicateBook.title}</b>&quot; is already in Meetup #{currentMeetup?.number}&apos;s list
                        {existingDuplicateBook.member ? (
                          <> (Discussed by: <b className="font-semibold text-neutral-900">{existingDuplicateBook.member}</b>)</>
                        ) : (
                          ' (no reader assigned)'
                        )}.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-amber-200/80">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddBookOpen(false)
                        handleOpenEditBook(existingDuplicateBook)
                      }}
                      className="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-semibold text-[11px] transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <span>✏️ Edit Existing Item & Add Reader</span>
                    </button>
                    <span className="text-[10px] text-amber-800/80 font-mono">
                      to avoid duplicate entries
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-neutral-700 font-semibold mb-1">
                  {newMediaType === 'movie' ? 'Director / Studio / Network' : newMediaType === 'youtube' ? 'Channel / Creator' : newMediaType === 'podcast' ? 'Host / Network' : newMediaType === 'tangent' ? 'Creator / Platform' : 'Author Name'}
                </label>
                <input
                  type="text"
                  value={newBookAuthor}
                  onChange={(e) => setNewBookAuthor(e.target.value)}
                  placeholder={newMediaType === 'movie' ? 'e.g. Bernardo Bertolucci' : newMediaType === 'youtube' ? 'e.g. 3Blue1Brown' : newMediaType === 'podcast' ? 'e.g. Andrew Huberman' : newMediaType === 'tangent' ? 'e.g. The Teaching Company' : 'e.g. Stephen King'}
                  className="w-full p-2.5 rounded-xl border border-[#DDD6C7] focus:outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-neutral-700 font-semibold">Discussed By (Readers / Discussants)</label>
                  <span className="text-[10px] font-mono text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    👤 BBB Club Readers
                  </span>
                </div>
                <MemberAutocompleteInput
                  value={newBookMember}
                  onChange={setNewBookMember}
                  placeholder="Type discussant name (e.g. Mishael, Abhiram)..."
                  apiBase={getApiBase()}
                  bookId={newBookMeta?.id || existingDuplicateBook?.book_id || undefined}
                />
              </div>

              <div>
                <label className="block text-neutral-700 font-semibold mb-1">Discussion Notes / Tangent Context</label>
                <input
                  type="text"
                  value={newBookNotes}
                  onChange={(e) => setNewBookNotes(e.target.value)}
                  placeholder={newIsGeneralDiscussion ? 'General Discussion / Tangent' : 'e.g. Tangents, Community Discussion'}
                  className="w-full p-2.5 rounded-xl border border-[#DDD6C7] focus:outline-none focus:border-amber-600"
                />
              </div>

              {/* General Discussion Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF8F5] border border-[#DDD6C7]">
                <div className="pr-3">
                  <div className="flex items-center gap-1.5 font-semibold text-neutral-800 text-xs">
                    <span>💬</span>
                    <span>General Discussion / Tangent</span>
                  </div>
                  <span className="text-[11px] text-neutral-500 block mt-0.5">
                    Toggle on to group under Tangents & General Discussion (at the bottom of meetup list).
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setNewIsGeneralDiscussion(!newIsGeneralDiscussion)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors shrink-0 ${
                    newIsGeneralDiscussion ? 'bg-amber-600 justify-end' : 'bg-neutral-300 justify-start'
                  }`}
                  title="Toggle General Discussion"
                >
                  <span className="bg-white w-4 h-4 rounded-full shadow-md transform transition-transform" />
                </button>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddBookOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#DDD6C7] text-neutral-600 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={Boolean(existingDuplicateBook)}
                  className={`px-5 py-2 rounded-xl font-semibold shadow-sm transition-all ${
                    existingDuplicateBook
                      ? 'bg-amber-100 text-amber-800 border border-amber-300 cursor-not-allowed opacity-90'
                      : 'bg-[#14130F] hover:bg-neutral-800 text-white cursor-pointer'
                  }`}
                  title={existingDuplicateBook ? 'This item is already in the list' : 'Add item to meetup'}
                >
                  {existingDuplicateBook ? '⚠️ Item Already in List' : 'Add to Meetup'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Edit Existing Book / Media Item */}
      {editingBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditingBook(null)} />
          <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl border border-[#DDD6C7] max-h-[92vh] overflow-y-auto">
            <h3 className="font-display font-bold text-lg text-neutral-900 mb-1">
              Edit Discussion Item
            </h3>
            <p className="text-xs text-neutral-500 mb-4">
              Update item title, media type, author/creator, web link, and discussion notes.
            </p>

            <form onSubmit={handleSaveBook} className="space-y-4 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-neutral-700 font-semibold">
                    {editMediaType === 'movie' ? 'Movie / TV Show Title *' : editMediaType === 'youtube' ? 'Video / Channel Title *' : editMediaType === 'podcast' ? 'Podcast Title *' : editMediaType === 'tangent' ? 'Topic / Platform Title *' : 'Book Title *'}
                  </label>
                  <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    ⚡ Multi-Source Search
                  </span>
                </div>
                <BookAutocompleteInput
                  value={editBookTitle}
                  onChange={setEditBookTitle}
                  onSelectBook={handleSelectEditBook}
                  mediaType={editMediaType}
                  onMediaTypeChange={setEditMediaType}
                  required
                  autoFocus
                  apiBase={getApiBase()}
                />
              </div>

              {/* Selected preview pill */}
              {editBookMeta && (
                <div className="flex items-center gap-2.5 p-2 bg-amber-50/70 border border-amber-200/80 rounded-xl">
                  {editBookMeta.thumbnail_url || editBookMeta.cover_url ? (
                    <img
                      src={editBookMeta.thumbnail_url || editBookMeta.cover_url || ''}
                      alt={editBookMeta.title}
                      className="w-8 h-10 object-cover rounded shadow-xs border border-amber-300 shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-10 bg-amber-200/60 rounded flex items-center justify-center text-amber-800 text-xs font-bold shrink-0">
                      {editMediaType === 'movie' ? '🎬' : editMediaType === 'youtube' ? '▶️' : editMediaType === 'podcast' ? '🎙️' : editMediaType === 'tangent' ? '🌐' : '📖'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-amber-950 truncate">
                      {editBookMeta.title}
                    </p>
                    <p className="text-[10px] text-amber-800 truncate">
                      {editBookMeta.author || editBookMeta.creator ? `by ${editBookMeta.author || editBookMeta.creator}` : ''}
                      {editBookMeta.rating ? ` · ★ ${editBookMeta.rating.toFixed(2)}` : ''}
                      {editBookMeta.publication_year ? ` · ${editBookMeta.publication_year}` : ''}
                      {editBookMeta.source_label ? ` · [${editBookMeta.source_label}]` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditBookMeta(null)}
                    className="text-neutral-400 hover:text-neutral-600 text-xs p-1"
                    title="Clear linked metadata"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Resource / External Web Link */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-neutral-700 font-semibold">
                    Resource / Web Link (YouTube, IMDb, Website)
                  </label>
                  {safeHttpUrl(editBookUrl) && (
                    <a
                      href={safeHttpUrl(editBookUrl) ?? undefined}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-amber-700 hover:text-amber-900 underline flex items-center gap-0.5"
                    >
                      Test Link ↗
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editBookUrl}
                    onChange={(e) => setEditBookUrl(e.target.value)}
                    placeholder="https://youtube.com/@channel or https://..."
                    className="w-full p-2.5 rounded-xl border border-[#DDD6C7] focus:outline-none focus:border-amber-600 text-xs"
                  />
                  {editBookUrl.trim() && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          showToast('⚡ Resolving link metadata...')
                          const res = await apiFetch(`/api/media/resolve-url?url=${encodeURIComponent(editBookUrl.trim())}`)
                          if (res.ok) {
                            const data = await res.json()
                            if (data.title && !editBookTitle) setEditBookTitle(data.title)
                            if ((data.author || data.creator) && !editBookAuthor) setEditBookAuthor(data.author || data.creator)
                            if (data.media_type) setEditMediaType(data.media_type)
                            setEditBookMeta(data)
                            showToast('✓ Link resolved successfully')
                          }
                        } catch (e) {
                          showToast('Failed to resolve URL')
                        }
                      }}
                      className="px-3 py-2.5 rounded-xl bg-neutral-900 text-white font-semibold text-xs whitespace-nowrap hover:bg-neutral-800 transition-colors shrink-0"
                    >
                      Auto-Fill
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-neutral-700 font-semibold mb-1">
                  {editMediaType === 'movie' ? 'Director / Studio / Network' : editMediaType === 'youtube' ? 'Channel / Creator' : editMediaType === 'podcast' ? 'Host / Network' : editMediaType === 'tangent' ? 'Creator / Platform' : 'Author Name'}
                </label>
                <input
                  type="text"
                  value={editBookAuthor}
                  onChange={(e) => setEditBookAuthor(e.target.value)}
                  placeholder={editMediaType === 'movie' ? 'e.g. Bernardo Bertolucci' : editMediaType === 'youtube' ? 'e.g. 3Blue1Brown' : editMediaType === 'podcast' ? 'e.g. Andrew Huberman' : editMediaType === 'tangent' ? 'e.g. The Teaching Company' : 'e.g. Kazuo Ishiguro'}
                  className="w-full p-2.5 rounded-xl border border-[#DDD6C7] focus:outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-neutral-700 font-semibold">
                    Discussed By (Readers / Discussants)
                  </label>
                  <span className="text-[10px] font-mono text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    👤 BBB Club Readers
                  </span>
                </div>
                <MemberAutocompleteInput
                  value={editBookMember}
                  onChange={setEditBookMember}
                  placeholder="Type discussant name (e.g. Mishael, Abhiram)..."
                  apiBase={getApiBase()}
                  bookId={editBookMeta?.id || editingBook?.book_id || undefined}
                />
                <p className="text-[10px] text-neutral-400 mt-1">
                  The book club reader who presented or discussed this item at the meetup.
                </p>
              </div>

              <div>
                <label className="block text-neutral-700 font-semibold mb-1">
                  Discussion Notes / Tangent Context
                </label>
                <input
                  type="text"
                  value={editBookNotes}
                  onChange={(e) => setEditBookNotes(e.target.value)}
                  placeholder={editIsGeneralDiscussion ? 'General Discussion / Tangent' : 'e.g. Tangents, Community Discussion'}
                  className="w-full p-2.5 rounded-xl border border-[#DDD6C7] focus:outline-none focus:border-amber-600"
                />
              </div>

              {/* General Discussion Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF8F5] border border-[#DDD6C7]">
                <div className="pr-3">
                  <div className="flex items-center gap-1.5 font-semibold text-neutral-800 text-xs">
                    <span>💬</span>
                    <span>General Discussion / Tangent</span>
                  </div>
                  <span className="text-[11px] text-neutral-500 block mt-0.5">
                    Toggle on to group under Tangents & General Discussion (at the bottom of meetup list).
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditIsGeneralDiscussion(!editIsGeneralDiscussion)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors shrink-0 ${
                    editIsGeneralDiscussion ? 'bg-amber-600 justify-end' : 'bg-neutral-300 justify-start'
                  }`}
                  title="Toggle General Discussion"
                >
                  <span className="bg-white w-4 h-4 rounded-full shadow-md transform transition-transform" />
                </button>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingBook(null)}
                  className="px-4 py-2 rounded-xl border border-[#DDD6C7] text-neutral-600 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-sm cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Group Photo & Media Upload Modal */}
      {isPhotoModalOpen && currentMeetup && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E5E0DB] shadow-2xl max-w-lg w-full overflow-hidden animate-scale-in">
            <div className="p-6 border-b border-[#E5E0DB] bg-[#FAF8F5] flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono text-amber-700 font-bold uppercase tracking-wider block">
                  Meetup #{currentMeetup.number} Media
                </span>
                <h3 className="font-display font-bold text-xl text-[#14130F]">
                  Club Group Photo
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsPhotoModalOpen(false)
                  setSelectedPhotoFile(null)
                  setPhotoPreviewUrl(null)
                }}
                className="w-8 h-8 rounded-full bg-white border border-[#DDD6C7] text-neutral-400 hover:text-neutral-700 flex items-center justify-center text-sm font-mono cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadPhoto} className="p-6 space-y-5">
              <p className="text-xs text-neutral-600 leading-relaxed">
                Upload the group picture taken at this meetup. It will be featured on the dedicated photo page in the Canva-styled publication PDF zine with a classic Polaroid border and drop shadow.
              </p>

              {/* Photo Preview Area */}
              <div className="border-2 border-dashed border-[#DDD6C7] rounded-2xl p-4 bg-[#FAF8F5] flex flex-col items-center justify-center text-center">
                {photoPreviewUrl ? (
                  <div className="relative group max-w-xs mx-auto">
                    {/* Polaroid-styled preview frame */}
                    <div className="bg-white p-3 pb-8 rounded-lg shadow-md border border-neutral-200 rotate-[-1deg] transition-transform group-hover:rotate-0">
                      <img
                        src={safeImageUrl(photoPreviewUrl)}
                        alt={`Group photo for Meetup #${currentMeetup.number}`}
                        className="w-full max-h-56 object-cover rounded-xs"
                      />
                      <div className="mt-2 text-center font-mono text-[11px] text-neutral-600 font-semibold tracking-wide">
                        BBB Meetup #{currentMeetup.number} {currentMeetup.date ? `· ${currentMeetup.date}` : ''}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-neutral-400">
                    <div className="text-4xl mb-2">📷</div>
                    <p className="text-xs font-medium text-neutral-700">No group photo attached yet</p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">JPG, PNG, WebP up to 25MB</p>
                  </div>
                )}
              </div>

              {/* File Input */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  {currentMeetup.photo_url ? 'Choose replacement image file:' : 'Select image file:'}
                </label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setSelectedPhotoFile(file)
                      setPhotoPreviewUrl(URL.createObjectURL(file))
                    }
                  }}
                  className="w-full text-xs text-neutral-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-amber-100 file:text-amber-900 hover:file:bg-amber-200 cursor-pointer"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between border-t border-[#F0EDE8]">
                {currentMeetup.photo_url ? (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="px-3 py-2 rounded-xl text-rose-700 hover:bg-rose-50 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    🗑️ Remove Photo
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPhotoModalOpen(false)
                      setSelectedPhotoFile(null)
                      setPhotoPreviewUrl(null)
                    }}
                    className="px-4 py-2 rounded-xl border border-[#DDD6C7] text-neutral-600 hover:bg-neutral-50 text-xs font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedPhotoFile || isUploadingPhoto}
                    className="px-5 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    {isUploadingPhoto ? (
                      <>
                        <span className="animate-spin text-xs">⏳</span>
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <span>Upload & Attach Photo</span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
