'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Act, AdminPage, api, Back, Msg, Sheet, useApi, useToast } from './AdminKit'
import { useMe } from './useMe'

interface Row { id: string; title: string; author: string | null; no_isbn: boolean; no_cover: boolean }
interface List { counts: { all: number; na: number; nc: number; ni: number }; shown: number; books: Row[] }
const N = (n: number) => n.toLocaleString('en-IN')

export function AdminBooks() {
  const me = useMe()
  const [tab, setTab] = React.useState<'all' | 'na' | 'nc' | 'ni'>('all')
  const [q, setQ] = React.useState('')
  const [dq, setDq] = React.useState('')
  const [rows, setRows] = React.useState<Row[]>([])
  const [info, setInfo] = React.useState<List | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  React.useEffect(() => { const t = setTimeout(() => setDq(q), 250); return () => clearTimeout(t) }, [q])
  const load = React.useCallback(async (offset: number) => {
    setLoading(true)
    setError(null)
    try {
      const r = await api<List>(`/api/admin/books?tab=${tab}&q=${encodeURIComponent(dq)}&offset=${offset}&limit=40`)
      setInfo(r)
      setRows((p) => (offset ? [...p, ...r.books] : r.books))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [tab, dq])
  React.useEffect(() => { if (me.state === 'admin') void load(0) }, [me.state, load])
  const c = info?.counts
  return (
    <AdminPage crumbs={[{ href: '/admin', label: 'Admin' }, { label: 'Books' }]}>
      <Back href="/admin" label="Admin" />
      <h1 className="h1">Books</h1>
      <label className="cap" htmlFor="bq" style={{ display: 'block', marginTop: 10 }}>Search title or author</label>
      <input className="search" id="bq" type="search" autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="tabs" role="group" aria-label="Show">
        {([['all', 'All', c?.all], ['na', 'No author', c?.na], ['nc', 'No cover', c?.nc], ['ni', 'No ISBN', c?.ni]] as const).map(([k, l, n]) => (
          <button key={k} type="button" aria-pressed={tab === k} onClick={() => setTab(k)}>{l} {n !== undefined ? N(n) : ''}</button>
        ))}
      </div>
      <p className="cap" aria-live="polite">{info ? `${N(info.shown)} shown` : 'Loading...'}</p>
      {error && <p className="amsg bad" role="alert">{error}</p>}
      <div>
        {rows.map((b) => (
          <Link key={b.id} className="mr serif" href={`/admin/books/${encodeURIComponent(b.id)}`}>
            <span className="t1">{b.title}</span>
            <span className="t2">{b.author ?? 'No author'}{b.no_isbn ? ' · No ISBN' : ''}{b.no_cover ? ' · No cover' : ''}</span>
          </Link>
        ))}
      </div>
      {info && rows.length < info.shown && <button className="rd" type="button" disabled={loading} onClick={() => load(rows.length)}>Show more ({N(info.shown - rows.length)})</button>}
    </AdminPage>
  )
}

interface Book {
  id: string; title: string; base_title: string; translator: string; author: string | null; publisher: string | null; publication_year: number | null
  isbn10: string | null; isbn13: string | null; cover_url: string | null; description: string | null; discussions: number; usage: Record<string, number>
}
interface Look { found: { isbn?: string; year?: number; cover?: string; description?: string; author?: string }; sources: { source: string; result: string }[]; failed: boolean }

export function AdminBook({ id }: { id: string }) {
  const me = useMe()
  const router = useRouter()
  const { data, error, reload } = useApi<Book>(me.state === 'admin' ? `/api/admin/books/${encodeURIComponent(id)}` : null)
  const toast = useToast()
  const [f, setF] = React.useState({ title: '', author: '', translator: '', publisher: '', isbn: '', year: '', cover: '', description: '' })
  const [showTr, setShowTr] = React.useState(false)
  const [msg, setMsg] = React.useState<{ ok: boolean; t: string } | null>(null)
  const [trail, setTrail] = React.useState<Look['sources'] | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [sugs, setSugs] = React.useState<string[]>([])
  const [sheet, setSheet] = React.useState<null | 'merge' | 'delete'>(null)
  const [mq, setMq] = React.useState('')
  const [cands, setCands] = React.useState<Row[]>([])
  const [into, setInto] = React.useState<Row | null>(null)
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((p) => ({ ...p, [k]: e.target.value }))

  React.useEffect(() => {
    if (!data) return
    setF({ title: data.base_title, author: data.author ?? '', translator: data.translator, publisher: data.publisher ?? '', isbn: data.isbn13 ?? data.isbn10 ?? '', year: data.publication_year ? String(data.publication_year) : '', cover: data.cover_url ?? '', description: data.description ?? '' })
    setShowTr(!!data.translator)
  }, [data])
  React.useEffect(() => {
    const q = f.author.trim()
    if (q.length < 2 || q === data?.author) return void setSugs([])
    const t = setTimeout(() => { api<{ full_name: string }[]>(`/api/admin/books/authors?q=${encodeURIComponent(q)}`).then((r) => setSugs(r.map((x) => x.full_name))).catch(() => setSugs([])) }, 200)
    return () => clearTimeout(t)
  }, [f.author, data?.author])
  React.useEffect(() => {
    if (sheet !== 'merge' || mq.trim().length < 2) return void setCands([])
    const t = setTimeout(() => { api<{ books: Row[] }>(`/api/admin/books?q=${encodeURIComponent(mq)}&limit=6`).then((r) => setCands(r.books.filter((b) => b.id !== id))).catch(() => setCands([])) }, 200)
    return () => clearTimeout(t)
  }, [mq, sheet, id])

  const save = async () => {
    setBusy(true)
    setMsg(null)
    try {
      const r = await api<{ message: string; changed: string[] }>(`/api/admin/books/${encodeURIComponent(id)}`, {
        method: 'PUT',
        json: { title: f.title, author: f.author, translator: f.translator, publisher: f.publisher, isbn: f.isbn, publication_year: f.year.trim() ? f.year.trim() : null, cover_url: f.cover.trim() || null, description: f.description },
      })
      setMsg({ ok: true, t: r.changed.length ? 'Saved.' : 'Nothing changed.' })
      reload()
    } catch (e) {
      setMsg({ ok: false, t: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }
  const lookup = async () => {
    setBusy(true)
    setMsg({ ok: true, t: 'Looking up...' })
    setTrail(null)
    try {
      const r = await api<Look>('/api/admin/books/lookup', { json: { title: f.title, author: f.author } })
      const got: string[] = []
      const nf = { ...f }
      if (!nf.author.trim() && r.found.author) { nf.author = r.found.author; got.push('author') }
      if (!nf.isbn.trim() && r.found.isbn) { nf.isbn = r.found.isbn; got.push('ISBN') }
      if (!nf.year.trim() && r.found.year) { nf.year = String(r.found.year); got.push('year') }
      if (!nf.cover.trim() && r.found.cover) { nf.cover = r.found.cover; got.push('cover') }
      if (!nf.description.trim() && r.found.description) { nf.description = r.found.description; got.push('synopsis') }
      setF(nf)
      setTrail(r.sources)
      if (got.length) setMsg({ ok: true, t: `Matched. Filled: ${got.join(', ')}. Check them, then save.` })
      else if (r.failed) setMsg({ ok: false, t: 'A source did not answer. Try again in a minute.' })
      else if (Object.keys(r.found).length) setMsg({ ok: true, t: 'Found it, but there was nothing new to fill.' })
      else { setMsg({ ok: false, t: 'No source found this book. Enter the publisher and the year by hand.' }) }
    } catch (e) {
      setMsg({ ok: false, t: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }
  const doMerge = async () => {
    if (!into) return
    setBusy(true)
    try {
      await api(`/api/admin/books/${encodeURIComponent(id)}/merge`, { json: { into: into.id } })
      router.push('/admin/books')
    } catch (e) {
      setMsg({ ok: false, t: (e as Error).message })
      setSheet(null)
    } finally {
      setBusy(false)
    }
  }
  const doDelete = async () => {
    setBusy(true)
    try {
      await api(`/api/admin/books/${encodeURIComponent(id)}`, { method: 'DELETE' })
      router.push('/admin/books')
    } catch (e) {
      setMsg({ ok: false, t: (e as Error).message })
      setSheet(null)
    } finally {
      setBusy(false)
    }
  }
  const d = data?.discussions ?? 0
  return (
    <AdminPage crumbs={[{ href: '/admin', label: 'Admin' }, { href: '/admin/books', label: 'Books' }, { label: 'Edit' }]}>
      <Back href="/admin/books" label="Books" />
      {error && <p className="amsg bad" role="alert">{error}</p>}
      {data && (
        <>
          <h1 className="h1" style={{ fontSize: 28, lineHeight: '34px' }}>Edit book</h1>
          <label className="al" htmlFor="t">Title</label>
          <input className="field2" id="t" value={f.title} onChange={set('title')} />
          <label className="al" htmlFor="a">Author</label>
          <input className="field2" id="a" value={f.author} onChange={set('author')} autoComplete="off" />
          <div className="sug" role="list">
            {sugs.map((s) => <button key={s} type="button" role="listitem" onClick={() => { setF((p) => ({ ...p, author: s })); setSugs([]) }}>{s}</button>)}
            {sugs.length > 0 && !sugs.includes(f.author.trim()) && <button type="button" role="listitem" onClick={() => setSugs([])}><small>New author</small>{f.author.trim()}</button>}
          </div>
          {showTr ? (
            <>
              <label className="al" htmlFor="tn">Translator</label>
              <input className="field2" id="tn" value={f.translator} onChange={set('translator')} />
            </>
          ) : <button className="rd" type="button" aria-expanded="false" onClick={() => setShowTr(true)}>Add a translator</button>}
          <label className="al" htmlFor="pb">Publisher</label>
          <input className="field2" id="pb" value={f.publisher} onChange={set('publisher')} />
          <label className="al" htmlFor="is">ISBN (10 or 13 digits)</label>
          <input className="field2" id="is" inputMode="numeric" value={f.isbn} onChange={set('isbn')} />
          <label className="al" htmlFor="yr">Year</label>
          <input className="field2" id="yr" inputMode="numeric" maxLength={4} value={f.year} onChange={set('year')} />
          <label className="al" htmlFor="cv">Cover link</label>
          <input className="field2" id="cv" value={f.cover} onChange={set('cover')} autoCapitalize="none" />
          <label className="al" htmlFor="sy">Synopsis</label>
          <textarea className="field2" id="sy" value={f.description} onChange={set('description')} />
          <div style={{ marginTop: 14 }}>
            <Act t="Look up details" sub="Fills what is empty from Open Library and Apple Books. You check it, then save." onClick={lookup} off={busy} />
          </div>
          <Msg m={msg} />
          {trail && (
            <details style={{ marginTop: 8 }}>
              <summary style={{ minHeight: 44, display: 'flex', alignItems: 'center', cursor: 'pointer', font: '600 15px/22px var(--sans)' }}>What each source said</summary>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20, font: '400 14px/22px var(--sans)' }}>{trail.map((s) => <li key={s.source}>{s.source}: {s.result}</li>)}</ul>
            </details>
          )}
          <div style={{ marginTop: 14 }}>
            <button className="btn" type="button" disabled={busy} onClick={save}><span>Save changes</span><span aria-hidden="true">&rsaquo;</span></button>
          </div>
          <p className="grpx">More</p>
          <Act t="Merge into another book" sub="Moves its discussions to the other book" onClick={() => { setMq(''); setInto(null); setSheet('merge') }} />
          <Act t="Delete book" sub={d ? `Blocked while it has discussions (${d})` : 'No discussions, so it can be deleted'} danger onClick={() => setSheet('delete')} />
        </>
      )}

      <Sheet open={sheet === 'merge'} onClose={() => setSheet(null)}>
        {!into ? (
          <>
            <p className="h2">Merge into another book</p>
            <p className="cap">{data?.title} will be removed and its discussions move to the book you pick. Undo for 7 days.</p>
            <label className="fl" htmlFor="mq">Find the book to keep</label>
            <input className="fld" id="mq" type="search" autoComplete="off" value={mq} onChange={(e) => setMq(e.target.value)} />
            <div className="sug">{cands.map((b) => <button key={b.id} type="button" onClick={() => setInto(b)}>{b.title}<small>{b.author ?? 'No author'}</small></button>)}</div>
            <div className="foot"><button className="x" type="button" onClick={() => setSheet(null)}>Cancel</button></div>
          </>
        ) : (
          <>
            <p className="h2">Merge?</p>
            <p className="body">{data?.title} into {into.title}. Its {d} discussion{d === 1 ? '' : 's'} move across and this book is removed.</p>
            <div className="foot">
              <button className="x" type="button" onClick={() => setInto(null)}>Back</button>
              <button className="btn" type="button" disabled={busy} onClick={doMerge}><span>Merge books</span><span aria-hidden="true">&rsaquo;</span></button>
            </div>
          </>
        )}
      </Sheet>
      <Sheet open={sheet === 'delete'} onClose={() => setSheet(null)}>
        {d ? (
          <>
            <p className="h2">Cannot delete</p>
            <p className="body">{data?.title} has {d} discussion{d === 1 ? '' : 's'}. Remove those from their meetups first, or merge this book into another.</p>
            <div className="foot"><button className="btn" type="button" onClick={() => setSheet(null)}><span>OK</span><span aria-hidden="true">&rsaquo;</span></button></div>
          </>
        ) : (
          <>
            <p className="h2">Delete {data?.title}?</p>
            <p className="body">It has no discussions. A copy is kept and you have 7 days to undo it from All changes.</p>
            <div className="foot">
              <button className="x" type="button" onClick={() => setSheet(null)}>Cancel</button>
              <button className="btn dg" type="button" disabled={busy} onClick={doDelete}><span>Delete book</span><span aria-hidden="true">&rsaquo;</span></button>
            </div>
          </>
        )}
      </Sheet>
      {toast.node}
    </AdminPage>
  )
}
