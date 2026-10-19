'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { forgotPassword, signIn } from '@/lib/auth'
import { PasswordField } from './AuthForm'
import { PhraseCard } from './PhraseCard'
import { refreshMe } from './useMe'

const MAIL = 'brokebibliophilesbangalore@gmail.com'

/** forgot.html: prove it is you (12 words or an admin's code), choose a new password, then see the NEW phrase once. */
export function ForgotFlow() {
  const router = useRouter()
  const [step, setStep] = React.useState<1 | 2 | 3>(1)
  const [mode, setMode] = React.useState<'phrase' | 'code'>('phrase')
  const [email, setEmail] = React.useState('')
  const [secret, setSecret] = React.useState('')
  const [pw, setPw] = React.useState('')
  const [msg, setMsg] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [words, setWords] = React.useState<string[] | null>(null)
  const typed = React.useRef('')

  const next = () => {
    setMsg(null)
    if (!email.trim()) return setMsg('Enter your email.')
    if (mode === 'phrase') {
      if (secret.trim().split(/\s+/).filter(Boolean).length !== 12) return setMsg('Enter all 12 words, separated by spaces.')
    } else if (!secret.trim()) return setMsg('Enter the reset code.')
    setStep(2)
  }
  const submit = async () => {
    setMsg(null)
    if (pw.length < 8) return setMsg('Use 8 or more characters.')
    setBusy(true)
    try {
      const phrase = await forgotPassword({ email: email.trim(), password: pw, ...(mode === 'phrase' ? { phrase: secret } : { code: secret }) })
      typed.current = pw
      setSecret('')
      setPw('')
      setWords(phrase)
      setStep(3)
    } catch (e) {
      const err = e as Error & { status?: number }
      setMsg(err.message)
      if (err.status !== 422) setStep(1) // the details did not match (or too many tries): back to the first screen, nothing is revealed
    } finally {
      setBusy(false)
    }
  }
  // After the new phrase is saved: sign in with the new password so the member lands on Me; fall back to the sign-in page.
  const finish = async () => {
    const p = typed.current
    typed.current = ''
    setWords(null)
    try {
      await signIn(email.trim(), p, undefined, false)
      await refreshMe()
      router.push('/me')
    } catch {
      router.push('/login?reset=1')
    }
  }

  return (
    <div className="auth">
      <Link className="back" href="/login"><span aria-hidden="true">&lsaquo;</span>Sign in</Link>
      <h1 className="h1">{step === 3 ? 'Your new recovery phrase' : 'Reset your password'}</h1>
      {step === 1 && (
        <>
          <p className="body" style={{ marginTop: 8 }}>Choose how to prove it is you.</p>
          <div className="tabs2" role="group" aria-label="Method">
            <button type="button" aria-pressed={mode === 'phrase'} onClick={() => { setMode('phrase'); setSecret(''); setMsg(null) }}>My 12 words</button>
            <button type="button" aria-pressed={mode === 'code'} onClick={() => { setMode('code'); setSecret(''); setMsg(null) }}>A code from an admin</button>
          </div>
          <label className="l" htmlFor="em">Email</label>
          <div className="field"><input id="em" type="email" autoComplete="username" inputMode="email" autoCapitalize="none" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          {mode === 'phrase' ? (
            <>
              <label className="l" htmlFor="ph">Your 12 recovery words, in order</label>
              <div className="field"><textarea id="ph" autoCapitalize="none" autoComplete="off" autoCorrect="off" spellCheck={false} placeholder="word1 word2 word3 ..." value={secret} onChange={(e) => setSecret(e.target.value)} /></div>
              <p className="cap" style={{ marginTop: 6 }}>Lost the 12 words? Choose &quot;A code from an admin&quot;.</p>
            </>
          ) : (
            <>
              <label className="l" htmlFor="cd">Reset code</label>
              <div className="field"><input id="cd" type="text" autoCapitalize="characters" autoComplete="off" spellCheck={false} value={secret} onChange={(e) => setSecret(e.target.value)} /></div>
              <p className="cap" style={{ marginTop: 6 }}>Ask an admin for a one-time reset code. It works once and expires after 24 hours. Write to <a style={{ color: 'var(--ink)' }} href={`mailto:${MAIL}`}>{MAIL}</a>.</p>
            </>
          )}
          {msg && <p className="notice err" role="alert">{msg}</p>}
          <div className="sp16" />
          <button className="btn" type="button" onClick={next} style={{ width: '100%' }}><span>Continue</span><span aria-hidden="true">&rsaquo;</span></button>
        </>
      )}
      {step === 2 && (
        <>
          <p className="body" style={{ marginTop: 8 }}>Choose a new password.</p>
          <PasswordField id="np" label="New password (8 or more characters)" value={pw} onChange={setPw} auto="new-password" />
          {msg && <p className="notice err" role="alert">{msg}</p>}
          <div className="sp16" />
          <button className="btn" type="button" disabled={busy} onClick={submit} style={{ width: '100%' }}><span>{busy ? 'Setting...' : 'Set password'}</span><span aria-hidden="true">&rsaquo;</span></button>
          <p className="body" style={{ marginTop: 8 }}><button className="toggle" type="button" onClick={() => { setMsg(null); setStep(1) }}>Back</button></p>
        </>
      )}
      {step === 3 && words && (
        <>
          <p className="body" style={{ marginTop: 8 }}>Your password is changed. This is your new recovery phrase. The old one no longer works.</p>
          <PhraseCard words={words} onContinue={finish} />
        </>
      )}
    </div>
  )
}
