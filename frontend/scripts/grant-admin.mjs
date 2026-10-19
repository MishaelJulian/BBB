// Gives an account the admin role. Roles live in app_metadata, which only the server can write (user_metadata is user-editable and is never read for roles).
//   node --env-file=.env.local scripts/grant-admin.mjs someone@example.com [--revoke] [--dry]
import postgres from 'postgres'

const args = process.argv.slice(2)
const email = args.find((a) => !a.startsWith('--'))
if (!email) throw new Error('Usage: grant-admin.mjs <email> [--revoke] [--dry]')
const db = postgres(process.env.DATABASE_URL, { max: 1, prepare: false })
try {
  const [u] = await db`select id, email, raw_app_meta_data from auth.users where lower(email) = lower(${email})`
  if (!u) throw new Error(`No account with that email. They must sign up first.`)
  const revoke = args.includes('--revoke')
  console.log(`${u.email}: role is now ${u.raw_app_meta_data?.role ?? 'none'}; will become ${revoke ? 'none' : 'admin'}.`)
  if (!args.includes('--dry')) {
    if (revoke) await db`update auth.users set raw_app_meta_data = raw_app_meta_data - 'role' where id = ${u.id}`
    else await db`update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb where id = ${u.id}`
    console.log('Done. They sign in again to pick it up.')
  }
} finally {
  await db.end()
}
