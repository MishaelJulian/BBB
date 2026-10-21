'use client'

import * as React from 'react'
import { useScene } from './NotFound404'

const DESKTOP = '(min-width:900px) and (hover:hover) and (pointer:fine)'

/**
 * Desktop view is enabled by default with wide-screen responsive layouts (see styles/desktop-gate.css).
 * The notice scene remains available only if explicitly triggered via ?desktop=0 or data-desktop="blocked".
 */
export function DesktopNotice() {
  const cv = React.useRef<HTMLCanvasElement>(null)
  const [on, setOn] = React.useState(false)
  React.useEffect(() => {
    try {
      const param = new URLSearchParams(window.location.search).get('desktop')
      if (param === '0') {
        document.documentElement.dataset.desktop = 'blocked'
      } else {
        document.documentElement.dataset.desktop = 'ok'
      }
    } catch {}
    setOn(matchMedia(DESKTOP).matches && document.documentElement.dataset.desktop === 'blocked')
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
