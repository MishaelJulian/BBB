# Slice A: what is built, what the founder runs, known gaps (2026-10-19)
Branch `ui/slice-a` (off `demo/vercel`). `npx tsc --noEmit` and `next build` pass. Nothing has been pushed or applied to the live database or storage.

## Built (all from the approved mockups)
Shell (top bar, tab bar, search, map, footer) and the scoped club styles; Home; Directory; Meetups list; Readers list; meetup page (books as rows, previous/next); reader page; Meetup #100; Library (the approved closet header, list grid, search sheet, filters, picks, full-screen book view, `?select=ID` deep link); Club hub, About, FAQ, Listicles and each listicle; 404; Terms and Privacy in the club type; sign in and create account (Show/Hide, standalone data notice and consent); the personal invite link `/join#code=...` (name shown as "You're invited as Abhiram", optional PIN, rate limits); Me (library card, "Did you read today", first-sign-in letter), Entries (add, remove, undo), Closet Picks (this phone), Profile and account (email, password, bio, linked record, privacy and requests, sign out).

## What the founder runs, in order (each one touches something live, so none was done for you)
1. Push the branch so Vercel builds it: `git push origin ui/slice-a:demo/vercel` (this replaces the live look; the 7 earlier unpushed commits go with it).
2. Photos for Home and Meetup #100 (they are not in the repo): in the Supabase SQL editor run `supabase/migrations/20261019100000_club_photos_bucket.sql`; then `cd frontend && SUPABASE_SERVICE_ROLE_KEY=... node --env-file=.env.local scripts/upload-club-photos.mjs`; then set `NEXT_PUBLIC_PHOTO_BASE=https://fdvjykrwckhovfocnnyy.supabase.co/storage/v1/object/public/club-photos` in Vercel and redeploy.
3. Abhiram's invite (writes one row to `member_invites`): `cd frontend && node --env-file=.env.local scripts/make-invite.mjs 065-01 --pin`. Send the link by one channel and the PIN by another (a call). The link only lets its holder make their own account and attach it to that one record; it never signs anyone in.
4. After Abhiram has registered, give them admin (writes `app_metadata` on their account): `node --env-file=.env.local scripts/grant-admin.mjs <their email>`. Add `--dry` first to see what it would do.

## Security notes
The invite code is after `#` (never sent to a server), one-time, hashed (with the PIN folded in), expires in 14 days, and a new code voids older ones. Claim is limited to 5 tries a minute per login and 10 an hour per code, so a PIN cannot be guessed. The preview returns only a first name for a valid unused invite and one generic answer otherwise, limited per address. Roles come from `app_metadata` only. The greeting and avatar come from the linked record, not editable account fields.

## Known gaps (on purpose, in later slices or on the backlog)
Book page, author page and the old admin page keep their old look (the book view's "Open the book page" button goes to the old page). Picks live on the phone until the picks table. "Forgot your password" is an email to the club until recovery phrases and reset codes. Session lengths (24 h admin, 30 days member, 90 days "keep me signed in") and the checkbox are not in yet. Wishlist, data download and delete account are slice B. The first-sign-in letter shows once to every account without the flag, including existing ones such as the founder's. Terms and Privacy keep their current words: review them against the new sign-up notice. Gallery is not linked. 2FA is on the backlog.

## Performance, measured on this machine with Lighthouse mobile emulation (same settings both sides)
| page | live (old) perf / TBT / a11y | new (ui/slice-a, local production build) perf / TBT / a11y |
|---|---|---|
| /meetups | 54 / 4,250 ms / 89 | 62 / 910 ms / 98 |
| /library-room | 51 / 5,840 ms / 96 | 47 / 2,650 ms / 96 |
Other new pages: Home 49 (TBT 2,190 ms, CLS 0.074), meetup #99 51, directory 53. Lab numbers on a fast machine with simulated slowdown; single runs vary by about 7 points. Real Android timings still to be taken after the deploy.
