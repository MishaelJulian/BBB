import postgres from 'postgres'

// One small pool per server instance. Supabase's pooler in transaction mode (port 6543) does not support prepared statements.
const g = globalThis as unknown as { __bbbSql?: ReturnType<typeof postgres> }

export function sql() {
  if (!g.__bbbSql) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL is not set')
    g.__bbbSql = postgres(url, { prepare: false, max: 1, idle_timeout: 20, connect_timeout: 10 })
  }
  return g.__bbbSql
}
