'use client'

import * as React from 'react'
import { PHOTOS } from '@/lib/club/photos'
import { photoSrc } from '@/lib/club/photoUrl'

const BY_ID = Object.fromEntries(PHOTOS.map((p) => [p.id, p]))
const ratio = (p: { w: number; h: number }) => p.w / p.h

/** Justified photo rows: equal height per row, widths follow each photo's ratio; landscapes take a full row (approved in the mockup). */
function layout(ids: string[]) {
  const q = ids.map((i) => BY_ID[i])
  const rows: (typeof PHOTOS)[] = []
  while (q.length) {
    const p = q.shift()!
    if (ratio(p) > 1.2) {
      rows.push([p])
      continue
    }
    const k = q.findIndex((x) => ratio(x) <= 1.2)
    if (k < 0) {
      const prev = rows[rows.length - 1]
      if (prev && prev.length === 2 && prev.every((x) => ratio(x) <= 1.2)) prev.push(p)
      else rows.push([p])
      continue
    }
    const [m] = q.splice(k, 1)
    rows.push([p, m])
  }
  return rows
}

const STOP: Record<string, string> = { arrival: 'Arrival and introduction', discussion: 'Discussion', games: 'Games' }
const stopOf = (id: string) => STOP[BY_ID[id].stop] ?? ''

export function PhotoRows({ ids, order, caps, flush = false }: { ids: string[]; order?: string[]; caps?: Record<string, string>; flush?: boolean }) {
  const [open, setOpen] = React.useState<number | null>(null)
  const seq = order ?? ids
  const gap = flush ? 0 : 8
  const rows = React.useMemo(() => layout(ids), [ids])
  const idx = Object.fromEntries(seq.map((id, i) => [id, i]))
  // Each photo's width follows its ratio (flex-grow = ratio), so every photo in a row ends up the same height without measuring anything:
  // no layout shift. A lone portrait photo is at most half the row and 262 px tall, as in the approved mockup.
  return (
    <div>
      {rows.map((r, ri) => {
        const single = r.length === 1
        const lonePortrait = single && ratio(r[0]) <= 1.2 && !flush
        return (
          <div className="row" key={ri} style={{ display: 'flex', gap, alignItems: 'flex-start', justifyContent: lonePortrait ? 'flex-start' : undefined }}>
            {r.map((p) => (
              <figure
                key={p.id}
                style={{ margin: 0, minWidth: 0, flex: lonePortrait ? '0 0 auto' : `${ratio(p)} 1 0`, width: lonePortrait ? `min(calc((100% - ${gap}px) / 2), ${(262 * ratio(p)).toFixed(1)}px)` : undefined }}
              >
                <button type="button" style={{ display: 'block', width: '100%', padding: 0, border: 0, background: 'none', cursor: 'pointer' }} onClick={() => setOpen(idx[p.id])} aria-label={`Open photo ${idx[p.id] + 1} of ${seq.length}: ${p.alt.replace(/"/g, '')}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoSrc(p.id, '800')} width={p.w} height={p.h} alt={p.alt} loading="lazy" decoding="async" style={{ display: 'block', width: '100%', height: 'auto', aspectRatio: `${p.w} / ${p.h}` }} />
                </button>
                {caps?.[p.id] && <p className="cap tilecap">{caps[p.id]}</p>}
              </figure>
            ))}
          </div>
        )
      })}
      <Lightbox order={seq} open={open} onClose={() => setOpen(null)} />
    </div>
  )
}

/** Scroll-snap swipe, arrows, Esc; the Android back button closes it. */
function Lightbox({ order, open, onClose }: { order: string[]; open: number | null; onClose: () => void }) {
  const d = React.useRef<HTMLDialogElement>(null)
  const track = React.useRef<HTMLDivElement>(null)
  const [cur, setCur] = React.useState(0)
  const pushed = React.useRef(false)
  const rm = React.useRef(false)
  React.useEffect(() => {
    rm.current = matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])
  const load = React.useCallback((i: number) => {
    ;[i - 1, i, i + 1].forEach((j) => {
      const im = track.current?.children[j]?.querySelector('img') as HTMLImageElement | null
      if (im && !im.getAttribute('src') && im.dataset.src) im.src = im.dataset.src
    })
  }, [])
  React.useEffect(() => {
    const dlg = d.current
    if (!dlg) return
    if (open !== null && !dlg.open) {
      dlg.showModal()
      history.pushState({ lb: 1 }, '')
      pushed.current = true
      track.current?.scrollTo({ left: open * (track.current?.clientWidth ?? 0), behavior: 'auto' })
      setCur(open)
      load(open)
    }
    if (open === null && dlg.open) dlg.close()
  }, [open, load])
  React.useEffect(() => {
    const onPop = () => {
      if (pushed.current && d.current?.open) {
        pushed.current = false
        d.current.close()
      }
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  const go = (i: number) => {
    const n = Math.max(0, Math.min(order.length - 1, i))
    track.current?.scrollTo({ left: n * (track.current?.clientWidth ?? 0), behavior: rm.current ? 'auto' : 'smooth' })
  }
  return (
    <dialog
      id="lb"
      ref={d}
      aria-label="Photo viewer"
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') go(cur - 1)
        if (e.key === 'ArrowRight') go(cur + 1)
      }}
      onClose={() => {
        if (pushed.current) {
          pushed.current = false
          history.back()
        }
        onClose()
      }}
    >
      <div className="lbtop">
        <span id="lbn" aria-live="polite">{`${cur + 1} / ${order.length}`}</span>
        <button type="button" id="lbx" aria-label="Close photo viewer" onClick={() => d.current?.close()}>
          &times;
        </button>
      </div>
      <div
        className="lbtrack"
        id="lbt"
        ref={track}
        onScroll={() => {
          const t = track.current
          if (!t) return
          const i = Math.round(t.scrollLeft / t.clientWidth)
          if (i !== cur) {
            setCur(i)
            load(i)
          }
        }}
      >
        {order.map((id) => (
          <div className="lbslide" key={id}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img data-src={photoSrc(id, 'full')} alt={BY_ID[id].alt} />
          </div>
        ))}
      </div>
      <button type="button" className="lbnav lbprev" aria-label="Previous photo" onClick={() => go(cur - 1)}>
        &lsaquo;
      </button>
      <button type="button" className="lbnav lbnext" aria-label="Next photo" onClick={() => go(cur + 1)}>
        &rsaquo;
      </button>
      <div className="lbcap" id="lbc">{order[cur] ? stopOf(order[cur]) : ''}</div>
    </dialog>
  )
}
