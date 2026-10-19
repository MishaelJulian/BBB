'use client'

import * as React from 'react'

// Elastic headline: the width axis and the font size move together so the longest line always fills the box (no clipping, no reflow).
const WMIN = 62
const WMAX = 100

export function ElasticHeadline({ lines }: { lines: string[] }) {
  const h = React.useRef<HTMLHeadingElement>(null)
  React.useEffect(() => {
    const el = h.current
    if (!el) return
    const spans = [...el.querySelectorAll('span')]
    const rm = matchMedia('(prefers-reduced-motion: reduce)').matches
    const fit = (wd: number) => {
      el.style.fontVariationSettings = `'wght' 800,'wdth' ${wd}`
      el.style.fontSize = '47px'
      let w = 0
      spans.forEach((s) => {
        const r = document.createRange()
        r.selectNodeContents(s)
        w = Math.max(w, r.getBoundingClientRect().width)
      })
      const fs = Math.max(30, Math.min(62, (47 * el.clientWidth * 0.97) / w))
      el.style.fontSize = fs.toFixed(2) + 'px'
      return fs
    }
    const reserve = () => {
      el.style.minHeight = '0'
      const a = fit(WMIN)
      const b = fit(WMAX)
      el.style.minHeight = (Math.max(a, b) * 0.96 * 3).toFixed(1) + 'px'
    }
    let cur = WMIN
    let target = WMIN
    let raf = 0
    let dead = false
    const start = () => {
      if (dead) return
      reserve()
      fit(WMIN)
    }
    if (document.fonts?.ready) void document.fonts.ready.then(start)
    else start()
    const onResize = () => {
      reserve()
      fit(cur)
    }
    window.addEventListener('resize', onResize)
    const onScroll = () => {
      target = WMIN + (WMAX - WMIN) * Math.min(window.scrollY / 320, 1)
    }
    const onMove = (e: PointerEvent) => {
      target = WMAX - (WMAX - WMIN) * (e.clientX / window.innerWidth)
    }
    if (!rm) {
      window.addEventListener('scroll', onScroll, { passive: true })
      if (matchMedia('(hover:hover) and (pointer:fine)').matches) window.addEventListener('pointermove', onMove)
      const loop = () => {
        if (Math.abs(target - cur) > 0.05) {
          cur += (target - cur) * 0.14
          fit(cur)
        }
        raf = requestAnimationFrame(loop)
      }
      raf = requestAnimationFrame(loop)
    }
    return () => {
      dead = true
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('pointermove', onMove)
    }
  }, [])
  return (
    <h1 id="hero-h" ref={h}>
      {lines.map((l) => (
        <span key={l}>{l}</span>
      ))}
    </h1>
  )
}
