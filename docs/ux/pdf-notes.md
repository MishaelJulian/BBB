# Meetup PDFs on Vercel: notes and report (2026-10-19)
Branch `pdf` (off `slice-bc` 1d83814), worktree `BBB-vercel-demo-pdf`. Nothing pushed. Nothing written to the live database, live storage or Vercel: every run used the local throwaway Postgres (`pdf_dev`, plus `pdf_base` for the Python baseline) and a stub storage server. `frontend/.env.local` in this worktree has the live `DATABASE_URL` replaced by the local one.

## What is done
- Both Python generators ported to pdfkit: **Magazine** (`generate_magazine_meetup_pdf`) and **Classic** (`generate_classic_meetup_pdf`).
- `POST /api/admin/meetups/<number>/pdf?style=magazine|classic` (admin only). Builds the PDF in memory, uploads it with `SUPABASE_SERVICE_ROLE_KEY` to the public bucket `meetup-pdfs` as `meetup-<number>-<style>-<timestamp>.pdf` (`x-upsert: false`, name made only from a checked integer, a whitelisted style and the clock), sets `meetups.pdf_url`, writes an audit row `meetup.pdf` (before and after `pdf_url`, style, pages). The old file stays in the bucket. **Undo** works from All changes (7 days) through a new `meetup.pdf` case in `changes.ts` ("Made a books PDF"; blocked with "The PDF was changed again since" when it was replaced again).
- Statuses: 401 no token, 403 member token, 200 admin; 404 unknown or non-numeric meetup; 422 bad or missing style, or meetup with no books; 413 PDF over 20 MB (cap `PDF_MAX`; biggest made is 6.4 MB); 503 service key missing, storage refused, PDF build failed, or two builds already running on this instance. Messages are plain; internals go to the server log only.
- The PDF sheet in `AdminMeetups.tsx` (approved mockup `admin-meetups.html`): Magazine / Classic choice, "Making the ... PDF... this can take up to a minute", result message with "Open the new PDF", error with "Try again", replace wording ("The old file is kept, so Undo in All changes brings it back for 7 days"), 90 s client timeout. Checked in headless Chromium at 390 x 844: no overflow, no console errors.

## Files changed (all under frontend/ unless noted)
New: `src/lib/pdf/{format,covers,images,doc,data,magazine,classic,index}.ts`, `src/lib/pdf/{pdf.test.ts,gen.test.ts}`, `src/lib/pdf/assets/{SpecialElite-Regular.ttf,cover-bg.jpeg,group-photo-fallback.jpeg}`, `src/lib/admin/pdf.ts`, `src/app/api/admin/meetups/[number]/pdf/route.ts`, `../docs/ux/pdf-progress.md`, `../docs/ux/pdf-notes.md`.
Edited: `src/components/club/AdminMeetups.tsx` (PDF sheet and the one Act line only), `src/lib/admin/changes.ts` (label and undo case), `next.config.ts` (only `outputFileTracingIncludes` for this route), `package.json` and `package-lock.json` (`pdfkit` ^0.20.2, dev `@types/pdfkit`). Not touched: `session.ts`, auth/account/recovery, migrations.
No new env vars (uses `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_URL`). No migration: the bucket `meetup-pdfs` already exists (it holds the 12 old PDFs); there is no migration for it in the repo, so a fresh Supabase project would need the bucket created by hand (public).

## How it works
- Fonts and template images are bundled in `src/lib/pdf/assets/` (Special Elite is the only font the Python code actually drew with; the other two registered fonts were never used). The cover background and closing background are the same file in the Python repo, so it is shipped once. `outputFileTracingIncludes` copies `assets/**` and `node_modules/pdfkit/js/**` into the function. The production build's trace file lists the font, both images and pdfkit's data.
- Data: one read of meetup, venue, discussions with book, author, cover (`cover_url` else `thumbnail_url`) and reader, in stored order (`ctid`, like the Python's unordered query on the same table). Same grouping rules: readers A-Z, "general" when notes or topic contain "general" or there is no reader, general books once.
- Covers: allow-list = Python `COVER_HOSTS` (https only, hosts `gr-assets.com mzstatic.com media-amazon.com duckduckgo.com tvmaze.com ytimg.com scdn.co` and subdomains). Extra guards: no `user:pass@`, no port, no IP literal, no trailing dot, URL <= 2048; redirects are followed by hand (max 3) and every hop goes through the same checks; the hostname is resolved and refused if any address is private, loopback, link-local or ULA; 8 s timeout per cover, 25 s budget for all, 2.5 MB cap (declared and streamed), bytes must sniff as JPEG, PNG, GIF or WebP; 6 at a time; only covers that are actually drawn are fetched. Failure of any kind = the drawn "book card" the Python code used, never an error. GIF and WebP are converted with `sharp` when present (Next ships it); otherwise those covers fall back to the card.
- Group photo: only from our own public bucket `meetup-photos` on the project in `NEXT_PUBLIC_SUPABASE_URL` (http allowed only for a localhost base outside production, for the stub). 10 s, 5 MB.

## Verification
- `npx tsc --noEmit` clean; `npx next build` clean (built with DATABASE_URL and NEXT_PUBLIC_SUPABASE_URL pointed at local); 78 vitest tests in `src/lib/pdf/pdf.test.ts` pass, plus the 13 existing admin tests and the others (91 passing in the whole run; the Playwright file `e2e/smoke.spec.ts` is picked up by `vitest run` and fails to load there, as before this work). Tests cover: date format (suffixes 1st/2nd/3rd/4th-20th/21st-23rd/24th-30th/31st, no date), word wrap (greedy, long word, whitespace), the URL allow-list (http, lookalike suffix, host-as-prefix, `gr-assets.com@evil.com`, credentials, port, IPv4/IPv6 literal, localhost, file/data/javascript, trailing dot, backslash trick, over-long), own-photo URL rules, private address ranges, fetch guards (redirect to 169.254.169.254, to another host, to a non-https URL, to a userinfo trick, a redirect loop, DNS rebinding to a private address, size cap declared and streamed, non-image body, timeout, error), grouping, the storage key, real PDF output in both styles (missing cover, no photo, odd characters, no date), and the route operation against the local database with stubbed storage (422, 404, 503 without key, 503 when storage refuses and `pdf_url` untouched, fresh key with `x-upsert: false`, `pdf_url` set, audit row).
- curl against the production build (`next start`, local DB, stub auth and storage): no token 401, member token 403, admin 200 for both styles on meetups 24, 99, 98, 71, 16, 100; unknown style 422; non-number 404; unknown meetup 404; undo through `/api/admin/changes/<id>/undo` restored the previous `pdf_url`. `pdfinfo` and `pdftotext` open the stored files with the right page counts.
- Size and time (production build, biggest meetup = #24, 103 books, 15 covers, plus #99 with 17 covers): 2.6 s and 4.9 MB for #24 Magazine, 2.2 s and 6.4 MB for #99 Magazine, 0.1 to 0.4 s and 6 to 14 KB for Classic; covers were fetched live from the real hosts. Server process RSS 350 to 430 MB for the whole Next server after all twelve runs (Next alone is about 330 MB), so the PDF itself costs well under 100 MB. Vercel Hobby gives 2 GB and the route sets `maxDuration = 60`; the worst case is the 25 s cover budget plus drawing plus upload. Not measured on Vercel itself.

### Parser round trip (`app/parsers/pdf_parser.py` `PdfMeetupParser`, pdfplumber, venv under /tmp/pdfwork)
Baseline = the Python generator run on the same data (a copy of the database where the one hidden member's name is blank, so the Python also leaves it out). File names given to the parser: `meetup-<n>-<style>-1760000000000.pdf`. "Titles / title+author" = how many of the database's discussion rows the parser recovers exactly; both columns are "Python / pdfkit".

| Meetup | Style | DB rows | Meetup number found | Titles | Title + author | Same set recovered | Date text in PDF |
|---|---|---|---|---|---|---|---|
| 99 | magazine | 62 | None / 99 | 58 / 58 | 57 / 57 | yes | no / yes |
| 99 | classic | 62 | 99 / 99 | 0 / 0 | 0 / 0 | yes | yes / yes |
| 98 | magazine | 64 | None / 98 | 60 / 60 | 59 / 59 | yes | no / yes |
| 98 | classic | 64 | 98 / 98 | 0 / 0 | 0 / 0 | yes | yes / yes |
| 24 (biggest) | magazine | 103 | None / 24 | 101 / 101 | 100 / 100 | yes | no / yes |
| 24 | classic | 103 | 24 / 24 | 0 / 0 | 0 / 0 | yes | yes / yes |
| 88 (12 books no cover) | magazine | 78 | None / 88 | 76 / 76 | 75 / 75 | yes | no / yes |
| 88 | classic | 78 | 88 / 88 | 0 / 0 | 0 / 0 | yes | yes / yes |
| 90 (13 no cover) | magazine | 53 | None / 90 | 51 / 51 | 51 / 51 | yes | no / yes |
| 90 | classic | 53 | 90 / 90 | 0 / 0 | 0 / 0 | yes | yes / yes |
| 71 | magazine | 34 | None / 71 | 28 / 28 | 26 / 26 | yes | no / yes |
| 71 | classic | 34 | 71 / 71 | 0 / 0 | 0 / 0 | yes | yes / yes |
| 100 (newest) | magazine | 2 | None / 100 | 2 / 2 | 2 / 2 | yes | no / yes |
| 100 | classic | 2 | 100 / 100 | 0 / 0 | 0 / 0 | yes | yes / yes |
| 16 (older, Atta Galatta) | magazine | 88 | None / 16 | 87 / 87 | 84 / 84 | yes | no / yes |
| 16 | classic | 88 | 16 / 16 | 0 / 0 | 0 / 0 | yes | yes / yes |

Reading it:
- The parsed set of database books is identical for Python and pdfkit in all 16 PDFs. The parser finds 0 members in every file, Python and pdfkit alike (it needs a name line followed by a book line; neither layout gives that), so "members" cannot differ. Classic finds 0 titles in both because each table row reads "1 Reader Title Author" on one line; this is how the Python PDF already behaves, kept on purpose.
- **Improvement, not a mismatch:** the Python Magazine drew every cover and closing line twice (a 2 pt shadow made of real text), so the text layer read `MMeeeettuupp ##9988` and the parser found no meetup number and no date. In pdfkit the shadow is drawn as glyph outlines (same picture), so the page text is clean and the parser reads the meetup number from every Magazine PDF. The parser takes the date only from the file name; the formatted date (for example "23rd August 2026") is in the PDF text of both styles.
- Text per page, pdfplumber `extract_text`, Python against pdfkit: Classic pages are identical except where the Python output is broken (see differences). Magazine pages 2 and the later reader pages are identical; the cover, group-photo and closing pages differ only by the doubled shadow text.
- Word positions (x and top of every word) differ by 0.0 pt on every page of every file compared (kerning is switched off in pdfkit to match reportlab).

### Visual comparison (pdftoppm, 50 to 80 dpi, pixel difference over 40/255)
Meetups 99 and 98 checked page by page, Magazine and Classic: pages 2 to 6 of the Magazine (readers pages with the covers and the drawn cards, the general discussion page) are pixel identical; cover and closing differ in about 0.2 to 0.4 percent of pixels (shadow anti-aliasing); Classic differs in 9 pixels on page 1 of #99. Seen side by side: layout, colours, fonts, covers and cards look the same.

## Differences from the Python version (all deliberate unless marked)
1. Shadow text is outlines, not a second copy of the text (parser can read the number; see above).
2. Characters the font cannot draw (Malayalam, Bengali, Kannada, Devanagari in a handful of titles, authors and reader names in the real data): Python printed blanks or garbage (`nnn`, NUL bytes); pdfkit prints `?` for each run, and folds letters with accents the font lacks to the plain letter (Fūtarō becomes Futaro). A fallback font for those scripts would fix it properly (needs a font file and its licence).
3. Text is literal. reportlab's Paragraph reads `&c.` as markup and printed `&c.;` in Classic; pdfkit prints `&c.`.
4. A reader whose member is hidden on the site (`members.is_hidden`, 1 member, 4 discussion rows) is not named: their books go to General Discussion (Magazine) or "General Discussion" (Classic). The Python named them. Changed because the PDFs are public.
5. Group photo: taken from the meetup's own `photo_url` when it is in our `meetup-photos` bucket. The Python code read a local file; with the demo's URL it found nothing. Classic embeds the photo stretched to 320 x 180 exactly as the Python did, which can distort it (kept for parity).
6. Long words in the Classic table are cut to fit the cell (reportlab does the same); pieces are joined with a space in the rare case two pieces share a line.
7. File size: Magazine 4 to 6.4 MB (the Python files were 9 to 11 MB because the same background was embedded several times).
8. PDF metadata Producer/Creator say `bbb-library` (was ReportLab).
9. Page numbers "Page i of n" in Classic: same wording, same place.

## Defaults the founder must confirm
- **Group photo fallback (kept from Python):** a Magazine for a meetup with no photo gets the BBB #99 template group photo on its photo page, captioned with that meetup's number and date. This is what the Python generator did (it falls back to `templates/bbb99/page_12_img_1.jpeg`), and it keeps the page count equal (#16 has 8 pages, #100 has 4). It puts the wrong people under another meetup's caption. Switch: `FALLBACK_TO_TEMPLATE_PHOTO` in `src/lib/pdf/index.ts` (false = no photo page). I kept the Python behaviour; please decide.
- Hidden members left out of the PDFs (difference 4).
- `?` for scripts the font cannot draw (difference 2).
- File name pattern (`meetup-<n>-<style>-<ms timestamp>.pdf`) instead of the old `bbb_meetup_<n>.pdf`; the old files stay and keep working until replaced.
- 20 MB cap, 2 builds at a time per instance, 60 s function limit.

## Open risks
- Not run on Vercel itself: the production build ran with `next start` on this machine. Fonts, images and pdfkit data are in the build's trace file, but a first deploy should be tried once on a preview (watch for a missing file error; the fix is another path in `outputFileTracingIncludes`). `sharp` is only used for GIF and WebP covers and for a WebP group photo; if it is missing there those fall back to the card or the template photo.
- Cover hosts can be slow or block a server's address; a missing cover shows as the plain card and the sheet says how many were missing. The cover URLs are hot-linked (founder decision), nothing is cached.
- The 20 s to 30 s worst case (every cover host slow) is near the 60 s limit together with the upload; the sheet times out at 90 s on its side.
- pdfkit's `_font` and AFM kern table are private fields used to match reportlab's widths; a pdfkit major upgrade could change them (kerning would simply come back and wrap points shift slightly). Pin pdfkit if exact parity matters.
- A rate limit of 30 writes a minute applies; one PDF is one write.
- The Python parser reads the date only from the file name; if the founder wants the date from the PDF text, the parser needs a change (not done: out of scope).
- SpecialElite is bundled from the repo's `assets/fonts` (SIL Open Font License); the licence file is not copied.
- `docs/ux/slice-c-notes.md` and the mockup still say the PDF is not built; not edited.
