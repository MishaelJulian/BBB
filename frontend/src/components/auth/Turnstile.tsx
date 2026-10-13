'use client'

import * as React from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string
      reset: (id?: string) => void
      remove: (id?: string) => void
    }
  }
}

const SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

export interface TurnstileHandle { reset: () => void }

// ponytail: Cloudflare's script, rendered explicitly; no wrapper package. Tokens are single use, so call reset() after every attempt.
export const Turnstile = React.forwardRef<TurnstileHandle, { onToken: (t: string | null) => void }>(function Turnstile({ onToken }, ref) {
  const box = React.useRef<HTMLDivElement>(null)
  const widget = React.useRef<string | undefined>(undefined)
  const cb = React.useRef(onToken)
  cb.current = onToken

  React.useImperativeHandle(ref, () => ({ reset: () => { cb.current(null); if (widget.current) window.turnstile?.reset(widget.current) } }), [])

  React.useEffect(() => {
    if (!SITE_KEY || !box.current) return
    let cancelled = false
    const mount = () => {
      if (cancelled || !box.current || !window.turnstile || widget.current) return
      widget.current = window.turnstile.render(box.current, {
        sitekey: SITE_KEY,
        callback: (t: string) => cb.current(t),
        'expired-callback': () => cb.current(null),
        'error-callback': () => cb.current(null),
      })
    }
    if (window.turnstile) mount()
    else {
      let s = document.querySelector<HTMLScriptElement>(`script[src="${SRC}"]`)
      if (!s) { s = document.createElement('script'); s.src = SRC; s.async = true; document.head.appendChild(s) }
      s.addEventListener('load', mount)
    }
    return () => { cancelled = true; if (widget.current) { window.turnstile?.remove(widget.current); widget.current = undefined } }
  }, [])

  if (!SITE_KEY) return <p className="text-xs text-muted">Bot check is not configured (NEXT_PUBLIC_TURNSTILE_SITE_KEY).</p>
  return <div ref={box} aria-label="Bot check" />
})
