# Slice C progress (resume file)
Worktree: `BBB-vercel-demo-slice-c`, branch `slice-c` (off ui/slice-a). Update after every item.

## Environment (re-run after a reboot)
- Throwaway Postgres 18 in /tmp/slicec/pgdata, port 55432, trust auth. Start: `pg_ctl -D /tmp/slicec/pgdata -o "-p 55432 -k /tmp/slicec -c listen_addresses=127.0.0.1" -l /tmp/slicec/pg.log start`. Helper: `/tmp/slicec/p.sh -d bbb`.
- DB `bbb` = schema-only dump of live public schema (/tmp/slicec/live_public.sql) plus a data-only copy (/tmp/slicec/live_data.sql, read-only dump, no audit_log/member_invites/rate_limits) with stub auth/storage/extensions schemas.
- Local app DB: `export DATABASE_URL=postgresql://postgres@127.0.0.1:55432/bbb` (never the live DB for writes).
- frontend/node_modules is a symlink, frontend/.env.local copied (secrets, git-ignored).
- Checks: `cd frontend && npx tsc --noEmit && npx next build`.

## Done (committed)
- Backend for items 1-7 (src/lib/admin/*, src/app/api/admin/**, migrations 20261021100000/100100, vitest tests src/lib/admin/admin.test.ts: 12 pass).
- Items 3 Members, 4 Codes, 5 Books tools (UI + routes) done and checked with Playwright (/tmp/slicec/e2e/members.cjs, books.cjs).
- Item 6 Meetups tool (photo, enrich, soft delete; PDF NOT built: no PDF library in package.json), item 7 Record a meetup + Notify draft: done, Playwright checked (meetups.cjs, record.cjs).
- Item 1 console home (/admin) and item 2 All changes (/admin/changes) UI, verified with Playwright at 390x844 against a mocked auth server.

## In progress / next steps
Remaining: verify Refresh site data on a production build, tsc + next build, notes doc. (UI still to build was: /admin/meetups(+[number]), /admin/record, /admin/notify. Then PDF (item 6 last part: no PDF library in package.json -> stop and report), Refresh verify (revalidatePath on cached indexes), final build, notes doc docs/ux/slice-c-notes.md.

## How to re-run the checks
1. Postgres: see Environment. Mock auth: `node /tmp/slicec/mockauth.cjs &` (port 54399, tokens admin-token / member-token).
2. Dev server: `cd frontend && DATABASE_URL=postgresql://postgres@127.0.0.1:55432/bbb NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54399 SUPABASE_SERVICE_ROLE_KEY=test npx next dev -p 3177`
3. Tests: `DATABASE_URL=postgresql://postgres@127.0.0.1:55432/bbb npx vitest run src/lib/admin`
4. Playwright scripts in /tmp/slicec/e2e (lib.cjs sets the session key sb-127-auth-token). If /tmp was wiped, recreate: the session is {access_token:'admin-token',...} in localStorage.

## FINISHED 2026-10-19
All items done except the Books PDF (no PDF library). Final report is docs/ux/slice-c-notes.md. Last checks: tsc ok, next build ok, vitest 13 pass.
