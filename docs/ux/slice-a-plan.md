# Slice A plan: the approved mockups become the real app (2026-10-19)
Branch: `ui/slice-a` (off `demo/vercel`, which is 7 commits ahead of origin). The founder pushes; Vercel deploys the pushed branch. No Claude attribution in commits.

## Architecture (taken as defaults; veto any)
1. Style: the approved mockup CSS is ported as-is into `src/styles/club.css`, every rule scoped under `.club` by `scripts/port-club-css.py`, so the legacy Tailwind pages and the closet keep their own styling. New pages are React components using the same class names. Reason: fidelity to what was approved, and speed.
2. Every new page renders inside `<ClubPage>` (top bar, tab bar, search, map, footer). Public pages fetch on the server with the existing data helpers (cacheable); interactive parts are client components.
3. Session comes from Supabase (`lib/auth`), roles from `app_metadata` only (server-written). The greeting and avatar come from the linked member record (`/api/me`), never from editable `user_metadata`.
4. Closet: the patched copies from the mockup (`mockup/tools/closet/patched`) become the real files, with the mockup session shim replaced by the real session, links pointed at real routes, and floating controls lifted above the tab bar.
5. Static assets live under `/ui/` (fonts, map, logo, team photos). Meetup photos go to Supabase Storage (public bucket), not the repo (the mockup folder is git-ignored because it holds member photos).

## Page map (mockup page -> route -> data)
Home -> `/` (replaces the closet-as-home) -> live counts, meetup photos. Directory -> `/directory`. Meetups -> `/meetups`, `/meetups/[n]` (the mockup's meetup page), Meetup #100 -> `/meetups/100`. Readers -> `/members`, `/members/[id]`. Library -> `/library-room` (closet) with `?select=ID`. Club -> `/club`, `/about`, `/faq`, `/listicles`, `/listicles/[slug]`. 404 -> `not-found.tsx`. Terms and Privacy restyled. Sign in and create account -> `/login`; invite -> `/join`. Me -> `/me`, `/me/entries`. Account (password, bio, linked record, sign out) -> `/account`.
Not in A: Wishlist, Picks, daily-question table, data download, delete account, recovery phrase and reset codes, admin tools, Statistics, Scorecard, 2FA (backlog).

## Invite link: who can do what (authentication and authorization)
- The link only lets its holder create their OWN new account and attach it to ONE member record. It never signs anyone into an existing account; there is no login token in it.
- Form: `https://<site>/join#code=XXXXX-XXXXX`. The code sits after `#`, so browsers never send it to servers, logs or referrers.
- The code is one-time, hashed in the database, expires after 14 days, and a new code voids older ones (all already in `/api/admin/members/[id]/invite` and `/api/me/claim`). Claim is rate-limited to 5 tries a minute per login and answers one message for every failure.
- Page text: "You're invited as Abhiram". A preview call returns only the first name for a valid, unused code, rate-limited by address, one generic answer otherwise.
- Second factor (added): an optional PIN the admin hands over by another channel (phone call, not the same chat). Wrong PIN burns the invite after 5 attempts. Needs a small schema change (pin_hash, attempts on `member_invites`); I will ask before applying it to the live database.
- After a claim: the record is linked to that login (one login to one record; the unique key already exists), an audit row is written, an admin can unlink and re-invite. Anyone else holding the used link gets "not valid".
- Admin rights: set only by the server-side `app_metadata.role`. For Abhiram it is a direct change on the live database after they register, with the founder's go-ahead.

## Performance tracking (the founder's "delta")
Pending the founder's answer on what "PWA" means here. Plan: record Lighthouse mobile (performance, accessibility, best practices, SEO, installability) for each deploy against a stated baseline, and keep the closet's long-task time on a real Android phone. Single Lighthouse runs vary by about 7 points.

## Steps
S1 assets, scoped CSS, ClubPage shell (top bar, tab bar, search, map, footer). S2 Home, 404, Directory, Meetups list. S3 meetup page and Meetup #100, Readers list and reader page. S4 Library (closet port). S5 Club pages. S6 sign in, create account, join, Me, Entries, Account, N2 letter, N1. S7 tests (tsc, build, Playwright smoke and the no-dead-button crawl), Lighthouse, push instructions.
