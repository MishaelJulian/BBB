'use client'

import * as React from 'react'

export interface LbItem {
  src: string
  alt: string
  caption?: string
}

/** Scroll-snap swipe, arrows, Esc; the Android back button closes it. */
export function Lightbox({ items, open, onClose, domId = 'lb' }: { items: LbItem[]; open: number | null; onClose: () => void; domId?: string }) {
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
    const n = Math.max(0, Math.min(items.length - 1, i))
    track.current?.scrollTo({ left: n * (track.current?.clientWidth ?? 0), behavior: rm.current ? 'auto' : 'smooth' })
  }
  return (
    <dialog
      id={domId}
      className="lb"
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
        <span aria-live="polite">{items.length ? `${cur + 1} / ${items.length}` : ''}</span>
        <button type="button" aria-label="Close photo viewer" onClick={() => d.current?.close()}>
          &times;
        </button>
      </div>
      <div
        className="lbtrack"
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
        {items.map((it, i) => (
          <div className="lbslide" key={i}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img data-src={it.src} alt={it.alt} />
          </div>
        ))}
      </div>
      <button type="button" className="lbnav lbprev" aria-label="Previous photo" onClick={() => go(cur - 1)}>
        &lsaquo;
      </button>
      <button type="button" className="lbnav lbnext" aria-label="Next photo" onClick={() => go(cur + 1)}>
        &rsaquo;
      </button>
      <div className="lbcap">{items[cur]?.caption ?? ''}</div>
    </dialog>
  )
}
