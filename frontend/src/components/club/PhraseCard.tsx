'use client'

import * as React from 'react'

/** The 12 words, shown once: numbered, Copy, Download, and a tick before Continue (recovery.html). The words live only in this component's props. */
export function PhraseCard({ words, onContinue, label = 'Continue' }: { words: string[]; onContinue: () => void; label?: string }) {
  const [saved, setSaved] = React.useState(false)
  const [note, setNote] = React.useState('')
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(words.join(' '))
      setNote('Copied.')
    } catch {
      setNote('Copy failed. Write the words down.')
    }
  }
  const download = () => {
    const day = new Date().toISOString().slice(0, 10)
    const b = new Blob([`BBB recovery phrase (${day})\n\n${words.map((w, i) => `${i + 1}. ${w}`).join('\n')}\n`], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(b)
    a.download = 'bbb-recovery-phrase.txt'
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    setNote('Downloaded.')
  }
  return (
    <>
      <div className="warn" role="note">If you forget your password, these 12 words are the only way to reset it yourself. We cannot show them again. Keep them somewhere safe and private.</div>
      <ol className="words" aria-label="Your 12 recovery words" data-testid="phrase-words">
        {words.map((w, i) => <li key={i}>{w}</li>)}
      </ol>
      <div className="acts">
        <button className="fbtn" type="button" onClick={copy}>Copy</button>
        <button className="fbtn" type="button" onClick={download}>Download</button>
      </div>
      <p className="cap" role="status" style={{ minHeight: 21 }}>{note}</p>
      <label className="chk"><input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} /><span>I have saved it somewhere safe.</span></label>
      <div className="sp16" />
      <button className="btn" type="button" disabled={!saved} onClick={onContinue} style={{ width: '100%' }}><span>{label}</span><span aria-hidden="true">&rsaquo;</span></button>
    </>
  )
}
