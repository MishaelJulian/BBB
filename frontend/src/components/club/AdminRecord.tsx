'use client'

import * as React from 'react'
import Link from 'next/link'
import { AdminPage, api, fmt, useApi } from './AdminKit'
import { clearDraft, emptyDraft, hasDraft, loadDraft, saveDraft, type Draft, type DraftBook, type DraftReader } from '@/lib/admin/draft'
import { useMe } from './useMe'

interface Member { id: string; name: string; code: string | null; status: string; meetups: number }
interface Overview { next_number: number; venues: string[] }
interface Look { found: { isbn?: string; year?: number; author?: string }; sources: { source: string; result: string }[]; failed: boolean }

const blank = (): DraftBook => ({ title: '', author: '', translator: '', showTr: false, isbn: '', year: '', edit: false, src: '', looked: '' })
const nb = (r: DraftReader) => r.books.filter((b) => b.title.trim()).length
const STATUS: Record<string, string> = { member: 'Member', byob: 'BYOB', guest: 'Guest' }

// the mascot from the mockup, in pixels
const MASCOT = ['......XX....', '.....XXXX...', '....XXXXXX..', '...XXXXXXXX.', '...XOXXXXOX.', '...XXXXXXXX.', '...XXXXXXXX.', '....XXXXXX..', '..AAAAAAAAA.', '..ABBBBBBBA.', '..ABBBBBBBA.', '..AAAAAAAAA.']
const FILL: Record<string, string> = { X: '#12295a', O: '#faf8f5', A: '#c93a14', B: '#faf8f5' }
function Mascot() {
  return (
    <svg viewBox="0 0 12 12" shapeRendering="crispEdges" aria-hidden="true">
      {MASCOT.flatMap((row, y) => [...row].map((c, x) => (c === '.' ? null : <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={FILL[c]} />)))}
    </svg>
  )
}

export function AdminRecord() {
  const me = useMe()
  const ok = me.state === 'admin'
  const ov = useApi<Overview>(ok ? '/api/admin/overview' : null)
  const mem = useApi<{ members: { id: string; name: string; code: string | null; status: string; meetups: number }[] }>(ok ? '/api/admin/members' : null)
  const members: Member[] = mem.data?.members ?? []

  const [D, setD] = React.useState<Draft | null>(null)
  const [step, setStep] = React.useState('1')
  const [who, setWho] = React.useState<number | null>(null)
  const [done, setDone] = React.useState<{ number: number; readers: number; books: number; made: number; date: string; venue: string } | null>(null)
  const [err, setErr] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [flash, setFlash] = React.useState('')

  // load the draft and the step from the address
  React.useEffect(() => {
    const d = loadDraft() ?? emptyDraft()
    const q = new URLSearchParams(window.location.search)
    let s = q.get('s') ?? (hasDraft(d) ? d.step : '1')
    const w = q.get('w')
    if (s !== '1' && !hasDraft(d)) s = '1'
    setD(d)
    setStep(s)
    setWho(w !== null && w !== '' ? Number(w) : d.who)
    const onPop = () => {
      const p = new URLSearchParams(window.location.search)
      setStep(p.get('s') ?? '1')
      setWho(p.get('w') ? Number(p.get('w')) : null)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const update = (fn: (d: Draft) => void) => {
    setD((p) => {
      if (!p) return p
      const d = structuredClone(p)
      fn(d)
      saveDraft(d)
      return d
    })
  }
  const go = (s: string, w: number | null = null) => {
    update((d) => { d.step = s; d.who = w })
    setStep(s)
    setWho(w)
    window.history.pushState({}, '', `/admin/record?s=${s}${w !== null ? `&w=${w}` : ''}`)
    window.scrollTo(0, 0)
  }

  if (!D) return <AdminPage crumbs={[{ href: '/admin', label: 'Admin' }, { label: 'Record' }]}><p className="body">One moment...</p></AdminPage>
  const venueName = D.venue === '__o' ? D.venueOther.trim() : D.venue

  const save = async () => {
    setBusy(true)
    setErr(null)
    try {
      const clean = D.readers.map((r) => ({ id: r.id, name: r.name, books: r.books.filter((b) => b.title.trim()).map((b) => ({ title: b.title, author: b.author, translator: b.translator, isbn: b.isbn, year: b.year })) }))
      const r = await api<{ number: number; readers: number; books: number; made_members: number }>('/api/admin/meetups/record', {
        json: { date: D.date, venue: venueName, presenter: D.presenter, readers: clean, make: Object.keys(D.make).filter((k) => D.make[k]) },
      })
      setDone({ number: r.number, readers: r.readers, books: r.books, made: r.made_members, date: D.date, venue: venueName })
      clearDraft()
      window.history.pushState({}, '', '/admin/record?s=done')
      setStep('done')
      window.scrollTo(0, 0)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AdminPage crumbs={[{ href: '/admin', label: 'Admin' }, { label: 'Record' }]}>
      {step === '1' && <Step1 D={D} update={update} next={ov.data?.next_number} venues={ov.data?.venues ?? []} onNext={() => go('2')} />}
      {step === '2' && <Step2 D={D} update={update} members={members} flash={flash} clearFlash={() => setFlash('')} onNext={(i) => go('3', i)} onBack={() => go('1')} />}
      {step === '3' && <Step3 D={D} update={update} who={who} onRegister={() => go('r')} onAnother={(msg) => { setFlash(msg); go('2') }} onBack={() => go('2')} />}
      {step === 'r' && (
        <Review D={D} update={update} venue={venueName} next={ov.data?.next_number} err={err} busy={busy} onChange={go} onSave={save}
          onDraft={() => { try { sessionStorage.setItem('bbb_flash', 'Draft saved on this phone.') } catch { /* ignore */ } window.location.href = '/admin' }} onBack={() => go('2')} />
      )}
      {step === 'done' && done && (
        <>
          <p className="step">Done</p>
          <h1 className="h1">Meetup #{done.number} registered</h1>
          <p className="body" style={{ marginTop: 12 }}>{fmt(done.date)}{done.venue ? ` · ${done.venue}` : ''}<br />{done.readers} readers, {done.books} books{done.made ? `, ${done.made} made members` : ''}.</p>
          <p className="note">Saved. You can undo this from All changes for 7 days.</p>
          <div className="nav2">
            <Link className="btn" href="/admin"><span>Back to Admin</span><span aria-hidden="true">&rsaquo;</span></Link>
            <a className="lnk" href="/admin/record" onClick={(e) => { e.preventDefault(); const d = emptyDraft(); saveDraft(d); setD(d); setDone(null); setStep('1'); setWho(null); window.history.pushState({}, '', '/admin/record') }}>Record another</a>
          </div>
        </>
      )}
      {step === 'done' && !done && <p className="body">Nothing to show. <Link className="link" href="/admin">Back to Admin</Link></p>}
    </AdminPage>
  )
}

type Upd = (fn: (d: Draft) => void) => void

function Step1({ D, update, next, venues, onNext }: { D: Draft; update: Upd; next?: number; venues: string[]; onNext: () => void }) {
  const ok = !!D.date && !!D.venue && (D.venue !== '__o' || !!D.venueOther.trim())
  const n = D.presenter.length
  return (
    <>
      <p className="step">1 of 3 &middot; The meet</p>
      <h1 className="h1">Record a meetup</h1>
      <p className="note">Meetup #{next ?? ''} (the next number)</p>
      <label className="f"><span>Date</span><input type="date" id="date" value={D.date} max="2099-12-31" onChange={(e) => update((d) => { d.date = e.target.value })} /></label>
      <label className="f"><span>Venue</span>
        <select id="venue" value={D.venue} onChange={(e) => update((d) => { d.venue = e.target.value })}>
          <option value="">Choose a venue</option>
          {venues.map((v) => <option key={v} value={v}>{v}</option>)}
          <option value="__o">Another</option>
        </select>
      </label>
      <label className="f" hidden={D.venue !== '__o'}><span>Name of the other venue</span><input id="venueOther" maxLength={80} value={D.venueOther} onChange={(e) => update((d) => { d.venueOther = e.target.value })} /></label>
      <label className="f"><span>Presented by</span><input id="presenter" maxLength={60} autoComplete="off" value={D.presenter} onChange={(e) => update((d) => { d.presenter = e.target.value })} /></label>
      <div className="cnt">{n >= 45 ? `${n}/60` : ''}</div>
      <p className="note">Your draft is saved on this phone.</p>
      <div className="nav2">
        <button type="button" className="btn" id="next1" aria-disabled={!ok} onClick={() => ok && onNext()}><span>Next</span><span aria-hidden="true">&rsaquo;</span></button>
        <Link className="lnk" href="/admin">&lsaquo; Admin</Link>
      </div>
    </>
  )
}

interface Sel { id: string | null; name: string; code: string | null; status: string; m: number; isNew: boolean }

function Step2({ D, update, members, flash, clearFlash, onNext, onBack }: { D: Draft; update: Upd; members: Member[]; flash: string; clearFlash: () => void; onNext: (i: number) => void; onBack: () => void }) {
  const [q, setQ] = React.useState('')
  const [open, setOpen] = React.useState(false)
  const [sel, setSel] = React.useState<Sel | null>(null)
  const t = q.trim().toLowerCase()
  const list = t.length < 1 ? [] : members.filter((x) => x.name.toLowerCase().includes(t) || (x.code ?? '').toLowerCase().startsWith(t)).sort((a, b) => Number(b.name.toLowerCase().startsWith(t)) - Number(a.name.toLowerCase().startsWith(t)) || b.meetups - a.meetups).slice(0, 8)
  const exact = members.some((x) => x.name.toLowerCase() === t)
  const added = (x: { id: string | null; name: string }) => D.readers.some((r) => (x.id && r.id === x.id) || (!x.id && r.name.toLowerCase() === x.name.toLowerCase()))
  const note = sel && !sel.isNew && sel.status !== 'member' && sel.m >= 1 ? `This would be ${sel.name}'s meetup number ${sel.m + 1}. You can make them a member on the last screen.` : ''
  const proceed = () => {
    if (!sel) return
    const existing = D.readers.findIndex((r) => (sel.id && r.id === sel.id) || (!sel.id && r.name.toLowerCase() === sel.name.toLowerCase()))
    const target = existing >= 0 ? existing : D.readers.length
    update((d) => {
      if (existing < 0) d.readers.push({ id: sel.id, name: sel.name, code: sel.code, status: sel.status, m: sel.m, isNew: sel.isNew, books: [blank()] })
      else if (!d.readers[existing].books.length) d.readers[existing].books = [blank()]
    })
    onNext(target)
  }
  return (
    <>
      <p className="step">2 of 3 &middot; Add a reader</p>
      <h1 className="h1">Add a reader</h1>
      <p className="flash" aria-live="polite">{flash}</p>
      <label className="f"><span>Name or member code</span>
        <input id="q" autoComplete="off" inputMode="search" placeholder="Start typing" value={q}
          onChange={(e) => { setQ(e.target.value); setSel(null); setOpen(true); clearFlash() }} onFocus={() => setOpen(true)} />
      </label>
      <div className="res" hidden={!open}>
        {list.map((x) => (
          <button key={x.id} type="button" aria-pressed={sel?.id === x.id} onPointerDown={(e) => e.preventDefault()}
            onClick={() => { setSel({ id: x.id, name: x.name, code: x.code, status: x.status, m: x.meetups, isNew: false }); setQ(x.name); setOpen(false); (document.activeElement as HTMLElement | null)?.blur() }}>
            <span>{x.name}{added(x) ? <span className="s"> &middot; added</span> : null}</span>
            <span className="s">{STATUS[x.status] ?? x.status} &middot; {x.meetups} meetup{x.meetups === 1 ? '' : 's'}</span>
          </button>
        ))}
        {t.length >= 2 && !exact && (
          <button type="button" aria-pressed={!!sel?.isNew} onPointerDown={(e) => e.preventDefault()}
            onClick={() => { setSel({ id: null, name: q.trim(), code: null, status: 'new', m: 0, isNew: true }); setOpen(false); (document.activeElement as HTMLElement | null)?.blur() }}>
            <span>Add &ldquo;{q.trim()}&rdquo; as a new person</span><span className="s">new</span>
          </button>
        )}
      </div>
      <p className="note">{note}</p>
      <div className="nav2">
        <button type="button" className="btn" id="next2" aria-disabled={!sel} onClick={proceed}><span>Next</span><span aria-hidden="true">&rsaquo;</span></button>
        <button type="button" className="lnk" onClick={onBack}>&lsaquo; Back</button>
      </div>
    </>
  )
}

function Step3({ D, update, who, onRegister, onAnother, onBack }: { D: Draft; update: Upd; who: number | null; onRegister: () => void; onAnother: (msg: string) => void; onBack: () => void }) {
  const idx = who ?? D.readers.length - 1
  const r = D.readers[idx]
  const [looking, setLooking] = React.useState<number | null>(null)
  if (!r) return <p className="body">Pick a reader first. <button className="lnk" type="button" onClick={onBack}>Back</button></p>
  const setBook = (i: number, patch: Partial<DraftBook>) => update((d) => { Object.assign(d.readers[idx].books[i], patch) })
  const finish = () => update((d) => { d.readers[idx].books = d.readers[idx].books.filter((b) => b.title.trim()) })
  const look = async (i: number) => {
    const b = r.books[i]
    const title = b.title.trim()
    if (title.length < 3 || b.looked === title) return
    setBook(i, { looked: title, src: 'wait' })
    setLooking(i)
    try {
      const res = await api<Look>('/api/admin/books/lookup', { json: { title, author: b.author } })
      const sources = res.sources.filter((s) => s.result.startsWith('found')).map((s) => s.source)
      update((d) => {
        const x = d.readers[idx].books[i]
        if (!x.author && res.found.author) x.author = res.found.author
        if (!x.isbn && res.found.isbn) x.isbn = res.found.isbn
        if (!x.year && res.found.year) x.year = String(res.found.year)
        x.src = sources.length ? 'ok' : 'bad'
        x.srcText = sources.length ? `Filled from ${sources.join(' and ')}.${x.isbn ? '' : ' No ISBN found: add it yourself if you have it.'}` : 'Not found. Type it by hand.'
      })
    } catch {
      setBook(i, { src: 'bad', srcText: 'The look-up did not answer. Type it by hand.' })
    } finally {
      setLooking(null)
    }
  }
  return (
    <>
      <p className="step">3 of 3 &middot; Books</p>
      <h1 className="h1">{r.name}&rsquo;s books</h1>
      <div>
        {r.books.map((b, i) => (
          <div className="abk" key={i}>
            <label className="f"><span>Title</span><input value={b.title} autoComplete="off" onChange={(e) => setBook(i, { title: e.target.value })} onBlur={() => look(i)} /></label>
            <label className="f"><span>Author</span><input value={b.author} autoComplete="off" onChange={(e) => setBook(i, { author: e.target.value })} /></label>
            {b.showTr
              ? <label className="f"><span>Translator</span><input value={b.translator} autoComplete="off" onChange={(e) => setBook(i, { translator: e.target.value })} /></label>
              : <button type="button" className="lnk" onClick={() => setBook(i, { showTr: true })}>+ Translator</button>}
            <p className={`src${b.src === 'bad' ? ' bad' : ''}`} aria-live="polite">{looking === i ? 'Looking up...' : b.srcText ?? ''}</p>
            {b.edit ? (
              <>
                <label className="f"><span>ISBN</span><input value={b.isbn} inputMode="numeric" onChange={(e) => setBook(i, { isbn: e.target.value })} /></label>
                <label className="f"><span>Year published</span><input value={b.year} inputMode="numeric" maxLength={4} onChange={(e) => setBook(i, { year: e.target.value })} /></label>
              </>
            ) : (b.isbn || b.year) ? (
              <p className="note" style={{ marginTop: 6 }}>{[b.isbn && `ISBN ${b.isbn}`, b.year].filter(Boolean).join(' · ')} &nbsp;<button type="button" className="lnk" onClick={() => setBook(i, { edit: true })}>Edit</button></p>
            ) : <button type="button" className="lnk" onClick={() => setBook(i, { edit: true })}>+ ISBN and year</button>}
            {r.books.length > 1 && <button type="button" className="lnk" onClick={() => update((d) => { d.readers[idx].books.splice(i, 1) })}>Remove this book</button>}
          </div>
        ))}
      </div>
      <button type="button" className="lnk" onClick={() => update((d) => { d.readers[idx].books.push(blank()) })}>+ Add another book</button>
      <div className="nav2">
        <button type="button" className="btn" onClick={() => { finish(); onRegister() }}><span>Register meetup</span><span aria-hidden="true">&rsaquo;</span></button>
        <button type="button" className="lnk" onClick={() => { finish(); const n = nb({ ...r, books: r.books }); onAnother(`Added ${r.name}: ${n} book${n === 1 ? '' : 's'}.`) }}>Add another reader</button>
        <button type="button" className="lnk" onClick={() => { finish(); onBack() }}>&lsaquo; Back</button>
      </div>
    </>
  )
}

function Review({ D, update, venue, next, err, busy, onChange, onSave, onDraft, onBack }: {
  D: Draft; update: Upd; venue: string; next?: number; err: string | null; busy: boolean
  onChange: (s: string, w?: number | null) => void; onSave: () => void; onDraft: () => void; onBack: () => void
}) {
  React.useEffect(() => { update((d) => { d.readers.forEach((r) => { r.books = r.books.filter((b) => b.title.trim()) }) }) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const nr = D.readers.length
  const nbk = D.readers.reduce((a, r) => a + nb(r), 0)
  const cands = D.readers.filter((r) => !r.isNew && r.id && r.status && r.status !== 'member')
  const ready = !!D.date && !!venue
  return (
    <>
      <p className="step">Check the details</p>
      <h1 className="h1">Register meetup #{next ?? ''}</h1>
      {([['Date', D.date ? fmt(D.date) : 'Not set'], ['Venue', venue || 'Not set'], ['Presented by', D.presenter || 'Not set']] as const).map(([k, v]) => (
        <div className="sum" key={k}><span className="k">{k}</span><button type="button" className="lnk" onClick={() => onChange('1')}>Change</button><span className="v">{v}</span></div>
      ))}
      {D.readers.map((r, i) => (
        <div className="sum" key={i}>
          <span className="k">Reader {i + 1}</span><button type="button" className="lnk" onClick={() => onChange('3', i)}>Change</button><span className="v">{r.name}</span>
          <ul>{nb(r) ? r.books.filter((b) => b.title.trim()).map((b, j) => <li key={j}>{b.title}{b.author ? ` by ${b.author}` : ''}{b.translator ? ` (tr. ${b.translator})` : ''}</li>) : <li>No books</li>}</ul>
        </div>
      ))}
      <p className="note">{nr} reader{nr === 1 ? '' : 's'}, {nbk} book{nbk === 1 ? '' : 's'}{nr ? '' : '. No readers added yet.'}</p>
      {cands.map((r) => (
        <div className="mascot" key={r.id}>
          <Mascot />
          <div>
            <b>Make {r.name} a member?</b>
            <span className="note" style={{ margin: 0, display: 'block' }}>This is their meetup number {r.m + 1}.</span>
            <div className="acts"><button type="button" className="lnk" onClick={() => update((d) => { d.make[r.id!] = !d.make[r.id!] })}>{D.make[r.id!] ? 'Will be made a member' : 'Make member'}</button></div>
          </div>
        </div>
      ))}
      {err && <p className="amsg bad" role="alert">{err}</p>}
      <div className="nav2">
        <div className="saverow">
          <button type="button" className="sd" onClick={onDraft}>Save as draft</button>
          <button type="button" className="btn" disabled={busy || !ready} onClick={onSave}><span>{busy ? 'Saving...' : 'Save meetup'}</span><span aria-hidden="true">&rsaquo;</span></button>
        </div>
        <button type="button" className="lnk" onClick={onBack}>&lsaquo; Back to readers</button>
      </div>
    </>
  )
}
