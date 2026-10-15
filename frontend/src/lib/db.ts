import postgres from 'postgres'

// One small pool per server instance (see max below). Supabase's pooler in transaction mode (port 6543) does not support prepared statements.
const g = globalThis as unknown as { __bbbSql?: ReturnType<typeof postgres>; __bbbRejections?: boolean }

export function sql() {
  if (!g.__bbbSql) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL is not set')
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
  return g.__bbbSql
}
