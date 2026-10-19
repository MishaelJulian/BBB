# UIUX backlog: deferred and open items (logged 2026-10-19)
Source of truth for what is left. Decisions and history live in `wave0-decisions.md` (rounds 1 to 62); sheets in `wave0-sheets-round2` to `round10`.

## Done and approved (mockups on the server, `mockup/site`)
Directory (D1 to D3); Club (hub, About Us, FAQ, Listicles); Meetup #100; Home; 404; Admin (A1, A2 record a meetup, N3 notify, All changes); Me batch (card, Did you read today, letter, Entries, Wishlist, Closet Picks); Library (real 3D closet, list grid, search sheet, Filters, Picks, full-screen book view); admin Closet Picks view; Sign in and Account (recovery phrase, forgot password, 2FA, data download, delete); admin tools (Members, Books, Codes, Meetups with photo, PDF, enrich, delete; Refresh site data).
Built, awaiting founder verdict: meetup detail page and reader profile (Round 62).

## Next, by the founder's own order
1. Statistics page (admin, A3). No sheet yet. Research prompts: `research-prompts-admin-stats.md`. Reuse the RTIH chart style (KpiTrendChart, indexed area chart); the filter engine and the file picker already decided.
2. Public Scorecard (pushed later, comes with Statistics).

## Pushed for later (founder, 2026-10-19)
- Opening sequence (B0). Answered: shown on devices with no prior record, replay link in the footer, 7 to 8 seconds, synthesised sound, current map, right-edge paper flip. Still open: iPhone fullscreen, sound on by default or not, portrait lock.
- iOS "Add to Home Screen" instruction sheet.
- Full-screen button.
- Dark mode (after layouts settle).
- Gallery (parked, not a priority); the Special events index is Meetup #100 only.
- Admin console "Do next" item "N guests have attended twice, Make them members?" still opens a placeholder (stub); making members already lives in Members, so the link should go or point there.

## Moved to the backlog
- Two-factor authentication (drawn in the Account mockup; removed from the near-term build by the founder, 2026-10-19). Supabase TOTP MFA is free and on by default; backup codes not verified.

## Unfinished in what is built (mockup limits)
- Admin actions (members, books, codes, meetups) show in All changes only as "On this phone" rows, without a shared undo; the real build needs the audit log to carry them.
- Goodreads export add step adds to this phone's Books list only.
- Picks (Library, Me, admin view) are one list but live on the phone; a picks table and routes are build work.
- Photo, PDF, delete and refresh actions in admin Meetups are mockup state; the demo stack has no photo store route, PDF generator or enrich routes yet.
- Recovery phrase, 2FA, reset codes and sign-in are drawn, not wired; Supabase has no phrase feature (own hashed table needed); TOTP MFA believed available, not re-checked.
- Password reset mail needs a sender (no domain); admin-issued reset codes are the stopgap.
- Header height left at 72 px (founder never confirmed).
- Library: live spine number (closet) and the number on the live flip book are computed differently; the preview omits the number.

## Wireframe and build stages (after the mockups)
Wireframe: real data, at least 5 working buttons per page, no error handling (0d). Then build waves: foundation, write paths, content. Needs device tests beyond Android (iPhone/Safari not yet tested; Android tested by the founder).

## Data items parked (not UI)
Orphan authors (396, review file in docs/ux); parser fix for meetup #93; 32 meetups have no attendance rows; `attendance_count` empty for 67 meetups; junk rows ("Mentions", "Genre Specific"); 156 books with no author; no book has an ISBN; 278 books with no cover; Goodreads grey placeholder covers.

## Founder-owned
Push the fork's unpushed commits; delete `~/bbb_export` and `~/bbb_pdfs_upload`; the Seoul Supabase project `jzcsqjuxzxlsexocuorq` is unused (the demo runs on `fdvjykrwckhovfocnnyy`, verified in the local env 2026-10-19; Vercel's own env not readable); stop the mockup server with `sh mockup/stop.sh`.
