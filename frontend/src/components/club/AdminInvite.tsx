'use client'

import * as React from 'react'
import { api, copy, fmt, Msg, Sheet } from './AdminKit'

/** Make a personal invite link for a member record: POST /api/admin/members/[id]/invite, optional PIN, link and PIN shown once. */
export function InviteSheet({ member, onClose, onDone }: { member: { id: string; name: string } | null; onClose: () => void; onDone: () => void }) {
  const [pin, setPin] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [msg, setMsg] = React.useState<{ ok: boolean; t: string } | null>(null)
  const [invite, setInvite] = React.useState<{ link: string; pin: string | null; expires: string } | null>(null)
  const [copied, setCopied] = React.useState('')
  const reset = () => { setPin(''); setMsg(null); setInvite(null); setCopied(''); setBusy(false) }
  React.useEffect(() => { if (!member) reset() }, [member])
  const first = member?.name.split(' ')[0]

  const make = async () => {
    if (!member) return
    setBusy(true)
    setMsg(null)
    try {
      const r = await api<{ code: string; expires_at: string; pin: boolean }>(`/api/admin/members/${encodeURIComponent(member.id)}/invite`, { json: pin.trim() ? { pin: pin.trim() } : {} })
      setInvite({ link: `${window.location.origin}/join#code=${r.code}${r.pin ? '&pin=1' : ''}`, pin: r.pin ? pin.trim() : null, expires: r.expires_at })
    } catch (e) {
      setMsg({ ok: false, t: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }
  const share = async () => {
    if (!invite) return
    try { await navigator.share({ title: 'BBB Library invite', text: 'Your personal invite to the BBB Library (it works once):', url: invite.link }) } catch { /* cancelled or unavailable: Copy still works */ }
  }
  const finish = () => { onClose(); onDone() }

  return (
    <Sheet open={!!member} onClose={invite ? finish : onClose}>
      {!invite ? (
        <>
          <p className="h2">Invite link for {member?.name}</p>
          <p className="body">A one-time link that lets {first} make their own account and attach it to this record. It expires in 14 days, and any earlier unused code for this person stops working.</p>
          <label className="fl" htmlFor="pin">PIN (optional, 4 to 8 digits)</label>
          <input className="fld" id="pin" inputMode="numeric" autoComplete="off" maxLength={8} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
          <p className="cap" style={{ marginTop: 8 }}>With a PIN, send the link and the PIN by two different channels (for example the link in chat, the PIN on a call).</p>
          <Msg m={msg} />
          <div className="foot">
            <button className="x" type="button" onClick={onClose}>Cancel</button>
            <button className="btn" type="button" disabled={busy || (pin.length > 0 && pin.length < 4)} onClick={make}><span>Make the link</span><span aria-hidden="true">&rsaquo;</span></button>
          </div>
        </>
      ) : (
        <>
          <p className="h2">Invite for {member?.name}</p>
          <p className="acode" data-testid="invite-link">{invite.link}</p>
          {invite.pin && <p className="body" style={{ marginTop: 10 }}>PIN: <b data-testid="invite-pin">{invite.pin}</b></p>}
          <p className="cap" style={{ marginTop: 8 }}>Works once. Expires {fmt(invite.expires)}. Shown only now: the link cannot be shown again.{invite.pin ? ' Send the PIN by another channel.' : ''}</p>
          <div className="foot" style={{ flexWrap: 'wrap' }}>
            <button className="x" type="button" onClick={async () => setCopied((await copy(invite.link)) ? 'link' : 'failed')}>{copied === 'link' ? 'Copied' : 'Copy link'}</button>
            {invite.pin && <button className="x" type="button" onClick={async () => setCopied((await copy(invite.pin!)) ? 'pin' : 'failed')}>{copied === 'pin' ? 'PIN copied' : 'Copy PIN'}</button>}
            {typeof navigator !== 'undefined' && 'share' in navigator && <button className="x" type="button" onClick={share}>Share</button>}
            <button className="btn" type="button" onClick={finish}><span>Done</span><span aria-hidden="true">&rsaquo;</span></button>
          </div>
          {copied === 'failed' && <p className="amsg bad" role="alert">Could not copy. Select the link and copy it by hand.</p>}
        </>
      )}
    </Sheet>
  )
}
