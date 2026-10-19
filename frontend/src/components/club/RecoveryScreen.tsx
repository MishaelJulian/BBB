'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { makeRecoveryPhrase, safeNext } from '@/lib/auth'
import { PhraseCard } from './PhraseCard'
import { useMe } from './useMe'

/** /recovery?first=1: the recovery phrase right after sign-up or first sign-in, shown once (recovery.html). */
export function RecoveryScreen() {
  const me = useMe()
  const router = useRouter()
  const [words, setWords] = React.useState<string[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const started = React.useRef(false)

  React.useEffect(() => {
    if ((me.state !== 'member' && me.state !== 'admin' && me.state !== 'new') || started.current) return
    started.current = true
    makeRecoveryPhrase().then(setWords, (e: Error) => setError(e.message))
  }, [me.state])

  const go = () => {
    setWords(null) // the words leave the page
    router.push(safeNext(new URLSearchParams(window.location.search).get('next')))
  }
  return (
    <div className="auth">
      <h1 className="h1">Your recovery phrase</h1>
      {me.state === 'loading' && <p className="body" style={{ marginTop: 8 }}>One moment...</p>}
      {me.state === 'out' && (
        <>
          <p className="body" style={{ marginTop: 8 }}>Sign in to make your recovery phrase.</p>
          <div className="sp24" />
          <Link className="btn" href="/login"><span>Sign in</span><span aria-hidden="true">&rsaquo;</span></Link>
        </>
      )}
      {error && (
        <>
          <p className="notice err" role="alert">{error === 'Enter your password.' ? 'Your recovery phrase was already made, and it cannot be shown again.' : error}</p>
          <p className="body" style={{ marginTop: 12 }}>You can make a new one any time from <Link className="link" href="/account?s=recovery">Account</Link>.</p>
          <div className="sp16" />
          <button className="btn" type="button" onClick={go} style={{ width: '100%' }}><span>Continue</span><span aria-hidden="true">&rsaquo;</span></button>
        </>
      )}
      {words && (
        <>
          <p className="body" style={{ marginTop: 8 }}>Welcome. Before you go on, save your recovery phrase.</p>
          <PhraseCard words={words} onContinue={go} />
        </>
      )}
    </div>
  )
}
