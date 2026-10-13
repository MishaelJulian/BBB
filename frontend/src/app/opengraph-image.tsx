import { ImageResponse } from 'next/og'

export const alt = 'BBB Library: Broke Bibliophiles of Bangalore'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 96, background: '#FAF8F5', color: '#1A1A1A' }}>
        <div style={{ fontSize: 108, fontWeight: 700, color: '#8B4513', lineHeight: 1.05 }}>BBB Library</div>
        <div style={{ fontSize: 44, marginTop: 28, color: '#4A4A4A' }}>Broke Bibliophiles of Bangalore</div>
        <div style={{ fontSize: 30, marginTop: 56, color: '#6B6B6B' }}>A living archive of conversations, books, and readers.</div>
      </div>
    ),
    size,
  )
}
