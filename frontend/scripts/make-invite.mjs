// Makes a personal invite link for a member record that has no account yet. Run by an admin from their own machine:
//   node --env-file=.env.local scripts/make-invite.mjs 065-01 --pin            (a random 6-digit PIN, given separately)
//   node --env-file=.env.local scripts/make-invite.mjs 065-01 --site https://bbbdemo.vercel.app --dry
// The link carries the code after '#', so it is never sent to a server. It only lets its holder create their OWN account and
// attach it to this one record. The code is stored hashed (with the PIN folded in); it works once and expires in 14 days.
import postgres from 'postgres'
import { createHash, randomBytes, randomInt } from 'node:crypto'

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ' // same as src/lib/invite.ts
const sha = (s) => createHash('sha256').update(s).digest('hex')
const args = process.argv.slice(2)
const memberCode = args.find((a) => !a.startsWith('--'))
const site = args.includes('--site') ? args[args.indexOf('--site') + 1] : 'https://bbbdemo.vercel.app'
const dry = args.includes('--dry')
let pin = null
if (args.includes('--pin')) {
  const next = args[args.indexOf('--pin') + 1]
  pin = next && /^\d{4,8}$/.test(next) ? next : String(randomInt(100000, 1000000))
}
if (!memberCode) throw new Error('Usage: make-invite.mjs <member code like 065-01> [--pin [digits]] [--site url] [--dry]')

const db = postgres(process.env.DATABASE_URL, { max: 1, prepare: false })
try {
  const [m] = await db`select id, display_name, auth_user_id from members where member_code = ${memberCode}`
  if (!m) throw new Error(`No member with code ${memberCode}.`)
  if (m.auth_user_id) throw new Error(`${m.display_name} already has an account linked.`)
  let s = ''
  for (const b of randomBytes(10)) s += ALPHABET[b % 32]
  const code = `${s.slice(0, 5)}-${s.slice(5)}`
  const norm = code.replace('-', '')
  const hash = sha(pin ? `${norm}:${pin}` : norm)
  if (!dry) {
    await db.begin(async (tx) => {
      await tx`update member_invites set expires_at = now() where member_id = ${m.id} and used_at is null and expires_at > now()`
      await tx`insert into member_invites (member_id, code_hash) values (${m.id}, ${hash})`
    })
  }
  console.log(`${dry ? '[dry run, nothing written] ' : ''}Invite for ${m.display_name} (${memberCode}), valid 14 days, works once:`)
  console.log(`  ${site}/join#code=${code}${pin ? '&pin=1' : ''}`)
  if (pin) console.log(`  PIN (give it by another channel, for example a phone call): ${pin}`)
  console.log('This is shown once; it is not stored anywhere else.')
} finally {
  await db.end()
}
