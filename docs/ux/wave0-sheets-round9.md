# Round 9 sheets: Import = the old admin page's five functions in our terms (2026-10-19, draft)
Founder: do what the old admin page did (Sync DB; Enrich from Goodreads for a book or a whole meetup; Look up a book; Generate PDF; Group photo upload), in our UIUX and styling. The command-line full archive import is not part of this.
Read from the old admin code (main repo `app/api/main.py` and `frontend/src/app/admin/page.tsx`):
- Enrich a book: fetches the book's goodreads.com page (browser-like User-Agent, reads the JSON-LD block) and falls back to an Apple Books search; answers matched / already complete / no match / failed. Enrich a meetup does all its books, 3 at a time, and returns counts ("12 enriched, 3 already complete, 2 no match, 1 failed of 18") plus up to 5 failure messages.
- Look up a book: tries each identity source in order and returns what each one said (the "trail"); if all fail, asks for publisher and year by hand.
- Generate PDF: two styles, Magazine (designed zine) and Classic (plain table); stores the link on the meetup; public download at /meetups/N/pdf.
- Group photo: jpg, png or webp, up to 4.5 MB, one per meetup; replace or remove.
- Sync DB: refreshes the site's cached data so changes appear in the Library and lists.
Flag: the enrich fetch reads Goodreads pages automatically. Goodreads closed its public API in 2020 and its Terms on automated access have not been read. Needs your decision.
Rules applied: same as the other admin tools (rows, sheets with the action at the foot, text tabs, 44 px targets, flat paper, accent underline, 7-day undo where a change can be reversed).

## Option A (recommended): put each function where its object lives
 Admin console Tools: add "Meetups" and "Refresh site data".
 MT1 Meetups   < Admin / Meetups / [Search number, book or reader] / All 99 | No photo | No PDF
   #99 . 11 Oct 2026 . 4 readers          >     (flags: No photo, No PDF)
 MT2 One meetup  < Meetups / #99 / 11 Oct 2026 . 4 readers . 18 books
   Group photo        Added 12 Oct          >   -> sheet: image (jpg, png, webp, up to 4.5 MB), preview, [Upload photo >]; Replace; Remove (confirm, 7-day undo)
   Books PDF          Magazine, 12 Oct      >   -> sheet: ( ) Magazine  designed zine   ( ) Classic  plain table   [Generate PDF >]; then [Open PDF] [Copy link]; making it again replaces the old one
   Enrich its books from Goodreads          >   -> confirm sheet "Asks Goodreads about 18 books, about a minute"; result "12 enriched, 3 already complete, 2 no match, 1 failed" with the failures listed and [Try the failed again]
 Books (B2, already built) gains:
   Enrich from Goodreads (this book)  -> matched "Title" / already has a cover and Goodreads id / no match / failed, try again
   Look up details now shows "What each source said" (expandable) and, when every source fails, asks for publisher and year
 Refresh site data (one row on the Admin console): [Refresh] -> "Refreshed 19 Oct, 14:02"
## Option B: one Import page with five rows
 Import / Refresh site data / Enrich books from Goodreads / Look up a book / Make a meetup PDF / Upload a group photo
 Each row first asks you to pick a meetup or a book, then runs. Fewer places to look, more picking each time.

## Edge case reserved: Goodreads CSV export (admin side)
 Books > More > "Add books from a Goodreads export" (best on a bigger screen)
 Steps: choose file -> always a dry run: "N new, N already in the archive, N problems" with the first 5 rows -> [Add N books >] -> result, problem rows listed, 7 days to undo the batch.
 Edge cases to handle: ISBN cells written as ="978..."; title with a series suffix "(Series, #1)"; several authors; blank ISBN; a book already in the archive (match on ISBN, else title plus author); the Exclusive Shelf and Bookshelves columns; byte-order mark and encoding; rows with no title.

## Needs your call
1. Option A (by object) or B (one page)? I recommend A.
2. Photo remove: delete the file, or keep the old one for 7 days so it can be undone?
3. PDF: keep both styles, Magazine and Classic?
4. Goodreads enrich: keep it as the old page did (reads Goodreads pages automatically), or limit it to Apple Books and Open Library until the Terms are checked?
5. Meetups tool: include "Delete meetup" (the old page had it, with a confirm), or leave it out?
