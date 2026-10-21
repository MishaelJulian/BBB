'use client'

import * as React from 'react'
import { STORY, STORY_GROUPS, storySrc, type StoryPhoto } from '@/lib/club/story100'
import { useStoryLightbox } from './StoryLightbox'

const ratio = (p: { w: number; h: number }) => p.w / p.h

/**
 * 'flow' = a landscape takes a full row and portraits pair up (the archive rule);
 * 'pair' = every two photos of the group share one row.
 */
function layout(items: StoryPhoto[], mode: 'flow' | 'pair'): StoryPhoto[][] {
  if (mode === 'pair') {
    const rows: StoryPhoto[][] = []
    for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2))
    return rows
  }
  const q = [...items]
  const rows: StoryPhoto[][] = []
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

/** One group of the Substack story. Clicking a photo opens the whole story in the viewer. */
export function StoryPhotos({ group }: { group: string }) {
  const { open } = useStoryLightbox()
  const g = STORY_GROUPS.find((x) => x.id === group)
  const items = STORY.filter((p) => p.group === group)
  const rows = React.useMemo(() => layout(items, g?.layout ?? 'flow'), [items, g])
  const indexOf = (id: string) => STORY.findIndex((p) => p.id === id)
  return (
    <div>
      <div className="rows flush">
        {rows.map((r, ri) => {
          const single = r.length === 1
          const lonePortrait = single && ratio(r[0]) <= 1.2
          return (
            <div className="row" key={ri} style={{ display: 'flex', gap: 0, alignItems: 'flex-start', justifyContent: lonePortrait ? 'flex-start' : undefined }}>
              {r.map((p) => (
                <figure
                  key={p.id}
                  style={{
                    margin: 0,
                    minWidth: 0,
                    flex: single ? '0 0 auto' : `${ratio(p)} 1 0`,
                    width: single ? (lonePortrait ? `min(50%, ${(262 * ratio(p)).toFixed(1)}px)` : '100%') : undefined,
                  }}
                >
                  <button
                    type="button"
                    style={{ display: 'block', width: '100%', padding: 0, border: 0, background: 'none', cursor: 'pointer' }}
                    onClick={() => open(indexOf(p.id))}
                    aria-label={`Open photo ${indexOf(p.id) + 1} of ${STORY.length}: ${p.alt.replace(/"/g, '')}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={storySrc(p)} width={p.w} height={p.h} alt={p.alt} loading="lazy" decoding="async" style={{ display: 'block', width: '100%', height: 'auto', aspectRatio: `${p.w} / ${p.h}` }} />
                  </button>
                </figure>
              ))}
            </div>
          )
        })}
      </div>
      {g?.caption && <p className="cap tilecap" style={{ marginTop: 8 }}>{g.caption}</p>}
    </div>
  )
}
