# Slice D progress (resume file)
Worktree: `BBB-vercel-demo-slice-d`, branch `slice-d` (off slice-bc 1d83814). Update after every step.

## Environment (re-run after a reboot)
- Postgres 18 on 127.0.0.1:55432 (trust auth). Start: `pg_ctl -D /tmp/slicec/pgdata -o "-p 55432 -k /tmp/slicec -c listen_addresses=127.0.0.1" -l /tmp/slicec/pg.log start`
- DB `slice_d` = copy of `bbb_m` (real-data copy) + the Slice D migration. Rebuild: `create database slice_d template bbb_m` then run supabase/migrations/20261022100000_recovery_and_sessions.sql. NEVER use the DATABASE_URL in frontend/.env.local (it is the LIVE db).
- `export DATABASE_URL=postgresql://postgres@127.0.0.1:55432/slice_d`
- Stub Supabase Auth: `cd frontend && DATABASE_URL=postgresql://postgres@127.0.0.1:55432/slice_d node scripts/slice-d/stub-auth.mjs` on port 54389 (54399 belongs to something else). Seed: `psql -h 127.0.0.1 -p 55432 -U postgres -d slice_d -f frontend/scripts/slice-d/seed.sql`.
- Dev server: /tmp/slicec/d/dev.sh (next dev -p 3188, env points at slice_d + stub: DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54389, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=stub-pub, SUPABASE_SERVICE_ROLE_KEY=stub-service-key).
- Browser checks: `node scripts/slice-d/e2e-flows.cjs signup` then `forgot` then `admin`; `node scripts/slice-d/e2e-session.cjs` (slow, run in background). Screenshots in /tmp/slicec/d/shots.
- Checks: `cd frontend && npx tsc --noEmit`; tests `npx vitest run src/lib/recovery src/lib/admin` (src only; ignore e2e/smoke.spec.ts); build `npx next build` with DATABASE_URL overridden.

## Done
1. Design note docs/ux/slice-d-design.md.
2. Migration 20261022100000, word list, phrase.ts, codes.ts, reset.ts, supabaseAuth.ts, session policy + caller() enforcement, routes (auth/forgot, me/recovery, session/start, admin members/[id]/reset-code), Codes list union, changes labels. tsc clean.

3. Tests (22 in src/lib/recovery/recovery.test.ts) pass with the admin tests. UI wired (login keep + forgot link + expired notice, /forgot, /recovery, Account recovery row, admin Issue reset code, Codes list). Browser flows pass (signup, forgot, admin code, lockout, expired/reused).

## Next (old list, mostly done)
tests (src/lib/recovery/recovery.test.ts), UI wiring (login keep checkbox, /forgot, /recovery, Account recovery row, admin reset code), stub auth + Playwright, final notes docs/ux/slice-d-notes.md.
