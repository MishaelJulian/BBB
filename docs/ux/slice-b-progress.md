# Slice B progress (resume file)

Worktree: `<repo>-slice-b`, branch `slice-b` (off `ui/slice-a`). Frontend dir: `frontend/`. Never push, never touch live DB.

## Setup to re-run
- `frontend/node_modules` is a symlink to the main checkout; `frontend/.env.local` copied (secrets, git-ignored).
- App env: `export DATABASE_URL="$(grep '^DATABASE_URL' frontend/.env.local | cut -d= -f2- | tr -d '"' | sed 's#:6543/#:5432/#')"`
- Local throwaway Postgres (schema-only dump of live, plus stubs for auth/extensions): data dir `/tmp/sb/pgdata`, port 5544, socket dir `/tmp/sb`, db `bbb`.
  Start: `pg_ctl -D /tmp/sb/pgdata -o "-p 5544 -k /tmp/sb" -l /tmp/sb/pg.log start`. Connect: `psql -h /tmp/sb -p 5544 -U postgres -d bbb`.
  If /tmp/sb is gone: `pg_dump --schema-only --no-owner --no-privileges --schema=public` from live (read only), stub `auth.users`, roles anon/authenticated, schema `extensions` with pg_trgm, then apply the 20261020* migrations in order.

## Done
- ITEM 2 WISHLIST done: `/api/me/wishlist` (GET/POST/DELETE), `/visibility` (PUT, audited), `/import` (POST, dry_run), `lib/member/goodreadsCsv.ts`, `MeWishlist.tsx`, `/me/wishlist`, Wishlist row in MeHome, public reader page shows it only if public. `FloatPair.tsx` portal fixes fixed buttons being covered by the footer (also used in MeEntries). Verified with Playwright (t4.mjs) + curl.
- ITEM 3 DATA DOWNLOAD + ACCOUNT REMOVAL done: /api/me/export (GET, JSON attachment) and /api/me/delete (POST; password checked through the Supabase token endpoint, 5 tries per 10 min, admins refused; erases bio, wishlist, picks, pick log, unused invites; unlinks; audit row without email; scrubs actor_email on earlier audit rows; removes the auth.users row in the same transaction). AccountScreens has Download my data, Delete account, Account deleted. Also fixed ?s= links on soft navigation (useSearchParams + Suspense). Verified with /tmp/sb/t5.mjs.
- Migrations (files): `supabase/migrations/20261020100000_member_picks.sql`, `20261020100100_wishlist.sql` (applied to the local DB only).
- ITEM 1 SHARED PICKS done: routes `/api/me/picks` (GET, POST, DELETE), `/api/me/picks/admin` (admin GET); closet + book view ported to API (count of others, admin sees names); `MePicks.tsx`; admin view `components/club/AdminPicks.tsx` at `/admin/picks`.
  Verified against local DB with auth stub: add/retag/replace/delete, 4-limit 409, replace of non-owned 422, admin 403 for member, mocked-session Playwright of closet sheets and admin page.

## In progress / next step
ALL ITEMS DONE (book and author pages ported, tsc and next build pass, notes in docs/ux/slice-b-notes.md). Nothing left except review by the coordinator.

## Decisions taken
- Admin picks data is served from `/api/me/picks/admin` because `src/app/api/admin/**` is off limits.
- DELETE /api/me/picks takes a JSON body `{book_id}`.
- Re-POSTing a held book changes its tag (logged `retagged`).

## Tree state
Committed at the end of each item. Check `git status` first.

## Local test stack (re-create if /tmp/sb is gone)
- Auth stub `/tmp/sb/stub.mjs` (port 54321): tokens tok-member / tok-admin / tok-other, password check 'correct-horse'. Seed `/tmp/sb/seed.sql`.
- Dev server: `bash /tmp/sb/dev.sh` (port 3157, local DB 127.0.0.1:5544, stub auth). Playwright helpers `/tmp/sb/lib.mjs`, tests t1-t3.mjs. curl helper `/tmp/sb/c.sh METHOD path json` (env T=token).
