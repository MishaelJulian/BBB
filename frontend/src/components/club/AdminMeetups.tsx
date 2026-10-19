'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Act, AdminPage, api, Back, fmt, Msg, Sheet, useApi, useToast } from './AdminKit'
import { authFetch } from '@/lib/auth'
import { useMe } from './useMe'

interface Meetup { number: number; date: string | null; venue: string | null; readers: number; books: number; photo_url: string | null; pdf_url: string | null }
interface Trashed { id: string; key: string; label: string; deleted_at: string; expires_at: string }
interface Data { meetups: Meetup[]; deleted: Trashed[] }

function useData() {
  const me = useMe()
  return useApi<Data>(me.state === 'admin' ? '/api/admin/meetups/list' : null)
}

export function AdminMeetups() {
  const { data, error, reload } = useData()
  const toast = useToast()
  const [tab, setTab] = React.useState('all')
  const [q, setQ] = React.useState('')
  const [shown, setShown] = React.useState(40)
  const [err, setErr] = React.useState<string | null>(null)
  React.useEffect(() => { const t = new URLSearchParams(window.location.search).get('tab'); if (t) setTab(t) }, [])
  const L = data?.meetups ?? []
  const f: Record<string, (m: Meetup) => boolean> = { all: () => true, np: (m) => !m.photo_url, nf: (m) => !m.pdf_url, nr: (m) => !m.readers, nv: (m) => !m.venue }
  const cnt = (k: string) => L.filter(f[k]).length
  const t = q.trim().toLowerCase().replace(/^#/, '')
  const rows = tab === 'del' ? [] : L.filter((m) => (f[tab] ?? f.all)(m) && (!t || String(m.number) === t || (m.venue ?? '').toLowerCase().includes(t)))
  const del = tab === 'del' ? data?.deleted ?? [] : []
  const TABS: [string, string, number | null | undefined][] = [['all', 'All', data && cnt('all')], ['nr', 'No readers', data && cnt('nr')], ['nv', 'No venue', data && cnt('nv')], ['np', 'No photo', data && cnt('np')], ['nf', 'No PDF', data && cnt('nf')], ['del', 'Deleted', data?.deleted.length]]
  const total = tab === 'del' ? del.length : rows.length
  const restore = async (x: Trashed) => {
    setErr(null)
    try {
      const r = await api<{ message: string }>(`/api/admin/trash/${x.id}/restore`, { method: 'POST' })
      toast.show(r.message)
      reload()
    } catch (e) { setErr((e as Error).message) }
  }
  return (
    <AdminPage crumbs={[{ href: '/admin', label: 'Admin' }, { label: 'Meetups' }]}>
      <Back href="/admin" label="Admin" />
      <h1 className="h1">Meetups</h1>
      <label className="cap" htmlFor="mq" style={{ display: 'block', marginTop: 10 }}>Search number or venue</label>
      <input className="search" id="mq" type="search" autoComplete="off" value={q} onChange={(e) => { setQ(e.target.value); setShown(40) }} />
      <div className="tabs" role="group" aria-label="Show">
        {TABS.map(([k, l, n]) => <button key={k} type="button" aria-pressed={tab === k} onClick={() => { setTab(k); setShown(40) }}>{l} {n ?? ''}</button>)}
      </div>
      <p className="cap" aria-live="polite">{data ? `${total} shown` : 'Loading...'}</p>
      {(error || err) && <p className="amsg bad" role="alert">{error || err}</p>}
      <div>
        {rows.slice(0, shown).map((m) => (
          <Link key={m.number} className="mr" href={`/admin/meetups/${m.number}`}>
            <span className="t1">#{m.number} &middot; {m.date ? fmt(m.date) : 'No date'}</span>
            <span className="t2">{m.venue ?? 'Venue not recorded'} &middot; {m.readers ? `${m.readers} readers` : 'Readers not recorded'} &middot; {m.books} books{m.photo_url ? '' : ' · No photo'}{m.pdf_url ? '' : ' · No PDF'}</span>
          </Link>
        ))}
        {del.map((x) => (
          <div key={x.id} className="mr" style={{ cursor: 'default' }}>
            <span className="t1">{x.label}</span>
            <span className="t2">Deleted {fmt(x.deleted_at)} &middot; can be restored until {fmt(x.expires_at)}</span>
            <button className="lnk" type="button" onClick={() => restore(x)}>Restore {x.label}</button>
          </div>
        ))}
        {data && !total && <p className="body" style={{ marginTop: 12 }}>{tab === 'del' ? 'Nothing deleted in the last 7 days.' : 'Nothing here.'}</p>}
      </div>
      {total > shown && <button className="rd" type="button" onClick={() => setShown((s) => s + 40)}>Show more ({total - shown})</button>}
      {toast.node}
    </AdminPage>
  )
}

const PHOTO_MAX = 4_718_592
type PdfStyle = 'magazine' | 'classic'
interface PdfDone { pdf_url: string; style: PdfStyle; pages: number; message: string }
interface Summary { total: number; enriched: number; complete: number; none: number; failed: number; failures: { id: string; title: string }[] }

export function AdminMeetup({ number }: { number: number }) {
  const router = useRouter()
  const { data, error, reload } = useData()
  const toast = useToast()
  const m = data?.meetups.find((x) => x.number === number)
  const [sheet, setSheet] = React.useState<null | 'photo' | 'enrich' | 'delete' | 'pdf'>(null)
  const [msg, setMsg] = React.useState<{ ok: boolean; t: string } | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [file, setFile] = React.useState<File | null>(null)
  const [preview, setPreview] = React.useState<string | null>(null)
  const [sum, setSum] = React.useState<Summary | null>(null)
  const [pdfStyle, setPdfStyle] = React.useState<PdfStyle>('magazine')
  const [pdfBusy, setPdfBusy] = React.useState(false)
  const [pdfRes, setPdfRes] = React.useState<PdfDone | null>(null)
  const [pdfErr, setPdfErr] = React.useState<string | null>(null)
  const close = () => { setSheet(null); setMsg(null); setFile(null); setPreview(null); setSum(null) }

  const choose = (f: File | undefined) => {
    setMsg(null)
    setFile(null)
    setPreview(null)
    if (!f) return
    if (f.size > PHOTO_MAX) return setMsg({ ok: false, t: 'That file is larger than 4.5 MB.' })
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return setMsg({ ok: false, t: 'Use a JPG, PNG or WebP image.' })
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }
  const upload = async () => {
    if (!file) return
    setBusy(true)
    setMsg(null)
    try {
      const r = await authFetch(`/api/admin/meetups/${number}/photo`, { method: 'POST', headers: { 'Content-Type': file.type }, body: file })
      const j = await r.json().catch(() => null)
      if (!r.ok) throw new Error(j?.detail || 'The photo could not be saved.')
      close()
      reload()
      toast.show('Photo saved.')
    } catch (e) { setMsg({ ok: false, t: (e as Error).message }) } finally { setBusy(false) }
  }
  const removePhoto = async () => {
    setBusy(true)
    try {
      const r = await api<{ message: string }>(`/api/admin/meetups/${number}/photo`, { method: 'DELETE' })
      close()
      reload()
      toast.show(r.message)
    } catch (e) { setMsg({ ok: false, t: (e as Error).message }) } finally { setBusy(false) }
  }
  const enrich = async (ids?: string[]) => {
    setBusy(true)
    setMsg(null)
    try {
      setSum(await api<Summary>(`/api/admin/meetups/${number}/enrich`, { json: ids ? { ids } : {} }))
    } catch (e) { setMsg({ ok: false, t: (e as Error).message }) } finally { setBusy(false) }
  }
  const makePdf = async () => {
    setPdfBusy(true)
    setPdfErr(null)
    setPdfRes(null)
    try {
      const r = await api<PdfDone>(`/api/admin/meetups/${number}/pdf?style=${pdfStyle}`, { method: 'POST', signal: AbortSignal.timeout(90_000) })
      setPdfRes(r)
      reload()
    } catch (e) {
      const x = e as Error
      setPdfErr(x.name === 'TimeoutError' || x.name === 'AbortError' ? 'This is taking too long. Check Books PDF on this meetup in a minute: it may have finished.' : x.message)
    } finally { setPdfBusy(false) }
  }
  const del = async () => {
    setBusy(true)
    try {
      await api(`/api/admin/meetups/${number}`, { method: 'DELETE' })
      router.push('/admin/meetups?tab=del')
    } catch (e) { setMsg({ ok: false, t: (e as Error).message }); setBusy(false) }
  }
  return (
    <AdminPage crumbs={[{ href: '/admin', label: 'Admin' }, { href: '/admin/meetups', label: 'Meetups' }, { label: `#${number}` }]}>
      <Back href="/admin/meetups" label="Meetups" />
      {error && <p className="amsg bad" role="alert">{error}</p>}
      {data && !m && <h1 className="h1">Not found</h1>}
      {m && (
        <>
          <h1 className="abig">#{m.number}</h1>
          <p className="cap" style={{ marginTop: 4 }}>{m.date ? fmt(m.date) : 'No date'} &middot; {m.venue ?? 'Venue not recorded'}</p>
          <p className="body" style={{ marginTop: 8 }}>{m.readers ? `${m.readers} readers` : 'Readers not recorded'} &middot; {m.books} books</p>
          {m.photo_url && /^https?:/.test(m.photo_url) && /* eslint-disable-next-line @next/next/no-img-element */ <img className="aph" src={m.photo_url} alt={`Group photo of meetup ${m.number}`} referrerPolicy="no-referrer" />}
          <div style={{ marginTop: 16 }}>
            <Act t="Group photo" sub={m.photo_url ? 'On the site' : 'No photo yet'} onClick={() => { setMsg(null); setSheet('photo') }} />
            <Act t="Books PDF" sub={m.pdf_url ? 'On the site. Make a new one to replace it' : 'Not made yet'} onClick={() => { if (!pdfBusy) { setPdfRes(null); setPdfErr(null) } setSheet('pdf') }} />
            <Act t="Enrich its books" sub="From Apple Books and Open Library" onClick={() => { setSum(null); setSheet('enrich') }} />
            <Act t="Delete meetup" sub="A copy is kept. Undo for 7 days" danger onClick={() => setSheet('delete')} />
          </div>
        </>
      )}

      <Sheet open={sheet === 'photo'} onClose={close}>
        <p className="h2">Group photo</p>
        {m?.photo_url && /^https?:/.test(m.photo_url) && /* eslint-disable-next-line @next/next/no-img-element */ <img className="aph" src={m.photo_url} alt="Current group photo" />}
        <label className="fl" htmlFor="pf">{m?.photo_url ? 'Replace with a new photo' : 'Choose a photo'}</label>
        <input id="pf" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={(e) => choose(e.target.files?.[0])} />
        <p className="cap" style={{ marginTop: 6 }}>JPG, PNG or WebP, up to 4.5 MB. One photo per meetup. The old file is kept for 7 days, so Undo in All changes brings it back.</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {preview && <img className="aph" src={preview} alt="Preview of the chosen photo" />}
        <Msg m={msg} />
        <div className="foot">
          {m?.photo_url && <button className="x" type="button" disabled={busy} onClick={removePhoto}>Remove</button>}
          <button className="x" type="button" onClick={close}>Cancel</button>
          <button className="btn" type="button" disabled={!file || busy} onClick={upload}><span>Upload photo</span><span aria-hidden="true">&rsaquo;</span></button>
        </div>
      </Sheet>

      <Sheet open={sheet === 'pdf'} onClose={() => { if (!pdfBusy) setSheet(null) }}>
        <p className="h2">Books PDF</p>
        <p className="cap">The books discussed at meetup #{number}. {m?.pdf_url ? 'Making it again replaces the one on the site. The old file is kept, so Undo in All changes brings it back for 7 days.' : 'It goes on the site when it is ready.'}</p>
        <fieldset className="tagset" disabled={pdfBusy}>
          <legend className="cap">Style</legend>
          <label className="opt2"><input type="radio" name="pdfstyle" value="magazine" checked={pdfStyle === 'magazine'} onChange={() => setPdfStyle('magazine')} /><span>Magazine<small>A designed zine, with covers</small></span></label>
          <label className="opt2"><input type="radio" name="pdfstyle" value="classic" checked={pdfStyle === 'classic'} onChange={() => setPdfStyle('classic')} /><span>Classic<small>A plain document with a table</small></span></label>
        </fieldset>
        {pdfBusy && <p className="amsg" role="status">Making the {pdfStyle === 'magazine' ? 'Magazine' : 'Classic'} PDF... this can take up to a minute. Keep this open.</p>}
        {pdfRes && !pdfBusy && (
          <>
            <p className="amsg" role="status">{pdfRes.message}</p>
            {/^https?:/.test(pdfRes.pdf_url) && <p style={{ marginTop: 8 }}><a className="link" href={pdfRes.pdf_url} target="_blank" rel="noopener">Open the new PDF</a></p>}
          </>
        )}
        {pdfErr && !pdfBusy && <p className="amsg bad" role="alert">{pdfErr}</p>}
        {!pdfRes && m?.pdf_url && /^https?:/.test(m.pdf_url) && <p style={{ marginTop: 8 }}><a className="link" href={m.pdf_url} target="_blank" rel="noopener">Open the current PDF</a></p>}
        <div className="foot">
          <button className="x" type="button" disabled={pdfBusy} onClick={() => { setSheet(null); setPdfRes(null); setPdfErr(null) }}>Close</button>
          <button className="btn" type="button" disabled={pdfBusy} onClick={makePdf}><span>{pdfErr ? 'Try again' : m?.pdf_url || pdfRes ? 'Make a new PDF' : 'Make PDF'}</span><span aria-hidden="true">&rsaquo;</span></button>
        </div>
      </Sheet>

      <Sheet open={sheet === 'enrich'} onClose={close}>
        <p className="h2">Enrich its books</p>
        <p className="body">Checks the {m?.books} books of meetup #{number} on Apple Books and Open Library and fills what is missing: cover, ISBN, year and synopsis. Nothing that is already there is overwritten.</p>
        {busy && <p className="amsg" role="status">Checking... this can take a minute.</p>}
        {sum && (
          <>
            <p className="amsg" role="status">{sum.enriched} enriched, {sum.complete} already complete, {sum.none} with no match, {sum.failed} failed (of {sum.total})</p>
            {sum.failures.length > 0 && (
              <>
                <ul className="failx">{sum.failures.slice(0, 5).map((b) => <li key={b.id}>{b.title}: a source did not answer</li>)}</ul>
                <button className="rd" type="button" disabled={busy} onClick={() => enrich(sum.failures.map((b) => b.id))}>Try the failed again</button>
              </>
            )}
          </>
        )}
        <Msg m={msg} />
        <div className="foot">
          <button className="x" type="button" onClick={close}>Close</button>
          <button className="btn" type="button" disabled={busy} onClick={() => enrich()}><span>{sum ? 'Run again' : 'Start'}</span><span aria-hidden="true">&rsaquo;</span></button>
        </div>
      </Sheet>

      <Sheet open={sheet === 'delete'} onClose={close}>
        <p className="h2">Delete meetup #{number}?</p>
        <p className="body">Its {m?.books} books and {m?.readers} attendance records leave the site. A copy is kept and you have 7 days to bring it back from Deleted here, or from All changes.</p>
        <Msg m={msg} />
        <div className="foot">
          <button className="x" type="button" onClick={close}>Cancel</button>
          <button className="btn dg" type="button" disabled={busy} onClick={del}><span>Delete meetup</span><span aria-hidden="true">&rsaquo;</span></button>
        </div>
      </Sheet>
      {toast.node}
    </AdminPage>
  )
}
