import { createHash, randomBytes } from 'node:crypto'

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ' // Crockford base32: no I, L, O or U to misread

/** A new code like "7QK2M-9XH4T" (50 random bits). Shown once to the admin; only its hash is stored. */
export function newInviteCode(): string {
  const bytes = randomBytes(10)
  let s = ''
  for (const b of bytes) s += ALPHABET[b % 32]
  return `${s.slice(0, 5)}-${s.slice(5)}`
}

/** Typed codes are forgiven: case, dashes and spaces ignored; O reads as 0 and I or L as 1. Returns null unless 10 characters remain. */
export function normalizeCode(input: string): string | null {
  const c = input.toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1')
  return c.length === 10 && [...c].every((ch) => ALPHABET.includes(ch)) ? c : null
}

export const hashCode = (normalized: string) => createHash('sha256').update(normalized).digest('hex')

/** An optional PIN (4 to 8 digits) the admin hands over by another channel. It is folded into the stored hash, so a link without its PIN cannot claim. */
export function normalizePin(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const d = input.replace(/\s/g, '')
  return /^\d{4,8}$/.test(d) ? d : null
}

/** What is stored for an invite: the code, and the PIN when there is one. */
export const hashInvite = (normalizedCode: string, pin?: string | null) => hashCode(pin ? `${normalizedCode}:${pin}` : normalizedCode)
