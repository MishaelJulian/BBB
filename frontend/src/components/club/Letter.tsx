'use client'

import * as React from 'react'
import { supabase } from '@/lib/supabase'

const LETTER =
  "Dear reader,\n\nThis site is a work in progress. You are early, which is the best time to be here and the worst time to expect things to work.\n\nIt is in alpha. Things will move, break and occasionally vanish. If you want full access to the club's records and you have not linked your member record yet, use the invite link an admin gave you.\n\nTell us what is broken. That is the whole job.\n\nThanks for reading with us."
const SIGNED = '\n\nDhilipan\nSystem Architect'

/** N2: shown once, on an account's very first sign-in (not after linking a record). The flag lives on the account, so it follows them to a new phone. */
export function Letter() {
  const ref = React.useRef<HTMLDialogElement>(null)
  const [text, setText] = React.useState('')
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    let dead = false
    void supabase.auth.getUser().then(({ data }) => {
      if (dead || !data.user) return
      if (data.user.user_metadata?.letter_seen) return
      setOpen(true)
    })
    return () => {
      dead = true
    }
  }, [])

  React.useEffect(() => {
    const d = ref.current
    if (!open || !d) return
    d.showModal()
    const full = LETTER + SIGNED
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return void setText(full)
    let i = 0
    const t = setInterval(() => {
      i++
      setText(full.slice(0, i))
      if (i >= full.length) clearInterval(t)
    }, 22)
    return () => clearInterval(t)
  }, [open])

  const done = () => {
    ref.current?.close()
    setOpen(false)
    void supabase.auth.updateUser({ data: { letter_seen: true } })
  }
  if (!open) return null
  return (
    <dialog className="sheetx" id="lt" ref={ref} aria-label="A letter from the club" onCancel={(e) => { e.preventDefault(); done() }}>
      <div className="letter"><div style={{ whiteSpace: 'pre-wrap' }} aria-live="off">{text}</div></div>
      <div className="foot">
        <button className="btn" type="button" onClick={done}><span>Got it</span><span aria-hidden="true">&rsaquo;</span></button>
      </div>
    </dialog>
  )
}
