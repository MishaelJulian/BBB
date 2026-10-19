'use client'

import * as React from 'react'

/** A long synopsis, shown short until the reader asks for the rest. */
export function ReadMore({ text }: { text: string }) {
  const [open, setOpen] = React.useState(false)
  return (
    <>
      <p className={`body por${open ? ' open' : ''}`} id="ds">{text}</p>
      {text.length > 280 && (
        <button className="rd" type="button" aria-expanded={open} aria-controls="ds" onClick={() => setOpen((o) => !o)}>{open ? 'Read less' : 'Read more'}</button>
      )}
    </>
  )
}
