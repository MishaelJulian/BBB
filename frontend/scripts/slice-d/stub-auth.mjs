// A stand-in for Supabase Auth, for LOCAL browser tests only (Slice D). Port 54389.
//   node scripts/slice-d/stub-auth.mjs        env: DATABASE_URL (local throwaway DB only) to mirror users into auth.users
// Issues JWTs shaped like Supabase's (session_id, amr[{method,timestamp}], app_metadata.role); a token refresh keeps the amr
// timestamp, so "a refresh cannot extend a session" can be tested. Control endpoints (/__ctl/*) let tests fake session start times.
import http from 'node:http'
import { createRequire } from 'node:module'
import { randomUUID } from 'node:crypto'

const require = createRequire(new URL('../../package.json', import.meta.url))
const dbUrl = process.env.DATABASE_URL ?? ''
if (dbUrl && !/127\.0\.0\.1|localhost/.test(dbUrl)) throw new Error('stub-auth refuses a non-local DATABASE_URL')
const sql = dbUrl ? require('postgres')(dbUrl, { max: 1, prepare: false }) : null

const SERVICE_KEY = 'stub-service-key'
const users = new Map() // id -> { id, email, password, role }
const sessions = new Map() // sid -> { userId, start, refresh }
const seed = [
  ['00000000-0000-0000-0000-0000000000a2', 'qa-admin@bbb.test', 'correct-horse-9', 'admin'],
  ['00000000-0000-0000-0000-0000000000a1', 'qa-member@bbb.test', 'correct-horse-9', null],
  ['00000000-0000-0000-0000-0000000000a3', 'qa-other@bbb.test', 'correct-horse-9', null],
]
for (const [id, email, password, role] of seed) users.set(id, { id, email, password, role })

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const now = () => Math.floor(Date.now() / 1000)
function userJson(u) { return { id: u.id, email: u.email, app_metadata: u.role ? { role: u.role } : {}, user_metadata: {} } }
function mint(u, sid, start) {
  const s = sessions.get(sid)
  const iat = now()
  const access = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: u.id, email: u.email, role: 'authenticated', session_id: sid, aal: 'aal1', amr: [{ method: 'password', timestamp: start }], app_metadata: u.role ? { role: u.role } : {}, user_metadata: {}, iat, exp: iat + 3600 })}.stub`
  return { access_token: access, token_type: 'bearer', expires_in: 3600, expires_at: iat + 3600, refresh_token: s.refresh, user: userJson(u) }
}
function newSession(u, startAt = now()) {
  const sid = randomUUID()
  sessions.set(sid, { userId: u.id, start: startAt, refresh: `r-${randomUUID()}` })
  return mint(u, sid, startAt)
}
const sidOf = (tok) => { try { return JSON.parse(Buffer.from(tok.split('.')[1], 'base64url')).session_id } catch { return null } }
const mirror = async (u) => { if (sql) await sql`insert into auth.users (id, email) values (${u.id}, ${u.email}) on conflict (id) do update set email = excluded.email` }
for (const u of users.values()) await mirror(u)

http.createServer((req, res) => {
  res.setHeader('access-control-allow-origin', req.headers.origin || '*')
  res.setHeader('access-control-allow-headers', 'authorization, apikey, content-type, x-client-info, x-supabase-api-version')
  res.setHeader('access-control-allow-methods', 'GET,POST,PUT,DELETE,OPTIONS')
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end() }
  const tok = (req.headers.authorization || '').slice(7)
  let body = ''
  req.on('data', (c) => (body += c))
  req.on('end', async () => {
    res.setHeader('content-type', 'application/json')
    const send = (code, o) => { res.statusCode = code; res.end(JSON.stringify(o)) }
    const url = new URL(req.url, 'http://x')
    const b = body ? JSON.parse(body) : {}
    const path = url.pathname
    if (path === '/auth/v1/user') {
      const sid = sidOf(tok)
      const s = sid && sessions.get(sid)
      if (!s) return send(401, { msg: 'invalid JWT' })
      return send(200, userJson(users.get(s.userId)))
    }
    if (path === '/auth/v1/token' && url.searchParams.get('grant_type') === 'password') {
      const u = [...users.values()].find((x) => x.email.toLowerCase() === String(b.email).toLowerCase())
      if (!u || u.password !== b.password) return send(400, { error: 'invalid_grant', msg: 'Invalid login credentials' })
      return send(200, newSession(u))
    }
    if (path === '/auth/v1/token' && url.searchParams.get('grant_type') === 'refresh_token') {
      const e = [...sessions.entries()].find(([, s]) => s.refresh === b.refresh_token)
      if (!e) return send(400, { error: 'invalid_grant', msg: 'Invalid Refresh Token' })
      e[1].refresh = `r-${randomUUID()}`
      return send(200, mint(users.get(e[1].userId), e[0], e[1].start)) // same amr timestamp, new iat/exp: like Supabase
    }
    if (path === '/auth/v1/signup') {
      const email = String(b.email).toLowerCase()
      if ([...users.values()].some((x) => x.email === email)) return send(422, { msg: 'User already registered' })
      const u = { id: randomUUID(), email, password: b.password, role: null }
      users.set(u.id, u); await mirror(u)
      return send(200, newSession(u))
    }
    if (path === '/auth/v1/logout') { const sid = sidOf(tok); if (sid) sessions.delete(sid); return send(204, {}) }
    const adm = /^\/auth\/v1\/admin\/users\/([^/]+)$/.exec(path)
    if (adm && req.method === 'PUT') {
      if (tok !== SERVICE_KEY) return send(401, { msg: 'not allowed' })
      const u = users.get(adm[1])
      if (!u) return send(404, { msg: 'User not found' })
      if (String(b.password).toLowerCase().includes('weakpass')) return send(422, { msg: 'Password is too weak.' })
      u.password = b.password
      return send(200, userJson(u))
    }
    // ---- test controls
    if (path === '/__ctl/mint') { // { email, age } -> a session that began `age` seconds ago
      const u = [...users.values()].find((x) => x.email === b.email)
      return u ? send(200, newSession(u, now() - Number(b.age ?? 0))) : send(404, {})
    }
    if (path === '/__ctl/password') { const u = [...users.values()].find((x) => x.email === b.email); return send(200, { password: u?.password ?? null }) }
    if (path === '/__ctl/sessions') return send(200, { count: sessions.size })
    send(404, {})
  })
}).listen(54389, '127.0.0.1', () => console.log('stub auth on 54389'))
