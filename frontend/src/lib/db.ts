import crypto from 'node:crypto'
import path from 'node:path'
import postgres from 'postgres'

// One small pool per server instance (see max below). Supabase's pooler in transaction mode (port 6543) does not support prepared statements.
const g = globalThis as unknown as { __bbbSql?: ReturnType<typeof postgres>; __bbbRejections?: boolean }

function createSqliteFallback(sqlitePath: string): ReturnType<typeof postgres> {
  // Local dev fallback when no PostgreSQL DATABASE_URL is configured (reads/writes ../book_club_archivist.db via built-in node:sqlite)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { DatabaseSync } = require('node:sqlite')
  const db = new DatabaseSync(sqlitePath, { readOnly: false })

  // Ensure helper tables & columns needed by admin tools exist in local SQLite
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        actor TEXT,
        actor_email TEXT,
        action TEXT NOT NULL,
        table_name TEXT NOT NULL,
        row_id TEXT,
        before TEXT,
        after TEXT,
        undone_at DATETIME,
        undone_by TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS admin_trash (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        key TEXT NOT NULL,
        label TEXT NOT NULL,
        snapshot TEXT,
        payload TEXT,
        deleted_by TEXT,
        deleted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL DEFAULT (datetime('now', '+7 days')),
        restored_at DATETIME
      );
      CREATE TABLE IF NOT EXISTS recovery_phrases (
        user_id TEXT PRIMARY KEY,
        phrase_hash TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      INSERT OR IGNORE INTO recovery_phrases (user_id, phrase_hash, created_at)
      VALUES ('ee62ffb4-d34e-4d2e-acba-96703e39e42d', 'local-dev-phrase', 1761000000);
    `)
  } catch {}
  for (const alter of [
    'ALTER TABLE admin_trash ADD COLUMN snapshot TEXT',
    'ALTER TABLE meetups ADD COLUMN presented_by TEXT',
    'ALTER TABLE canonical_books ADD COLUMN publisher TEXT',
    'ALTER TABLE members ADD COLUMN auth_user_id TEXT',
    'ALTER TABLE members ADD COLUMN wishlist_public BOOLEAN DEFAULT 0',
  ]) {
    try { db.exec(alter) } catch {}
  }
  // If an earlier dev table had payload NOT NULL, recreate admin_trash if empty so snapshot inserts succeed
  try {
    const info = db.prepare("PRAGMA table_info('admin_trash')").all() as { name: string; notnull: number }[]
    const payloadCol = info.find((c) => c.name === 'payload')
    if (payloadCol && payloadCol.notnull) {
      db.exec(`
        DROP TABLE IF EXISTS admin_trash;
        CREATE TABLE admin_trash (
          id TEXT PRIMARY KEY,
          kind TEXT NOT NULL,
          key TEXT NOT NULL,
          label TEXT NOT NULL,
          snapshot TEXT,
          payload TEXT,
          deleted_by TEXT,
          deleted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME NOT NULL DEFAULT (datetime('now', '+7 days')),
          restored_at DATETIME
        );
      `)
    }
  } catch {}

  type Frag = { __frag: true; sql: string; vals: unknown[] }
  const isFrag = (v: unknown): v is Frag => Boolean(v && typeof v === 'object' && (v as Frag).__frag)

  const translateSql = (raw: string, vals: unknown[]): { sql: string; vals: unknown[] } => {
    let q = raw
      .replace(/::(?:int|integer|text|bigint|boolean|date|float8|jsonb|timestamptz)\b/gi, '')
      .replace(/extract\(\s*year\s+from\s+((?:[^()]|\([^()]*\))+)\)/gi, "CAST(strftime('%Y', $1) AS INTEGER)")
      .replace(/substring\(\s*member_code\s+from\s+'-\(\\\\d\+\)\$'\s*\)/gi, "substr(member_code, instr(member_code, '-') + 1)")
      .replace(/\bnow\(\)\s*\+\s*interval\s*'7 days'/gi, "datetime('now', '+7 days')")
      .replace(/\bnow\(\)\s*-\s*interval\s*'7 days'/gi, "datetime('now', '-7 days')")
      .replace(/\bnow\(\)/gi, 'CURRENT_TIMESTAMP')
      .replace(/\bfor\s+update\b/gi, '')
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
      .replace(/\bon\s+conflict\s*\((?:normalized_name|name)\)\s*do\s+update\s+set\s+[a-z_]+\s*=\s*excluded\.[a-z_]+/gi, '')

    // In SQLite, id/created_at/updated_at/language/confidence_score do not have server defaults on legacy SQLAlchemy tables.
    // Inject them automatically on INSERT when omitted.
    const insertMatch = q.match(/^\s*insert\s+into\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)\s*values\s*\(([\s\S]+?)\)(\s+returning\s+[\s\S]+|\s+on\s+conflict[\s\S]+|\s*)$/i)
    if (insertMatch) {
      const table = insertMatch[1].toLowerCase()
      const cols = insertMatch[2].split(',').map((c) => c.trim())
      const colsLower = cols.map((c) => c.toLowerCase())
      let valExprs = insertMatch[3].trim()
      const suffix = insertMatch[4] ?? ''
      const extraCols: string[] = []
      const extraVals: unknown[] = []

      const needsUuid = ['meetups', 'canonical_books', 'discussions', 'authors', 'members', 'venues', 'audit_log', 'admin_trash', 'meetup_attendance', 'editions', 'publishers'].includes(table)
      if (needsUuid && !colsLower.includes('id')) {
        extraCols.push('id')
        extraVals.push(crypto.randomUUID())
      }
      const needsTimestamps = ['meetups', 'canonical_books', 'discussions', 'authors', 'members', 'venues', 'editions', 'publishers'].includes(table)
      const nowIso = new Date().toISOString()
      if (needsTimestamps && !colsLower.includes('created_at')) {
        extraCols.push('created_at')
        extraVals.push(nowIso)
      }
      if (needsTimestamps && !colsLower.includes('updated_at')) {
        extraCols.push('updated_at')
        extraVals.push(nowIso)
      }
      if (table === 'canonical_books' && !colsLower.includes('language')) {
        extraCols.push('language')
        extraVals.push('en')
      }
      if (table === 'discussions' && !colsLower.includes('confidence_score')) {
        extraCols.push('confidence_score')
        extraVals.push(1.0)
      }
      if (table === 'meetup_attendance' && colsLower.includes('source')) {
        // SQLite CHECK constraint on meetup_attendance.source only allows ('form', 'gforms', 'backfill')
        const srcIdx = colsLower.indexOf('source')
        let qMarkCount = 0
        for (let ci = 0; ci < srcIdx; ci++) {
          qMarkCount++
        }
        if (vals[qMarkCount] === 'admin') {
          vals = [...vals]
          vals[qMarkCount] = 'form'
        }
      }

      if (extraCols.length > 0) {
        const allCols = [...extraCols, ...cols].join(', ')
        valExprs = `${extraCols.map(() => '?').join(', ')}, ${valExprs}`
        q = `INSERT INTO ${insertMatch[1]} (${allCols}) VALUES (${valExprs})${suffix}`
        vals = [...extraVals, ...vals]
      }
    }

    return { sql: q, vals }
  }

  const fn: any = (first: any, ...rest: any[]) => {
    if (!Array.isArray(first) || !('raw' in first)) {
      if (Array.isArray(first)) {
        if (first.length === 0) return { __frag: true, sql: '(NULL)', vals: [] } satisfies Frag
        return { __frag: true, sql: `(${first.map(() => '?').join(', ')})`, vals: first } satisfies Frag
      }
      // postgres identifier helper: sql('table_name') or sql('column_name')
      if (typeof first === 'string' && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(first)) {
        return { __frag: true, sql: first, vals: [] } satisfies Frag
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
          const translated = translateSql(built, vals)
          const q = translated.sql
          const qVals = translated.vals
          try {
            const popMatch = q.match(/^\s*insert\s+into\s+([a-zA-Z0-9_]+)\s+select\s+\*\s+from\s+jsonb_populate_recordset\s*\(\s*null::[a-zA-Z0-9_]+\s*,\s*\?\s*\)/i)
            if (popMatch && typeof qVals[0] === 'string') {
              const table = popMatch[1]
              const rowsToInsert = JSON.parse(qVals[0]) as Record<string, unknown>[]
              for (const r of rowsToInsert) {
                const keys = Object.keys(r)
                if (!keys.length) continue
                const placeholders = keys.map(() => '?').join(', ')
                const rowVals = keys.map((k) => {
                  const v = r[k]
                  return typeof v === 'boolean' ? (v ? 1 : 0) : v !== null && typeof v === 'object' ? JSON.stringify(v) : v ?? null
                })
                db.prepare(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`).run(...rowVals)
              }
              const arr: any = []
              arr.count = rowsToInsert.length
              return arr
            }
            const stmt = db.prepare(q)
            const isReadOrReturning = /^\s*(select|pragma|with)\b/i.test(q) || /\breturning\b/i.test(q)
            if (!isReadOrReturning) {
              const info = stmt.run(...qVals)
              const arr: any = []
              arr.count = Number(info?.changes ?? 0)
              return arr
            }
            const rawRows = stmt.all(...qVals) as Record<string, any>[]
            const mapped: any = rawRows.map((rawRow) => {
              const r: Record<string, any> = { ...rawRow }
              for (const k of Object.keys(r)) {
                if ((k === 'bk' || k === 'rd' || k === 'snapshot' || k === 'before' || k === 'after') && typeof r[k] === 'string' && (r[k].startsWith('[') || r[k].startsWith('{'))) {
                  try {
                    const parsed = JSON.parse(r[k])
                    r[k] = (k === 'bk' || k === 'rd') && Array.isArray(parsed) ? parsed.filter((x) => x !== null) : parsed
                  } catch {}
                }
                if (k === 'is_hidden' || k === 'is_tangent' || k === 'wishlist_public' || k === 'expired') {
                  r[k] = Boolean(r[k])
                }
              }
              return r
            })
            mapped.count = mapped.length
            return mapped
          } catch (err: any) {
            const msg = String(err?.message ?? '')
            if (/no such table:\s*(session_prefs|auth_security)/i.test(msg)) {
              err.code = '42P01'
              throw err
            }
            if (/no such table:\s*(member_picks|wishlist_items|recovery_phrases|invite_codes)/i.test(msg)) {
              if (/count\(\*\)/i.test(q)) return [{ n: 0, c: 0 }]
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
  fn.json = (v: unknown) => JSON.stringify(v)
  fn.unsafe = (rawSql: string) => {
    const stmt = db.prepare(translateSql(rawSql, []).sql)
    return Promise.resolve(stmt.all())
  }
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
      if (!g.__bbbRejections) {
        g.__bbbRejections = true
        process.on('unhandledRejection', (e) => console.error('unhandled rejection (instance kept alive)', e))
      }
      g.__bbbSql = postgres(url, { prepare: false, max: Number(process.env.DB_POOL_MAX ?? 5), idle_timeout: 20, connect_timeout: 10 })
    }
  }
  return g.__bbbSql
}
