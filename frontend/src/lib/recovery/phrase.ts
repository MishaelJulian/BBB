import { randomBytes, randomInt, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto'
import { WORDS } from './wordlist'

// 12 words x 11 bits = 132 bits of entropy, drawn with crypto.randomInt (uniform, no modulo bias) from the 2048-word list.
// It is not a checksummed BIP39 mnemonic; never load it into a wallet.
export const PHRASE_WORDS = 12
const N = 32768, R = 8, P = 1, KEYLEN = 32
const OPTS: ScryptOptions = { N, r: R, p: P, maxmem: 64 * 1024 * 1024 }

export function generatePhrase(): string[] {
  return Array.from({ length: PHRASE_WORDS }, () => WORDS[randomInt(WORDS.length)])
}

const INDEX = new Set(WORDS)

/** Typed phrases are forgiven: case, extra spaces, commas and line breaks. Returns the canonical "w1 w2 ... w12", or null unless it is 12 listed words. */
export function normalizePhrase(input: unknown): string | null {
  if (typeof input !== 'string' || input.length > 400) return null
  const w = input.toLowerCase().split(/[\s,.;]+/).filter(Boolean)
  return w.length === PHRASE_WORDS && w.every((x) => INDEX.has(x)) ? w.join(' ') : null
}

const derive = (secret: string, salt: Buffer, n: number, r: number, p: number, len: number) =>
  new Promise<Buffer>((res, rej) => scrypt(secret, salt, len, { ...OPTS, N: n, r, p }, (e, k) => (e ? rej(e) : res(k))))

/** "scrypt$N$r$p$salt$hash" with a fresh 16-byte salt. */
export async function hashSecret(secret: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await derive(secret, salt, N, R, P, KEYLEN)
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${key.toString('base64')}`
}

/** Constant-time comparison against a stored hash. A missing or malformed stored value still costs one scrypt, so timing does not tell. */
export async function verifySecret(secret: string, stored: string | null | undefined): Promise<boolean> {
  const parts = (stored ?? '').split('$')
  const good = parts.length === 6 && parts[0] === 'scrypt'
  const [n, r, p] = good ? [Number(parts[1]), Number(parts[2]), Number(parts[3])] : [N, R, P]
  const salt = Buffer.from(good ? parts[4] : 'AAAAAAAAAAAAAAAAAAAAAA==', 'base64')
  const want = Buffer.from(good ? parts[5] : 'A'.repeat(43) + '=', 'base64')
  const got = await derive(secret, salt, n, r, p, want.length || KEYLEN)
  return good && got.length === want.length && timingSafeEqual(got, want)
}
