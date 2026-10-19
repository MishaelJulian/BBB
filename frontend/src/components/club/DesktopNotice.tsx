'use client'

import * as React from 'react'
import { useScene } from './NotFound404'

const DESKTOP = '(min-width:900px) and (hover:hover) and (pointer:fine)'

/**
 * Shown instead of the app on a large screen with a mouse (see styles/desktop-gate.css). The same pixel scene as the 404 page,
 * drawn only when it is actually visible so phones never run it. A developer can open any page with ?desktop=1 to see the app anyway
 * (kept for the rest of the browser session).
 */
export function DesktopNotice() {
  const cv = React.useRef<HTMLCanvasElement>(null)
  const [on, setOn] = React.useState(false)
  React.useEffect(() => {
    try {
      if (new URLSearchParams(window.location.search).get('desktop') === '1') sessionStorage.setItem('bbb_desktop_ok', '1')
      if (sessionStorage.getItem('bbb_desktop_ok') === '1') document.documentElement.dataset.desktop = 'ok'
    } catch {}
    setOn(matchMedia(DESKTOP).matches && document.documentElement.dataset.desktop !== 'ok')
  }, [])
  return (
    <div className="club desk-notice" role="region" aria-label="Desktop notice">
      <div className="stage">
        {on && <ScenePaint cv={cv} />}
        <canvas ref={cv} aria-hidden="true" />
        <h1 className="err">The site is not meant for desktop use.</h1>
        <p className="q">Please open it in your browser on any mobile device and continue your exploration for the time being.</p>
      </div>
    </div>
  )
}

function ScenePaint({ cv }: { cv: React.RefObject<HTMLCanvasElement | null> }) {
  useScene(cv)
  return null
}
