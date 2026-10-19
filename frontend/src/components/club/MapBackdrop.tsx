'use client'

import * as React from 'react'

declare global {
  interface Window {
    BBBDesktopMap?: { mount: (host: Element, opts: Record<string, unknown>) => Promise<{ size: [number, number] }> }
  }
}

const MAP_W = 579
const MAP_H = 913

/**
 * Page-wide map: a static soft raster on phones; on a desktop with a real mouse, halftone dots drawn from vectors
 * (the same two modes the mockup approved). Placed once and moved only when the width changes, so the browser bar
 * sliding away or the keyboard opening never makes it slip.
 */
export function MapBackdrop() {
  const img = React.useRef<HTMLImageElement>(null)
  const dmap = React.useRef<HTMLDivElement>(null)
  const [desk, setDesk] = React.useState(false)

  React.useEffect(() => {
    const rm = matchMedia('(prefers-reduced-motion: reduce)').matches
    setDesk(matchMedia('(min-width:900px) and (hover:hover) and (pointer:fine)').matches && !rm)
  }, [])

  React.useEffect(() => {
    if (desk) return
    const el = img.current
    if (!el) return
    let w0 = window.innerWidth
    const h0 = window.innerHeight
    const place = () => {
      el.style.transform = `translate3d(${(window.innerWidth - MAP_W) / 2}px,${(h0 - MAP_H) / 2}px,0)`
    }
    place()
    const onResize = () => {
      if (window.innerWidth !== w0) {
        w0 = window.innerWidth
        place()
      }
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [desk])

  React.useEffect(() => {
    if (!desk || !dmap.current) return
    const inner = dmap.current.firstElementChild as HTMLElement
    let off: (() => void) | null = null
    let dead = false
    const s = document.createElement('script')
    s.src = '/ui/desktop-map.js'
    s.onload = () => {
      if (dead || !window.BBBDesktopMap) return
      void window.BBBDesktopMap.mount(inner, { src: '/ui/map-vectors.json', duration: 90, scale: Math.max(1.9, window.innerWidth / MAP_W) }).then((r) => {
        const place = () => {
          const max = document.documentElement.scrollHeight - window.innerHeight
          const p = max > 0 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 0
          const ex = Math.max(0, r.size[0] - window.innerWidth)
          const ey = Math.max(0, r.size[1] - window.innerHeight)
          inner.style.transform = `translate3d(${-ex / 2}px,${-ey * p}px,0)`
        }
        place()
        window.addEventListener('scroll', place, { passive: true })
        window.addEventListener('resize', place)
        off = () => {
          window.removeEventListener('scroll', place)
          window.removeEventListener('resize', place)
        }
      })
    }
    document.head.append(s)
    return () => {
      dead = true
      off?.()
      s.remove()
    }
  }, [desk])

  if (desk) {
    return (
      <div className="dmap" aria-hidden="true" ref={dmap}>
        <div />
      </div>
    )
  }
  return (
    <div className="mapbg" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={img} src="/ui/map-kamsb.webp" width={MAP_W} height={MAP_H} alt="" decoding="async" fetchPriority="low" />
    </div>
  )
}
