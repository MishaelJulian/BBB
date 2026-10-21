'use client'

import * as React from 'react'
import { PHOTOS } from '@/lib/club/photos'
import { photoSrc } from '@/lib/club/photoUrl'
import { Lightbox } from './Lightbox'

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
  // A page can hold several galleries (the timeline has three), so each viewer needs its own id.
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, '')
  const seq = order ?? ids
  const gap = flush ? 0 : 8
  const rows = React.useMemo(() => layout(ids), [ids])
  const idx = Object.fromEntries(seq.map((id, i) => [id, i]))
  const items = seq.map((id) => ({ src: photoSrc(id, 'full'), alt: BY_ID[id].alt, caption: stopOf(id) }))
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
      <Lightbox items={items} open={open} onClose={() => setOpen(null)} domId={`lb${uid}`} />
    </div>
  )
}
