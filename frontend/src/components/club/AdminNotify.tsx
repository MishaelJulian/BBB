'use client'

import * as React from 'react'
import { AdminPage, Back, copy, E, useApi } from './AdminKit'
import { useMe } from './useMe'

/** Notify members: a draft only. There is no sending domain yet, so Send stays off and the message can be copied. */
export function AdminNotify() {
  const me = useMe()
  const ov = useApi<{ accounts: number | null; linked: number }>(me.state === 'admin' ? '/api/admin/overview' : null)
  const [subj, setSubj] = React.useState('')
  const [msg, setMsg] = React.useState('Fourth Sunday, 2:30 to 4:30 pm, The Bookworm, Church Street, Bengaluru.\nReply to this message to say you are coming.')
  const [copied, setCopied] = React.useState('')
  const o = ov.data
  return (
    <AdminPage crumbs={[{ href: '/admin', label: 'Admin' }, { label: 'Notify' }]}>
      <h1 className="h1">Notify members</h1>
      <section className="block" style={{ marginTop: 28 }} aria-labelledby="ah">
        <p className="sec" id="ah">Audience</p>
        <p className="body" style={{ marginTop: 6 }}>{o ? `Accounts that can be reached: ${o.accounts ?? 'not counted here'} (${o.linked} linked to a member).` : ' '}</p>
      </section>
      <label className="f" style={{ marginTop: 32 }}><span>Subject</span><input id="subj" maxLength={100} autoComplete="off" placeholder="For example, the meetup you are announcing" value={subj} onChange={(e) => setSubj(e.target.value)} /></label>
      <label className="f"><span>Message</span><textarea id="msg" value={msg} onChange={(e) => setMsg(e.target.value)} /></label>
      <section className="block" style={{ marginTop: 32 }} aria-labelledby="ph">
        <p className="sec" id="ph">Preview</p>
        <p className="pre" aria-live="polite">
          {subj.trim() && <b>{E(subj.trim())}<br /><br /></b>}
          {msg ? msg.split('\n').map((l, i) => <React.Fragment key={i}>{i > 0 && <br />}{l}</React.Fragment>) : !subj.trim() && 'Nothing to preview yet.'}
        </p>
        <button type="button" className="lnk" onClick={async () => setCopied((await copy(`${subj.trim() ? `${subj.trim()}\n\n` : ''}${msg}`)) ? 'Copied.' : 'Could not copy. Select the text and copy it.')}>Copy the message</button>
        <span className="note" aria-live="polite"> {copied}</span>
      </section>
      <div className="why">
        <p className="sec">Sending</p>
        <p className="body" style={{ marginTop: 6 }}>Sending is not connected yet, so the Send button stays off. The plan is the club&apos;s Gmail over SMTP.</p>
        <div className="nav2">
          <button type="button" className="btn" aria-disabled="true" disabled style={{ width: '100%' }}><span>Send</span><span aria-hidden="true">&rsaquo;</span></button>
          <Back href="/admin" label="Admin" />
        </div>
      </div>
      <div className="sp32" />
    </AdminPage>
  )
}
