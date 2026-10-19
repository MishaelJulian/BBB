'use client'

import * as React from 'react'
import { PHOTOS } from '@/lib/club/photos'
import { PhotoRows } from './PhotoRows'

const STOPS: [string, string][] = [['arrival', 'Arrival and introduction'], ['discussion', 'Discussion'], ['games', 'Games']]

/** Three moments, each a flush run of photos; the dot of the section in view turns red. */
export function Timeline() {
  const ol = React.useRef<HTMLOListElement>(null)
  const by = (s: string) => PHOTOS.filter((p) => p.stop === s).map((p) => p.id)
  const order = STOPS.flatMap(([k]) => by(k))
  React.useEffect(() => {
    const el = ol.current
    if (!el || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && el.querySelectorAll('li').forEach((l) => l.classList.toggle('cur', l === e.target))),
      { rootMargin: '-40% 0px -50% 0px' },
    )
    el.querySelectorAll('li').forEach((l) => io.observe(l))
    return () => io.disconnect()
  }, [])
  return (
    <ol className="tl" ref={ol}>
      {STOPS.map(([k, t]) => {
        const ids = by(k)
        return (
          <li key={k} data-stop={k}>
            <h2 className="h2">{t}</h2>
            <p className="cap" style={{ margin: '2px 0 12px' }}>{ids.length} photo{ids.length > 1 ? 's' : ''}</p>
            <div className="rows flush">
              <PhotoRows ids={ids} order={order} flush />
            </div>
          </li>
        )
      })}
    </ol>
  )
}
