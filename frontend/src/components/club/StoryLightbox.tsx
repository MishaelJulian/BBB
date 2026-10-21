'use client'

import * as React from 'react'
import { STORY, groupCaption, storySrc } from '@/lib/club/story100'
import { Lightbox } from './Lightbox'

type Ctx = { open: (index: number) => void }
const StoryCtx = React.createContext<Ctx | null>(null)

export function useStoryLightbox() {
  const c = React.useContext(StoryCtx)
  if (!c) throw new Error('StoryPhotos needs a StoryLightboxProvider above it.')
  return c
}

/**
 * One viewer for the whole story, so the photos can be swiped end to end
 * instead of each group carrying its own copy of the markup.
 */
export function StoryLightboxProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState<number | null>(null)
  const items = React.useMemo(() => STORY.map((p) => ({ src: storySrc(p), alt: p.alt, caption: groupCaption(p.group) })), [])
  const value = React.useMemo(() => ({ open: setOpen }), [])
  return (
    <StoryCtx.Provider value={value}>
      {children}
      <Lightbox items={items} open={open} onClose={() => setOpen(null)} domId="lbstory" />
    </StoryCtx.Provider>
  )
}
