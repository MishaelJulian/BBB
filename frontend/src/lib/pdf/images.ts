// Turns downloaded bytes into something pdfkit can embed (JPEG or PNG). GIF and WebP are converted with sharp when it is installed
// (Next ships it); without sharp those covers fall back to the drawn book card.
import { sniffImage } from './covers'

export interface Prepared { data: Buffer; width: number; height: number }

type SharpFn = (input: Uint8Array, opts?: Record<string, unknown>) => {
  rotate(): ReturnType<SharpFn>; resize(o: Record<string, unknown>): ReturnType<SharpFn>; jpeg(o: Record<string, unknown>): ReturnType<SharpFn>
  toBuffer(): Promise<Buffer>
}
let sharpP: Promise<SharpFn | null> | null = null
function loadSharp() {
  sharpP ??= import('sharp').then((m) => (m.default ?? m) as unknown as SharpFn).catch(() => null)
  return sharpP
}

function dims(kind: 'jpeg' | 'png', b: Uint8Array): { width: number; height: number } | null {
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength)
  try {
    if (kind === 'png') return { width: v.getUint32(16), height: v.getUint32(20) }
    let i = 2
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue }
      const mk = b[i + 1]
      if (mk >= 0xc0 && mk <= 0xcf && mk !== 0xc4 && mk !== 0xc8 && mk !== 0xcc) return { height: v.getUint16(i + 5), width: v.getUint16(i + 7) }
      i += 2 + v.getUint16(i + 2)
    }
  } catch { /* fall through */ }
  return null
}

/** maxSide caps the pixel size (sharp only); bytes already JPEG or PNG are used as they are, like reportlab did. */
export async function prepareImage(bytes: Uint8Array | null, maxSide = 1600): Promise<Prepared | null> {
  if (!bytes) return null
  const kind = sniffImage(bytes)
  if (!kind) return null
  if (kind === 'jpeg' || kind === 'png') {
    const d = dims(kind, bytes)
    if (d && d.width > 0 && d.height > 0 && d.width * d.height < 40_000_000) return { data: Buffer.from(bytes), ...d }
  }
  const sharp = await loadSharp()
  if (!sharp) return null
  try {
    const out = await sharp(bytes, { limitInputPixels: 40_000_000 }).rotate().resize({ width: maxSide, height: maxSide, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer()
    const d = dims('jpeg', out)
    return d ? { data: out, ...d } : null
  } catch {
    return null
  }
}
