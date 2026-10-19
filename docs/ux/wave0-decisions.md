# Wave 0 decisions and layout sheets (BBB demo)

Status: working record, 2026-10-18. Everything marked **agreed** was answered by the founder. Everything marked **proposal** is not a default and needs sign-off. Process rule: no silent defaults; stages are 0a define and site map, 0b ASCII layout sheets, 0c visual mockup, 0d minimal functional wireframe, then build (see `ADR-ui-revamp.md` and the plan file).

## 0a. Decisions (agreed)
- Site map: **A with a rooms band on Home**. Five tabs: Home, Directory, Library, Club, Me (tab order is decided in the sheets).
- URLs: `/directory/meetups/99` and `/directory/members/<id>`, with permanent redirects from `/meetups/*` and `/members/*`. About 35 links in 20 files change, plus `sitemap.ts`, `public/llms.txt`, ISR in `meetups/[id]/layout.tsx`, canonicals. `/api/*` stays.
- Root: landing story at `/`, closet at `/library-room`.
- Lead persona: **visitor from a social link**; visitor and admin both get full sheets. The persona jobs table (visitor, member, admin; top 3 jobs each) is still a hypothesis.
- Test case: mobile web, iOS Safari and Android Chrome. Desktop secondary. Dark mode after the layout is agreed.
- Club facts from the old site (confirmed current): since 2017, 4th or last Sunday 2:30 to 4:30 PM, Bookworm on Church Street; Substack `brokebibliophilesbangalore.substack.com`, Instagram `@brokebibliophilesbangalore`, Twitter `@BibliophilesBlr`, `brokebibliophilesbangalore@gmail.com`.
- Home button: **Substack subscribe**. Photo tap: **swipe lightbox**. Discussion photos: **show all**. Phone gallery: **two columns of portraits**.

## The 100th meetup (real facts)
- 11 Oct 2026, 2:00 to 6:00 PM, Samagata Foundation (Substack post of 4 Oct; the founder confirmed). No book discussion: an author spoke about his book (name and title to come from the founder; to be named on the page). No attendee names. The Substack payment handle never appears on the site.
- Timeline stops (founder's order, snacks dropped): Arrival, Introduction, Discussion, Games.
- Photos in `~/Downloads/BBB_100`: 28 total. 24 WhatsApp files `IMG-20261014-WA0033..0058` (1066x1600 mostly, no EXIF) and 4 games photos `IMG-20261012-WA0019..0022` (960x1280, no EXIF). 23 portrait, 5 landscape. Capture times cannot be read; the founder will send originals with EXIF.
- The placeholder DB row for meetup #100 (date 2026-10-17, wrong) was deleted on 2026-10-18; a backup of it is not kept in the repo. Re-create the real row (11 Oct, Samagata) through the admin write path or a one-off SQL on explicit approval.

## bswt.tv/work study (measured with headless Chromium, screenshots in the session scratchpad)
- Desktop 1440: edge-to-edge justified rows, no gaps; ratios 2.35, 1.78, 1.47, 0.74; fixed transparent 76 px header (Work, Talent, wordmark, About, Contact; 12 px tracked capitals); hover plays a video and shows a two-line caption.
- Mobile 390: single column at natural ratios, 8 px gaps; fixed 123 px header with a full-width wordmark and a 20 px nav row; no captions at all.
- Not infinite scroll: fixed 9,646 px (desktop) and 9,308 px (mobile) for 39 projects. 78 media elements. Near-black `#000201`, Neue Haas Grotesk, no `h1` to `h4`.
- Borrow: justified rows, natural ratios, small steady gap. **Don't borrow (agreed 100%)**: hover-only captions, a fixed header covering content or illegible over photos, nav targets under 44 px, missing headings, autoplaying video.

## 0b. Layout sheets, batch 1 (proposal)
Sizes proposal: 390 px baseline, gutter 16, 8-pt spacing, body 16/24, H1 32/38 serif, labels 14/20, top bar 48, tab bar 56 plus safe area, tap targets at least 44 px, photo gap 8. Photo rule: portraits in pairs of equal height (175x262; 3:4 shots 175x233); a landscape takes a full-width row (358x201); nothing cropped.

```
SHEET H1  HOME (visitor, mobile 390)
+----------------------------------+
| BBB Library                 (Q)  |  top bar 48 px; (Q) 44x44 opens search
|----------------------------------|
| A book club in Bangalore,        |  H1 32/38 serif
| since 2017.                      |
| 4th Sunday, 2:30-4:30 pm,        |  16/24 facts
| Bookworm, Church Street.         |
| [ Subscribe for the next one > ] |  button 48 px, ink + hard accent shadow, to Substack
|                                  |
| MEETUP #100  11 OCT 2026         |  label 14/20
| [ photo ][ photo ]               |  2x2 portrait mosaic, one per stop
| [ photo ][ photo ]               |
| The 100th, in four moments  >    |
|                                  |
| THE MEETUP BEFORE: #99           |
| [ photo 16:9, full width ]       |  358x201 from meetups.photo_url
| excerpt from meetups.description |
| Read #99  >                      |
|----------------------------------|
| Library Room              >      |  3 hairline rows, 56 px each
| 68 of 99 meetups on record  >    |  counts from GET /stats
| Readers' Archive          >      |
|----------------------------------|
| footer (batch 2)                 |
|----------------------------------|
| Home  Dir.  Lib.  Club   Me      |  tab bar 56 px, 5 buttons
+----------------------------------+

SHEET H2  MEETUP #100 POST (vertical timeline, 4 stops)
+----------------------------------+
| Directory > Meetups > #100  (Q)  |
|----------------------------------|
| Meetup #100                      |  H1 32/38
| 11 Oct 2026 . Samagata Foundation|
| An author spoke about <book> by  |  names pending from the founder
| <author>, then games.            |
|o ARRIVAL                         |  rail in the 16 px margin; stop heading is an h2
| [ photo 16:9 full width ]        |
||                                 |
|o INTRODUCTION                    |
| [ portrait ][ portrait ]         |
||                                 |
|o DISCUSSION                      |  active stop = the one accent
| [ portrait ][ portrait ] x ~10   |  all photos, about 2,700 px
||                                 |
|o GAMES                           |
| [ 175x233 ][ 175x233 ] x 2       |
|----------------------------------|
| < Meetup #99   Subscribe  >      |
|----------------------------------|
| Home  Dir.  Lib.  Club   Me      |
+----------------------------------+
```

Components: top bar custom + `button.tsx`; search `command.tsx` + `dialog.tsx`; tab bar custom `Link` x5 (Radix Tabs is for in-page panels); breadcrumb `breadcrumb.tsx`; button new "primary" variant; photo tiles `next/image` with stored width and height plus `skeleton.tsx`; lightbox `dialog.tsx`; timeline `<ol>` with an `h2` per stop; rooms rows `Link` plus `separator.tsx`.

## Open items
- Author name and book title (founder). Originals with EXIF to map photos to stops (founder).
- Photo records need a new table (meetup, stop, order, url, width, height, alt) and a storage bucket; not created.
- Persona jobs table unconfirmed. "Dealpipeline" filter reference has no URL yet (Library list page). Lookup trail in admin: meaning unclear. Skill names "Collage B-Roll", "Lemo Opuscar" unknown.

## 0b. Batch 2 decisions (agreed 2026-10-18)
- Directory index: two rows **with a 2-item peek** (newest two meetups; two recently active readers). Entries are hairline rows, not card tiles (card tiles were not among the approved exceptions).
- Gallery: **G1-B album list** (one 16:9 cover per meetup with title, date, photo count; opens the meetup post). Real data today: 29 photos in 2 albums (#100: 28, #99: 1).
- Readers sort: **keep the 4 existing sorts** (Books, Meetups, Name, Recent). No Earliest sort.
- Meetups list: **20 rows, then a working "Show 20 more" button**.
- Real-data facts behind the sheets (live DB, 2026-10-18): 68 meetups on record, 2017-08-26 to 2026-08-23; 140 members; 4 venues; 37 meetups have a description, 12 have a PDF, 1 has a photo. List rows show a description line only when it exists.

```
SHEET D1  DIRECTORY (/directory)            SHEET D2  MEETUPS LIST (/directory/meetups)
 top bar 48; rows 72 px, title 22/28         breadcrumb; H1; "Find a number" underline input 44 px;
 Meetups >  68 on record, since Aug 2017     Year, Month, Venue, Sort as 4 text buttons -> bottom sheet;
   (peek: 2 newest meetups)                  active filters as accent text, tap clears; rows 18/24 + 14/20
 Readers >  140 members                      (number, date, venue, counts, optional description);
   (peek: 2 recently active readers)         20 rows then [ Show 20 more ] 48 px

SHEET D3  READERS LIST (/directory/members)  SHEET C1  CLUB (/club)
 breadcrumb; H1; "Find a name" underline;    rows: About, Gallery, Lists, Special events, FAQ, Contact
 Sort: Books, Meetups, Name, Recent          bottom: Substack, Instagram, Twitter as 44 px text links
 rows: display name + "N books . M meetups"  Lists and Special events: rebuilt from the old site (content
 (real counts from the API); 20 then more    store decision is Wave 3); FAQ: 5 answers from real facts

SHEET G1-B  GALLERY (/club/gallery)
 Meetup #100 / 11 Oct 2026 . 28 photos / [cover 16:9 358x201]
 Meetup #99 / 23 Aug 2026 . 1 photo / [cover 16:9 358x201]
 more albums appear only when photos exist
```

## Correction to the plan: Wave 2 mostly exists already (verified 2026-10-18)
- Built and live in the fork: server-checked admin role (`lib/admin.ts` `requireAdmin`, role from `app_metadata`), `audit_log` written in the same transaction as every admin or member write (`lib/audit.ts`), one-time hashed invite codes (`member_invites`, 14-day expiry) with a rate-limited claim route (`/api/me/claim`), member self-edit (`/api/me/profile`, `/api/me/entries`), 12 admin write calls used by `app/admin/page.tsx`, a write rate limit of 30 a minute per visitor (`lib/http.ts`), and a nightly in-database 3-slot backup (`backup.snapshot()` via pg_cron, 02:00 IST; migration `20261013180000_identity_audit_backup.sql`).
- The "admin writes OUT / /admin read-only" notes in older memory are outdated.
- The placeholder meetup #100 (deleted 2026-10-18) was created on 2026-10-17 14:52 UTC through the live admin route by the founder's own admin account (audit_log row `meetup.create`). The deletion was done with SQL, so the log has no `meetup.delete` row for it.
- Real gaps: (1) backups are inside the same Supabase project, none off-site, no restore rehearsal; (2) `deleteMeetup` is a hard cascade delete (discussions, quotes, resources, current reads, recommendations) with only a summary in the audit `before`; `deleteMember` archives first; (3) no Turnstile on write routes (rate limit only); (4) no audit viewer; (5) no photo table or upload route; (6) no member has claimed a record yet (0 invites, 0 claimed), so "Hi, <first name>" needs a claimed record; (7) /admin visual check still pending.
- Password reset emails cannot be sent today: Supabase built-in mail reaches team addresses only, 2 an hour; real users need custom SMTP (the club Gmail with an app password is one option).

## 0b. Batch 3 sheets (proposal): L1 sign in, L2 reset password, M1 Me (states S0 signed out, S1 signed in without a record, S2 record linked, S3 admin), A1 admin home (existing write actions plus a Recent changes list from audit_log), A2 record a meetup (4 steps, native date input), I1 install prompt (Android `beforeinstallprompt` banner; iPhone Share-sheet instructions on `sheet.tsx`; Instagram's in-app browser needs an "Open in Safari or Chrome" line).

## 0b. Batch 3 decisions (agreed 2026-10-18)
- "Lookup trail" in admin = the audit trail: a read-only **Recent changes** list on the admin home (newest first; tap a row for before and after). Motion is decided in the mockup.
- Password reset: **skipped for the demo**. L2 is drawn but disabled with a "contact the club" line (no email sending without a domain or SMTP).
- Admin delete meetup: **type the meetup number to confirm, and the audit log stores a full copy of the meetup and everything attached before the delete**.
- Off-site backup: **skipped** (demo is short-lived; the nightly in-database snapshots remain the only backup, so a paused or lost Supabase project would lose the data).
- Note for the record: the SQL delete of placeholder meetup #100 left no `meetup.delete` row in `audit_log`; an entry can be added on request.

## 0b. Batch 3 follow-up decisions (agreed 2026-10-18)
- Footer sticky reveal: **phone and desktop** (as specified). Needs `dvh` units, bottom padding for the 56 px tab bar plus safe area, and a real-iPhone tap test on the footer links. Sheet F1 content: LAPL-style groups, one column on phones.
- Tab bar: **T-A, Library in the centre, drawn larger** (Home, Directory, LIBRARY, Club, Me). One standout only.
- 0b sign-off: founder chose **"Changes first"**. No mockup (0c) starts until the change list is given and the sheets are re-approved. Pending from the founder: the list of changes, the "dealpipeline" URL for the Library sheet, the author name and book title, originals with EXIF, and confirmation of the persona jobs table.

## Deal-pipeline filter engine (source: RTIH `platform_/apps/investor-web/app/(dashboard)/DealPipeline.tsx`, ADR-007 section 5, ADR-0010 anti-pattern "filters hidden behind unnecessary interactions")
- Engine: fetch the whole dataset once, filter in the browser with `useMemo`: free-text search, stage filter, sector filter, view toggle, sort (score or name), density; preferences persisted (`usePipelinePrefs`). A stage row shows live counts that follow the active filters and toggles that stage as a filter. ADR-007 rule: drop filters with no database column behind them.
- Flaws not to port: hover-only filter drawer (dead on touch), "Reset All" does not clear the stage filter, pills with coloured dots (our no-pills rule), sort limited to two fields, active filters not shown, filter state not in the URL.

## 0b. Library list sheet LB1 and decisions (agreed 2026-10-18)
- Segment row on the Library list, as text tabs with live counts: **All, Most read, Translated** (3 real `translation_of` rows). "Community favourites" = **Most read by members** (derived from discussion rows; top book has 69). **Library picks dropped for now** (no flag exists). "Rated" tab and rating sort were an unapproved addition and are removed pending approval (2,159 books have a book-level `rating`, origin not verified).
- Real data (2026-10-18): 2,741 books, all `language = 'en'`; 3,691 discussion rows; 2,536 books discussed; `book_relations` has 3 rows.
- Engine fixes: tap-opened bottom sheet instead of hover; Reset clears everything; active filters shown as removable text; filter state in the URL; view and sort remembered per device; Sync DB and Manage DB gone from this page (admin only). Paging 20 then "Show 20 more".

```
SHEET LB1  LIBRARY LIST (tab 3)
 top bar 48; Shelves | List text toggle (closet frozen behind it)
 Find a title or author (underline input 44 px)
 All 2,741 | Most read | Translated 3   (text tabs with live counts)
 Sort: Most read x   Filters >          (Filters = bottom sheet: sort, meetup year, Reset all)
 Showing N books
 row: title 18/24, author 14/20, "read by 69 . at 12 meetups" (real counts)
 20 rows then [ Show 20 more ]; tab bar with Library larger in the centre
```

## 100th meetup timeline: revised (agreed 2026-10-18)
- Photo dates: every photo is dated **11 Oct 2026** by the founder's instruction. The filenames carry only the share date (14 Oct for WA0033-0058, 12 Oct for WA0019-0022) and a send-order number; there are no capture times, so no clock times are shown. Order within a stop follows the send-order number; order across stops follows the running order, not the file numbers.
- Stops are now **three**: **Arrival and Introduction** (WA0037, the handshake), **Discussion** (the other 23 photos of the 24-photo batch), **Games** (WA0019-0022). Snacks stay out. These stop assignments are assumptions from the contact sheets, not recorded data.

## Persona jobs (hypothesis, awaiting the founder)
Built from the spec files, the old site and the code; never tested with users. Weakest row: Member job 3 (meetup details and RSVP): no RSVP system exists, only a Google Form.
| Persona | Job | Evidence |
|---|---|---|
| Visitor | What is BBB and when do they meet | spec, old site About |
| Visitor | Browse past meetups and books | spec, old site |
| Visitor | Contact or join | old site "how to join" |
| Member | See my entries and books | existing `MyEntries` code |
| Member | Shortlist next 4, keep a wishlist | spec, not built |
| Member | Meetup details and RSVP | weak, no RSVP system |
| Admin | Record a meetup | exists in code |
| Admin | Fix member and book data | exists in code |
| Admin | Issue claim codes, view stats | claim codes exist; stats are spec |

## Personas v2 (founder correction, 2026-10-18)
- Visitor: what is BBB and when do they meet; browse past meetups and books; contact or join (Substack).
- Member: my entries and books; Goodreads wishlist; top-4 shortlist (matching picks revealed only after the club decides); "Did you read today" check-in; profile, library card, account. (Replaces the RSVP job: there is no RSVP system.)
- Admin: record a meetup; fix member and book data; issue claim codes; **a stats page for admins only**; audit trail (Recent changes).

## H1, H2, L1 detail decisions (agreed 2026-10-18)
- Corrections to earlier sheets: use the repo's type tokens (H1 32/40, H2 24/31, body 16/25.6, caption 14/21; the 12 px label token is not used for readable text). Meetup #99's photo is 1844x1459 (ratio 1.26), shown at 358x283 uncropped. Discussion portraits vary in ratio (0.56 to 0.67), so rows are justified (tile widths about 155 to 195 px), not fixed 175x262.
- **Home 100th preview: three photos, one per stop** (landscape 358x201 on top: Arrival, WA0037; a discussion portrait and a games portrait side by side below). Candidates for the two portraits are chosen at the mockup (discussion: WA0044, WA0049 or WA0056; games: WA0019 or WA0022).
- **Stop labels scroll away** (no pinned label). **Login stays one screen with a sign-in / create-account toggle.** **Sign-up consent is a required, unticked checkbox** (Terms and Privacy).
- H1 spec: top bar 48; H1 3 lines; Subscribe button 48 high with caption "Invites and RSVPs come by Substack."; 100th block (eyebrow, H2 "The 100th, in three moments", mosaic with always-visible captions, link "See the whole day"); #99 teaser (natural ratio photo, 3-line description clamp, link); three rooms rows 64 px each with counts from GET /stats (2,741 books, 68 of 99 meetups on record, 140 members); footer F1; tab bar. Skeletons reserve heights; counts show a dash until loaded; failures show no wrong numbers.
- H2 spec: breadcrumb top bar; H1 "Meetup #100"; facts; "28 photos, three moments"; sentence with author and book (names pending); timeline `<ol>` with rail in the 16 px margin, 9 px nodes, accent only on the stop in view (IntersectionObserver, colour change only); stops: Arrival and introduction (1 landscape), Discussion (23), Games (4, 3:4). Row rule: send order within a stop; portraits paired at equal height (row height = 350 / (r1 + r2)); landscapes get a full row; a would-be lone portrait pairs with the next portrait and the landscape waits one place. Lightbox on `dialog.tsx`: 100dvh, scroll-snap swipe, arrows and Esc, counter, 44 px close, pinch-zoom allowed, Android back closes it, focus returns. Images: explicit width and height, first one priority, pre-generated srcset 480/800/1066, one factual alt per photo (no names), the stop heading is the caption. Ending block: closing line, Subscribe button, link to #99, no next link.
- L1 spec: back button 44, H1 32/40, label above underline inputs 48 high at 16 px type, text "Show" button (no icon-only eye), Turnstile space of 65 px reserved, error line `role=alert` with friendly wording, primary button 48, "Forgot your password? Email the club." (reset skipped), toggle link, required consent checkbox in sign-up mode. Field attributes: email `type=email`, `autocomplete=username`, `inputmode=email`, `autocapitalize=none`, `enterkeyhint=go`; password `current-password` or `new-password` (8+ characters on sign-up). After sign-in: same-origin `next`, else `/me`. Expired session: `/login?next=...` with "Your session ended. Sign in again."
- Open: top bar static or sticky; a Share button on the #100 post; tab bar hidden on the login screen (recommended: iOS keyboard); palette variants to be shown at the mockup (brown `#8b4513` is only the existing token); author name and book title.

## H1/H2/L1 final details (agreed 2026-10-18)
- **Top bar:** scrolls away on the way down, and comes back on a fast scroll up even when the user is not near the top (a "headroom" pattern, the founder calls it basically a hover). It is a transient 48 px overlay on a solid background. The speed threshold is a tuning value to calibrate on a real phone at the mockup stage (proposal: an upward movement of 24 px or more within 150 ms, or reaching the top). Whether the tab bar behaves the same is being confirmed.
- **Share button on the #100 post: no.**
- **Login screen: tab bar hidden, with a 44 px Back button** (avoids the iOS keyboard problem; the page still has well over five working controls).

## Founder additions to H1 and L1 (2026-10-18)
- **Logo:** the favicon (a 640x640 photo of a typewriter typing "BBB / BROKE BIBLIOPHILES BANGALORE", with the paper-bail arc) sits next to the "BBB Library" wordmark in the top bar. The only copy of `logo_favicon.jpg` is in the founder's Trash (`~/.local/share/Trash/files/`): it must not be emptied, and it still has to be copied into the repo when building. At 16 px the full photo is mush; at 32 px the composition (type line plus arc) is recognisable. Crops tested: full photo, type line + arc, BBB + arc (square), arc only (the arc survives 16 px best). Icon assets for the PWA (192/512, maskable safe area) are derived from it.
- **Trifecta graphic** (replaces the three hairline rooms rows on Home): Library Room, Meetups and Readers as three equal triangles. Shapes are not sized by their counts (2,741 vs 68 vs 140 would make the others vanish). Concept sketches in the session scratchpad (`tri/concepts.png`): A, a Sierpinski-style trifecta with dither and hatch textures and the typewriter "BBB" in the centre; B, dgrees-style pixel icons on a faint grid joined by elastic lines; C, a low-poly triangulation. Each triangle is a link (Library Room to `/library-room`, Meetups to `/directory/meetups`, Readers to `/directory/members`) with visible labels and real counts from GET /stats. The elastic-line physics component (fancycomponents) was named for the future stats page; whether it also drives the trifecta edges is open.
- **Landing style, from the spec file:** a hybrid of the Awwwards "elastic typography" example (huge heavy capitals cropped by the frame), Heron AI (two colours, orange-red `#F15534` with charcoal `#282828`), and dgrees.studio (verified by screenshots: the "heart out of shape" is a pixel-art heart among 8-bit icons on a faint grid; also a pixel-block reveal, monospace labels, orange accent, a woman portrait collage), without the woman, the snake pointer and the pizza tree, and with the green turned deep blue. An out-of-focus procedural Bangalore map (from Majestic) as the background, textures and colours following those references. This is blur, which the no-glass rule restricts, so it needs an explicit exception.
- **Prescreen:** the first-visit full-screen preparation screen (Android) is separate from Home; Home is the main page after it (Wave 4).
- **Microcopy:** the expired-session line is exactly "Your previous session has expired. Sign in again." (replaces "Your session ended. Sign in again.").
- **Header sheet needed (new, T1):** top bar states for signed out, member ("Hi, <first name>", remove the "BBB Bangalore" tag, toy library card centred per the spec) and admin.

## Answers on the trifecta, logo, elastic line and blur (2026-10-18)
- Elastic-line physics: **stats page only**. The Home trifecta gets a drawn sagging line, no physics.
- Logo mark in the top bar: **BBB + arc, square crop at 32 px** next to the wordmark; the favicon and tab icon use the **arc-only crop**. Source file is in the Trash until copied into the repo.
- Out-of-focus Bangalore map: **not approved yet; shown in the mockup first** (it is blur, which the no-glass rule restricts).
- Trifecta direction: **still open**. The founder asked what the Home background is and wants the trifecta not to interfere with it. Proposed layering: the map lives only in the hero zone (about the first 560 px), masked to fade out before the 100th block, behind text at low contrast; the trifecta sits lower, after the #99 teaser, on solid paper, so the two never overlap.
- Concept images (kept in the repo docs): `docs/ux/wave0-assets/concepts.png`, `logo_crops.png`, `concepts.html` (source).

## Trifecta decision (agreed 2026-10-18): **B, pixel icons on a faint grid**
- Three equal pixel-art icons on a faint grid, joined by drawn lines (a sagging line, no physics; elastic-line physics is stats-page only): Library Room (shelf or books), Meetups (speech bubble or chairs), Readers (person with a book). Deep blue icons, one accent for the connecting lines (palette still open: dgrees' green alien becomes deep blue). Crisp SVG rects, never scaled raster. The pixel art in the sketch is crude and is redrawn properly at the mockup.
- Each icon plus its label is one link of at least 44 px: Library Room to `/library-room`, Meetups to `/directory/meetups`, Readers to `/directory/members`; visible labels with real counts from GET /stats (2,741 books, 68 of 99 meetups on record, 140 members). Sizes are equal; counts are text, not area.
- Position: below the #99 teaser, on solid paper, nothing behind it. The out-of-focus map is confined to the hero zone (about the first 560 px), fades out before the 100th block, sits behind text at low contrast and is pointer-transparent.
- Mockup scope: stage 0c starts with H1, H2 and L1 only (signed-out top bar); the top bar for members and admins comes from the T1 header sheet later.

## Reference-item decisions (agreed 2026-10-18)
- **Date inputs in admin: Carbon's picker (flatpickr) everywhere** (a new dependency; keep it keyboard and screen-reader accessible on every device; supersedes the "native date input" in sheet A2, which was an unapproved default).
- **Book marquee covers: our own copies of a few covers** copied into our storage (the founder picks the books and accepts the copyright position). The 2,463 existing cover URLs point at the Goodreads image host `i.gr-assets.com` and are not used for the marquee.
- **ASCII image on About: our own live converter** (small canvas script with an accessible text alternative). What "so user reviews can make sense" means is still unexplained; there is no reviews data.
- Waves for these items **as listed**: gallery 3; marquee, typewriter and the ASCII image 4; file input and date input 2 (with the photo table and upload route).
- Marquee and typewriter need a reduced-motion fallback, a full-text accessible label (typewriter) and a pause control (marquee, WCAG 2.2.2).
- **The existing brown (`#8b4513` and its dark/light variants) is gone completely** (founder, 2026-10-18).

## Pre-mockup decisions (agreed 2026-10-18); stage 0c starts for H1, H2, L1 only
- Accent colour: **show both in the mockup** (deepened orange `#c93a14` and deep blue `#12295a`); nothing is locked until the founder picks. Contrast facts on paper `#faf8f5`: Heron orange `#f15534` 3.25:1 and dgrees orange `#ff5a00` 2.95:1 fail for small text (usable for drawn lines and large shapes only); `#c93a14` 4.83:1 (white text 5.12:1); deep blue `#12295a` 13.29:1. The brown is gone: about 214 amber uses in 26 files, 101 accent-token uses in 27 files and 4 literal `#8b4513` files still need re-tokening in Wave 1.
- Home headline: **heavy capitals on Home only**, with an elastic stretch, in a self-hosted variable font with a width axis; everything else stays calm. The elastic effect is scroll-driven on touch, pointer-driven on desktop, static under reduced motion.
- Pixel icons: **we draw our own SVG set** (trifecta icons plus tab-bar glyphs, one grid, one deep-blue colour).
- Viewing: **local server on the founder's Wi-Fi** (member photos stay on this machine; the server is stopped when done).
- Not blocking, placeholders in the mockup: author and book names, photo picks (candidates shown), map (shown unapproved), dark mode, signed-in header T1.

## Stage 0c mockup built for H1, H2, L1 (2026-10-18)
- Static HTML, no framework, in the session scratchpad (`scratchpad/site`, temporary), served from the founder's machine on port 8765 (LAN only; photos of members are in it; stop it when done). Pages: `home.html` (H1), `meetup-100.html` (H2), `login.html` (L1), `stub.html` for unbuilt destinations, `index.html` (variants), `compare.html` (orange next to blue). Query options: `?accent=orange|blue`, `?map=blur|sharp|off`, `?expired=1` on the login page.
- Real data: the map is drawn from 2,468 OpenStreetMap road segments (trunk, primary, secondary) within 6.5 km of Majestic (fetched via Overpass, "Map (c) OpenStreetMap contributors" is credited in the footer); counts 2,741 books, 68 of 99 meetups, 140 members; meetup #99 text and photo; venue Bookworm; the 28 club photos (stops assigned by content, order within a stop by send number, alt texts drafted from contact sheets and unreviewed).
- Verified in headless Chromium (390, 360, 430 px; orange and blue): 0 console errors, no horizontal overflow, no tap target under 44 px, top bar hides on scroll down and returns on a fast scroll up (24 px within 150 ms; the slow 12 px case stays hidden), lightbox opens at "1 / 28", moves with the arrow key and closes with the back button, Discussion lays out as 13 justified rows with a three-up last row, Games as 2 rows of 2, sign-up mode shows the consent box, the login page has no tab bar, the expiry line reads exactly "Your previous session has expired. Sign in again."
- Not verified: real iOS Safari behaviour (dvh units, sticky footer reveal, keyboard behaviour, `interactive-widget`) and real Android Chrome; nothing was run on a physical phone.
- Refinements found while building: (1) the width axis alone only has a safe range of 62 to 74 before the longest headline line clips, so the headline now moves the width axis and the font size together (the longest line always fills the box, the block keeps a fixed height, nothing below moves); it starts tall and condensed and relaxes to wide on scroll; pointer-driven stretch only on devices with a real mouse (`hover:hover` and `pointer:fine`); static under reduced motion. (2) A lone portrait at the end of a stop joins the previous pair as a three-up row (rule added to the row algorithm). (3) Breadcrumb links and short footer links were under 44 px and were enlarged. (4) The lightbox's black backdrop style leaked onto the search dialog; scoped to the lightbox.
- Known drafts: pixel icons (the back arrow is crude), the 32 px logo crop reads as a dark square with a dome, book title and author name are visible placeholders, the map blur is unapproved, the accent is not chosen, contrast of muted captions over the map lines is not measured.

## Mockup round 2 (2026-10-18, founder feedback)
- **Accent: orange stays.** The blue accent variant is dropped from the UI (deep blue remains as the illustration, icon and footer colour).
- **Map: page-wide soft background**, semi-sharp (0.55 px blur, not a full blur), with texture and very desaturated colour: parks sage green with a dither texture, woods and scrub with a dot texture, water muted blue with a wave texture, railways dashed, roads grey-blue by class, 137 landmark icons in the pixel style (churches, hospitals, stations, theatres/libraries/museums, colleges), no labels. Two orange pins mark the club's venues (Bookworm and Samagata Foundation, coordinates from OpenStreetMap). The founder's phrase "green and blue respectively in the areas where parks apply" is read as green for parks, blue for water (to confirm).
- **Area:** centred on Church Street / MG Road, covering Trinity Church, Brigade Road, Richmond Road, Double Road, Cubbon Park, Queens Road and Crescent Road. Real OpenStreetMap data for the box 12.944 to 13.006 N, 77.585 to 77.625 E (about 4.3 x 6.9 km): 5,477 map features and 563 points. The map is fixed behind the page and drifts west to east (Cubbon Park to Trinity/Ulsoor) as the page scrolls; static under reduced motion. Layer is a single 586 KB WebP (1158 x 1826 px) plus a small grain tile; credit "Map (c) OpenStreetMap contributors" is in the footer.
- **Legibility cost, measured:** at 80% layer strength a third of map pixels fail 4.5:1 for grey captions; at 55% strength with captions in `#4a4a4a` only 0.1% of the map surface fails (worst-case pixel 3.57:1; ink text passes everywhere). So the map is drawn at 55% and the muted text token is now `#4a4a4a`; a paper-coloured text glow also helps (not measured).
- **Trifecta:** the grid is gone. The pixel icons stay; the triangle between them is filled with patterns: triangular tessellation (top), dither (bottom left), diagonal hatch (bottom right), the centre left empty with a sagging orange outline. A feathered paper clearing in the map sits behind it so the pins and roads do not collide with it.
- **Footer:** the sticky reveal is desktop only (min width 900 px with a real mouse); on phones it is a normal block at the end of the page. The footer now lists the **Facebook group** (`facebook.com/groups/brokebangalore`, taken from the old site's About page). On desktop the map is hidden for now (the reveal needs an opaque page).
- **Headline:** explained to the founder as a width change on scroll (tall and narrow at the top, wide and smaller after about 320 px, the three lines always filling the width). Preview URLs: `home.html?hl=0`, `?hl=0.5`, `?hl=1`. A race (a window resize re-fitting the headline to its start state) was found and fixed.
- Verified again in headless Chromium: 0 console errors, no overflow at 360 and 390 px, no tap target under 44 px, footer `relative` on phones and `sticky` at 1440 px. Not verified on a physical phone.

## Round 2 answers (2026-10-18)
- Headline tall-to-wide effect on scroll: **keep it**.
- Map strength: **48%** (the founder's number, between the 55% and 40% options); captions stay `#4a4a4a`.

## Round 3 (2026-10-18): founder feedback and research memo
**Founder decisions and reading of them**
- Headline: the founder likes the `hl=0` state (tall, condensed). Applied as: **static `hl=0` on phones; elastic only on a desktop with a real mouse**. (This is my reading of "I certainly like hl=0"; to confirm.)
- Map: **static on phones** (centred, no scroll movement); **the dynamic scroll and the real-time art are desktop-exclusive**.
- Trifecta: the geometric triangle-pattern version is rejected; the pixel icons are kept. Replacement built: **Bauhaus basic shapes as ASCII with ordered dithering** (triangle = Library Room, circle = Meetups, square = Readers), orange `@` outlines, the pixel icons sitting in clear windows, labels and real counts below. The shape-to-room mapping is my choice (Kandinsky's 1923 Bauhaus survey paired triangle, square and circle with yellow, red and blue; the survey is the source of the triad, the mapping is mine).
- Top bar: too small. Now 64 px (logo about 42 px, wordmark 20 px, 28 px search icon) as a proposal; `?bar=56|64|72|80` previews other sizes. Founder to pick.
- Command palette: the register already has it in **Wave 1** (item 3: wire the Search and Command buttons to a palette built on `command.tsx` + `dialog.tsx`). The mockup's search panel is a stand-in; the palette's own layout sheet is not drawn yet.
- Sign-up page: the founder says a line sits "higher or above the line for the input fields"; measured: all fields 48 px with a 2 px bottom line, text centred about 18 px above it, the password hint about 4 px under its line. What the founder means is unconfirmed.

**Research memo (sourced facts vs inference; dated 2026-10-18)**
- Sourced: Next.js supports a web app manifest through `app/manifest.ts` and recommends a service worker in `public/` served with no-cache headers; its own guide (last updated 2026-07-30) says a custom install button via `beforeinstallprompt` does not work on iOS Safari and lists Serwist for offline caching.
- Sourced: Vercel serves files in `public/` with `cache-control: public, max-age=0, must-revalidate` by default; fingerprinted `/_next/static` assets get `public, max-age=31536000, immutable`; Hobby limits are 100 GB Fast Data Transfer, 1M edge requests and 1,000 image-optimisation source images a month.
- Sourced (secondary articles, not Apple): Safari's tracking prevention deletes script-writable storage (including service worker registrations and caches) after 7 days of Safari use without a visit; home-screen web apps are effectively exempt. A "50 MB" iOS cache quota appeared in one secondary source and is unverified.
- Sourced: ordered (Bayer) dithering is cheap enough for real-time use and gives stable grain; halftone dot size encodes density on a fixed screen; Kandinsky's 1923 Bauhaus questionnaire paired triangle/yellow, square/red, circle/blue.
- Measured here (headless desktop Chromium, not a phone): the whole map as vectors is 155 KB raw, 60.5 KB gzip, 50.3 KB brotli (16,728 points, 5,447 paths) against 586 KB for the raster WebP. Building 21,590 halftone dots takes about 176 ms once (coverage 91 ms, dots 85 ms); the slow line redraw (2,122 segments, 27,810 px of line, 20 updates a second) costs 0.025 ms per frame on average, 0.2 to 0.4 ms worst. Two full-size canvases cost roughly 15 to 25 MB on desktop.
- Inference: phone CPUs would be several times slower (hence static raster on phones); 100,000 desktop loads at 586 KB would be about 58 GB of the 100 GB Hobby transfer limit, against about 5 GB at 50 KB, before browser caching; the art needs no database (a static file made from OpenStreetMap at build time), so the Postgres-to-SQLite question does not touch it; the existing code does use Postgres-specific features elsewhere (`jsonb` in `audit_log`, the `hit_rate_limit` function), which would need rewriting for SQLite regardless of the art.
- Recommendation: vectors plus a precache in the service worker, files under hashed names with long `immutable` headers set explicitly (the `public/` default is `max-age=0`), the service worker itself never cached, pre-generated photo sizes instead of the image optimiser to stay clear of the 1,000-image limit, any new tables written in portable SQL types (plain integer, text, timestamp; avoid jsonb, arrays and PG-only functions), and the halftone art on desktop only.

## Round 3 answers (2026-10-18)
- **Trifecta: reverted to the first version** the founder saw: the three pixel icons (Library Room, Meetups, Readers) with labels, real counts and the orange sagging lines on a faint 12 px grid. No ASCII, no patterns, and no white clearing behind it ("stop doing the weird white background"). The faint grid belongs to that first version; `?tri=nogrid` removes it if wanted. The ASCII Bauhaus experiment (dithered triangle, circle, square) and the triangle-pattern version were rejected; the ASCII code is archived in the session scratchpad only (`archive-home-ascii-trifecta.html`).
- **Top bar: 72 px** (logo 50 px, wordmark 22 px, 28 px search icon).
- **Command palette: left for Wave 1** (register item 3).
- **Sign-up/sign-in fields:** the typed text floated too far above its line. Fields are now 44 px high with the text about 10 px above the line (`padding-top` 16, line height 24), the Show/Hide word sits on the same baseline as the typed text, label spacing 14 px, the password hint 8 px below its line. Verified by measurement: email field 220.6 to 264.6, password field 299.6 to 343.6, Show button the same box, hint starting 8 px below.
- Desktop-only items stand as built: halftone dot map with slowly redrawn roads (desktop with a real mouse), elastic headline (desktop only), sticky footer reveal (desktop only). Phones: static map, static tall headline.

## Trifecta colour (2026-10-18)
- **Grid removed for good.** The three pixel icons are now a **deep red** `#a3281c` (6.88:1 on paper) so they sit with the muted map; the sagging lines stay the bright accent orange `#f15534` for now. Sign-up and sign-in confirmed good by the founder.
- No Heron AI screenshot was ever captured (`heron.ai` is a for-sale domain); the only Heron colour on record is `#F15534`, a bright orange-red from the Awwwards listing, so the deep red is my pick, not a sampled colour. Preview switch `home.html?ic=deep|maroon|accent|heron` (maroon `#7a1f1a` 9.72:1, accent `#c93a14` 4.83:1, Heron `#f15534` 3.25:1).

## Round 4 (2026-10-18)
- Trifecta: the pixel icons use the **accent `#c93a14`** and the connecting lines now **match the icons** (same colour). Grid stays removed. Earlier deep-red and `?ic=` options are retired.
- Meetup #100: the author and book names are **not important**: the placeholders are removed; the sentence reads "An author spoke about his book, then there were games."
- Headline: the founder does **not** want it static on phones. The scroll effect is back on phones (starts tall and condensed at the top, relaxes to wide and smaller as you scroll; static only for reduced motion); a mouse also drives it on a desktop. Verified: line widths fill the box and the block height stays fixed at 360, 390 and 430 px.
- The founder is checking on a real phone. Note: the map's orange venue pins and the orange trifecta share a hue, so at some scroll positions a pin lands next to the trifecta lines.

## Mockup workflow, wave by wave (agreed 2026-10-18)
- **Home:** `mockup/` in the fork, **git-ignored** (`.gitignore` line 91; it holds member photos and OpenStreetMap source files, 12 MB). Contents: `site/` (the served pages), `tools/` (map and vector builders, the check script), `source/` (OpenStreetMap queries and downloads), `start.sh`, `stop.sh`. Start with `sh mockup/start.sh` (prints the phone address); stop with `sh mockup/stop.sh`. The server listens on the Wi-Fi, port 8765, **open to anyone on the same network** (founder chose "as today"); it runs from this folder.
- **Rules for every round:** change the static pages, run the check script (console errors, overflow, tap targets, behaviours), give the phone link, log decisions here.
- **Limits:** a static mockup cannot test sign-in, saving, email or push; those need the functional wireframe stage (0d) against real data. PWA install and service workers need HTTPS, which a plain Wi-Fi address is not (Next.js PWA guide), so Wave 1b install testing needs a Vercel preview or a local HTTPS tunnel.
- **Next, in this order (founder):** more static pages first (Directory, Club, Library, Me, Admin) using today's global decisions (orange accent, 72 px top bar, static map on phones, no grid), plus the **product communication features**: the "Did you read today" notification, the post-registration letter, and future RSVP emails (integration shown, not sending).
- Open: `bbb-icon-remastered.jpg` (578 x 539, dated 14 Oct, untracked in the fork root, not made by this session) is a remastered version of the typewriter logo; the mockup still uses crops of the original `logo_favicon.jpg` from the Trash. Which logo is the real one is unconfirmed.

## Next-round sheets, redrawn with the global decisions (2026-10-18, proposals awaiting approval)
Global: orange accent, 72 px top bar that scrolls away, static map on phones, no cards or grid, the five-tab bar with Library larger, the deep-blue footer, serif page titles, pixel icons, 44 px targets, typed text close to its field line.
- **D1 Directory:** two rows with a two-item peek (newest meetups #99 23 Aug 2026 and #98 1 Jul 2026, both Bookworm; two recently active readers). **D2 Meetups list:** filters Year (2017 to 2026), Month, Venue (Bookworm 35, Atta Galatta 19, Online 4, Art Studio Koramangala 1), Sort; rows show number, date, venue, readers; 20 then "Show 20 more". **D3 Readers list:** sorts Books, Meetups, Name, Recent; 139 listed.
- **C1 Club hub:** About, Gallery, Lists, Special events, FAQ, Contact, plus Substack, Instagram, Twitter and the Facebook group. **C2 About:** who (since 2017, started by Abhiram R and Radhika Chauhan, from the old site), when, where, how to join, Subscribe button, developer card later. **C3 FAQ:** five accordion questions answered from real facts (when and where, how to join, what this site is with version 0.1.0-beta, how a name is removed, how to link a record).
- **T1 Top bar states:** signed out; signed in without a linked record (no greeting, since the name must come from a linked record); member and admin ("Hi, first name" plus the library card; no "BBB Bangalore" tag).
- **M1 Me (member):** greeting, toy library card, Did you read today, entries, Goodreads wishlist, top-4 shortlist, profile and account, Admin door for admins.
- **A1 Admin home:** record a meetup, add books, edit a book, members and invite codes, statistics, notify members, refresh the closet, Recent changes (audit log). **A3 Statistics (admin only):** elastic line (stats page only), counts (68 meetups, 140 members, 2,741 books, 8.2 readers per meetup = 560 attendance rows / 68), meetups per year (2017 to 2026: 2, 8, 9, 3, 3, 7, 5, 12, 11, 8), venue split. **A2 Record a meetup:** date field is a flatpickr picker in the Carbon style.
- **N1 Did you read today:** in-app, once a day, never a pop-up, answer Yes or Not today; needs a new reading log table (member, day, yes or no); push only later (installed app plus HTTPS). **N2 Letter:** a typewriter-type paper sheet shown once after the first sign-in and after linking a record; says this is BBB Library 0.1.0-beta, an early build; the copy about the full version is a placeholder. **N3 Notify members:** admin wireframe; audience today is 1 account (0 linked to a member); sending is not connected; options are the club Gmail over SMTP or an own domain with a sender.
- **Data realities found:** only 1 account exists (the founder's admin) and 0 members are linked, so every member feature can be shown only through the admin account or a new invite; the public count "140 members" includes the 1 hidden member while the Readers list shows 139; a reading log, a photo table and an email sender do not exist yet. Logo switched to `bbb-icon-remastered.jpg` (copy of the crop in `mockup/site/assets`).

## Answers on the next-round sheets (2026-10-18)
- The full ASCII sheets are saved in `docs/ux/wave0-sheets-round2.md` (the first attempt to show them failed: they were printed in a tool result, not in the message).
- "Did you read today": **inside the Me tab only**. Notify-members wireframe: **club Gmail over SMTP listed first**. Public Readers count: **140, all members** (the list itself still shows the 139 visible readers).
- Approval of the batch: **pending**, because the founder could not see the sheets the first time.

## Round 5 feedback (2026-10-18)
- **Batches:** mockups are approved in batches of pages, never all at once.
- **D1:** the Directory doors become **envelope tiles**: airmail-stripe border in orange and deep blue, a stamp holding the pixel icon, a postmark, and ruled address lines under normal text (the text is unchanged, the lines are texture behind it). The caption "The archive in two doors" is removed. Live concept: `directory.html` (git-ignored mockup folder). This is a manually requested exception to the no-boxes rule. A back-of-envelope view (flap and seal) is shown for the opening and loading moment.
- **D2:** "Find a number" becomes **"By the number"**. D2 and D3 follow the DealPipeline engine: a live total, a search field with a clear button, a segment row of text tabs with live counts (D2 by venue, D3 by status: member 114, BYOB 18, guest 8), a Filters bottom sheet opened by tap, active filters as removable text with Reset all, a **List | Grid** toggle (two columns), URL state, remembered view. D3 uses **initial avatars**. The full-screen button is deferred (Wave 1b and 4).
- **Avatars:** RTIH's investor module used Mantine's Avatar with a hand-picked palette for company avatars and explicitly rejected Mantine's auto-hash "color=initials" ("avoid AI colour gizmos"); the header avatar there is just the initial letter in a styled disc. For BBB: initials in a square tile, colour from a short curated palette (no orange accent, no red or green status colours), assigned by member code so it is stable.
- **C1** purpose explained (the Club tab's landing page); **C3 FAQ** moves inside **C2 About** as an expandable section.
- **T1** explained: roles are independent flags (account, admin, linked member), so an admin who is also a member (Abhiram and one other) is just two flags on. State matrix and flow are in the founder message and the sheets file.
- **A1 and A3:** research prompts written for the founder to feed to research-ops by hand: `docs/ux/research-prompts-admin-stats.md`. The founder's own notes require the Statistics page to show the in-app versions of the archive reports (summary, ingestion report, missing meetups, duplicate review queue, manifest, statistics, timeline), plus a public Scorecard (most books read, most-read book, newly trending, timeline, statistics).
- **N2** signature: **"Dhilipan, System Architect"**. N1 and N2 otherwise approved.
- **A2** rebuilt from `docs/plans/founder_notes/PRESENTER - ADMIN MODULE IDEAS.txt` (the earlier A2 ignored it). "Presenter mode" is now "Admin". The file does not mention an audit trail; if a longer file exists, it has not been found. Goodreads' API is retired, so the book lookup must use another source.
- Sheets: `docs/ux/wave0-sheets-round3.md`.

## Round 5 answers (2026-10-18)
- **Club tab opens a hub page (C1)** (About with FAQ inside, Gallery, Lists, Special events, Contact).
- **Avatars: initials in a curated palette** (square tile, hand-picked colours, no orange accent or red/green status colours, stable per member code).
- **Search / command palette: a floating icon on the page, not in the header** (the older note wins). Consequence: the top bar loses its search icon in the next batch; the floating icon's position is still to be drawn (Wave 1 builds the palette itself).
- **"Make them a member?" nudge: a pixel-art mascot** delivers it (needs one new drawing in the icon style; the existing make-member admin action backs it).
- Still open: typewriter font for the letter; envelope paper tint `#f3ecdf`; the curated avatar palette values; a presenter column for meetups; a book lookup source to replace Goodreads (Open Library or Google Books); a public Scorecard sheet; GitHub link and x.y.z version rule in the footer; full-screen button and dark mode sheets.
- Proposed next batch of mockups (founder approves in batches): Directory (D1 envelopes, D2, D3), then Club, then Me, then Admin and Statistics.

## Round 6 answers (2026-10-18)
- **D1 envelope** redone as Indian mail: sandal paper, thin red rule, bilingual stamp, double-ring postmark, Kannada city name, six PIN boxes, slanted shadow, "Open the ...  ›" affordance. No airmail stripes, no perforation. Height 308 px.
- **D2 approved** (list + grid). **Grid is the default** for now; list stays as an option. Venue is also a group in the Filters sheet.
- **Mantine rejected**; the proposal stays visible in the D3 mockup.
- **C2 tagline**, **library card**, **A2 changes** and **footer GitHub logo**: see `wave0-sheets-round4.md`.
- Presenter = the admin for now. A separate presenter column comes later.
- Open: translator storage (new column or `book_relations`), GitHub repo URL, Directory batch approval.
- **Translator storage decided:** a `book_relations` `translation_of` row, for now (founder, 2026-10-18).
- **Mockup data check (2026-10-18):** 68 meetups and 139 readers in `mockup/site/data/*.json` match the live `bbbdemo.vercel.app/api/meetups` and `/api/members` field for field (0 mismatches). Segment counts 15 / 57 / 18 and venue counts re-derived from the live feed agree.

## Round 7 (2026-10-18): D2/D3 tidy
- No counts on filter tags (venue tabs, reader segments, Filters-sheet venue and year options). The count line "Showing N meetups" stays on Meetups.
- Venue tabs show every venue, one scrolling row (last tab is cut off as a scroll cue).
- "Show 20 more" button replaced by progressive loading: 20 more rows load as the list nears the bottom (Meetups and Readers).
- "All readers" caption removed.
- Main-site meetup filters (read from `frontend/src/app/meetups/page.tsx` and `api/meetups/route.ts`): search by number and year only. The mockup already covers those plus venue, month and sort.
- Open: extra criteria the live data supports, not yet added: book or author, reader name, has PDF notes (12 of 68), online or in person.

## Round 8 (2026-10-18): Meetups filtering, for approval
- Added (founder: "add them but exclude PDF notes"): one search box for number, book, author or reader; a Format group (Any, In person, Online) in the Filters sheet. PDF-notes filter excluded. Repo URL `github.com/MishaelJulian/BBB` approved.
- Search rules: all digits (with or without #) match the meetup number prefix; anything else matches book title, author or reader name (substring, any case). A matching tile shows why ("Book: 1984" or "Reader: Vinay Leo").
- Year and Month options laid out in three columns to shorten the sheet (a layout default I took; to confirm).
- Founder will approve the Directory batch only after the filtering is shown to fit UX laws.
- Data finding: 34 of 68 meetups have 0 attendance rows (#4 to #63 range, mostly pre-2023), so their tiles read "0 readers". Open: show "readers not recorded" instead?
- `mockup/site/data/meetups.json` now also holds format, books (title, author) and reader names from the live feed (180 KB).
- **Name clarity (founder, 2026-10-18):** a matching tile now says what matched: "Book: ...", "Author: name (book)", "Reader: name". When a text search matches two or more distinct people, a "Readers" and an "Authors" row of full names appears; tapping one narrows the search to that person. Verified: "vinay" = 33 meetups = Vinay Leo 32 (reader) + 1 more (#19) matched by author Vinayak Varma. Readers named Vinay: Vinay Leo 32 meetups, Vinayak 6, Vinay Keerthi 1.
- **Attendance gap, verified from the live feed:** 34 of 68 meetups return `member_count` 0 and an empty member list, yet all 34 have books. They run from 2017 to mid-2023 (#4 to #63). Cause not verified. Sum of `member_count` is 554 against 560 attendance rows counted earlier (6 unexplained).
- **Vinay Leo (reader) vs Vinay Leo R. (author), checked 2026-10-18 against Supabase and the two PDFs:** not confirmed. PDF #86 lists "I Rhyme Without Reason, by Vinay Leo R." under MENTIONS (no presenter). PDF #93 lists it under Archana (book 5, author "Vinay Leo R."); Vinay Leo's own books there are 9 and 10 (To Kill A Mockingbird, The One and Only Family). No PDF says the author is the member. The only link is the name. Mockup keeps them labelled separately.
- **Junk rows found in `canonical_books`:** 15 rows from the #93 table parse, titled "<member name> <number>" (e.g. "Archana 5", "Irene 1") with glued authors ("IRhymeWithoutReason VinayLeoR.", "Beartown FrederikBackman"). All have 0 discussions, so none reach the public pages. Not deleted; needs a founder decision.
- **Confirmed by the founder (2026-10-18):** author "Vinay Leo R." and reader "Vinay Leo" are the same person. Listed as an author on that book's row only; members, readers and discussion rows are untouched. No database change made. The PDFs alone do not show this; the founder's word is the source.
- **Correction (2026-10-18):** the earlier note "all 15 junk `canonical_books` rows have 0 discussions" was wrong. "Chaitanya 13" (author "TheGroovyGreeks TerryDeary") and "Deepak 11" (author "Embroideries MarjaneSatrapi") each have 1 discussion on meetup #93, so they show on that meetup's public page next to the correct "The Groovy Greeks" and "Embroideries". The other junk rows are orphans.
- **Parser run on #93 (read-only, `app/parsers/meetup_parser.py` `parse_file`, version `meetup_parser/2026-10-12`):** layout `member_table`, confidence 0.9, no warnings, but only 12 of the 37 numbered books found, none of the mentions. Item 12 (Instruments of Torture) swallows lines 53 to 154 and gets author "Aparna Sanyal Piotr Sarna" and translator "Shanna Tan", both from later rows. Cause read from the code, not yet tested with a fix: column offsets come from the page-1 header, and rows on later pages sit at different offsets, so they are not recognised as numbered rows.
- **Deleted 2026-10-18 (founder: "Do you want the two live junk rows ... deleted, with a backup first?", taken as a go):** `canonical_books` "Chaitanya 13" and "Deepak 11", plus their 2 `discussions` rows (meetup #93) and 2 `imported_books` rows, in one statement (2 / 2 / 2 deleted). Backup of all six rows: scratchpad `backup_junk_93_2026-10-18.json`. Checked after: #93 has 49 discussions, the correct "The Groovy Greeks" and "Embroideries" rows are still there, books 2,739 (was 2,741), discussions 3,689 (was 3,691). Glued author rows ("TheGroovyGreeks TerryDeary", "Embroideries MarjaneSatrapi") were not deleted; 396 authors now have no books, of which these two are part.
- **Filter layout (founder: "yes", 2026-10-18), Meetups page only:** the Filters button is now a floating ink button, bottom centre, 12 px above the tab bar (thumb reach; same look as the floating search). Year (All + 10) and Month (All + 12) are four-column text choices with the picked one underlined in the accent; Year drops from 11 rows to 3 and Month from 13 to 4. Venue, Format and Sort stay as radio lists. Readers keeps its top Sort button. Both are my design choices, to confirm. "Show 1 meetups" plural bug fixed on Meetups and Readers.
- **Orphan authors (read-only look, nothing deleted):** 396 authors have no books; 14 of them are used by a series, leaving 382: 20 glued title+author junk ("ABookofLight JerryPinto"), 67 glued names with no clean twin ("AnuradhaRoy"), 1 mojibake, 10 not names (e.g. "Foreign authors:", a whole sentence about Atta Galatta), 284 plain names with no books (mixed: real authors such as "Abhiram G. Ranade" and titles filed as authors such as "A History of Japan"). No public page lists authors, so none show. Awaiting founder decision per group.
- **Orphan authors cross-reference (2026-10-18, read-only):** see `orphan-authors-review-2026-10-18.md` and the CSV of 396 proposals. Nothing deleted yet.

## Round 9 (2026-10-18)
- Founder: yes to Readers' floating Sort and to "readers not recorded". Both done (Meetups tiles with no attendees now say "Readers not recorded"; also "1 reader" singular).
- Envelope: sandal tint and the type "isn't working". Postmark no longer shows a date (centre now reads "BBB", my choice). Three paper and type options are at `envelope-options.html` (white and clean, inland-letter blue and typewriter, pale cream and serif); none chosen yet. Default stays sandal until chosen.
- Background: the map interferes with inner pages. Inner pages now use the light sonar grid (faint 32 px grid plus slow orange rings, fading to the edges, static under reduced motion); the Home page map is untouched. `?map=soft` on any page shows the map for comparison. The sonar here is my own CSS version, not the 21st.dev component.
- Opening sequence (full-screen button and animation) drawn as B0 in `wave0-sheets-round4.md`; scorecard waits for the stats page.

## Round 10 (2026-10-18)
- **Background:** sonar grid dropped; the map stays on inner pages as "dusty wallpaper": blur 4 px, saturation x0.55, a slight sepia, strength .30 (was .48), grain up. Home page untouched. Measured on the Meetups page with text hidden: #4a4a4a against the background has a worst case of 5.07:1 and 0% of pixels under 4.5:1 (the earlier map settings: worst 3.70:1, 0.2% under). Desktop halftone map on inner pages gets blur 2.5 px, strength .55 (not yet seen by the founder).
- **Envelope:** inland-letter blue paper `#dfe8f2` with Special Elite typewriter type (Apache-2.0, `@fontsource/special-elite` 5.3.0, self-hosted woff2) chosen. PIN boxes and label in deep red `#8a1c1c` (my hex, to confirm); other reds unchanged. Spacing tightened (envelope 334 to 344 px). Special-cover cachet moved onto the PIN row. The PIN shown is 560001, which matches Church Street per Square Yards; the founder's note "change the Pin to the one used by Church Street or M.G. Road" is unclear (PIN code or the orange map markers), asked.
- **Open button:** three placements at `envelope-options.html` (full-width ruled row, filled ink button, right-aligned link); none chosen.
- **B0 opening sequence answers:** (1) shown on a device with no earlier record of the demo at all (no stored flag, cookie or cache); (3) a "Replay intro" link in the footer approved; (4) total 7 to 8 s; (5) sound synthesised in the browser; (6) keep the current map, no new extract; (8) paper turns from the right edge like a book. The black at t0 and t1 is the screen switching to full screen itself, and "nothing visible" at t2 lasts exactly 1 s. Still open: iPhone behaviour (needs the founder's iPhone), sound on or off after the tap, portrait lock. Build waits until the A, C and L series are done.
- **Round 11 (2026-10-18):** open-button placement A chosen (full-width ruled row), now the base; the other two placements and `envelope-options.html` removed. PIN 560001 and deep red confirmed. Envelope "From" line now reads "From: BBB, Bookworm, Church Street" with the Kannada city name under it (my reading of "BBB, Bookworm etc."). The top bar and footer still say "BBB Library"; not changed, asked.
- **Round 12 (2026-10-18):** Directory batch (D1, D2, D3) APPROVED by the founder. "BBB Library" replaced by "BBB" everywhere in the mockup (13 places: top bar brand, back-bar label, footer heading, login lines, all page titles, including Home's top bar and title). Tapping the dimmed area outside an open sheet closes it (Filters, Sort, search); taps inside the sheet do not; the photo viewer is excluded.

## Round 13 (2026-10-18)
- **Library tab goes straight into the closet** (founder): the Library tab opens the closet as a real page (`/library-room`, mockup `?p=library` becomes a page), not through the Directory envelopes, which stay Meetups and Readers only. A choice to switch to the normal list of books comes later; the closet's own Shelves | List toggle already exists in the component. Open: how the mockup shows the closet (see the options put to the founder), and where the footer "Library Room" link sits (it is under Directory today).
- Facts read from `CriterionBookCloset.tsx` (2,632 lines): framer-motion plus CSS 3D (`preserve-3d`, `perspective`), no WebGL; the 3D is switched to flat on phones (`isMobile ? 'flat' : 'preserve-3d'`); it fetches real books via the API, has a filter sheet, a picks tray, a canvas Polaroid export and an admin-only link.

## Round 14 (2026-10-18)
- Founder: focus on the mockups (screen series), not the intro sequence; the intro build and the closet page wait. Nothing was built for the intro (no `intro.html`). Note: "own root page" for the closet means `/library-room` is separate from the landing page `/`.
- **Club batch mocked (for approval):** `club.html` (C1 hub: About, Gallery, Lists, Special events, FAQ, Contact, Follow links) and `about.html` (C2: tagline, Who/When/Where/Join, Subscribe button, FAQ of five questions inside, "Built by" developer ID card). Club tab, footer Club links (About, Events, FAQ) now point to them; Special events and Events go to `meetup-100.html`; Gallery and Lists stay placeholders. Draft copy of mine, to confirm: the FAQ answers (join, name removal, record linking) and the ID card text ("Built this site and its archive of the club's meetups", "No. 001"). Checked at 390 px: no overflow, no tap target under 44 px, FAQ opens and closes, `club.html` FAQ row jumps to `about.html#faq`.
- **Round 15 (2026-10-18), founder corrections on the Club batch; nothing approved yet:** About is now passages, not a Who/When/Where table; the FAQ is a plain list, not expandable, with 72 px of space above it; the "Built by" section uses two cards redrawn from the ovio Developer ID Card toy variant (MIT, `JanaSundar/ovio`, `worlds/toy.tsx` and `styles/ovio.css`): Mishael (the idea, built the closet and the archive; GitHub `MishaelJulian`) and Dhilipan (architected the system, designed the webpage; GitHub `dhilipa01`, taken from the signed-in `gh` account, so inferred). Card palette adapted: deep blue header `#12295a`, first key in the site orange, rest from ovio. No QR code (needs a library). Profile pictures are copies saved on our side (`assets/team/`, fetched from GitHub on 2026-10-18); the page makes no request to GitHub's image host. Printed name is "Dhilipan" (GitHub shows "Dhilipan Sankar"). The new About passages (what a meetup is like, "nobody has to be a critic or a collector") are my wording from the sources I found (old site: active since 2017, 4th Sunday at Bookworm; PDFs: people list the books they read, plus tangents), to confirm.
- Club hub is `club.html` (Club tab, or `index.html` under "Club (C1, C2)"). The founder could not find it; likely a phone cache of the old tab bar.
- **Round 16 (2026-10-18), developer cards, E-Ink treatment (option A, compact strip):** each card is one link (the whole card is the tap target), 358 x 156 px (was about 260), paper `#faf8f5`, 2px ink outline `#1a1a1a`, 16px corners, no shadow, no colour, no tags, no serial number. Photo is plain (56px square as GitHub supplies it, no border, ring or effect). Name in Newsreader (OFL-1.1, `@fontsource-variable/newsreader` 5.3.0, self-hosted, latin weight axis, 58 KB), captions in Inter. Pressed state inverts instantly; focus is a 3px ink outline; the arrow stays the site orange. Captions: Mishael "The Visionary. Built the Closet and the Archive"; Dhilipan "The Architect. Built the Stats and the Website." The "Built by" passage now says Mishael built the closet and the archive and Dhilipan architected the system and built the stats and the website. Taken without an answer, to confirm: square photo, 16px corners, the slot kept. If Newsreader fails, try Literata.
- **Literata, checked:** commissioned by Google and designed by TypeTogether, released 2015, default in Google Play Books, SIL OFL (open-sourced 2018). It was designed for reading across many devices and high-resolution screens and moved away from conventions rooted in low-resolution e-readers, so it is not an e-ink-specific font (earlier remark that it was "made for e-readers" was only partly right). Sources: https://en.wikipedia.org/wiki/Literata and https://www.type-together.com/literata-book
- Removed from About: the "68 of them on record" phrase and its script.
- Round 17: slot kept; photo now circular (revert to square if disliked).
- **Round 18 (2026-10-18):** About page renamed "About Us" (H1, title, breadcrumb, Club hub row, footer link); its FAQ section removed and moved to the new `faq.html` (C3, six questions including one for authors, from the old site's "authors, feel free to mail us"); About links to it. About text now follows the original site's About page (https://brokebibliophilesbangalore.com/about/, read 2026-10-18): co-created and run by Abhiram R and Radhika Chauhan in early 2017; meetups on the 4th (or last) Sunday plus author events and writing prompts; the Facebook group, Twitter and Substack as ways in; authors welcome by email. The earlier invented lines were removed. Meetup #100 photos now join edge to edge with no gap and no crop (full-bleed rows, natural ratios, checked: 16 rows, zero gaps, aspect error under 0.3%); the lone-portrait height cap is off for this page only. Lists: the original site has 10 reading lists (https://brokebibliophilesbangalore.com/listicles/); ASCII sheet for a Lists index and a list page is in `wave0-sheets-round4.md`; not built.
- **Round 19 (2026-10-18), Listicles built:** "Lists" renamed "Listicles" (Club hub row, footer, breadcrumb). `listicles.html` (index, newest first, 9 of the old site's 10 lists: all except Monthly Read Discussions) and `listicle.html?l=<slug>` (detail), from `data/listicles.json`, generated by `mockup/tools/build_listicles.py` from the old site's pages (read 2026-10-18). Old "Tweet at us" lines changed to "Email us" (intro text and a closing "Have a book to add? Email us"). A listed title that is already in our archive links to the Library (placeholder `stub.html?p=library&book=<id>` until the closet page exists; matched by exact main title, which is why only a few match: 1 in Books on Bangalore, 3 in Mental Health, 12 in Women Authors, 4 in Cricket, 3 in Politics); the others keep their original Goodreads link, labelled. Bookstores and Bookclubs are shown as entries (status, medium or contact, map link). Clubhouse Silent Reads is kept: it records books discussed after the club's weekly silent-reading sessions on Clubhouse (7 to 7:40 pm daily, discussion 7 to 9 pm Saturdays) in June 2021.
- **Round 20 (2026-10-18):** "Clubhouse Silent Reads Discussions" now carries the data from its two linked Notion pages (read through Notion's public page API on 2026-10-18; sources https://www.notion.so/abhidotr/7f29c7c0698044398b187bcad3e21007 and https://www.notion.so/d8a3fafcc31c4b7a87a7272aa5bf0ff8): 35 books for 12 Jun 2021 and 36 for 19 Jun 2021, each with title, author and the page's Fiction or Non-Fiction tag, under the old site's context paragraph; each date keeps a link to its Notion page. Tags are shown as the source has them, including ones that look wrong (His Dark Materials and Towards Zero are tagged Non-Fiction). Library links now require the author to agree with the archive's author when the list gives one (24 of 70 link). Generator updated: `mockup/tools/build_listicles.py`.
- **Round 21 (2026-10-18):** founder approved correcting two source tags: His Dark Materials and Towards Zero now sit under Fiction on the Clubhouse listicle (the Notion page tags them Non-Fiction). Correction: the 12 Jun 2021 page has 34 books, not 35 (one blank row), so the listicle has 34 + 36 = 70 books. Two more tags look wrong and are left as the source has them, awaiting the founder: The Nickel Boys (tagged Non-Fiction, a novel) and Think Again by Adam Grant (tagged Fiction, non-fiction).

## Round 22 (2026-10-19)
- **Club batch APPROVED by the founder** (hub, About Us, FAQ, Listicles including Clubhouse Silent Reads, developer cards). Approved batches so far: Directory, Club.
- **Map slip fixed (all pages):** the map used to be re-centred on every resize, and the browser bar sliding away or the keyboard opening resizes a phone's viewport. It is now placed once and moves only if the width changes (rotation); its box is `100lvh`. Checked headless: the map position is identical after the viewport shrinks to 520 px (keyboard) and grows to 900 px. Not tested on a real phone. The desktop scroll movement of the halftone map is unchanged.
- **Footer "dragged up":** cause not reproduced. On phones the footer is static; the likely candidate is the browser's rubber-band overscroll at the page end, so `overscroll-behavior-y:none` was added. Asked the founder where and when it happens.
- **Headline:** four options drawn from the listicles at `headline-options.html`, shown in two cuts of Archivo. Heavitas is free for personal use only, with a $15 donation for a desktop licence for commercial use (dafont.com/heavitas.font); Duera is free for personal use only, commercial licence bought from aringtypeface.com/duera. Neither has a stated web-embedding licence, so neither is used. Archivo (OFL) has the width axis and covers both looks.
- **Round 23 (2026-10-19):** Home headline is now "A book club that will make you go broke." (founder's wording), set in three lines (A BOOK CLUB / THAT WILL MAKE / YOU GO BROKE.) so the first line stays clear of the floating search button; same Archivo font and elastic fit as before, nothing else on Home changed. Checked at 360, 390 and 430 px: no clipping, no overflow. The footer issue is dropped by the founder; the overscroll tweak added in round 22 was removed again. The map fix from round 22 stays.

## Round 24 (2026-10-19): 404 page, questions stage (nothing built yet)
- References read: (A) https://cdn.prod.website-files.com/65ba70a5bb6f912baf0094a3/6a96ef0f8fa190ba2b524211_pensatori-irrazionali.com_404(Pixel%207).avif, a phone 404: pale grey paper, thin notched frame, small logo top-left, square menu button top-right, "Error 404" in a high-contrast pointed-pen script about 70% of the width at about 44% of the height, a two-line sans sentence below, a solid dark rectangular "HOME" button with an arrow, a barely visible lion image low on the page. (B) https://cdn.prod.website-files.com/65ba70a5bb6f912baf0094a3/6a2fd21da789ab75dcafc56f_www.maximiliankaspar.com_404(1440).avif, a desktop 404: white page, four hairline columns, mono nav, a huge grey ASCII-character picture across the whole page behind a bold black "404".
- `404-fonts.html` shows five OFL script fonts (Ballet, Pinyon Script, Monsieur La Doulaise, Mea Culpa, Italianno). Ballet looks the same as the reference's script (inference from the render, not confirmed).
- Open for the founder: script font; wallpaper subject and style; coverage; meaning of "ungapped areas"; frame; body font; button style; copy; shell and links. Fonts self-hosted in `mockup/site/assets/fonts/` (all OFL-1.1, from @fontsource 5.3.0).

## Round 25 (2026-10-19): 404 page built (`mockup/site/404.html`), for approval
- Founder's answers: Pinyon Script (fallback Monsieur La Doulaise); wallpaper is a branching tree drawn by code, a Bangalore "cherry blossom" in soft low-saturation bright pink, with a dynamic bookshelf beside it; solid square pixels (fall back to ASCII characters if disliked); the reference's thin notched frame; funny Tolkien wording; the full shell (top bar, tab bar, footer).
- Facts checked 2026-10-19: Bengaluru's "cherry blossoms" are pink trumpet trees (Tabebuia rosea), blooming roughly February to April, brought to the city by the British (https://outlookindia.com/national/the-origin-of-bangalores-very-own-cherry-blossom-trees-2, https://citizenmatters.in/bengaluru-outer-ring-road-tabebuia-rosea-flowering-trees-pink-bloom). The line is "Fly, you fools!" (Gandalf, The Fellowship of the Ring, book 2 chapter 5), not "go back".
- Built: "Error 404" in Pinyon Script at about 72% of the width (about 281 px at 390), centred at about 40% of the height; "Fly, you fools!" (Newsreader, 20 px) then "This page is not on any shelf." and "J. R. R. Tolkien, speaking of this very page"; flat ink HOME button (48 px) and Meetups, Listicles, Email us links; top bar, tab bar and footer kept; frame with concave notched corners between the bars. Wallpaper: 6 px solid squares on a canvas, tree and bookshelf in soft greys and pinks (opacity .62, paper glow behind the text); the bookshelf is dynamic: every 2.6 s one book slides out or leans, and petals fall slowly; still under reduced motion. The map is turned off on this page (`data-nomap`). Placed once, so the browser bar or keyboard cannot make it slip.
- Measured: worst-case contrast behind the text block, ink 8.0:1 and #3a3a3a 5.25:1; no overflow, no tap target under 44 px.
- Defaults taken without being asked (to confirm): flat button, not the shadowed site button; Newsreader for the quote line; wording of the second and third lines; frame between the bars, not around the whole screen; tree colour palette; bookshelf motion. Known: the floating search button overlaps the frame's top-right notch.
- **Round 26 (2026-10-19), 404 corrections:** quote is now "Fly, you fools! This page that you seek is not within any shelf of mine." credited "J. R. R. Tolkien" (the line is a joke on Gandalf's real "Fly, you fools!"); the notched frame is removed (it also drew over the footer); the floating search button is removed on this page; Home uses the site's own ink button with the orange shadow (`.btn`, 280 px wide); the tree, petals and bookshelf are a larger background wallpaper (tree trunk 15% of the height, shelf 40%), moved into the page layer so it also shows on desktop (it had been hidden behind the desktop page background). Contrast behind the text block: ink 9.1:1, #4a4a4a 4.65:1. Footer checked on a 390 px and a 1280 px screen: clean, nothing drawn over it.
- **Round 27 (2026-10-19), 404 page end:** the founder felt the footer "dragging up" because the wallpaper was fixed to the screen and the footer slid over it. The scene (tree, shelf, petals) now belongs to the page (sized to the content area, ground at its bottom edge, footer directly after), so the page has a real end. Petals drift on a breeze, land and pile into a floor that grows from one side to the other (a pile height cap of 14% of the area; checked with a fake clock: about 2 rows after 1 min, 10 after 5 min, 12 average after 15 min, almost no bare column left). Under reduced motion the floor is shown part-filled and still. Open for the founder: whether the pile should persist between visits, and the cap height.
- **Round 28 (2026-10-19), 404:** the pale paper glow behind the text is removed. Wallpaper trunk, branches, shelf frame and ground line are now dull, low-contrast greys; the blossoms, falling petals, petal floor and books keep their colour. The Home button is replaced by the BBB logo (72 px, links to `home.html`, label "BBB, go to the home page"), 44 px below the credit line. Contrast behind the text block with no scrim: ink 9.2:1, credit line 6.0:1.

## Round 29 (2026-10-19): A series decisions (A1 admin home, A2 record a meetup)
- **Founder decisions:** bulk import, bulk delete and Google Form sync are allowed on the phone (Google Form sync can wait); undo lasts 7 days; no "same readers as last meetup" button; Record a meetup has three steps; the Admin entry sits in the top bar for admin accounts; the meetup draft stays on the phone.
- **Priority order given by the founder.** Main: (1) one activity feed filterable by event type, the same feed on each member's page; (2) admin tools reached from the same account's menu (the top bar); (3) attendee lookup by searching a name or email; (4) undo preferred to "are you sure"; (5) Open Library lookup (fields parameter, ISBN endpoint), Google Books keyless as a lower-quota fallback. Features: totals against the prior period, then recent activity and suggested actions; "your most recent edits", the five latest; expansion to an activity log with a revision on each activity and a Revert on the item page.
- **Charts:** borrowed from RTIH's investor dashboard (`KpiTrendChart.tsx`, `DealEconomicsChart.tsx`): Recharts area chart, series indexed to one shared axis (no dual axis), sign-based gradient with muted fills, hand-built hover crosshair, reduced-motion support, and a "two points: no fabricated trend" fallback. Placement: one compact trend on A1, the full set on A3 (my choice, to confirm). Lists reuse the Meetups and Readers filter engine. File picking uses the Flowbite file input from the founder's notes.
- **Sources checked 2026-10-19:** Nielsen Norman Group on confirmation dialogs (read): undo for errors that get through, confirmation only for serious consequences, type-to-confirm for dangerous operations. A List Apart, "Never Use a Warning When You Mean Undo" (read). Baymard (read): the number of form fields affects usability far more than the number of steps (checkout averages 5.1 steps and 11.3 fields in 2024). GOV.UK Design Notes (one thing per page). Brandur on soft deletion (read): `deleted_at` leaks into every query and loses foreign keys, nobody undeleted in ten years; keep deleted rows in a separate table as JSON with an expiry. GitHub docs on sudo mode (search summary). Not usable: no relevant Pragmatic Engineer article was found, and Hello Interview's relevant material is premium or only a community RBAC question.

## Round 30 (2026-10-19): A1 and A2 changes
- Founder: 15-minute re-enter-password window accepted; stale draft vanishing after Safari's 7-day script-storage clean-up accepted; chart placement accepted (compact on A1, full on A3).
- Chart code: reuse RTIH's `KpiTrendChart.tsx` (1,303 lines) as it is. BBB's frontend already has React 19, Tailwind 4.3.3, framer-motion and lucide-react but not `recharts`, which would be added. Only three changes proposed: feed it BBB data through its existing props (`startupId` carries a series id, `period` a month), set the palette constants (its red, orange and green series colours break the one-accent rule), and replace its `Panel` card chrome with a plain heading (no cards). Nothing else edited.
- A1 order now: status, Record a meetup (with space between them), the draft as its own separate shape, This year against last, Tools, Do next, Recent changes.
- A2 gap found by the founder: step 3 must record books reader by reader (the PDFs list books per person, and `discussions.member_id` ties a book to a reader). Books nobody owns are general discussion (a null member). Step 3 is now a reader list; tapping a reader opens that reader's books inside the same step.

## Round 31 (2026-10-19)
- Charts: keep RTIH's palette and `Panel` as they are; only the data is mapped in (overrides the earlier proposal to change the palette and panel).
- A2 step 3 corrected again: not a reader list. For the readers added in step 2, the admin goes through them one at a time (reader 1 of N, then the next), entering that reader's books, with Skip when they have none; a last "Nobody's books" pass for general discussion; review at the end. Still three steps.

## Round 32 (2026-10-19): A2 flow, final reading
Step 1 sets up the meetup. Steps 2 and 3 are a loop, one pass per reader: step 2 adds a reader (search a member or type a new person), step 3 adds that reader's books, then back to step 2 for the next reader. A running list of readers (with book counts) and a "Register meetup" button stay on the step 2 screen, so the admin can submit at any time; Register shows the full details for a final check, then saves. "Nobody's books" (general discussion) is one extra choice in step 2. Tapping a reader in the running list reopens their books.

## Round 33 (2026-10-19): A2 flow research and audit (form screens against the UX laws)
- Founder corrections: "Presented by" is a free text field with a character limit (not "you"); drop the "so far" tally; "Register meetup" belongs in step 3. Consequence: the database has no presenter column, so a text column (about 60 characters) would be needed now, not later.
- References read 2026-10-19: GOV.UK / DWP "add another thing" pattern (hub and spoke: a summary list with add another, change, remove, continue; "add another" is a secondary button); GOV.UK "check answers" (confidence, a second chance to notice errors, a clear submit label at the end, Change links with hidden text); GOV.UK one thing per page; Typeform's own figure of 57% average completion (56% on mobile) for one question at a time; Baymard (fields matter more than steps); thumb-zone guidance from secondary sources (primary action in the lower third, 44 px minimum, 8 px between targets, 12 to 16 px between stacked buttons); Nielsen's heuristics (visibility of system status, recognition rather than recall); Laws of UX wording (lawsofux.com).
- Audit of the last drawn flow and the two alternatives are in the message to the founder and in `wave0-sheets-round4.md` (A2 options).
- **A2 step 3 fields, data check (2026-10-19, live DB):** `canonical_books` has `title`, `isbn10`, `isbn13`, `publication_year`, `language`, `media_type`, `page_count`, `description`; author is a link to `authors`. There is no genre column (a `genres` table exists with 0 rows). `book_relations` holds only source book, target book and relation type, with no translator name; the 3 existing `translation_of` rows put the translator in the title, e.g. "Ponniyin Selvan (tr. Varalotti Rengasamy)", linked to the original work. Open: where genre and translator name are stored.

## Round 34 (2026-10-19): A2 step 3 fields
Label is "Translator", hidden behind a "+ Translator" expander. Genre is left out until the founder says. Translator storage follows the existing convention: the book is saved as "Title (tr. Name)" and a `translation_of` row in `book_relations` links it to the original work (source = translated, target = original). No new column. Note: of the 3 existing rows, one ("Sivagami's Vow", linked to "Sivagamiyin Sabatham") records no translator name.

## Round 35 (2026-10-19): A1 draft shape
Option (a), the folded-corner page, is chosen. It is a static block in the normal page flow: not sticky, not fixed, nothing drawn outside its own box (the fold is made inside the box, unlike the 404 frame's corners). Resume and Discard are separate text links. A1 order: status, Record a meetup, space, the draft, This year against last, Tools, Do next, Recent changes.

## Round 36 (2026-10-19): Admin batch built (A1, A2, N3 and All changes); data synced from the database
- Pages on the mockup server: `admin.html` (A1), `record.html` (A2: steps 1 to 3 in a loop, the details check, saved screen), `notify.html` (N3), `changes.html` (all changes). Tools rows that have no sheet go to the placeholder page (Members, Books, Claim codes, Import, Statistics). Statistics and the Scorecard are a separate batch.
- A1 order as approved; the draft is a static folded-corner block; the chart is a drawn stand-in for RTIH's `KpiTrendChart` (same look: indexed to the first meetup, dashed baseline, sign-coloured line, muted fill, touch crosshair, RTIH palette and panel kept); the real component goes in at the wireframe step. Open Library lookups on the A2 title field are live calls; Save does not write to the database ("mockup only" is stated on the saved screen). The draft is kept in the phone's localStorage; Resume returns to the right step and reader.
- **Data sync** (`mockup/tools/sync_data.py`, read-only, 2026-10-19 06:32 UTC): members, meetups and admin counts now come from the database. Findings: (1) the public API's "readers" and `member_count` are the people who brought books (from `discussions`), not the attendance rows. Meetups #5 and #8 have 3 and 1 attendance rows but the API showed 0; so the earlier statement that 34 meetups have no attendance rows was wrong: 32 have none. The Meetups and Readers pages now use attendance rows. (2) Book total is 2,739 (two junk rows were deleted); Home and search now say 2,739. (3) Nobody who is not a member has attended twice, so "make them members" is not offered on A1 today; the nudge appears on the A2 check screen when a chosen non-member would reach their second meetup. (4) `meetups.attendance_count` is empty for 67 meetups and 13 for #25, which has no attendance rows. (5) The audit log holds one row: the placeholder meetup recorded on 17 Oct, which was later removed in the database, so its Undo reads "Gone".

## Round 37 (2026-10-19): A2 corrections
- Venue: the extra name field is hidden until the venue is "Another" (it was always visible: a CSS rule overrode the hidden attribute). The option is renamed "Another".
- Reader search: the result list shows only while the field is in use; picking a reader fills the field, collapses the list and dismisses the keyboard; focusing the field opens the list again.
- "Nobody's books (mentions)" removed entirely (step 2, step 3, the details check, the saved summary, the draft data).
- Book lookup, why an author came without an ISBN: the lookup took only the first Open Library result, and about 1 in 36 sampled titles had a first result with no ISBN, while 9 in 36 had no result. It now asks for 5 results, prefers one that has an ISBN and matches the typed author, falls back to that work's editions list, then to Google Books (keyless quota is low and returned HTTP 429 in testing), and says "No ISBN found: add it yourself" instead of staying silent. Risk found: a title-only lookup can pick another book with the same title (The Dig gave Alan Dean Foster, Butter gave Erin Jade Lange); when the author is not typed and several authors share the title, the line now says so.
- "Save as draft" now sits beside "Save meetup" on the details screen. Three ways to tell it apart from the Save button, previewed with `record.html?s=r&db=a`, `&db=b`, `&db=c`: (a) a hollow button of the same height next to the filled one, (b) a plain underlined text link under the Save button, (c) a dashed-underline button with a small pause mark. Default shown: (a). Saving a draft goes to Admin with "Draft saved on this phone." and the draft block.
- **Round 38 (2026-10-19):** "Save as draft" style (a), the hollow button beside "Save meetup", is chosen; the other two previews are removed. The About Us "Built by" line now reads "A couple of CS dudes who've yet to have an internship that's paid." (founder's wording; "Cs" capitalised as "CS").

## Round 39 (2026-10-19): Admin batch APPROVED; Me batch started
Approved batches: Directory, Club, Admin (A1, A2, N3, All changes). Me batch (T1 top bar states, M1 Me with the library card, N1 Did you read today, N2 letter) is at the sheet stage; the Admin link now sits in the top bar for admins, so the old "Admin" row inside Me is dropped.

## Round 40 (2026-10-19): Me batch answers
- Library card: the E-Ink flat treatment with a small flash of colour (options drawn: an orange left band, or deep-blue stamp ink). "Preview as" switch accepted (mockup tooling). "Did you read today" stays on the phone for now, a new table later, and shows an encouraging note for Yes and a (gentle) discouraging note for No. Demo member: Abhiram. Sheets wanted for Entries, Wishlist and Shortlist, with a clear difference between Wishlist and Shortlist.
- Real data for the demo member (database, 2026-10-19): Abhiram, member code 065-01 (the code format is NNN-NN, not BBB-NNNN), status member, 28 recorded meetups, first recorded attendance 2023-10-01, 47 books across meetups (latest: #98 The Seed Children, The Two Kingdoms; #97 Dungeon Crawler Carl, Jacked; #96 The Correspondent). Attendance before Oct 2023 is not recorded, so the card must say "first meetup on record", not "member since".
- Spec read again (`do this too.txt`): wishlist = Goodreads want-to-read integration ("a must"); the top-4 shortlist is picked by swiping through books (the CRED stack animation); two people picking the same book is shown only after the member has locked their four.

## Round 41 (2026-10-19): Me batch corrections
- Library card: an 8 px orange band down the left edge (flash of colour).
- N1 "Did you read today?" is asked on the Me page only, under the card, once a day, for members with a linked record (the note needs the name). Buttons: Yes and No (not "Not today"). Yes: "Good. That is a few more pages." No: "Damn, that's crazy, <name>." (the display name of the linked record).
- N2 letter: only on the very first sign-in of an account, not after linking a record.
- "Shortlist" is renamed "Closet Picks". Wishlist visibility is the member's choice, private or public. Entries, Wishlist and Closet Picks each get an explicit submit button; Wishlist links to Goodreads' import and export page and says the export needs a desktop browser (the export is not in the Goodreads mobile app); Closet Picks links to the closet.
- Existing member self-edit in the code (`/api/me/entries`): a member can add a book to a meetup they attended (POST: meetup, title, author) and remove their own entry (DELETE). The Entries page uses those two actions.
- Defaults taken, to confirm: wishlist is private until the member switches it; Closet Picks candidates come from the wishlist plus a search box for any book in the archive; a locked set can be unlocked until the club decides, which hides the matches again.

## Round 42 (2026-10-19): Me batch thumb-zone pass; Closet Picks rule corrected
- "12 days this month" removed from N1. Wishlist is private by default (confirmed).
- All Me-batch layouts redrawn so the frequent actions sit in the lower third of a 390 x 844 screen (above the 56 px tab bar): Entries and Wishlist get a floating bottom action (as Filters does on the lists), their forms open as bottom sheets with the submit at the sheet's foot; Closet Picks puts Keep and Drop buttons (not swipe-only) and Lock my four at the bottom. The top bar's Admin link stays top-right as decided (rare action).
- **Correction to my earlier wording on Closet Picks.** The founder's rule (`do this too.txt`, lines 170 to 176): two people picking the same book is revealed only after the club (admins) decides which four books will be read, not after the member locks. So before the club decides nobody sees any match. Lock means "my four are final" (admins can see it) and can be undone until the club decides; unlocking changes no matches because none are shown yet. After the club decides, picks freeze and each member sees which books were chosen and "N others also picked <book>". This needs a new admin step (a Closet Picks round: see the tally, decide the four) that is not yet in the A series sheets.
- Wishlist: the Goodreads export link stays on the Wishlist page at all times (founder), as well as inside the Import sheet and the empty state.

## Round 43: Me batch built (2026-10-19, mockup only)
Built: `me.html` (T1 top bar states via "Preview as": Signed out, No record, Member, Admin; M1 card with 8 px orange band; N1 Yes/No with notes; N2 letter on first sign-in only, `?letter=1` forces), `entries.html`, `wishlist.html`, `closet-picks.html`. State lives on the phone (localStorage `bbb_*`). Verified at 390 px in headless Chromium: no overflow, no tap target under 44 px, flows exercised. Not tested on a real phone.
Flagged defaults still to confirm: Closet Picks candidates = wishlist plus archive search; locked set can be unlocked until the club decides. Admin Closet Picks round sheet not drawn yet.

## Round 44: Me batch APPROVED (2026-10-19)
Founder: "Approve the Me batch, draw the admin Closet Picks sheet". Changes folded in before approval: back link on Entries, Wishlist, Closet Picks; compact bottom-right Add a book; smaller "Hi, Abhiram" and round avatar in the header. Defaults accepted by approval: Closet Picks candidates = wishlist plus archive search; locked set can be unlocked until the club decides. Open: header height (left at 72 px), Lock my four bar width.
Next: admin Closet Picks round sheet (wave0-sheets-round5.md), awaiting verdict.

## Round 45: Library direction (2026-10-19)
Founder: L2 and L3 follow the set mockup aesthetic and UIUX rules; L1 closet header follows it too, options to be presented; closet/list toggle sits centre-right of the header (not top or bottom corner); L4 needs a friendlier layout, especially for the readers; picks are ALWAYS limited; Lock/Unlock removed; matches shown straight away. Closet Picks is a metric (favourite or want to read), no rounds, no club four, admins see names plus counts, with name and date and history.
Consequence: Me > Closet Picks page (Lock, delayed matches) must be reworked after approval.

## Round 46: Library header and preview (2026-10-19)
Header = mix of A1 and A3 (field in header opens a bottom sheet with the input above the keyboard). List view = cover grid like the live demo. Mini preview: the flipping book is the live HeroBookModal code, unchanged; everything else in our aesthetic with accessibility around it. Details: wave0-sheets-round6.md revision 3.
Closet on a phone: a flat spine row per shelf, like the live Vercel demo (founder, 2026-10-19). L4 redrawn as four screens (wave0-sheets-round6.md revision 4).

## Round 47: Library built (2026-10-19, mockup only)
Built: `library.html` (closet flat spine rows, 24 per row, 5 rows per shelf, 3 shelves per page, like the live demo; list = 2-column cover grid; header with centre-right Closet|List toggle; search field opens a bottom sheet; floating Filters and Picks), `book.html` (L3), `admin-picks.html` (L4a to L4d, reading this phone's picks only), `closet-picks.html` (reworked: no Lock, no delayed matches, tags, limit four).
The flipping book is the live code: `mockup/tools/flipbook/flipbook.tsx` holds the HeroBookModal springs and 3D markup copied verbatim, bundled by Vite with the fork's React, framer-motion and Tailwind utilities into `site/assets/flipbook/`. Spine palettes and style function copied unchanged from CriterionBookCloset.tsx.
Data: `site/data/library.json` (2,739 books, 2,461 covers). No picks table exists, so no pick counts are shown beyond this phone's own picks (no invented counts).
Flags: live spine number (closet hash, id+title) differs from the number printed on the live flip book (title+id); the preview sheet omits the number. Closet spines are about 14 px wide on a phone, so they miss the 44 px tap rule; the list view is the accessible route.

## Round 48: Library redone with the real closet code (2026-10-19)
Founder: the flat spine rows, the button-driven book preview and the re-made list were "fake"; the actual 3D closet (pan, zoom, drag-to-turn book) must be taken as is. Correction: `library.html` now hosts `closet.html`, which mounts the real `CriterionBookCloset` (3D wall, list view, `CriterionDetailModal` drag-to-turn preview) unmodified, bundled by Vite from `frontend/src` (`mockup/tools/closet/`). Removed: my flat spine rows, my list grid and search sheet, and the HeroBookModal extract (parked in `mockup/_removed-flipbook/`; HeroBookModal is not used by the closet, the turn lives in CriterionDetailModal).
Data boundary only: `mockup/tools/server.py` proxies `/api/*` read-only to the live demo (real data); shims for `next/link`, `next/navigation` and `lib/auth` (session from "Preview as"). Source files are not edited.
Open: the closet header (still the repo's text header, to be redesigned per the approved L1 mix), the closet's own Picks tray vs the Me picks page (two stores), the live site is older (pill header) than the repo source.

## Round 49: closet header, list and one book view (2026-10-19)
Founder confirmed: remove the whole strip (Previous, Shelves 1-3, latest, wings, Random); the agreed header is the main header; list view is the grid we built; the detailed book view applies to both views and keeps synopsis, details and "Discussed by" with the real turning book.
Built as asserted string edits on COPIES (`mockup/tools/closet/make_patched.py` writes `patched/`; fork source untouched): (1) header: back, Library, Closet|List centre-right, search field that opens a bottom sheet; (2) strip removed; (3) list = 2-column cover grid, tabs All / Discussed 2+ / Discussed once, Load more; (4) floating Filters and Picks bottom-right (left of the zoom control in the closet); (5) one book view: the real `CriterionListDetailModal` (synopsis, details, Discussed by) with the real `Rotatable3DBook` from `CriterionDetailModal` on top, used from both views.
Defaults taken, to confirm: (a) shelf paging = small previous/next arrows at the bottom-left of the closet (the only way to reach shelves beyond the first three besides Filters); (b) the real Filters drawer and the real Picks tray stay as they are (dark, not yet in our style); (c) the book view's save heart keeps the closet's own picks store, separate from the Me picks pages; (d) tabs use real fields (discussion count), "My picks" tab dropped.

## Round 50: Filters drawer and Picks tray in our style (2026-10-19)
Built (patched copies via make_patched.py): Filters as a flat bottom sheet with the real options (meetup select and chips, discussions volume, six sorts incl. random, starts-with letters, Reset all, Show N books); Picks as a flat bottom sheet (four rows, open, remove, Take a Polaroid). Verified in headless Chromium: Title A to Z + 2 or more discussions = 572 books.
Open for founder: (1) shelf paging placement, options P1 to P3; (2) merging the closet picks with the Me picks, options U1 to U3. Details in the chat of 2026-10-19.

## Round 51: P2 paging and one picks list U2 (2026-10-19)
Founder: "Follow U2. Paging placement shall be P2."
P2: side handles at mid-height on both edges of the closet (previous on the left, next on the right), shown only when there is somewhere to go, labelled "Previous shelves" / "Next shelves". The bottom-left arrows are gone.
U2: one picks list in `bbb_picks` (entries carry id, title, author, cover, tag, date). The book view heart, the Library Picks sheet, Me > Closet Picks and the admin picks view all read and write it. The heart opens a Favourite / Want to read sheet; at four picks it asks which one to replace (the silent "replace oldest" is gone). Add and remove events go to `bbb_pick_log` for the admin History tab. Signed-out visitors are sent to sign-in, members without a linked record to Me. Verified in headless Chromium: five adds gave four stored picks and a replace prompt on the fifth; Me showed four rows; admin showed four picks.
Still local to this phone: no picks table yet.

## Round 52: book view full screen (2026-10-19)
Founder asks: the detailed book view fills the whole page (reading "even excluding the bottom bar and header" as covering both); Close more prominent by typography, placement and underline (no colour); book id, title, heart, share and the rest bigger; scroll to details visible; links ("Meetup #N discussion", Discussed by names) in a stronger red; nothing else changes.
Built via `mockup/tools/closet/patch_bookview.py` (copies only): full-screen panel (scrolls as a page), fixed top bar with "‹ CLOSE" (20 px, bold, caps, 3 px underline), id badge 16 px, title 24 px, author line 16 px, heart/share/reset 48 px with 30 px glyphs, a "Synopsis and details ↓" button that scrolls to the details, links in #8a1c1c with 2 px underline. The closet page tells the page around it to hide the bottom bar while a book is open.
Not changed: the real turning book, synopsis, details, Discussed by, previous/next arrows (they float at mid-height and overlap text while scrolling, as in the repo).

## Round 53: batch order and approvals (2026-10-19)
Founder: Library batch and 404 APPROVED. Gallery later, not a priority. Next, in order: Account and Sign in, Admin tools behind placeholders (Members, Books, Claim codes, Import), Statistics, then meetup detail pages (content can be taken from the main website and the live demo; only a template layout and style needs agreeing, low priority).
Sheets for Account and Sign in: wave0-sheets-round7.md, awaiting verdict.

## Round 54: Account and Sign in decisions (2026-10-19)
Founder: no email, SMS or device-backup recovery; recovery is the 12-word phrase, plus an admin-issued reset code as the stopgap (accepted). 2FA: yes. Delete account: follow Proton's flow (reason, warning, tick box, password and 2FA code). Do not follow Proton's inactive-account policy. Privacy follows DPDP; the rights and complaints contact is the club email brokebibliophilesbangalore@gmail.com. "Keep me signed in" is a consent choice; otherwise the default is 24 hours (admins) and 30 days (members). Ignore "sign out of other devices". Agreed: Account layout B (rows), Forgot password, New password with Show toggle and no Confirm field, Download my data in the mockup, not a monitor.
Open: what "keep me signed in" extends to; what delete removes; 2FA required for admins; reset-code expiry. Sheets redrawn in wave0-sheets-round7.md revision 2.

## Round 55: Sign in and Account mockups drawn (2026-10-19)
Founder: "Go with your suggestions on all four, with option A for question 2. Draw the mockups first; I approve then we move forward."
Decided: keep me signed in = members 90 days instead of 30, admins always 24 hours; delete = unlink and erase bio, wishlist, picks, entries, keep the club's meeting history (anonymised on request); 2FA required for admins; reset codes one use, 24 hours.
Built: login.html (Show/Hide, keep me signed in, standalone DPDP notice on sign-up, 2FA step on sign-in), recovery.html (12-word phrase shown once), forgot.html (12 words or admin code, then new password with Show, then a new phrase), account.html (rows grouped; Email, Profile, Password, Recovery phrase, Two-factor with QR placeholder and 10 backup codes, Linked record, Download my data, Privacy and requests, Delete account with Proton's flow, deleted screen). Verified in headless Chromium: sign-up to phrase to Me, forgot with the saved words, all account screens, 2FA on and the sign-in code step, data download, delete wipes state. No horizontal overflow; only inline text links are under 44 px.
Mockup fakes (not real): the phrase, QR, codes and sign-in checks run on this phone only. Admin Members tool "Issue reset code" is part of the next batch.

## Round 56: Account and Sign in APPROVED; admin tools sheets drawn (2026-10-19)
Founder: "yup" to the Sign in and Account mockups. Sheets for Members, Books, Codes and Import drawn in wave0-sheets-round8.md, awaiting verdict.

## Round 57: Members, Books, Codes built (2026-10-19)
Founder: yes to the 7-day undo on remove; Merge and Delete stay in the Books mockup; one combined list for claim and reset codes; Import = the old admin page's functionality (not its UI), with room for the Goodreads CSV export edge case; no Google Form; bulk actions later.
Built: admin-members.html (list with tabs and search, member page with edit name, make a member, claim code, reset code for linked accounts, hide/show, remove with restore), admin-books.html (list with tabs No author / No cover / No ISBN, edit with author picker, translator, ISBN check, Open Library lookup, synopsis from the live API, Merge, Delete blocked while a book has discussions), admin-codes.html (Active / Used / Expired, New code, Revoke). Data: members-all.json (140 incl. hidden), library.json. State on this phone (`bbb_adm`); All changes does not yet show these local actions. Verified in headless Chromium, no overflow, all targets 44 px or more.
Correction to the Round 8 sheet: Member tab is 114 (113 plus 1 hidden), not 113.
Import: the old admin page (main repo and fork) has no import screen. What it has: Sync DB, Enrich from Goodreads for a book and for a whole meetup, Look up a book, Generate PDF, photo upload. The only import is the command-line full archive import (TXT and PDF into import jobs). Asked the founder which one is meant.

## Round 58: Import clarified (2026-10-19)
Founder: Import = Sync DB, Enrich from Goodreads (book and meetup), Look up a book, Generate PDF, Group photo upload, in our own UIUX and styling; the command-line archive import is not being done now; make way for a Goodreads CSV export as an edge case. Sheets in wave0-sheets-round9.md (options A and B), awaiting verdict.

## Round 59: the five old admin functions, built by object (2026-10-19)
Founder: Option A; do not remove the photo (read as: keep the file, so Remove can be undone for 7 days); keep both PDF styles; limit enrich to Apple Books and Open Library (no Goodreads page reading); include Delete meetup.
Built: admin-meetups.html (68 meetups; tabs All / No photo / No PDF / Deleted; one meetup: Group photo upload with 4.5 MB and type checks, replace, remove and restore; Books PDF with Magazine or Classic; Enrich its books with a count summary and retry; Delete meetup with restore), admin-books.html gains Enrich this book, Look up details with "What each source said" and a publisher field when every source fails, and "Add books from a Goodreads export" (check only: new, already in the archive, problems; handles ="978..." ISBNs, series suffixes, rows with no title), admin.html gains Meetups and Refresh site data (replacing the Import row).
Enrich is real: it queries Open Library and Apple Books from the browser and only accepts a result whose title matches; it fills only empty fields on this phone. Photo, PDF, delete and refresh are mockup state on this phone (no file is made). Verified in headless Chromium with a real image upload, a 14-book enrich (12 enriched, 1 already complete, 1 no match), delete and restore, the Goodreads check on a sample CSV.
Data facts found: the database has 68 meetups (1 photo, 12 PDFs), not 99; earlier sheet text said "All 99".
Open: adding Goodreads CSV rows is not connected; the real build needs a photo store, a PDF generator on the demo stack, and the audit hookup.

## Round 60: admin tools batch (Members, Books, Codes, Meetups, refresh) APPROVED by founder 2026-10-19.

## Round 61: scope and unfinished items (2026-10-19)
Founder: focus on meetup detail pages and reader profiles. Pushed for later: opening sequence, public Scorecard, iOS Add to Home Screen sheet, full-screen button, dark mode, Gallery, the "Make a member" placeholder link on the admin screen. Also work on the unfinished items: admin actions in All changes, Goodreads CSV add step, picks still local. Founder has tested the mockups on Android.
Done now: All changes shows this phone's admin actions (members, books, codes, meetups) merged with the database entries, labelled "On this phone"; the Goodreads export check now has an Add step (adds to this phone's Books list, 7-day undo of the whole batch, logged). Picks stay local: a picks table and routes are build work (wireframe/build stage), not a mockup change.
Sheets for meetup detail and reader profile: wave0-sheets-round10.md, awaiting verdict. Statistics page itself is still undone.

## Round 62: meetup detail and reader profile built (2026-10-19)
Founder: books on the meetup page as B rows (only here; the rest of the site keeps its grids); keep previous/next at the foot; reader privacy as drawn (no code or status); "Readers not recorded" is fine. Question 5 (a book row opens the full-screen book view) was not answered; taken as a default and flagged: rows link to library.html?select=ID, which the closet already supports.
Built: meetup.html (crumb, title, date . venue . format, counts, jump links, group photo and caption, PDF button, books as rows with a small cover and "Brought by" link, Who was there, General discussion, previous/next incl. a link to the Meetup #100 page; #100 redirects to the special page), reader.html (name, counts, first and latest, bio, "this is you" note, wishlist only when public, books newest meetup first with red meetup links and show more, meetups attended, hidden or unknown readers show not found), detail.css. Meetups and Readers lists, Home and the footer now link to them. library.html forwards ?select to the closet.
Data: live API (/api/meetups/N, /api/members/ID). Note: the API counts mentions inside book_count (#99: 61); the page shows 46 books plus 15 general-discussion items.
Verified in headless Chromium: list to meetup to reader to book view, previous/next, not-found pages, no overflow; inline text links and small controls fixed to 44 px.

## Round 63: backlog logged (2026-10-19)
Founder asked to log the deferred work. Created `docs/ux/backlog.md` (done, next, pushed later, unfinished mockup limits, wireframe and build, data items, founder-owned).

## Round 64: build decisions (2026-10-19)
Founder: session lengths enforced in our own code (not Supabase Pro); port the meetup PDF generator to run on Vercel; email stays a UIUX wireframe (Notify is a draft, no domain); hot-link covers now, copy later; recovery phrases and reset codes in our own hashed tables with rate limits (the server sets the new password); 2FA removed from the near-term build and moved to the backlog; deploy in slices.
Checks made: the mockup index lists 38 pages; Slice A must cover every public page (Home with the map, Directory, Meetups, Readers, Library, Club, About, FAQ, Listicles and detail, Meetup #100, meetup and reader pages, 404, Terms and Privacy) plus the shell (top bar, tab bar, footer, search, wallpaper map); the headline-options and 404-fonts pages are design experiments, not product pages.
First share: Abhiram (member 065-01, not yet linked). Needs a personal invite link, sign-up, auto-claim, the first-sign-in letter (N2) and a fresh "Did you read today" (N1). Slice A therefore also carries sign-up, claim, Me (card, N1, N2), Entries and basic Account.
- Round 65: Slice A plan written (docs/ux/slice-a-plan.md); branch ui/slice-a created; assets, scoped CSS and port script started.

## Round 66: Slice A built (2026-10-19)
Founder: session lengths in our own code; port the PDF generator to Vercel; email stays a wireframe; hot-link covers; recovery in own hashed tables; 2FA to the backlog; adjusted Slice A approved; invite page says "You're invited as <name>"; admin for Abhiram by a direct change after they register (yes); keep a "delta" between PWA and our own performance, lower is better (meaning to confirm); anyone with Abhiram's link must not reach his account.
Built on branch `ui/slice-a` (see docs/ux/slice-a-deploy.md): the club shell and every public page, sign in and create account, the personal invite link with an optional PIN (code after #, one-time, hashed with the PIN, rate-limited per login and per code, name preview), Me (card, daily question, first-sign-in letter), Entries, Closet Picks (phone), Account, Library on the approved closet, Terms and Privacy in the club type. Verified: tsc and next build pass; mocked-session checks of /me, /login, /join (valid, bad, PIN, none), letter and daily question; Lighthouse mobile on the same machine: /meetups 54 to 62 and TBT 4,250 to 910 ms, a11y 89 to 98; /library-room 51 to 47, TBT 5,840 to 2,650 ms.
Not done in A, on purpose: wishlist, picks table, data download, delete account, recovery phrase, session-length enforcement, admin tools port, Statistics. Founder-run steps: push, photo bucket and upload, invite script, admin grant.
