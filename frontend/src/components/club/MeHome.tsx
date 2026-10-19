'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authFetch, signOut } from '@/lib/auth'
import { Letter } from './Letter'
import { refreshMe, useMe } from './useMe'

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const d2 = (d: string) => new Date(d.slice(0, 10) + 'T00:00:00')
const my = (d: string) => `${MON[d2(d).getMonth()]} ${d2(d).getFullYear()}`
const stamp = (d: string) => `${d2(d).getDate()} ${MON[d2(d).getMonth()].toUpperCase()} ${String(d2(d).getFullYear()).slice(2)}`
const today = () => {
  const t = new Date()
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
}

interface Card { name: string; code: string | null; first: string | null; total: number; stamps: { n: number; d: string }[] }

function LibraryCard({ c }: { c: Card }) {
  return (
    <div className="lcard" role="group" aria-label={`Library card for ${c.name}`}>
      <span className="slot" aria-hidden="true" />
      <div className="row2">
        <div>
          <div className="t">BBB library card</div>
          <div className="nm">{c.name}</div>
          {c.code && <div className="k">Code {c.code}</div>}
          {c.first && <div className="k">First meetup on record: {my(c.first)}</div>}
        </div>
        {c.stamps.length > 0 && (
          <div className="st">
            <b>Stamps</b>
            {c.stamps.map((s) => (
              <React.Fragment key={s.n}>#{s.n} &middot; {stamp(s.d)}<br /></React.Fragment>
            ))}
            {c.total > c.stamps.length && <span style={{ fontWeight: 400, color: 'var(--muted)' }}>+ {c.total - c.stamps.length} more</span>}
          </div>
        )}
      </div>
    </div>
  )
}

/** N1: asked once a day on this phone, for members with a linked record. */
function DidYouRead({ name }: { name: string }) {
  const [ans, setAns] = React.useState<{ d: string; a: 'y' | 'n' } | null | undefined>(undefined)
  React.useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem('bbb_n1') || 'null')
      setAns(v && v.d === today() ? v : null)
    } catch {
      setAns(null)
    }
  }, [])
  if (ans === undefined) return null
  const set = (a: 'y' | 'n') => {
    const v = { d: today(), a }
    try {
      localStorage.setItem('bbb_n1', JSON.stringify(v))
    } catch {}
    setAns(v)
  }
  if (ans)
    return (
      <div className="n1">
        <p className={`note1 ${ans.a === 'y' ? 'good' : 'bad'}`} role="status">{ans.a === 'y' ? 'Good. That is a few more pages.' : `Damn, that's crazy, ${name}.`}</p>
      </div>
    )
  return (
    <div className="n1">
      <p className="q" id="n1q">Did you read today?</p>
      <div className="yn" role="group" aria-labelledby="n1q">
        <button className="y" type="button" onClick={() => set('y')}>Yes</button>
        <button type="button" onClick={() => set('n')}>No</button>
      </div>
    </div>
  )
}

function LinkRecord({ onDone }: { onDone: () => void }) {
  const [code, setCode] = React.useState('')
  const [pin, setPin] = React.useState('')
  const [msg, setMsg] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  return (
    <div className="auth">
      <h1 className="h1">Link your record</h1>
      <p className="body" style={{ marginTop: 12 }}>An admin gives you an invite link, or a code. It links your account to your name in the club records.</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          setMsg('')
          const r = await authFetch('/api/me/claim', { method: 'POST', body: JSON.stringify({ code, pin: pin || undefined }) })
          if (r.ok) return onDone()
          const j = await r.json().catch(() => null)
          setMsg(j?.detail || j?.error?.message || 'The code did not work.')
          setBusy(false)
        }}
      >
        <label className="l" htmlFor="cd">Invite code</label>
        <div className="field"><input id="cd" autoComplete="off" autoCapitalize="characters" placeholder="7QK2M-9XH4T" value={code} onChange={(e) => setCode(e.target.value)} /></div>
        <label className="l" htmlFor="pin">PIN (only if the admin gave you one)</label>
        <div className="field"><input id="pin" inputMode="numeric" autoComplete="off" value={pin} onChange={(e) => setPin(e.target.value)} /></div>
        {msg && <p className="notice err" role="alert">{msg}</p>}
        <div className="sp16" />
        <button className="btn" type="submit" disabled={busy || !code}><span>{busy ? 'Linking...' : 'Link record'}</span><span aria-hidden="true">&rsaquo;</span></button>
      </form>
    </div>
  )
}

export function MeHome() {
  const me = useMe()
  const router = useRouter()
  const [card, setCard] = React.useState<Card | null | undefined>(undefined)
  React.useEffect(() => {
    if (me.state !== 'member' && me.state !== 'admin') return
    let dead = false
    void authFetch('/api/me/card').then(async (r) => {
      const j = r.ok ? await r.json() : null
      if (!dead) setCard(j && j.linked !== false ? (j as Card) : null)
    })
    return () => {
      dead = true
    }
  }, [me.state])

  if (me.state === 'loading') return <p className="body">One moment...</p>
  if (me.state === 'out')
    return (
      <>
        <h1 className="h1">Me</h1>
        <p className="body" style={{ marginTop: 12 }}>Sign in to see your library card, entries and picks.</p>
        <div className="sp24" />
        <Link className="btn" href="/login"><span>Sign in</span><span aria-hidden="true">&rsaquo;</span></Link>
      </>
    )
  const rows = (
    <div style={{ marginTop: 24 }}>
      {(me.state === 'member' || card) && (
        <>
          <Link className="rowl" href="/me/entries"><span><span className="t1">Entries</span><span className="t2">Books you brought</span></span><span className="go" aria-hidden="true">&rsaquo;</span></Link>
          <Link className="rowl" href="/me/wishlist"><span><span className="t1">Wishlist</span><span className="t2">Books you want to read</span></span><span className="go" aria-hidden="true">&rsaquo;</span></Link>
          <Link className="rowl" href="/me/picks"><span><span className="t1">Closet Picks</span><span className="t2">Up to four from the Library</span></span><span className="go" aria-hidden="true">&rsaquo;</span></Link>
        </>
      )}
      <Link className="rowl" href="/account"><span><span className="t1">Profile and account</span><span className="t2">Name, bio, password</span></span><span className="go" aria-hidden="true">&rsaquo;</span></Link>
      <button
        className="rowl"
        type="button"
        style={{ width: '100%', background: 'none', border: 0, textAlign: 'left', borderTop: '1px solid var(--line2)', borderBottom: '1px solid var(--line2)', cursor: 'pointer', font: 'inherit' }}
        onClick={async () => {
          await signOut()
          await refreshMe()
          router.push('/')
        }}
      >
        <span><span className="t1">Sign out</span></span><span className="go" aria-hidden="true">&rsaquo;</span>
      </button>
    </div>
  )
  if (me.state === 'new')
    return (
      <>
        <Letter />
        <LinkRecord onDone={async () => { await refreshMe(); router.refresh() }} />
        {rows}
      </>
    )
  return (
    <>
      <Letter />
      <h1 className="h1">Me</h1>
      {card === undefined ? null : card ? (
        <>
          <LibraryCard c={card} />
          <DidYouRead name={card.name.split(' ')[0]} />
        </>
      ) : (
        <p className="body" style={{ marginTop: 12 }}>No member record is linked to this login yet.</p>
      )}
      {rows}
    </>
  )
}
