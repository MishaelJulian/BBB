// Helpers shared by the write operations. Ported from app/api/main.py (to_title_case_name, _media, find-or-create author and member).
import type { TransactionSql } from 'postgres'
import { HttpError } from './http'

export type Tx = TransactionSql

export const GENERAL = /general/i
const NOT_A_NAME = new Set(['unknown', '--', 'none'])

/** "deepak t" -> "Deepak T"; a lone initial is upper-cased; an ALL-CAPS word is capitalized. */
export function titleCaseName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.length === 1 ? w.toUpperCase() : w === w.toUpperCase() && w !== w.toLowerCase() ? w[0] + w.slice(1).toLowerCase() : w[0].toUpperCase() + w.slice(1)))
    .join(' ')
}

/** "anura m, DARSHAN, none" -> ["Anura M", "Darshan"]: split on commas, drop placeholders and repeats. */
export function cleanNames(raw: string | null | undefined): string[] {
  const out: string[] = []
  for (const n of (raw ?? '').split(',').map((s) => s.trim()).filter(Boolean)) {
    if (NOT_A_NAME.has(n.toLowerCase())) continue
    const t = titleCaseName(n)
    if (t && !out.includes(t)) out.push(t)
  }
  return out
}

/** Existing author by name (any case), else a new one. */
export async function authorId(tx: Tx, name: string): Promise<string> {
  const [a] = await tx<{ id: string }[]>`select id from authors where lower(full_name) = lower(${name}) limit 1`
  if (a) return a.id
  const [n] = await tx<{ id: string }[]>`
    insert into authors (full_name, normalized_name) values (${name}, ${name.toLowerCase()})
    on conflict (normalized_name) do update set normalized_name = excluded.normalized_name returning id`
  return n.id
}

/** Existing member by name (any case), else a new one (status "member" by default, as before). */
export async function memberId(tx: Tx, name: string): Promise<string> {
  const [m] = await tx<{ id: string }[]>`select id from members where lower(display_name) = lower(${name}) limit 1`
  if (m) return m.id
  const [n] = await tx<{ id: string }[]>`
    insert into members (display_name, normalized_name) values (${name}, ${name.toLowerCase()})
    on conflict (normalized_name) do update set normalized_name = excluded.normalized_name returning id`
  return n.id
}

const LEGACY_MEDIA: Record<string, [string, boolean]> = { youtube: ['video', false], show: ['tv_series', false], tangent: ['website_app', true] }

/** Old spellings map to the approved categories; the allowed codes live in the media_categories table. */
export async function mediaOf(tx: Tx, value: string | null | undefined): Promise<{ code: string; legacyTangent: boolean }> {
  const v = (value ?? 'book').trim().toLowerCase() || 'book'
  const [code, legacyTangent] = LEGACY_MEDIA[v] ?? [v, false]
  const [ok] = await tx<{ x: number }[]>`select 1 as x from media_categories where code = ${code}`
  if (!ok) {
    const all = await tx<{ code: string }[]>`select code from media_categories order by sort_order`
    throw new HttpError(400, `Unknown media type '${value}'. Allowed: ${all.map((r) => r.code).join(', ')}`)
  }
  return { code, legacyTangent }
}

/** Stored links must be http(s): javascript:, data: and other schemes are refused. */
export function httpOnly(v: unknown, field: string): string | null | undefined {
  if (v === undefined) return undefined
  if (v === null || v === '') return null
  if (typeof v !== 'string') throw new HttpError(422, `${field} must be text.`)
  const s = v.trim()
  let ok = false
  try {
    const u = new URL(s)
    ok = u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    ok = false
  }
  if (!ok) throw new HttpError(422, `${field} must be an http or https link.`)
  return s
}

export const strOrUndef = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined)
export const present = (v: unknown) => v !== undefined && v !== null

export function dateOrNull(v: unknown): string | null {
  if (typeof v !== 'string' || !v.trim()) return null
  const s = v.trim()
  const d = new Date(`${s}T00:00:00Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) throw new HttpError(400, 'Invalid date format. Use YYYY-MM-DD')
  return s
}

/** A venue by name (any case), else a new one in Bangalore. */
export async function venueId(tx: Tx, name: string): Promise<string> {
  const [v] = await tx<{ id: string }[]>`select id from venues where lower(name) = lower(${name}) limit 1`
  if (v) return v.id
  const [n] = await tx<{ id: string }[]>`
    insert into venues (name, city, is_online) values (${name}, 'Bangalore', false)
    on conflict (name) do update set name = excluded.name returning id`
  return n.id
}
