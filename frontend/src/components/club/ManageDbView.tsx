'use client'

import * as React from 'react'
import Link from 'next/link'
import { BookAutocompleteInput, type BookSuggestion, type MediaTypeOption } from '@/components/admin/BookAutocompleteInput'
import { MemberAutocompleteInput } from '@/components/admin/MemberAutocompleteInput'
import { authFetch } from '@/lib/auth'
import { AdminLoginGate } from './AdminKit'
import { ClubPage } from './ClubPage'
import { useMe } from './useMe'
import '@/styles/club-admin.css'

const safeHttpUrl = (u: string) => (/^https?:\/\//i.test(u.trim()) ? u.trim() : null)
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

function normalizeBookTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/['’"“”:,.-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function ManageDbView() {
  const me = useMe()
  const [meetups, setMeetups] = React.useState<MeetupAdminItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedMeetupNumber, setSelectedMeetupNumber] = React.useState<number | null>(null)
  const [mobileDetailView, setMobileDetailView] = React.useState(false)
  const [toast, setToast] = React.useState<string | null>(null)

  const [isEnrichingMeetup, setIsEnrichingMeetup] = React.useState(false)
  const [enrichingBookId, setEnrichingBookId] = React.useState<string | null>(null)

  // Create Meetup Modal state
  const [isCreateMeetupOpen, setIsCreateMeetupOpen] = React.useState(false)
  const [createNumber, setCreateNumber] = React.useState<number>(100)
  const [createDate, setCreateDate] = React.useState('')
  const [createVenue, setCreateVenue] = React.useState('Bookworm')
  const [createTitle, setCreateTitle] = React.useState('')
  const [createFormat, setCreateFormat] = React.useState('IN_PERSON')
  const [createDescription, setCreateDescription] = React.useState('')
  const [isCreatingMeetup, setIsCreatingMeetup] = React.useState(false)

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
  const [generatingPdfStyle, setGeneratingPdfStyle] = React.useState<'magazine' | 'classic' | null>(null)
  const [isPdfStyleModalOpen, setIsPdfStyleModalOpen] = React.useState(false)
  const [isPhotoModalOpen, setIsPhotoModalOpen] = React.useState(false)
  const [isUploadingPhoto, setIsUploadingPhoto] = React.useState(false)
  const [selectedPhotoFile, setSelectedPhotoFile] = React.useState<File | null>(null)
  const [photoPreviewUrl, setPhotoPreviewUrl] = React.useState<string | null>(null)
  const [isSyncing, setIsSyncing] = React.useState(false)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  const apiFetch = React.useCallback(async (path: string, init?: RequestInit): Promise<Response> => {
    const cleanPath = path.startsWith('/') ? path : `/${path}`
    const fullPath = cleanPath.startsWith('/api') ? cleanPath : `/api${cleanPath}`
    return authFetch(fullPath, init)
  }, [])

  const loadData = React.useCallback(
    async (silent = false) => {
      try {
        if (!silent) setLoading(true)
        const res = await apiFetch('/api/admin/meetups')
        if (!res.ok) throw new Error('Failed to fetch meetups')
        const data = (await res.json()) as MeetupAdminItem[]
        setMeetups(data)
        setSelectedMeetupNumber((prev) => (prev === null && data.length > 0 ? data[0].number : prev))
      } catch (err) {
        console.error(err)
        showToast('Could not load meetups from database.')
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [apiFetch]
  )

  React.useEffect(() => {
    if (me.state === 'admin') {
      void loadData()
    } else if (me.state !== 'loading') {
      setLoading(false)
    }
  }, [me.state, loadData])

  const handleSyncDatabase = async () => {
    setIsSyncing(true)
    try {
      await apiFetch('/api/admin/refresh', { method: 'POST' }).catch(() => null)
      await loadData()
      showToast('Database refreshed — all updates are live across the Library and Lists.')
    } catch {
      showToast('Failed to refresh database.')
    } finally {
      setIsSyncing(false)
    }
  }

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

  const handleOpenCreateMeetup = () => {
    const maxNum = meetups.reduce((max, m) => Math.max(max, m.number), 0)
    const nextNum = maxNum > 0 ? maxNum + 1 : 1
    const todayStr = new Date().toISOString().split('T')[0]
    setCreateNumber(nextNum)
    setCreateDate(todayStr)
    setCreateVenue('Bookworm')
    setCreateTitle(`BBB Meetup #${nextNum}`)
    setCreateFormat('IN_PERSON')
    setCreateDescription('')
    setIsCreateMeetupOpen(true)
  }

  const handleCreateMeetup = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreatingMeetup(true)
    try {
      const res = await apiFetch('/api/admin/meetups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetup_number: Number(createNumber),
          date: createDate || null,
          venue: createVenue || 'Bookworm',
          title: createTitle || `BBB Meetup #${createNumber}`,
          format: createFormat || 'IN_PERSON',
          description: createDescription || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.detail || data?.error?.message || 'Failed to create meetup')
      }
      showToast(`Created Meetup #${createNumber}`)
      setIsCreateMeetupOpen(false)
      const newMeetupItem: MeetupAdminItem = {
        id: `meetup_${createNumber}`,
        number: Number(createNumber),
        date: createDate || null,
        venue: createVenue || 'Bookworm',
        title: createTitle || `BBB Meetup #${createNumber}`,
        photo_url: null,
        pdf_url: null,
        books_count: 0,
        books: [],
      }
      setMeetups((prev) =>
        [newMeetupItem, ...prev.filter((m) => m.number !== Number(createNumber))].sort((a, b) => b.number - a.number)
      )
      setSelectedMeetupNumber(Number(createNumber))
      setMobileDetailView(true)
      void loadData(true)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create meetup')
    } finally {
      setIsCreatingMeetup(false)
    }
  }

  const handleOpenEditMeetup = () => {
    if (!currentMeetup) return
    setEditDate(currentMeetup.date || '')
    setEditVenue(currentMeetup.venue || 'Bookworm')
    setEditTitle(currentMeetup.title || `BBB Meetup #${currentMeetup.number}`)
    setIsEditMeetupOpen(true)
  }

  const handleSaveMeetup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentMeetup) return
    try {
      const res = await apiFetch(`/api/admin/meetups/${currentMeetup.number}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: editDate,
          venue: editVenue,
          title: editTitle,
        }),
      })
      if (!res.ok) throw new Error('Failed to update meetup')
      showToast(`Updated Meetup #${currentMeetup.number}`)
      setIsEditMeetupOpen(false)
      setMeetups((prev) =>
        prev.map((m) =>
          m.number === currentMeetup.number ? { ...m, date: editDate || null, venue: editVenue, title: editTitle } : m
        )
      )
      void loadData(true)
    } catch {
      showToast('Failed to save changes')
    }
  }

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

  const handleSelectEditBook = (book: BookSuggestion) => {
    setEditBookTitle(book.title)
    if (book.author || book.creator) setEditBookAuthor(book.author || book.creator || '')
    if (book.url) setEditBookUrl(book.url)
    if (book.media_type) setEditMediaType(book.media_type as MediaTypeOption)
    setEditBookMeta(book)
  }

  const existingDuplicateBook = React.useMemo(() => {
    if (!currentMeetup || !newBookTitle.trim()) return null
    const normNew = normalizeBookTitle(newBookTitle)
    if (!normNew) return null

    return (
      currentMeetup.books.find((b) => {
        if (normalizeBookTitle(b.title) === normNew) return true
        if (b.goodreads_id && newBookMeta?.goodreads_id && b.goodreads_id === newBookMeta.goodreads_id) {
          return true
        }
        return false
      }) || null
    )
  }, [currentMeetup, newBookTitle, newBookMeta])

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentMeetup || !newBookTitle.trim()) return

    if (existingDuplicateBook) {
      showToast(`"${existingDuplicateBook.title}" is already in this meetup's list!`)
      return
    }

    try {
      const res = await apiFetch(`/api/admin/meetups/${currentMeetup.number}/books`, {
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
        throw new Error(errJson.detail || errJson.error?.message || 'Failed to add item')
      }
      showToast(`Added "${newBookTitle}" to Meetup #${currentMeetup.number}`)
      setNewBookTitle('')
      setNewBookAuthor('')
      setNewBookMember('')
      setNewBookNotes('')
      setNewBookUrl('')
      setNewBookMeta(null)
      setNewMediaType('book')
      setNewIsGeneralDiscussion(false)
      setIsAddBookOpen(false)
      void loadData(true)
    } catch (err: unknown) {
      showToast((err as Error).message || 'Failed to add item')
    }
  }

  const handleDeleteBook = async (book: BookItem) => {
    if (!confirm(`Remove "${book.title}" from Meetup #${selectedMeetupNumber}?`)) return
    setMeetups((prev) =>
      prev.map((m) =>
        m.number === selectedMeetupNumber
          ? {
              ...m,
              books: m.books.filter((b) => b.discussion_id !== book.discussion_id),
              books_count: Math.max(0, m.books_count - 1),
            }
          : m
      )
    )
    try {
      const res = await apiFetch(`/api/admin/discussions/${book.discussion_id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete book entry')
      showToast(`Removed "${book.title}" from Meetup #${selectedMeetupNumber}`)
      void loadData(true)
    } catch {
      showToast('Failed to remove book')
      void loadData(true)
    }
  }

  const handleDeleteMeetup = async () => {
    if (!currentMeetup) return
    const bookCount = currentMeetup.books.length
    const promptMessage =
      bookCount > 0
        ? `Delete Meetup #${currentMeetup.number} and its ${bookCount} linked book discussion${bookCount > 1 ? 's' : ''}?\n(A copy is kept in Deleted for 7 days.)`
        : `Delete Meetup #${currentMeetup.number}?`

    if (!confirm(promptMessage)) return

    const targetNum = currentMeetup.number
    const remaining = meetups.filter((m) => m.number !== targetNum)
    setMeetups(remaining)
    setSelectedMeetupNumber(remaining.length > 0 ? remaining[0].number : null)

    try {
      const res = await apiFetch(`/api/admin/meetups/${targetNum}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || 'Failed to delete meetup')
      }
      showToast(`Deleted Meetup #${targetNum} (can be restored for 7 days)`)
      void loadData(true)
    } catch (err: unknown) {
      showToast((err as Error).message || 'Failed to delete meetup')
      void loadData(true)
    }
  }

  const handleToggleGeneralDiscussion = async (book: BookItem) => {
    const nextState = !book.is_general_discussion
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
      const res = await apiFetch(`/api/admin/discussions/${book.discussion_id}/general`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_general_discussion: nextState }),
      })
      if (!res.ok) throw new Error('Failed to toggle')
      showToast(
        nextState
          ? `Moved "${book.title}" to General Discussion`
          : `Moved "${book.title}" to Regular Discussion`
      )
    } catch {
      showToast('Failed to update General Discussion status')
      void loadData()
    }
  }

  const handleOpenEditBook = (book: BookItem) => {
    setEditingBook(book)
    setEditMediaType((book.media_type as MediaTypeOption) || 'book')
    setEditBookTitle(book.title)
    setEditBookAuthor(book.author || '')
    setEditBookMember(book.member || '')
    setEditBookNotes(book.notes || '')
    setEditBookUrl(book.url || '')
    setEditBookMeta(null)
    setEditIsGeneralDiscussion(
      Boolean(book.is_general_discussion || (book.notes && book.notes.toLowerCase().includes('general')))
    )
  }

  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingBook || !editBookTitle.trim()) return
    try {
      const res = await apiFetch(`/api/admin/books/${editingBook.book_id}`, {
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
          rating: editBookMeta?.rating || undefined,
          goodreads_id: editBookMeta?.goodreads_id || undefined,
          is_general_discussion: editIsGeneralDiscussion,
          media_type: editMediaType,
          url: editBookUrl.trim() || editBookMeta?.url || undefined,
        }),
      })
      if (!res.ok) throw new Error('Failed to update item')
      showToast(`Updated "${editBookTitle}"`)
      setEditingBook(null)
      setEditBookMeta(null)
      void loadData(true)
    } catch {
      showToast('Failed to update item')
    }
  }

  const handleEnrichMeetup = async () => {
    if (!currentMeetup) return
    setIsEnrichingMeetup(true)
    showToast(`Querying Goodreads API for Meetup #${currentMeetup.number} books...`)
    try {
      const res = await apiFetch(`/api/admin/meetups/${currentMeetup.number}/enrich-goodreads`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Enrichment failed')
      const data = await res.json()
      showToast(data.message || `Enriched ${data.enriched_count} books from Goodreads!`)
      void loadData()
    } catch {
      showToast('Enrichment from Goodreads encountered an error')
    } finally {
      setIsEnrichingMeetup(false)
    }
  }

  const handleEnrichBook = async (book: BookItem) => {
    setEnrichingBookId(book.book_id)
    showToast(`Querying Goodreads for "${book.title}"...`)
    try {
      const res = await apiFetch(`/api/admin/books/${book.book_id}/enrich-goodreads`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Book enrichment failed')
      const data = await res.json()
      if (data.success) {
        showToast(`Matched "${data.matched_title || book.title}" on Goodreads!`)
        void loadData()
      } else {
        showToast(`No Goodreads match found for "${book.title}"`)
      }
    } catch {
      showToast(`Failed to enrich "${book.title}"`)
    } finally {
      setEnrichingBookId(null)
    }
  }

  const handleGeneratePdf = async (style: 'magazine' | 'classic' = 'magazine') => {
    if (!currentMeetup) return
    setIsGeneratingPdf(true)
    setGeneratingPdfStyle(style)
    const styleLabel = style === 'classic' ? 'Classic document' : 'Magazine zine'
    showToast(`Generating ${styleLabel} PDF for Meetup #${currentMeetup.number}...`)
    try {
      const res = await apiFetch(`/api/admin/meetups/${currentMeetup.number}/pdf?style=${style}`, {
        method: 'POST',
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.detail || errData.error?.message || 'Failed to generate PDF')
      }
      showToast(`Generated ${styleLabel} PDF for Meetup #${currentMeetup.number}!`)
      setIsPdfStyleModalOpen(false)
      await loadData()
    } catch (err: unknown) {
      showToast(`Failed to generate PDF: ${(err as Error).message || 'Error'}`)
    } finally {
      setIsGeneratingPdf(false)
      setGeneratingPdfStyle(null)
    }
  }

  const handleUploadPhoto = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentMeetup || !selectedPhotoFile) return
    setIsUploadingPhoto(true)
    showToast(`Uploading group photo for Meetup #${currentMeetup.number}...`)
    try {
      const res = await apiFetch(`/api/admin/meetups/${currentMeetup.number}/photo`, {
        method: 'POST',
        headers: { 'Content-Type': selectedPhotoFile.type || 'image/jpeg' },
        body: selectedPhotoFile,
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.detail || errData.error?.message || 'Failed to upload photo')
      }
      showToast(`Group photo uploaded for Meetup #${currentMeetup.number}!`)
      setSelectedPhotoFile(null)
      setPhotoPreviewUrl(null)
      setIsPhotoModalOpen(false)
      await loadData()
    } catch (err: unknown) {
      showToast(`Photo upload failed: ${(err as Error).message || 'Error'}`)
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  const handleRemovePhoto = async () => {
    if (!currentMeetup) return
    if (!confirm(`Remove the group photo for Meetup #${currentMeetup.number}?`)) return
    try {
      const res = await apiFetch(`/api/admin/meetups/${currentMeetup.number}/photo`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to remove photo')
      showToast(`Group photo removed for Meetup #${currentMeetup.number}`)
      setSelectedPhotoFile(null)
      setPhotoPreviewUrl(null)
      await loadData()
    } catch (err: unknown) {
      showToast(`Failed to remove photo: ${(err as Error).message || 'Error'}`)
    }
  }

  return (
    <ClubPage
      kind="crumb"
      crumbs={[{ href: '/', label: 'Home' }, { href: '/admin', label: 'Admin' }, { label: 'Manage DB' }]}
      bare
    >
      <div className="adm" style={{ maxWidth: 1220, margin: '0 auto', padding: '16px 20px 64px' }}>
        {toast && (
          <div className="undo" role="status" style={{ zIndex: 100 }}>
            <span>{toast}</span>
          </div>
        )}

        {me.state === 'loading' ? (
          <p className="body" style={{ marginTop: 24 }}>One moment...</p>
        ) : me.state !== 'admin' ? (
          <div style={{ maxWidth: 430, margin: '24px auto' }}>
            <AdminLoginGate />
          </div>
        ) : (
          <>
            {/* Editorial Header Bar */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                gap: 16,
                paddingBottom: 16,
                borderBottom: '2px solid #1a1a1a',
              }}
            >
              <div>
                <Link className="back" href="/admin">
                  <span aria-hidden="true">&lsaquo;</span>Admin Tools
                </Link>
                <h1 className="h1" style={{ marginTop: 4 }}>
                  Manage DB
                </h1>
                <p className="cap" style={{ marginTop: 4 }}>
                  Create &amp; edit meetups, add books with live Goodreads API autocomplete, manage group photos &amp; generate PDFs
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleSyncDatabase}
                  disabled={isSyncing}
                  style={{
                    padding: '8px 14px',
                    background: '#faf8f5',
                    border: '2px solid #1a1a1a',
                    fontFamily: 'var(--sans)',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#1a1a1a',
                    cursor: 'pointer',
                  }}
                >
                  {isSyncing ? 'Syncing...' : '↻ Sync DB'}
                </button>
                <Link
                  href="/admin/record"
                  style={{
                    padding: '8px 14px',
                    background: '#faf8f5',
                    border: '2px solid #1a1a1a',
                    fontFamily: 'var(--sans)',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#1a1a1a',
                    textDecoration: 'none',
                  }}
                >
                  Step-by-Step Recorder &rsaquo;
                </Link>
                <button
                  type="button"
                  onClick={handleOpenCreateMeetup}
                  style={{
                    padding: '8px 16px',
                    background: '#c93a14',
                    color: '#fff',
                    border: '2px solid #1a1a1a',
                    boxShadow: '2px 2px 0 #1a1a1a',
                    fontFamily: 'var(--sans)',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  + New Meetup
                </button>
              </div>
            </div>

            {/* Search & Stats Bar */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                padding: '14px 0',
                borderBottom: '1px solid #d4cfc9',
                marginBottom: 20,
              }}
            >
              <div style={{ flex: '1 1 280px', maxWidth: 420 }}>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search meetups (#), venues, book titles, authors, or readers..."
                  className="search"
                  style={{ height: 40 }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 24, fontSize: 13, color: '#555' }}>
                <div>
                  <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', display: 'block' }}>
                    Total Meetups
                  </span>
                  <b style={{ fontFamily: 'var(--serif)', fontSize: 18, color: '#1a1a1a' }}>{meetups.length}</b>
                </div>
                <div style={{ width: 1, height: 28, background: '#d4cfc9' }} />
                <div>
                  <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', display: 'block' }}>
                    Book Lookup
                  </span>
                  <b style={{ color: '#c93a14', fontWeight: 600 }}>Goodreads API · Live</b>
                </div>
              </div>
            </div>

            {loading ? (
              <p className="body" style={{ padding: '40px 0' }}>
                Loading archive records...
              </p>
            ) : (
              <div className="mdb-grid">
                {/* Left Column: All Meetups List */}
                <div className={`mdb-left${mobileDetailView ? ' mdb-hide-mobile' : ''}`}>
                  <div
                    style={{
                      padding: '12px 14px',
                      borderBottom: '2px solid #1a1a1a',
                      background: '#f2ede4',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          color: '#1a1a1a',
                          display: 'block',
                        }}
                      >
                        Meetups ({filteredMeetups.length})
                      </span>
                      <span style={{ fontSize: 11, color: '#64748b' }}>Select a meetup to inspect or edit</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenCreateMeetup}
                      style={{
                        padding: '5px 10px',
                        background: '#1a1a1a',
                        color: '#faf8f5',
                        border: 0,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      + New
                    </button>
                  </div>

                  <div style={{ flex: 1, overflowY: 'auto' }}>
                    {filteredMeetups.map((m) => {
                      const isSelected = m.number === selectedMeetupNumber
                      return (
                        <button
                          key={`meetup-${m.number}`}
                          type="button"
                          onClick={() => {
                            setSelectedMeetupNumber(m.number)
                            setMobileDetailView(true)
                          }}
                          style={{
                            all: 'unset',
                            boxSizing: 'border-box',
                            width: '100%',
                            padding: '12px 14px',
                            borderBottom: '1px solid #e2ddd5',
                            borderLeft: isSelected ? '4px solid #c93a14' : '4px solid transparent',
                            background: isSelected ? 'rgba(201, 58, 20, 0.08)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 10,
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                              <span style={{ fontFamily: 'var(--serif)', fontWeight: 700, fontSize: 16, color: '#1a1a1a' }}>
                                #{m.number}
                              </span>
                              <span style={{ fontSize: 12, color: '#64748b' }}>{m.date || 'No date'}</span>
                            </div>
                            <span
                              style={{
                                fontSize: 13,
                                color: '#444',
                                display: 'block',
                                marginTop: 2,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {m.venue || 'Bookworm'}
                            </span>
                          </div>

                          <span
                            style={{
                              padding: '2px 8px',
                              fontSize: 11,
                              fontWeight: 600,
                              background: isSelected ? '#c93a14' : '#ebe6dc',
                              color: isSelected ? '#fff' : '#1a1a1a',
                              flexShrink: 0,
                            }}
                          >
                            {m.books_count} {m.books_count === 1 ? 'book' : 'books'}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Right Column: Selected Meetup Books & Actions */}
                <div className={`mdb-right${mobileDetailView ? '' : ' mdb-hide-mobile'}`}>
                  {currentMeetup ? (
                    <>
                      {/* Meetup Header */}
                      <div
                        style={{
                          padding: '16px 18px',
                          borderBottom: '2px solid #1a1a1a',
                          background: '#f2ede4',
                          display: 'flex',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 14,
                        }}
                      >
                        <div>
                          <button
                            type="button"
                            className="mdb-mobile-back"
                            onClick={() => setMobileDetailView(false)}
                          >
                            &lsaquo; Back to All Meetups
                          </button>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <span
                              style={{
                                padding: '2px 8px',
                                background: '#1a1a1a',
                                color: '#faf8f5',
                                fontSize: 11,
                                fontWeight: 700,
                                letterSpacing: '0.05em',
                              }}
                            >
                              MEETUP #{currentMeetup.number}
                            </span>
                            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 700, margin: 0, color: '#1a1a1a' }}>
                              {currentMeetup.title || `BBB Meetup #${currentMeetup.number}`}
                            </h2>
                          </div>
                          <p style={{ fontSize: 13, color: '#555', margin: '6px 0 0', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            <span>
                              Date: <b style={{ color: '#1a1a1a' }}>{currentMeetup.date || 'Not set'}</b>
                            </span>
                            <span>&middot;</span>
                            <span>
                              Venue: <b style={{ color: '#1a1a1a' }}>{currentMeetup.venue || 'Bookworm'}</b>
                            </span>
                            <span>&middot;</span>
                            <span>
                              Books: <b style={{ color: '#c93a14' }}>{currentMeetup.books.length}</b>
                            </span>
                            {currentMeetup.photo_url && (
                              <>
                                <span>&middot;</span>
                                <span style={{ color: '#137333', fontWeight: 600 }}>✓ Photo Attached</span>
                              </>
                            )}
                            {currentMeetup.pdf_url && (
                              <>
                                <span>&middot;</span>
                                <span style={{ color: '#c93a14', fontWeight: 600 }}>✓ PDF Ready</span>
                              </>
                            )}
                          </p>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={handleEnrichMeetup}
                            disabled={isEnrichingMeetup}
                            style={{
                              padding: '6px 11px',
                              background: '#faf8f5',
                              border: '1.5px solid #1a1a1a',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                              color: '#1a1a1a',
                            }}
                            title="Fetch covers, ratings & metadata from Goodreads for all books in this meetup"
                          >
                            {isEnrichingMeetup ? 'Enriching...' : '⚡ Enrich All (Goodreads)'}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPhotoFile(null)
                              setPhotoPreviewUrl(currentMeetup.photo_url || null)
                              setIsPhotoModalOpen(true)
                            }}
                            style={{
                              padding: '6px 11px',
                              background: currentMeetup.photo_url ? '#e6f4ea' : '#faf8f5',
                              border: '1.5px solid #1a1a1a',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                              color: '#1a1a1a',
                            }}
                          >
                            {currentMeetup.photo_url ? 'Group Photo ✓' : 'Group Photo'}
                          </button>

                          <button
                            type="button"
                            onClick={() => setIsPdfStyleModalOpen(true)}
                            disabled={isGeneratingPdf}
                            style={{
                              padding: '6px 11px',
                              background: '#faf8f5',
                              border: '1.5px solid #1a1a1a',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                              color: '#1a1a1a',
                            }}
                          >
                            {isGeneratingPdf
                              ? `Making ${generatingPdfStyle === 'classic' ? 'Classic' : 'Magazine'} PDF...`
                              : currentMeetup.pdf_url
                              ? 'Re-gen PDF'
                              : 'Generate PDF'}
                          </button>

                          <a
                            href={`/api/admin/meetups/${currentMeetup.number}/pdf`}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              padding: '6px 11px',
                              background: '#1a1a1a',
                              color: '#faf8f5',
                              border: '1.5px solid #1a1a1a',
                              fontSize: 12,
                              fontWeight: 600,
                              textDecoration: 'none',
                            }}
                          >
                            PDF ↗
                          </a>

                          <button
                            type="button"
                            onClick={handleOpenEditMeetup}
                            style={{
                              padding: '6px 11px',
                              background: '#faf8f5',
                              border: '1.5px solid #1a1a1a',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                              color: '#1a1a1a',
                            }}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={handleDeleteMeetup}
                            style={{
                              padding: '6px 11px',
                              background: '#faf8f5',
                              border: '1.5px solid #8a1c1c',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                              color: '#8a1c1c',
                            }}
                          >
                            Delete
                          </button>

                          <button
                            type="button"
                            onClick={() => setIsAddBookOpen(true)}
                            style={{
                              padding: '6px 14px',
                              background: '#c93a14',
                              color: '#fff',
                              border: '1.5px solid #1a1a1a',
                              boxShadow: '2px 2px 0 #1a1a1a',
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            + Add Book
                          </button>
                        </div>
                      </div>

                      {/* Books Table */}
                      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
                        {currentMeetup.books.length === 0 ? (
                          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                            <p style={{ fontFamily: 'var(--serif)', fontSize: 18, color: '#555', marginBottom: 14 }}>
                              No books linked to Meetup #{currentMeetup.number} yet.
                            </p>
                            <button
                              type="button"
                              onClick={() => setIsAddBookOpen(true)}
                              style={{
                                padding: '10px 18px',
                                background: '#c93a14',
                                color: '#fff',
                                border: '2px solid #1a1a1a',
                                boxShadow: '3px 3px 0 #1a1a1a',
                                fontWeight: 600,
                                fontSize: 14,
                                cursor: 'pointer',
                              }}
                            >
                              + Add the first book (Goodreads API)
                            </button>
                          </div>
                        ) : (
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                              <tr
                                style={{
                                  borderBottom: '2px solid #1a1a1a',
                                  textAlign: 'left',
                                  fontSize: 11,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.05em',
                                  color: '#64748b',
                                }}
                              >
                                <th style={{ padding: '8px 6px' }}>#</th>
                                <th style={{ padding: '8px 6px' }}>Book / Media</th>
                                <th style={{ padding: '8px 6px' }}>Author / Creator</th>
                                <th style={{ padding: '8px 6px' }}>Discussed By</th>
                                <th style={{ padding: '8px 6px' }}>Type</th>
                                <th style={{ padding: '8px 6px', textAlign: 'right' }}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {currentMeetup.books.map((book, idx) => {
                                const isFirstGeneral =
                                  Boolean(book.is_general_discussion) &&
                                  (idx === 0 || !currentMeetup.books[idx - 1].is_general_discussion)
                                const generalCount = currentMeetup.books.filter((b) => b.is_general_discussion).length

                                return (
                                  <React.Fragment key={book.discussion_id}>
                                    {isFirstGeneral && (
                                      <tr style={{ background: '#f2ede4', borderTop: '1.5px solid #1a1a1a', borderBottom: '1px solid #d4cfc9' }}>
                                        <td
                                          colSpan={6}
                                          style={{
                                            padding: '8px 10px',
                                            fontSize: 11,
                                            fontWeight: 700,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.06em',
                                            color: '#1a1a1a',
                                          }}
                                        >
                                          General Discussion &amp; Tangents ({generalCount})
                                        </td>
                                      </tr>
                                    )}
                                    <tr style={{ borderBottom: '1px solid #e6e1d8' }}>
                                      <td style={{ padding: '10px 6px', color: '#64748b', width: 28 }}>{idx + 1}</td>
                                      <td style={{ padding: '10px 6px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                          {book.cover_url || book.thumbnail_url ? (
                                            /* eslint-disable-next-line @next/next/no-img-element */
                                            <img
                                              src={book.cover_url || book.thumbnail_url || ''}
                                              alt=""
                                              referrerPolicy="no-referrer"
                                              style={{
                                                width: 30,
                                                height: 44,
                                                objectFit: 'cover',
                                                border: '1px solid #1a1a1a',
                                                flexShrink: 0,
                                              }}
                                              loading="lazy"
                                            />
                                          ) : (
                                            <div
                                              style={{
                                                width: 30,
                                                height: 44,
                                                background: '#ede8df',
                                                border: '1px dashed #999',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: 10,
                                                color: '#666',
                                                flexShrink: 0,
                                              }}
                                            >
                                              Bk
                                            </div>
                                          )}
                                          <div style={{ minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                              <span style={{ fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 15, color: '#1a1a1a' }}>
                                                {book.title}
                                              </span>
                                              {book.media_type && book.media_type !== 'book' && (
                                                <span
                                                  style={{
                                                    fontSize: 10,
                                                    textTransform: 'uppercase',
                                                    padding: '1px 5px',
                                                    background: '#ede8df',
                                                    border: '1px solid #ccc',
                                                  }}
                                                >
                                                  {book.media_type}
                                                </span>
                                              )}
                                              {book.rating ? (
                                                <span style={{ fontSize: 11, color: '#c93a14', fontWeight: 700 }}>
                                                  ★ {Number(book.rating).toFixed(2)}
                                                </span>
                                              ) : null}
                                              {book.url && safeHttpUrl(book.url) && (
                                                <a
                                                  href={book.url}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  style={{ fontSize: 11, color: '#c93a14', textDecoration: 'underline' }}
                                                >
                                                  Link ↗
                                                </a>
                                              )}
                                            </div>
                                            {book.publication_year && (
                                              <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>
                                                Published {book.publication_year}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </td>
                                      <td style={{ padding: '10px 6px', color: '#444' }}>
                                        {book.author || <span style={{ color: '#999', fontStyle: 'italic' }}>Unknown</span>}
                                      </td>
                                      <td style={{ padding: '10px 6px' }}>
                                        {book.member ? (
                                          <button
                                            type="button"
                                            onClick={() => handleOpenEditBook(book)}
                                            style={{
                                              all: 'unset',
                                              cursor: 'pointer',
                                              display: 'flex',
                                              flexWrap: 'wrap',
                                              gap: 4,
                                            }}
                                            title="Click to edit discussants"
                                          >
                                            {book.member.split(',').map((mName, i) => (
                                              <span
                                                key={i}
                                                style={{
                                                  padding: '2px 7px',
                                                  background: '#f2ede4',
                                                  border: '1px solid #d4cfc9',
                                                  fontSize: 12,
                                                  color: '#1a1a1a',
                                                }}
                                              >
                                                {mName.trim()}
                                              </span>
                                            ))}
                                          </button>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => handleOpenEditBook(book)}
                                            style={{
                                              all: 'unset',
                                              cursor: 'pointer',
                                              fontSize: 12,
                                              color: '#64748b',
                                              borderBottom: '1px dashed #64748b',
                                            }}
                                          >
                                            + Add Discussant
                                          </button>
                                        )}
                                      </td>
                                      <td style={{ padding: '10px 6px' }}>
                                        <button
                                          type="button"
                                          onClick={() => handleToggleGeneralDiscussion(book)}
                                          style={{
                                            padding: '3px 8px',
                                            fontSize: 11,
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            background: book.is_general_discussion ? '#f2ede4' : 'transparent',
                                            border: '1px solid #1a1a1a',
                                            color: '#1a1a1a',
                                          }}
                                        >
                                          {book.is_general_discussion ? 'General' : 'Regular'}
                                        </button>
                                      </td>
                                      <td style={{ padding: '10px 6px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                        {!book.cover_url && (
                                          <button
                                            type="button"
                                            onClick={() => handleEnrichBook(book)}
                                            disabled={enrichingBookId === book.book_id}
                                            style={{
                                              padding: '4px 7px',
                                              marginRight: 4,
                                              background: 'transparent',
                                              border: '1px solid #d4cfc9',
                                              cursor: 'pointer',
                                              fontSize: 12,
                                            }}
                                            title="Quick-enrich from Goodreads"
                                          >
                                            {enrichingBookId === book.book_id ? '...' : '⚡'}
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => handleOpenEditBook(book)}
                                          style={{
                                            padding: '4px 8px',
                                            marginRight: 4,
                                            background: 'transparent',
                                            border: '1px solid #1a1a1a',
                                            cursor: 'pointer',
                                            fontSize: 12,
                                            fontWeight: 600,
                                          }}
                                        >
                                          Edit
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteBook(book)}
                                          style={{
                                            padding: '4px 8px',
                                            background: 'transparent',
                                            border: '1px solid #8a1c1c',
                                            color: '#8a1c1c',
                                            cursor: 'pointer',
                                            fontSize: 12,
                                            fontWeight: 600,
                                          }}
                                        >
                                          Remove
                                        </button>
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
                    <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                      Select a meetup from the left panel to inspect and edit.
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* MODAL: Create New Meetup */}
        {isCreateMeetupOpen && (
          <div className="mdb-modal-backdrop" onClick={() => !isCreatingMeetup && setIsCreateMeetupOpen(false)}>
            <div className="mdb-modal" onClick={(e) => e.stopPropagation()}>
              <h3 className="h2" style={{ margin: 0 }}>Create New Meetup</h3>
              <p className="cap" style={{ marginTop: 4, marginBottom: 16 }}>
                Add a new meetup session to the BBB Archive database.
              </p>
              <form onSubmit={handleCreateMeetup}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <label className="al" style={{ marginTop: 0 }}>
                    Meetup Number *
                    <input
                      type="number"
                      min={1}
                      className="field2"
                      value={createNumber}
                      onChange={(e) => {
                        const num = parseInt(e.target.value, 10) || 0
                        setCreateNumber(num)
                        if (!createTitle || createTitle === `BBB Meetup #${createNumber}`) {
                          setCreateTitle(`BBB Meetup #${num}`)
                        }
                      }}
                      required
                    />
                  </label>
                  <label className="al" style={{ marginTop: 0 }}>
                    Format
                    <select
                      className="field2"
                      value={createFormat}
                      onChange={(e) => setCreateFormat(e.target.value)}
                    >
                      <option value="IN_PERSON">In-person</option>
                      <option value="ONLINE">Online</option>
                      <option value="HYBRID">Hybrid</option>
                    </select>
                  </label>
                </div>

                <label className="al">
                  Meetup Title *
                  <input
                    type="text"
                    className="field2"
                    value={createTitle}
                    onChange={(e) => setCreateTitle(e.target.value)}
                    required
                  />
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <label className="al">
                    Date
                    <input
                      type="date"
                      className="field2"
                      value={createDate}
                      onChange={(e) => setCreateDate(e.target.value)}
                    />
                  </label>
                  <label className="al">
                    Venue
                    <input
                      type="text"
                      className="field2"
                      value={createVenue}
                      onChange={(e) => setCreateVenue(e.target.value)}
                      placeholder="e.g. Bookworm, Cubbon Park"
                    />
                  </label>
                </div>

                <label className="al">
                  Description (optional)
                  <input
                    type="text"
                    className="field2"
                    value={createDescription}
                    onChange={(e) => setCreateDescription(e.target.value)}
                    placeholder="Optional theme or notes..."
                  />
                </label>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                  <button
                    type="button"
                    className="x"
                    onClick={() => setIsCreateMeetupOpen(false)}
                    style={{ padding: '10px 16px', border: '1.5px solid #1a1a1a', background: 'transparent', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn" disabled={isCreatingMeetup} style={{ width: 'auto', padding: '0 20px' }}>
                    <span>{isCreatingMeetup ? 'Creating...' : 'Create Meetup'}</span>
                    <span aria-hidden="true">&rsaquo;</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Edit Meetup */}
        {isEditMeetupOpen && currentMeetup && (
          <div className="mdb-modal-backdrop" onClick={() => setIsEditMeetupOpen(false)}>
            <div className="mdb-modal" onClick={(e) => e.stopPropagation()}>
              <h3 className="h2" style={{ margin: 0 }}>Edit Meetup #{currentMeetup.number}</h3>
              <p className="cap" style={{ marginTop: 4, marginBottom: 16 }}>
                Update date, venue, or title.
              </p>
              <form onSubmit={handleSaveMeetup}>
                <label className="al" style={{ marginTop: 0 }}>
                  Meetup Title
                  <input
                    type="text"
                    className="field2"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    required
                  />
                </label>
                <label className="al">
                  Date (YYYY-MM-DD)
                  <input
                    type="date"
                    className="field2"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                  />
                </label>
                <label className="al">
                  Venue
                  <input
                    type="text"
                    className="field2"
                    value={editVenue}
                    onChange={(e) => setEditVenue(e.target.value)}
                  />
                </label>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                  <button
                    type="button"
                    onClick={() => setIsEditMeetupOpen(false)}
                    style={{ padding: '10px 16px', border: '1.5px solid #1a1a1a', background: 'transparent', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn" style={{ width: 'auto', padding: '0 20px' }}>
                    <span>Save Changes</span>
                    <span aria-hidden="true">&rsaquo;</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Add Book / Media to Meetup (Connected to Goodreads API) */}
        {isAddBookOpen && currentMeetup && (
          <div className="mdb-modal-backdrop" onClick={() => setIsAddBookOpen(false)}>
            <div className="mdb-modal mdb-modal-lg" onClick={(e) => e.stopPropagation()}>
              <h3 className="h2" style={{ margin: 0 }}>Add Book / Media to Meetup #{currentMeetup.number}</h3>
              <p className="cap" style={{ marginTop: 4, marginBottom: 16 }}>
                Connected to Goodreads API &amp; BBB Archive — start typing a title to search covers, ratings, and authors.
              </p>
              <form onSubmit={handleAddBook}>
                <div style={{ marginBottom: 14 }}>
                  <label className="al" style={{ marginTop: 0, marginBottom: 6 }}>
                    Title (Goodreads &amp; Multi-Source Autocomplete) *
                  </label>
                  <BookAutocompleteInput
                    value={newBookTitle}
                    onChange={setNewBookTitle}
                    onSelectBook={handleSelectAddBook}
                    mediaType={newMediaType}
                    onMediaTypeChange={setNewMediaType}
                    required
                    autoFocus
                  />
                </div>

                {newBookMeta && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 10,
                      background: '#f2ede4',
                      border: '1.5px solid #1a1a1a',
                      marginBottom: 14,
                    }}
                  >
                    {(newBookMeta.thumbnail_url || newBookMeta.cover_url) && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={newBookMeta.thumbnail_url || newBookMeta.cover_url || ''}
                        alt=""
                        referrerPolicy="no-referrer"
                        style={{ width: 34, height: 48, objectFit: 'cover', border: '1px solid #1a1a1a' }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--serif)', fontWeight: 700, fontSize: 14 }}>{newBookMeta.title}</div>
                      <div style={{ fontSize: 12, color: '#555' }}>
                        {newBookMeta.author ? `by ${newBookMeta.author}` : ''}
                        {newBookMeta.rating ? ` · ★ ${Number(newBookMeta.rating).toFixed(2)}` : ''}
                        {newBookMeta.publication_year ? ` · ${newBookMeta.publication_year}` : ''}
                        {newBookMeta.source_label ? ` · [${newBookMeta.source_label}]` : ''}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNewBookMeta(null)}
                      style={{ all: 'unset', cursor: 'pointer', fontSize: 14, padding: 4 }}
                    >
                      ✕
                    </button>
                  </div>
                )}

                {existingDuplicateBook && (
                  <div
                    style={{
                      padding: 12,
                      background: 'rgba(201, 58, 20, 0.09)',
                      borderLeft: '3px solid #c93a14',
                      marginBottom: 14,
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 13 }}>
                      &ldquo;{existingDuplicateBook.title}&rdquo; is already in Meetup #{currentMeetup.number}!
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddBookOpen(false)
                        handleOpenEditBook(existingDuplicateBook)
                      }}
                      className="lnk"
                      style={{ minHeight: 32, fontSize: 13 }}
                    >
                      Edit Existing Item &amp; Add Reader &rsaquo;
                    </button>
                  </div>
                )}

                <label className="al">
                  Author / Creator
                  <input
                    type="text"
                    className="field2"
                    value={newBookAuthor}
                    onChange={(e) => setNewBookAuthor(e.target.value)}
                    placeholder="e.g. Frank Herbert, Stephen King"
                  />
                </label>

                <div style={{ marginTop: 14 }}>
                  <label className="al" style={{ marginBottom: 6 }}>
                    Discussed By (Club Readers)
                  </label>
                  <MemberAutocompleteInput
                    value={newBookMember}
                    onChange={setNewBookMember}
                    bookId={newBookMeta?.id || existingDuplicateBook?.book_id || undefined}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <label className="al">
                    Discussion Notes / Tangent Context
                    <input
                      type="text"
                      className="field2"
                      value={newBookNotes}
                      onChange={(e) => setNewBookNotes(e.target.value)}
                      placeholder="Optional notes..."
                    />
                  </label>
                  <label className="al">
                    External Link (optional)
                    <input
                      type="text"
                      className="field2"
                      value={newBookUrl}
                      onChange={(e) => setNewBookUrl(e.target.value)}
                      placeholder="https://..."
                    />
                  </label>
                </div>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginTop: 16,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={newIsGeneralDiscussion}
                    onChange={(e) => setNewIsGeneralDiscussion(e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: '#c93a14' }}
                  />
                  <span>Mark as General Discussion / Tangent (grouped at bottom of meetup)</span>
                </label>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                  <button
                    type="button"
                    onClick={() => setIsAddBookOpen(false)}
                    style={{ padding: '10px 16px', border: '1.5px solid #1a1a1a', background: 'transparent', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn"
                    disabled={Boolean(existingDuplicateBook)}
                    style={{ width: 'auto', padding: '0 20px' }}
                  >
                    <span>Add to Meetup</span>
                    <span aria-hidden="true">&rsaquo;</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Edit Existing Book / Media */}
        {editingBook && (
          <div className="mdb-modal-backdrop" onClick={() => setEditingBook(null)}>
            <div className="mdb-modal mdb-modal-lg" onClick={(e) => e.stopPropagation()}>
              <h3 className="h2" style={{ margin: 0 }}>Edit Discussion Item</h3>
              <p className="cap" style={{ marginTop: 4, marginBottom: 16 }}>
                Update title, Goodreads metadata, author, readers, or discussion notes.
              </p>
              <form onSubmit={handleSaveBook}>
                <div style={{ marginBottom: 14 }}>
                  <label className="al" style={{ marginTop: 0, marginBottom: 6 }}>
                    Title (Goodreads &amp; Archive Search) *
                  </label>
                  <BookAutocompleteInput
                    value={editBookTitle}
                    onChange={setEditBookTitle}
                    onSelectBook={handleSelectEditBook}
                    mediaType={editMediaType}
                    onMediaTypeChange={setEditMediaType}
                    required
                  />
                </div>

                <label className="al">
                  Author / Creator
                  <input
                    type="text"
                    className="field2"
                    value={editBookAuthor}
                    onChange={(e) => setEditBookAuthor(e.target.value)}
                  />
                </label>

                <div style={{ marginTop: 14 }}>
                  <label className="al" style={{ marginBottom: 6 }}>
                    Discussed By (Club Readers)
                  </label>
                  <MemberAutocompleteInput
                    value={editBookMember}
                    onChange={setEditBookMember}
                    bookId={editBookMeta?.id || editingBook.book_id || undefined}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <label className="al">
                    Discussion Notes
                    <input
                      type="text"
                      className="field2"
                      value={editBookNotes}
                      onChange={(e) => setEditBookNotes(e.target.value)}
                    />
                  </label>
                  <label className="al">
                    External Link
                    <input
                      type="text"
                      className="field2"
                      value={editBookUrl}
                      onChange={(e) => setEditBookUrl(e.target.value)}
                    />
                  </label>
                </div>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginTop: 16,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={editIsGeneralDiscussion}
                    onChange={(e) => setEditIsGeneralDiscussion(e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: '#c93a14' }}
                  />
                  <span>General Discussion / Tangent</span>
                </label>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                  <button
                    type="button"
                    onClick={() => setEditingBook(null)}
                    style={{ padding: '10px 16px', border: '1.5px solid #1a1a1a', background: 'transparent', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn" style={{ width: 'auto', padding: '0 20px' }}>
                    <span>Save Changes</span>
                    <span aria-hidden="true">&rsaquo;</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Group Photo */}
        {isPhotoModalOpen && currentMeetup && (
          <div className="mdb-modal-backdrop" onClick={() => setIsPhotoModalOpen(false)}>
            <div className="mdb-modal" onClick={(e) => e.stopPropagation()}>
              <h3 className="h2" style={{ margin: 0 }}>Group Photo · Meetup #{currentMeetup.number}</h3>
              <p className="cap" style={{ marginTop: 4, marginBottom: 14 }}>
                JPG, PNG or WebP up to 4.5 MB. Featured on the meetup page and in the Magazine PDF.
              </p>
              <form onSubmit={handleUploadPhoto}>
                {photoPreviewUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={safeImageUrl(photoPreviewUrl)}
                    alt={`Meetup #${currentMeetup.number}`}
                    className="aph"
                    style={{ marginBottom: 14 }}
                  />
                )}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setSelectedPhotoFile(file)
                      setPhotoPreviewUrl(URL.createObjectURL(file))
                    }
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 24 }}>
                  {currentMeetup.photo_url ? (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      style={{ padding: '10px 14px', border: '1.5px solid #8a1c1c', color: '#8a1c1c', background: 'transparent', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Remove Photo
                    </button>
                  ) : <span />}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => setIsPhotoModalOpen(false)}
                      style={{ padding: '10px 16px', border: '1.5px solid #1a1a1a', background: 'transparent', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn"
                      disabled={!selectedPhotoFile || isUploadingPhoto}
                      style={{ width: 'auto', padding: '0 20px' }}
                    >
                      <span>{isUploadingPhoto ? 'Uploading...' : 'Upload Photo'}</span>
                      <span aria-hidden="true">&rsaquo;</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Generate PDF */}
        {isPdfStyleModalOpen && currentMeetup && (
          <div className="mdb-modal-backdrop" onClick={() => !isGeneratingPdf && setIsPdfStyleModalOpen(false)}>
            <div className="mdb-modal" onClick={(e) => e.stopPropagation()}>
              <h3 className="h2" style={{ margin: 0 }}>Generate PDF · Meetup #{currentMeetup.number}</h3>
              <p className="cap" style={{ marginTop: 4, marginBottom: 16 }}>
                Choose a layout style for Meetup #{currentMeetup.number}&rsquo;s books PDF:
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ padding: 14, border: '2px solid #1a1a1a', background: '#faf8f5', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <b style={{ fontFamily: 'var(--serif)', fontSize: 16, display: 'block' }}>Magazine Zine</b>
                    <p style={{ fontSize: 12, color: '#555', marginTop: 4 }}>
                      Designed zine layout with book covers, author spotlight, and polaroid group photo.
                    </p>
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <button
                      type="button"
                      disabled={isGeneratingPdf}
                      onClick={() => handleGeneratePdf('magazine')}
                      className="btn"
                      style={{ minHeight: 40, fontSize: 13 }}
                    >
                      <span>{generatingPdfStyle === 'magazine' ? 'Generating...' : 'Make Magazine PDF'}</span>
                      <span aria-hidden="true">&rsaquo;</span>
                    </button>
                    <a
                      href={`/api/admin/meetups/${currentMeetup.number}/pdf?style=magazine`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: 12, color: '#c93a14', textAlign: 'center', fontWeight: 600 }}
                    >
                      Open Magazine PDF ↗
                    </a>
                  </div>
                </div>

                <div style={{ padding: 14, border: '2px solid #1a1a1a', background: '#faf8f5', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <b style={{ fontFamily: 'var(--serif)', fontSize: 16, display: 'block' }}>Classic Document</b>
                    <p style={{ fontSize: 12, color: '#555', marginTop: 4 }}>
                      Clean A4 tabular archive layout with reader assignments and summary.
                    </p>
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <button
                      type="button"
                      disabled={isGeneratingPdf}
                      onClick={() => handleGeneratePdf('classic')}
                      style={{
                        minHeight: 40,
                        background: '#1a1a1a',
                        color: '#faf8f5',
                        border: '2px solid #1a1a1a',
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: 'pointer',
                      }}
                    >
                      {generatingPdfStyle === 'classic' ? 'Generating...' : 'Make Classic PDF ›'}
                    </button>
                    <a
                      href={`/api/admin/meetups/${currentMeetup.number}/pdf?style=classic`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: 12, color: '#1a1a1a', textAlign: 'center', fontWeight: 600 }}
                    >
                      Open Classic PDF ↗
                    </a>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                <button
                  type="button"
                  disabled={isGeneratingPdf}
                  onClick={() => setIsPdfStyleModalOpen(false)}
                  style={{ padding: '8px 16px', border: '1.5px solid #1a1a1a', background: 'transparent', cursor: 'pointer', fontWeight: 600 }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ClubPage>
  )
}
