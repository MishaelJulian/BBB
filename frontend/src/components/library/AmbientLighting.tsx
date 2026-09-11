'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export type LightingMode = 'afternoon' | 'candlelight' | 'morning' | 'night'

interface AmbientLightingProps {
  mode?: LightingMode
  className?: string
}

interface LightingPreset {
  name: string
  background: string
  overlayGlow: string
  shelfGlow: string
  warmthFilter: string
  description: string
}

const LIGHTING_CONFIGS: Record<LightingMode, LightingPreset> = {
  afternoon: {
    name: 'Afternoon',
    background: `
      radial-gradient(ellipse 95% 70% at 50% 15%, rgba(248, 210, 140, 0.12) 0%, transparent 65%),
      radial-gradient(ellipse 80% 60% at 85% 30%, rgba(230, 160, 80, 0.08) 0%, transparent 60%),
      linear-gradient(180deg, #16120F 0%, #100C09 50%, #0A0806 100%)
    `,
    overlayGlow: 'radial-gradient(ellipse at 50% 0%, rgba(255, 220, 150, 0.06) 0%, transparent 70%)',
    shelfGlow: 'rgba(245, 195, 120, 0.15)',
    warmthFilter: 'sepia(0.08) saturate(1.05)',
    description: 'Golden hour library ambience with warm wood highlights',
  },
  candlelight: {
    name: 'Candlelight',
    background: `
      radial-gradient(ellipse 70% 50% at 35% 45%, rgba(255, 160, 50, 0.16) 0%, transparent 55%),
      radial-gradient(ellipse 70% 50% at 65% 55%, rgba(240, 130, 30, 0.12) 0%, transparent 60%),
      linear-gradient(180deg, #180F08 0%, #100A05 60%, #080503 100%)
    `,
    overlayGlow: 'radial-gradient(circle at 50% 50%, rgba(255, 150, 40, 0.08) 0%, transparent 60%)',
    shelfGlow: 'rgba(255, 140, 40, 0.22)',
    warmthFilter: 'sepia(0.2) contrast(1.08) brightness(0.92)',
    description: 'Intimate flickering candlelight with deep atmospheric shadows',
  },
  morning: {
    name: 'Morning',
    background: `
      radial-gradient(ellipse 90% 60% at 50% 10%, rgba(235, 240, 255, 0.12) 0%, transparent 60%),
      radial-gradient(ellipse 80% 60% at 15% 40%, rgba(200, 220, 245, 0.06) 0%, transparent 55%),
      linear-gradient(180deg, #111317 0%, #0C0E12 50%, #07080A 100%)
    `,
    overlayGlow: 'radial-gradient(ellipse at 50% 0%, rgba(220, 235, 255, 0.05) 0%, transparent 70%)',
    shelfGlow: 'rgba(210, 230, 255, 0.12)',
    warmthFilter: 'saturate(0.95) brightness(1.02)',
    description: 'Crisp cool morning daylight softly filtering through high library windows',
  },
  night: {
    name: 'Midnight',
    background: `
      radial-gradient(ellipse 70% 45% at 50% 20%, rgba(160, 140, 220, 0.07) 0%, transparent 55%),
      radial-gradient(circle at 50% 60%, rgba(255, 200, 100, 0.05) 0%, transparent 45%),
      linear-gradient(180deg, #09090D 0%, #060609 50%, #030305 100%)
    `,
    overlayGlow: 'radial-gradient(circle at 50% 50%, rgba(140, 160, 220, 0.04) 0%, transparent 70%)',
    shelfGlow: 'rgba(255, 200, 100, 0.1)',
    warmthFilter: 'contrast(1.1) brightness(0.88)',
    description: 'Quiet midnight archive illuminated by soft brass desk lamps',
  },
}

export function AmbientLighting({ mode = 'afternoon', className }: AmbientLightingProps) {
  const config = LIGHTING_CONFIGS[mode] || LIGHTING_CONFIGS.afternoon

  return (
    <div
      className={cn('fixed inset-0 pointer-events-none z-0 transition-all duration-1000 overflow-hidden', className)}
      aria-hidden="true"
    >
      {/* Dynamic Background Base Gradient */}
      <div
        className="absolute inset-0 transition-all duration-1000"
        style={{ background: config.background }}
      />

      {/* Atmospheric Ceiling / Spotlight Falloff */}
      <div
        className="absolute inset-0 transition-opacity duration-1000"
        style={{ background: config.overlayGlow }}
      />

      {/* Subtle Archival Dust & Vignette Grain */}
      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Deep Room Perimeter Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 45%, transparent 45%, rgba(0, 0, 0, 0.55) 100%)',
        }}
      />
    </div>
  )
}

export function LightingToggle({
  mode,
  onModeChange,
}: {
  mode: LightingMode
  onModeChange: (mode: LightingMode) => void
}) {
  const modes: { value: LightingMode; label: string; icon: string }[] = [
    { value: 'afternoon', label: 'Afternoon', icon: '🌅' },
    { value: 'candlelight', label: 'Candlelight', icon: '🕯️' },
    { value: 'morning', label: 'Morning', icon: '☀️' },
    { value: 'night', label: 'Midnight', icon: '🌙' },
  ]

  return (
    <div className="flex items-center gap-1 p-1 rounded-full bg-black/50 border border-amber-900/30 backdrop-blur-xl shadow-lg">
      {modes.map((m) => (
        <button
          key={m.value}
          onClick={() => onModeChange(m.value)}
          suppressHydrationWarning
          className={cn(
            'px-2.5 py-1 rounded-full text-[11px] font-sans font-medium transition-all flex items-center gap-1.5',
            mode === m.value
              ? 'bg-amber-600/90 text-white shadow-md border border-amber-400/50 scale-105'
              : 'text-amber-100/60 hover:text-white hover:bg-white/5'
          )}
          title={`${m.label} atmosphere`}
        >
          <span className="text-xs">{m.icon}</span>
          <span className="hidden sm:inline font-serif">{m.label}</span>
        </button>
      ))}
    </div>
  )
}
