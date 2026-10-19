'use client'

import * as React from 'react'
import Link from 'next/link'
import { PixelIcon } from './icons'

type Pt = { x: number; y: number; vx: number; v: number; ph: number; c: string }
type Bk = { x: number; w: number; h: number; base: number; c: string; off: number; lean: number; t0: number; kind?: string }

const BARK = ['#cbc5c0', '#c1bab5', '#d4cfca']
const PINK = ['#f3ccd6', '#ebb7c4', '#f8dde4', '#e2a8b8', '#fbe9ee']
const SHELF = '#cdc8c2'
const BOOKS = ['#8a90a0', '#a8a299', '#c6beb2', '#7f8ca6', '#b98f8a', '#9aa99a', '#b4a6c0']
const CELL = 6

function rng(s: number) {
  return function () {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * The 404 wallpaper: a pixel tree in bloom and a bookshelf drawn by code on a coarse grid; petals drift from the crown
 * and pile up along the page's end, books slide and lean. Same scene and constants the founder approved in the mockup.
 */
function useScene(ref: React.RefObject<HTMLCanvasElement | null>) {
  React.useEffect(() => {
    const cv = ref.current
    const st = cv?.parentElement
    const g = cv?.getContext('2d')
    if (!cv || !st || !g) return
    const RM = matchMedia('(prefers-reduced-motion:reduce)').matches
    let W0 = 0
    let cols = 0
    let rows = 0
    let books: Bk[] = []
    let petals: Pt[] = []
    let tree: Map<number, string> = new Map()
    let ground = 0
    let floor: number[] = []
    let cap = 0
    let bx = 0
    let timer: ReturnType<typeof setInterval> | undefined

    const spawn = (init: boolean): Pt => {
      const top = ground - Math.round(rows * 0.55)
      return { x: bx - 14 + Math.random() * 28, y: init ? top + Math.random() * (ground - top) : top + Math.random() * 10, vx: (Math.random() - 0.5) * 0.9, v: 0.4 + Math.random() * 0.4, ph: Math.random() * 6.28, c: PINK[Math.floor(Math.random() * PINK.length)] }
    }
    const land = (c0: number) => {
      let c = Math.max(0, Math.min(cols - 1, c0))
      for (let k = 0; k < 6; k++) {
        const l = c > 0 ? floor[c - 1] : 99
        const rr = c < cols - 1 ? floor[c + 1] : 99
        if (floor[c] - Math.min(l, rr) >= 2) c += l <= rr ? -1 : 1
        else break
      }
      if (floor[c] < cap) floor[c]++
    }
    const build = () => {
      const r = rng(404)
      const px = new Map<number, string>()
      const set = (x0: number, y0: number, c: string) => {
        const x = Math.round(x0)
        const y = Math.round(y0)
        if (x < 0 || y < 0 || x >= cols || y >= rows) return
        px.set(y * cols + x, c)
      }
      ground = rows - 1
      cap = Math.max(6, Math.round(rows * 0.14))
      floor = new Array(cols).fill(0)
      for (let x = 0; x < cols; x++) set(x, ground, '#d6d1ca')
      bx = Math.round(cols * 0.7)
      const blos: [number, number, number][] = []
      const branch = (x0: number, y0: number, a: number, len: number, d: number, th: number) => {
        let x = x0
        let y = y0
        const steps = Math.max(2, Math.round(len))
        for (let i = 0; i < steps; i++) {
          x += Math.cos(a)
          y -= Math.sin(a)
          for (let k = 0; k < th; k++) set(x + k - (th >> 1), y, BARK[(d + k) % 3])
          if (d >= 3 && r() < 0.45) blos.push([x, y, d])
        }
        if (d >= 8) {
          blos.push([x, y, 9])
          return
        }
        const n = d < 2 ? 2 : r() < 0.3 ? 3 : 2
        for (let i = 0; i < n; i++) {
          const spread = 0.35 + r() * 0.5
          const na = a + (i - (n - 1) / 2) * spread + (r() - 0.5) * 0.25
          branch(x, y, na, len * (0.72 + r() * 0.1), d + 1, Math.max(1, th - (d % 2 ? 1 : 0)))
        }
      }
      branch(bx, ground - 1, Math.PI / 2 + 0.05, Math.max(18, rows * 0.15), 0, 5)
      blos.forEach(([x, y, d]) => {
        const rad = d >= 8 ? 3.6 : 2.4
        for (let dy = -4; dy <= 4; dy++)
          for (let dx = -4; dx <= 4; dx++) {
            const dd = Math.hypot(dx, dy * 1.1)
            if (dd <= rad + r() * 1.2 && r() < 0.78) set(x + dx, y + dy, PINK[Math.floor(r() * PINK.length)])
          }
      })
      tree = px
      const sx = Math.round(cols * 0.05)
      const sw = Math.min(30, Math.round(cols * 0.42))
      const sh = Math.min(64, Math.round(rows * 0.4))
      const top = ground - 1 - sh
      for (let x = 0; x < sw; x++) {
        set(sx + x, top, SHELF)
        set(sx + x, ground - 2, SHELF)
      }
      for (let y = 0; y < sh; y++) {
        set(sx, top + y, SHELF)
        set(sx + sw - 1, top + y, SHELF)
      }
      books = []
      const shelves = 4
      const gap = Math.floor((sh - 2) / shelves)
      for (let s = 0; s < shelves; s++) {
        const base = top + 1 + gap * (s + 1) - 1
        for (let x = 0; x < sw; x++) set(sx + x, base + 1, SHELF)
        let x = sx + 1
        while (x < sx + sw - 3) {
          const w = 1 + Math.floor(r() * 3)
          const h = Math.max(4, Math.min(gap - 2, 5 + Math.floor(r() * (gap - 4))))
          if (x + w >= sx + sw - 1) break
          if (r() < 0.12) {
            x += 2
            continue
          }
          books.push({ x, w, h, base, c: BOOKS[Math.floor(r() * BOOKS.length)], off: 0, lean: 0, t0: -1 })
          x += w + (r() < 0.25 ? 1 : 0)
        }
      }
      petals = []
      for (let i = 0; i < 22; i++) petals.push(spawn(true))
      if (RM) for (let i = 0; i < cols * cap * 0.45; i++) land(Math.floor(Math.random() * cols))
    }
    const draw = (t: number) => {
      g.clearRect(0, 0, cols, rows)
      tree.forEach((c, k) => {
        g.fillStyle = c
        g.fillRect(k % cols, Math.floor(k / cols), 1, 1)
      })
      for (let x = 0; x < cols; x++)
        for (let y = 0; y < floor[x]; y++) {
          g.fillStyle = PINK[((Math.imul(x, 73856093) ^ Math.imul(y, 19349663)) >>> 0) % PINK.length]
          g.fillRect(x, ground - 1 - y, 1, 1)
        }
      books.forEach((b) => {
        g.fillStyle = b.c
        const o = b.off | 0
        for (let y = 0; y < b.h; y++) {
          const sh = b.lean ? Math.round(b.lean * (y / b.h)) : 0
          g.fillRect(b.x + sh, b.base - y - o, b.w, 1)
        }
      })
      petals.forEach((p) => {
        g.fillStyle = p.c
        g.fillRect(Math.round(p.x + Math.sin(p.ph + t * 0.0006) * 2), Math.round(p.y), 1, 1)
      })
    }
    const resize = () => {
      const w = Math.round(st.getBoundingClientRect().width)
      const h = Math.round(st.getBoundingClientRect().height)
      if (!w || (W0 && w === W0)) return
      W0 = w
      cols = Math.ceil(w / CELL)
      rows = Math.ceil(h / CELL)
      cv.width = cols
      cv.height = rows
      build()
      draw(0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(st)
    if (!RM) {
      let pick = 0
      timer = setInterval(() => {
        if (document.hidden) return
        const t = performance.now()
        petals.forEach((p, i) => {
          p.y += p.v
          p.x += p.vx * 0.6
          if (p.x < 0 || p.x >= cols) {
            petals[i] = spawn(false)
            return
          }
          const c = Math.round(p.x)
          if (p.y >= ground - 1 - floor[Math.max(0, Math.min(cols - 1, c))]) {
            land(c)
            petals[i] = spawn(false)
          }
        })
        if (t - pick > 2600) {
          pick = t
          const b = books[Math.floor(Math.random() * books.length)]
          if (b) {
            b.t0 = t
            b.kind = Math.random() < 0.35 ? 'lean' : 'out'
          }
        }
        books.forEach((b) => {
          if (b.t0 < 0) return
          const e = (t - b.t0) / 1400
          if (e >= 1) {
            b.off = 0
            b.lean = 0
            b.t0 = -1
            return
          }
          const k = Math.sin(Math.PI * e)
          if (b.kind === 'lean') b.lean = Math.round(k * 2)
          else b.off = k * 2.4
        })
        draw(t)
      }, 90)
    }
    return () => {
      ro.disconnect()
      if (timer) clearInterval(timer)
    }
  }, [ref])
}

export function NotFound404() {
  const cv = React.useRef<HTMLCanvasElement>(null)
  useScene(cv)
  return (
    <div className="stage">
      <canvas id="wp" ref={cv} aria-hidden="true" />
      <h1 className="err">Error 404</h1>
      <p className="q">&ldquo;Fly, you fools! This page that you seek is not within any shelf of mine.&rdquo;</p>
      <p className="by">&mdash; J. R. R. Tolkien</p>
      <Link className="homelogo" href="/" aria-label="Home"><span aria-hidden="true"><PixelIcon name="home" /></span></Link>
      <nav className="more" aria-label="Other pages">
        <Link className="link" href="/meetups">Meetups</Link>
        <Link className="link" href="/listicles">Listicles</Link>
        <a className="link" href="mailto:brokebibliophilesbangalore@gmail.com">Email us</a>
      </nav>
    </div>
  )
}
