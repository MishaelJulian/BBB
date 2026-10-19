# Slice B (member features): notes and hand-off (2026-10-19)
Branch `slice-b`, worktree `BBB-vercel-demo-slice-b`, off `ui/slice-a`. Nothing pushed; nothing applied to the live database or storage. `npx tsc --noEmit` and `npx next build` pass (build run against a local throwaway Postgres, not the live one).

## Done
1. Shared Closet Picks. Tables `member_picks` and `pick_log`. `/api/me/picks` GET, POST (add, change tag, or `replace_book_id` at four), DELETE (JSON body `{book_id}`); at most four enforced inside a transaction that locks the member row. `GET /api/me/picks?book=ID` returns `others` (a count, never names) and, for admins only, the readers. The closet (`CriterionBookCloset`, `CriterionListDetailModal`) now uses the API instead of localStorage `bbb_picks` and shows "N others have also picked this"; tag sheet, replace-at-four sheet, Picks sheet and Polaroid unchanged. `/me/picks` reads the API. Admin view at `/admin/picks` (Most picked, By reader, History, book drill-down, search, Filters by tag) reads `GET /api/me/picks/admin` (admin only).
2. Wishlist. `wishlist_items`, `members.wishlist_public` (default false). `/api/me/wishlist` GET/POST/DELETE, `/visibility` PUT (confirmation in the UI, audit row), `/import` POST (client parses the Goodreads CSV: to-read only, `="978..."` cells, series suffix stripped, deduped; server dry-run preview then add). Page `/me/wishlist`, row on `/me`, persistent "How to export from Goodreads" link. Reader page shows the wishlist only when public.
3. Data download and delete account (Account screens). `GET /api/me/export` (JSON file: sign-in email, bio, linked record, entries, meetups attended, wishlist, picks). `POST /api/me/delete`: reasons, permanent warning, tick box, password re-entered and verified on the server against Supabase Auth (5 tries per 10 minutes). Option A: unlinks the record, erases bio, wishlist, picks, pick log and unused invites; keeps attendance and discussions ("entries" in this schema are `discussions`, kept) under the member's name; audit row written without the email; the email is blanked on that user's earlier audit rows; the login is removed with `delete from auth.users` in the same transaction. Admin accounts are refused (a last admin must not vanish by accident).
4. Book page `/books/[id]` and author page `/authors/[id]` as server components in the club style (rows like the meetup page, picks control with the count, synopsis with Read more, discussed-at and readers lists).

## Migrations (files only), apply in this order in the Supabase SQL editor
1. `supabase/migrations/20261020100000_member_picks.sql`
2. `supabase/migrations/20261020100100_wishlist.sql`
Code deployed before they are applied: the reader page and the book/author pages tolerate the missing wishlist table; picks, wishlist and delete routes answer 500 until applied. Apply first, then push.

## Env vars
None new. Uses existing `DATABASE_URL` (port 5432), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

## Files changed
Edited: `src/app/account/page.tsx`, `src/app/authors/[id]/page.tsx`, `src/app/books/[id]/page.tsx`, `src/app/members/[id]/page.tsx`, `src/components/club/{AccountScreens,MeEntries,MeHome,MePicks}.tsx`, `src/components/library/{CriterionBookCloset,CriterionListDetailModal}.tsx`.
Added: `src/app/admin/picks/page.tsx`, `src/app/me/wishlist/page.tsx`, `src/app/api/me/{picks,picks/admin,wishlist,wishlist/visibility,wishlist/import,export,delete}/route.ts`, `src/components/club/{AdminPicks,BookPickControl,FloatPair,MeWishlist,ReadMore}.tsx`, `src/lib/member/{picks,goodreadsCsv}.ts`, the two migrations, `docs/ux/slice-b-notes.md`, `docs/ux/slice-b-progress.md`. (The planned `club-member.css` was not needed: every class already exists in `club.css`.)

## How verified
Local throwaway Postgres (schema-only dump of the live public schema, stub `auth.users`), a small Supabase Auth stub, `next dev` on port 3157, curl for every route (limits, wrong owner, admin-only, dedupe, password wrong and right, erase and keep results checked in SQL), and Playwright at 390x844 with a stored session for: closet pick sheets (add, replace at four, count of others), `/admin/picks`, `/me/wishlist` (CSV import preview and add, public switch, public reader page), account download and delete flow, book and author pages. `tsc` and `next build` clean. Not tested: the real Supabase (password check and `delete from auth.users` against the live pooler role), a real phone, the Polaroid after the change.

## Open risks and things to know
- `delete from auth.users` needs the `DATABASE_URL` role to have that right (the `postgres` role normally does). If it does not, the whole delete rolls back and the member sees an error; nothing is half-erased. Fallback would be the Supabase admin API with a service key (not configured).
- The reader page is cached 60 s, so switching the wishlist to private can take up to a minute to disappear from the public page.
- `backup.snapshot()` does not yet list `member_picks`, `pick_log`, `wishlist_items` (a later migration should add them).
- Admin picks data is served from `/api/me/picks/admin` because `src/app/api/admin/**` was off limits; Slice C only needs to link to `/admin/picks`.
- Slice A bugs fixed on the way (in files I own): the Account screens did not change when you tapped a row (soft navigation) and the floating buttons on Entries were covered by the footer on short pages (`FloatPair` portal). Other Slice A pages using `fpair` inside `main` (outside my scope) may have the same footer problem.
- In dev the 404 page logged a hydration warning after client navigation (not from my code).
- Files I was not allowed to edit and did not: none needed a change. `ClubPage` tab `''` highlights nothing, which is fine for `/admin/picks`.
