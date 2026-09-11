'use client'

import * as React from 'react'
import { motion, useSpring } from 'framer-motion'
import { cn } from '@/lib/utils'

// 12 Bespoke Archival Folio binding palettes with cloth/leather textures & foil embossing
export const SPINE_PALETTES = [
  { name: 'Forest Emerald', bg: '#1E3224', accent: '#132117', foil: '#DEC176', page: '#F4ECE0', rib: '#16281D' },
  { name: 'Oxford Navy', bg: '#172435', accent: '#0E1722', foil: '#DFC388', page: '#F2E8DC', rib: '#111B28' },
  { name: 'Burgundy Morocco', bg: '#401720', accent: '#2A0E15', foil: '#E8D49E', page: '#F5ECE4', rib: '#321118' },
  { name: 'Antique Oxblood', bg: '#341414', accent: '#220D0D', foil: '#E5D09A', page: '#F3E7DC', rib: '#2A1010' },
  { name: 'Walnut Buckram', bg: '#332317', accent: '#20160E', foil: '#DCC077', page: '#F4ECE3', rib: '#271A11' },
  { name: 'Obsidian Cloth', bg: '#1D1D20', accent: '#121214', foil: '#E2E0D8', page: '#F0E9DF', rib: '#17171A' },
  { name: 'Imperial Plum', bg: '#281833', accent: '#190E20', foil: '#E4C68B', page: '#F4ECE3', rib: '#201329' },
  { name: 'Dark Spruce', bg: '#142C2C', accent: '#0C1C1C', foil: '#D8C38B', page: '#F2E9DF', rib: '#0F2222' },
  { name: 'Slate Library', bg: '#253542', accent: '#18222B', foil: '#DFC896', page: '#F4EDE5', rib: '#1D2A34' },
  { name: 'Crimson Leather', bg: '#421C1C', accent: '#2B1212', foil: '#E8CB88', page: '#F3E8DF', rib: '#341515' },
  { name: 'Terracotta Cloth', bg: '#3C2117', accent: '#27140E', foil: '#DFC182', page: '#F3E8DC', rib: '#301A12' },
  { name: 'Aged Amber Ochre', bg: '#382B14', accent: '#241B0C', foil: '#EAD79B', page: '#F5EFE4', rib: '#2C210F' },
]

export function getBookPalette(title: string) {
  let hash = 0
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash)
  }
  return SPINE_PALETTES[Math.abs(hash) % SPINE_PALETTES.length]
}

export function getBookDimensions(title: string) {
  let hash = 0
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash)
  }
  const absHash = Math.abs(hash)
  
  // Width variation: 26px to 42px (spine thickness)
  const baseWidth = 26
  const extraWidth = Math.max(0, title.length - 12)
  const width = Math.min(42, baseWidth + (absHash % 12) + Math.min(extraWidth, 6))
  
  // Height variation: 178px to 212px (physical volume height)
  const height = 178 + (absHash % 34)
  
  // Slight natural resting tilt on the shelf: -1.2 deg to +1.2 deg
  const naturalTilt = ((absHash % 24) - 12) * 0.09
  
  return { width, height, depth: 34, naturalTilt }
}

export function getCatalogNumber(title: string, id?: string): string {
  let hash = 0
  const key = id ? title + id : title
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash)
  }
  const num = (Math.abs(hash) % 990) + 10
  return `#${num.toString().padStart(3, '0')}`
}

export interface Book3DProps {
  id: string
  title: string
  author?: string
  discussionCount?: number
  firstDiscussedYear?: number
  isSelected?: boolean
  isDimmed?: boolean
  isHighlighted?: boolean
  className?: string
  onClick?: () => void
  onSelect?: (id: string) => void
  onHoverStateChange?: (isHovered: boolean, meta: { id: string; title: string; author?: string; catalogNo: string; discussionCount: number }) => void
}

export function Book3D({
  id,
  title,
  author,
  discussionCount = 0,
  firstDiscussedYear,
  isSelected = false,
  isDimmed = false,
  isHighlighted = false,
  className,
  onClick,
  onSelect,
  onHoverStateChange,
}: Book3DProps) {
  const [isHovered, setIsHovered] = React.useState(false)
  const [isPressed, setIsPressed] = React.useState(false)

  const palette = React.useMemo(() => getBookPalette(title), [title])
  const { width, height, depth, naturalTilt } = React.useMemo(() => getBookDimensions(title), [title])
  const catalogNo = React.useMemo(() => getCatalogNumber(title, id), [title, id])

  // Spring physics for physical book pulling sensation
  const springConfig = { stiffness: 280, damping: 22, mass: 0.6 }
  const y = useSpring(0, springConfig)
  const z = useSpring(0, springConfig)
  const rotateY = useSpring(0, springConfig)
  const rotateX = useSpring(0, springConfig)
  const rotateZ = useSpring(naturalTilt, springConfig)
  const scale = useSpring(1, springConfig)

  React.useEffect(() => {
    if (isSelected) {
      y.set(-32)
      z.set(50)
      rotateY.set(-22)
      rotateX.set(6)
      rotateZ.set(0)
      scale.set(1.08)
    } else if (isPressed) {
      y.set(-18)
      z.set(28)
      rotateY.set(-12)
      rotateX.set(3)
      rotateZ.set(0)
      scale.set(1.03)
    } else if (isHovered) {
      y.set(-16)
      z.set(30)
      rotateY.set(-12)
      rotateX.set(2)
      rotateZ.set(0)
      scale.set(1.04)
    } else if (isHighlighted) {
      y.set(-8)
      z.set(16)
      rotateY.set(-6)
      rotateX.set(1)
      rotateZ.set(naturalTilt)
      scale.set(1.02)
    } else {
      y.set(0)
      z.set(0)
      rotateY.set(0)
      rotateX.set(0)
      rotateZ.set(naturalTilt)
      scale.set(1)
    }
  }, [isHovered, isPressed, isSelected, isHighlighted, naturalTilt, y, z, rotateY, rotateX, rotateZ, scale])

  const handleMouseEnter = () => {
    setIsHovered(true)
    if (onHoverStateChange) {
      onHoverStateChange(true, { id, title, author, catalogNo, discussionCount })
    }
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    setIsPressed(false)
    if (onHoverStateChange) {
      onHoverStateChange(false, { id, title, author, catalogNo, discussionCount })
    }
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (onSelect) {
      onSelect(id)
    }
    if (onClick) {
      onClick()
    }
  }

  return (
    <div
      className={cn(
        'relative block select-none transition-all duration-300 transform-gpu',
        isDimmed ? 'opacity-20 grayscale-[70%]' : 'opacity-100',
        isHighlighted && !isSelected && 'ring-2 ring-amber-400/80 rounded-sm ring-offset-2 ring-offset-black',
        className
      )}
      style={{
        perspective: '1400px',
        width,
        height,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      suppressHydrationWarning
      aria-label={`${title} by ${author || 'Unknown author'}`}
    >
      {/* Physical Contact Shadow on the wooden shelf plank */}
      <motion.div
        className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-full bg-black/80 blur-[3px] pointer-events-none"
        animate={{
          width: isSelected ? width * 1.3 : isHovered ? width * 1.15 : width * 0.85,
          height: isSelected ? 12 : isHovered ? 8 : 4,
          opacity: isSelected ? 0.85 : isHovered ? 0.7 : 0.4,
          y: isHovered || isSelected ? 2 : 0,
        }}
        transition={{ duration: 0.2 }}
      />

      {/* 3D Book Volume Object */}
      <motion.div
        className="relative cursor-pointer h-full"
        style={{
          width,
          height,
          transformStyle: 'preserve-3d',
          y,
          z,
          rotateY,
          rotateX,
          rotateZ,
          scale,
          transformOrigin: 'bottom center',
        }}
      >
        {/* FRONT COVER */}
        <div
          className="absolute inset-0 rounded-sm overflow-hidden"
          style={{
            backgroundColor: palette.bg,
            transform: `translateZ(${depth / 2}px)`,
            backfaceVisibility: 'hidden',
            boxShadow: `
              inset 0 0 0 1px rgba(255,255,255,0.1),
              inset 0 0 18px rgba(0,0,0,0.45),
              ${isHovered ? '8px 12px 28px rgba(0,0,0,0.7)' : '2px 4px 12px rgba(0,0,0,0.45)'}
            `,
          }}
        >
          {/* Cloth / Leather Texture */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='0.25'%3E%3Crect width='1' height='1' x='0' y='0'/%3E%3Crect width='1' height='1' x='3' y='3'/%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />

          {/* Foil border frame */}
          <div
            className="absolute inset-2 border rounded-sm pointer-events-none"
            style={{ borderColor: `${palette.foil}35` }}
          />

          {/* Front content */}
          <div className="relative h-full flex flex-col items-center justify-between p-2.5 text-center">
            <div className="w-5 h-px" style={{ backgroundColor: `${palette.foil}70` }} />

            <div>
              <h4
                className="font-display text-[10px] font-bold leading-tight line-clamp-3"
                style={{ color: '#FAF7F0', textShadow: '0 1px 2px rgba(0,0,0,0.7)' }}
              >
                {title}
              </h4>
              {author && (
                <p
                  className="mt-1 text-[8px] font-serif uppercase tracking-wider line-clamp-1 opacity-90"
                  style={{ color: palette.foil }}
                >
                  {author}
                </p>
              )}
            </div>

            <span className="text-[7px] font-mono tracking-widest" style={{ color: `${palette.foil}AA` }}>
              {catalogNo}
            </span>
          </div>

          {/* Specular sheen */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 60%)',
            }}
          />
        </div>

        {/* BACK COVER */}
        <div
          className="absolute inset-0 rounded-sm"
          style={{
            backgroundColor: palette.accent,
            transform: `translateZ(-${depth / 2}px) rotateY(180deg)`,
            backfaceVisibility: 'hidden',
          }}
        />

        {/* SPINE (Facing out when sitting on the shelf) */}
        <div
          className="absolute rounded-l-sm overflow-hidden"
          style={{
            width: depth,
            height: height,
            left: 0,
            top: 0,
            backgroundColor: palette.accent,
            transform: `rotateY(-90deg) translateZ(${depth / 2}px)`,
            transformOrigin: 'left center',
            backfaceVisibility: 'hidden',
            boxShadow: `
              inset 0 0 10px rgba(0,0,0,0.6),
              inset 1px 0 0 rgba(255,255,255,0.1)
            `,
          }}
        >
          {/* Top Headband Rib */}
          <div className="absolute top-2 inset-x-0 h-1.5 bg-gradient-to-r from-amber-700/50 via-amber-500/70 to-amber-700/50 border-y border-white/25 shadow-sm" />

          {/* Raised Spine Ribs (Archival binding bands) */}
          <div className="absolute top-[28%] inset-x-0 h-[2px] bg-black/40 border-t border-white/20" />
          <div className="absolute bottom-[28%] inset-x-0 h-[2px] bg-black/40 border-b border-white/20" />

          {/* Bottom Headband Rib */}
          <div className="absolute bottom-2 inset-x-0 h-1.5 bg-gradient-to-r from-amber-700/50 via-amber-500/70 to-amber-700/50 border-y border-white/25 shadow-sm" />

          {/* Vertical Spine Title & Catalog Number */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-between py-4 px-0.5"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          >
            <span
              className="text-[9px] font-display font-semibold tracking-wider truncate px-0.5"
              style={{
                color: '#FAF7F0',
                textShadow: '0 1px 2px rgba(0,0,0,0.8), 0 0 1px rgba(255,255,255,0.2)',
              }}
            >
              {title}
            </span>

            <div className="flex items-center gap-1">
              {discussionCount > 2 && (
                <span className="text-[7px] text-amber-400 font-serif">★</span>
              )}
              <span
                className="text-[7px] font-mono tracking-widest font-semibold"
                style={{ color: palette.foil, textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
              >
                {catalogNo}
              </span>
            </div>
          </div>

          {/* Spine 3D Curvature Highlight */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, rgba(0,0,0,0.45) 0%, transparent 30%, rgba(255,255,255,0.15) 65%, rgba(0,0,0,0.35) 100%)',
            }}
          />
        </div>

        {/* PAGES BLOCK (Right Edge) */}
        <div
          className="absolute rounded-r-sm"
          style={{
            width: depth,
            height: height - 4,
            right: 0,
            top: 2,
            background: `linear-gradient(90deg, ${palette.page} 0%, #DFD6CB 55%, #CEC2B2 100%)`,
            transform: `rotateY(90deg) translateZ(${width - depth / 2}px)`,
            transformOrigin: 'right center',
            backfaceVisibility: 'hidden',
            boxShadow: 'inset 0 0 8px rgba(0,0,0,0.25)',
          }}
        >
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 3px)',
            }}
          />
        </div>

        {/* TOP PAGE EDGE */}
        <div
          className="absolute"
          style={{
            width: width,
            height: depth,
            left: 0,
            top: 0,
            background: `linear-gradient(180deg, ${palette.page} 0%, #D8CEBF 100%)`,
            transform: 'rotateX(90deg) translateZ(0px)',
            transformOrigin: 'top center',
            backfaceVisibility: 'hidden',
          }}
        />

        {/* BOTTOM COVER BASE */}
        <div
          className="absolute"
          style={{
            width: width,
            height: depth,
            left: 0,
            bottom: 0,
            backgroundColor: palette.accent,
            transform: 'rotateX(-90deg) translateZ(0px)',
            transformOrigin: 'bottom center',
            backfaceVisibility: 'hidden',
          }}
        />
      </motion.div>

      {/* Floating Micro-Badge on Hover ("PULL TO EXAMINE") */}
      {isHovered && !isSelected && (
        <motion.div
          initial={{ opacity: 0, y: 4, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.15 }}
          className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-30 pointer-events-none"
        >
          <div className="bg-[#14110E]/95 border border-amber-500/40 text-amber-200 px-2.5 py-1 rounded-md shadow-2xl backdrop-blur-md whitespace-nowrap text-center">
            <span className="text-[9px] font-mono tracking-wider uppercase font-semibold text-amber-300">
              {catalogNo} · Pull Volume
            </span>
          </div>
        </motion.div>
      )}
    </div>
  )
}
