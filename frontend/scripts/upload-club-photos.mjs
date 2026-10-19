// Uploads public/ui/photos/*.jpg to the public `club-photos` bucket (apply supabase/migrations/20261019100000_club_photos_bucket.sql first).
// Run once by the founder:  SUPABASE_SERVICE_ROLE_KEY=... node --env-file=.env.local scripts/upload-club-photos.mjs
// Then set NEXT_PUBLIC_PHOTO_BASE=https://<project>.supabase.co/storage/v1/object/public/club-photos on Vercel.
import { createClient } from '@supabase/supabase-js'
import { readdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
if (!key || !url) throw new Error('Set SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL.')
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'ui', 'photos')
const sb = createClient(url, key, { auth: { persistSession: false } })
let n = 0
for (const f of readdirSync(dir).filter((x) => x.endsWith('.jpg'))) {
  const { error } = await sb.storage.from('club-photos').upload(f, readFileSync(join(dir, f)), { contentType: 'image/jpeg', upsert: true, cacheControl: '31536000' })
  if (error) throw new Error(`${f}: ${error.message}`)
  n++
}
console.log(`uploaded ${n} files to club-photos`)
