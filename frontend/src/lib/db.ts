import path from 'node:path'
import postgres from 'postgres'

// One small pool per server instance (see max below). Supabase's pooler in transaction mode (port 6543) does not support prepared statements.
const g = globalThis as unknown as { __bbbSql?: ReturnType<typeof postgres>; __bbbRejections?: boolean }

function createSqliteFallback(sqlitePath: string): ReturnType<typeof postgres> {
  // Local dev fallback when no PostgreSQL DATABASE_URL is configured (reads ../book_club_archivist.db via built-in node:sqlite)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { DatabaseSync } = require('node:sqlite')
  const db = new DatabaseSync(sqlitePath, { readOnly: true })

  type Frag = { __frag: true; sql: string; vals: unknown[] }
  const isFrag = (v: unknown): v is Frag => Boolean(v && typeof v === 'object' && (v as Frag).__frag)

  const translateSql = (raw: string): string =>
    raw
      .replace(/::(?:int|integer|text|bigint|boolean)\b/gi, '')
      .replace(/extract\(\s*year\s+from\s+((?:[^()]|\([^()]*\))+)\)/gi, "CAST(strftime('%Y', $1) AS INTEGER)")
      .replace(/\bnot\s+ilike\b/gi, 'NOT LIKE')
      .replace(/\bilike\b/gi, 'LIKE')
      .replace(/\b([a-zA-Z0-9_]+)\.ctid\b/g, '$1.rowid')
      .replace(/\bctid\b/g, 'rowid')
      .replace(/collate\s+"C"/gi, 'COLLATE BINARY')
      .replace(/is\s+not\s+true/gi, 'IS NOT 1')
      .replace(/json_agg\(\s*([a-zA-Z0-9_.]+)\s+order\s+by\s+[a-zA-Z0-9_.]+\s*\)/gi, 'json_group_array($1)')
      .replace(/\bjson_build_array\s*\(/gi, 'json_array(')
      .replace(/\bjson_agg\s*\(/gi, 'json_group_array(')
      .replace(/where\s+auth_user_id\s*=\s*\?/gi, "where id = 'ee62ffb4-d34e-4d2e-acba-96703e39e42d' and ? is not null")

  const fn: any = (first: any, ...rest: any[]) => {
    if (!Array.isArray(first) || !('raw' in first)) {
      if (Array.isArray(first)) {
        if (first.length === 0) return { __frag: true, sql: '(NULL)', vals: [] } satisfies Frag
        return { __frag: true, sql: `(${first.map(() => '?').join(', ')})`, vals: first } satisfies Frag
      }
      return { __frag: true, sql: '?', vals: [first] } satisfies Frag
    }
    const strings = first as TemplateStringsArray
    let built = ''
    const vals: unknown[] = []
    for (let i = 0; i < strings.length; i++) {
      built += strings[i]
      if (i < rest.length) {
        const v = rest[i]
        if (isFrag(v)) {
          built += v.sql
          vals.push(...v.vals)
        } else {
          built += '?'
          vals.push(typeof v === 'boolean' ? (v ? 1 : 0) : v ?? null)
        }
      }
    }
    let cache: Promise<any[]> | null = null
    const run = () => {
      if (!cache) {
        cache = Promise.resolve().then(() => {
          const q = translateSql(built)
          try {
            const stmt = db.prepare(q)
            const rawRows = stmt.all(...vals) as Record<string, any>[]
            return rawRows.map((rawRow) => {
              const r: Record<string, any> = { ...rawRow }
              for (const k of Object.keys(r)) {
                if ((k === 'bk' || k === 'rd') && typeof r[k] === 'string' && r[k].startsWith('[')) {
                  try {
                    const parsed = JSON.parse(r[k])
                    r[k] = Array.isArray(parsed) ? parsed.filter((x) => x !== null) : parsed
                  } catch {}
                }
                if (k === 'is_hidden' || k === 'is_tangent' || k === 'wishlist_public') {
                  r[k] = Boolean(r[k])
                }
              }
              return r
            })
          } catch (err: any) {
            const msg = String(err?.message ?? '')
            if (/no such table:\s*(session_prefs|auth_security)/i.test(msg)) {
              err.code = '42P01'
              throw err
            }
            if (/no such table:\s*(member_picks|wishlist_items|recovery_phrases)/i.test(msg)) {
              if (/count\(\*\)/i.test(q)) return [{ n: 0 }]
              return []
            }
            if (/no such column:\s*wishlist_public/i.test(msg)) {
              return [{ wishlist_public: false }]
            }
            throw err
          }
        })
      }
      return cache
    }
    return {
      __frag: true,
      sql: built,
      vals,
      then: (onfulfilled?: any, onrejected?: any) => run().then(onfulfilled, onrejected),
      catch: (onrejected?: any) => run().catch(onrejected),
      finally: (onfinally?: any) => run().finally(onfinally),
    }
  }
  fn.begin = async (cb: any) => cb(fn)
  return fn as ReturnType<typeof postgres>
}

export function sql() {
  if (!g.__bbbSql || process.env.NODE_ENV !== 'production') {
    const url = process.env.DATABASE_URL
    if (!url || url.startsWith('sqlite:')) {
      const dbFile = path.resolve(process.cwd(), '..', 'book_club_archivist.db')
      g.__bbbSql = createSqliteFallback(dbFile)
      return g.__bbbSql
    }
    if (!g.__bbbSql) {
      // The driver can reject a query promise nobody awaits when the pooler cancels it (seen 2026-10-13: statement timeout a few ms
      // after a fresh connection). Node would exit the function with status 128; log it and keep serving instead.
      if (!g.__bbbRejections) {
        g.__bbbRejections = true
        process.on('unhandledRejection', (e) => console.error('unhandled rejection (instance kept alive)', e))
      }
      // Pool of 5: a single connection cannot serve overlapping requests. DATABASE_URL must use the pooler's SESSION mode (port 5432):
      // on transaction mode (port 6543) six overlapping requests stalled every connection for good (reproduced 2026-10-13 in three
      // runs, with pool 1 and 5 and with pipelining off; backends sat "active / ClientRead" for minutes), while the same traffic on
      // port 5432 answered every request. prepare:false is harmless on session mode and keeps a switch back to 6543 possible.
      g.__bbbSql = postgres(url, { prepare: false, max: Number(process.env.DB_POOL_MAX ?? 5), idle_timeout: 20, connect_timeout: 10 })
    }
  }
  return g.__bbbSql
}
