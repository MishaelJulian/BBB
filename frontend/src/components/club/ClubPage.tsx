'use client'

import * as React from 'react'
import Link from 'next/link'
import { PixelIcon, type IconName } from './icons'
import { useMe } from './useMe'
import { MapBackdrop } from './MapBackdrop'
import { SearchDialog } from './SearchDialog'
import { ClubFooter } from './ClubFooter'

export type Crumb = { href?: string; label: string }
export type Tab = 'home' | 'dir' | 'lib' | 'club' | 'me' | ''

interface Props {
  /** 'home' = brand bar, 'crumb' = breadcrumb bar, 'back' = back arrow bar */
  kind?: 'home' | 'crumb' | 'back'
  crumbs?: Crumb[]
  tab?: Tab
  /** The Home page keeps the sharper map; every other page shows it as dusty wallpaper. */
  home?: boolean
  /** Skip the page-wide map (404 draws its own scene). */
  noMap?: boolean
  /** Render children without the 430 px column wrapper. */
  bare?: boolean
  /** No floating search button (the 404 page). */
  noSearch?: boolean
  /** Extra class on <main>. */
  mainClass?: string
  children: React.ReactNode
}

function TopBar({ kind, crumbs }: { kind: 'home' | 'crumb' | 'back'; crumbs: Crumb[] }) {
  const me = useMe()
  const ref = React.useRef<HTMLElement>(null)
  // Hides going down; returns on a fast scroll up (the thresholds were tuned in the mockup).
  React.useEffect(() => {
    const FAST_PX = 24
    const FAST_MS = 150
    let lastY = window.scrollY
    let upDist = 0
    let upStart = 0
    const onScroll = () => {
      const bar = ref.current
      if (!bar) return
      const y = window.scrollY
      const dy = y - lastY
      const now = performance.now()
      lastY = y
      if (y <= 0) return void bar.classList.remove('hide')
      if (dy > 0) {
        upDist = 0
        upStart = 0
        if (y > 48) bar.classList.add('hide')
      } else if (dy < 0) {
        if (!upStart || now - upStart > FAST_MS) {
          upStart = now
          upDist = 0
        }
        upDist += -dy
        if (upDist >= FAST_PX && now - upStart <= FAST_MS) {
          bar.classList.remove('hide')
          upDist = 0
          upStart = 0
        }
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const signedIn = me.state === 'member' || me.state === 'admin'
  const first = me.name ? me.name.split(' ')[0] : null
  return (
    <header className="topbar" id="topbar" ref={ref}>
      {kind === 'home' && (
        <>
          <Link className="brand" href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ui/logo-bbb-arc-96.png" width={32} height={32} alt="" />
            <b className={signedIn && first ? 'hi' : undefined}>{signedIn && first ? `Hi, ${first}` : 'BBB'}</b>
          </Link>
          {signedIn && first && (
            <Link className={`pfp${me.state === 'admin' ? ' adm' : ''}`} href="/me" aria-label={`Me, ${first}${me.state === 'admin' ? ', admin' : ''}`}>
              <span>{first[0]}</span>
            </Link>
          )}
        </>
      )}
      {kind === 'crumb' && (
        <nav className="crumb" aria-label="Breadcrumb">
          {crumbs.map((c, i) => (
            <React.Fragment key={i}>
              {i > 0 && <> &rsaquo; </>}
              {c.href ? <Link href={c.href}>{c.label}</Link> : <b>{c.label}</b>}
            </React.Fragment>
          ))}
        </nav>
      )}
      {kind === 'back' && (
        <>
          <Link className="icobtn" style={{ marginLeft: -12 }} href="/" aria-label="Back to Home">
            <span className="backpx"><PixelIcon name="back" /></span>
          </Link>
          <span className="cap" style={{ marginLeft: 4 }}>BBB</span>
        </>
      )}
      <Link className="adminlink" href="/admin">
        Admin
      </Link>
    </header>
  )
}

const TABS: [Tab, string, IconName][] = [
  ['home', 'Home', 'home'],
  ['dir', 'Directory', 'dir'],
  ['lib', 'Library', 'lib'],
  ['club', 'Club', 'club'],
  ['me', 'Me', 'me'],
]

export function TabBar({ active }: { active: Tab }) {
  const me = useMe()
  const href = (k: Tab) => (k === 'home' ? '/' : k === 'dir' ? '/directory' : k === 'lib' ? '/library-room' : k === 'club' ? '/club' : me.state === 'out' ? '/login' : '/me')
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map(([k, label, icon]) => (
        <Link key={k} href={href(k)} className={k === 'lib' ? 'big' : undefined} aria-current={active === k ? 'page' : undefined}>
          <PixelIcon name={icon} />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  )
}

export function ClubPage({ kind = 'home', crumbs = [], tab = '', home = false, noMap = false, bare = false, noSearch = false, mainClass = '', children }: Props) {
  const [searchOpen, setSearchOpen] = React.useState(false)
  React.useEffect(() => {
    const el = document.documentElement
    if (!home) el.dataset.page = 'inner'
    return () => {
      delete el.dataset.page
    }
  }, [home])
  return (
    <div className="club">
      {!noMap && <MapBackdrop />}
      <TopBar kind={kind} crumbs={crumbs} />
      {kind !== 'back' && !noSearch && (
        <button className="fsearch" id="open-search" type="button" aria-label="Search" onClick={() => setSearchOpen(true)}>
          <PixelIcon name="search" />
        </button>
      )}
      <main className={`reveal${mainClass ? ` ${mainClass}` : ''}`} id="top">
        {bare ? children : <div className="wrap">{children}</div>}
      </main>
      <ClubFooter />
      <TabBar active={tab} />
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}
