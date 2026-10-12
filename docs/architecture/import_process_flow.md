# Import process flow

How a meetup source file (PDF, text archive, chat export) becomes rows in the database. Written 2026-10-12 with the new parser
(`app/parsers/meetup_parser.py`, `resolve.py`, `changeset.py`, `scripts/import_meetups.py`). Flow D (assets, cache, CDN) is a separate,
later phase; nothing here changes the fields it depends on.

```
 sources/*.pdf|txt ─►[1 Register]─►[2 Extract]─►[3 Layout]─►[4 Structure]─►[5 Relation checks]
                                                                                   │
                         ChangeSet (typed operations, each with its evidence) ◄────┘
                                   │
                [6 Staging diff on the live DB inside a transaction, rolled back] ─► report ─► YOU APPROVE
                                   │
                [7 Settle: automatic backup, one transaction, triggers enforce the rules]
                                   │
                [8 Identity hand-off: work ids / ISBN / editions]  ─►  [9 Enrich: covers, ratings]
                                   │
                [10 Verify: tests, integrity, before/after diff]  ─►  commit
```
Stages 1-6 are offline and repeatable (no network, no writes that persist). Network calls happen only in 8-9.

| # | Input | Processing | Output (type) | DB shape |
|---|---|---|---|---|
| 1 Register | a file in `sources/` | meetup number from the filename, else month-year or a date line matched to `meetups.date`; **no number = stop and report** | `(number, how)` | `sources.meetup_number`, `sources.importer_name` (parser version) |
| 2 Extract | the file | `pdftotext -layout` (fallback pdfplumber with doubled glyphs removed); a page with images but no text is OCR'd (tesseract); page numbers and repeating headers/footers dropped | `Line(text, indent, page, no)` | `sources.raw_text` |
| 3 Layout | the lines | `blocks` (bullets, numbered, indented, nested `Name:`), `table` (Title/Author/Type header; the Type column sets the medium), `member_table` (Member # Title Author), `roman_table` (`I Name 1 Title Author`, columns cut at each page's own header; a ChatGPT summary above it is ignored), `glued_bullets` (∙ mid-line), `name_colon` (`NAME: Title - Author`, `o` sub-bullets), `author_interaction` (author's books, general lists, then UPPER-CASE member names); the `chat` export, text-less (image-only) pages and a non-English OCR gap are **reported, not guessed** | `(layout, confidence)` | none |
| 4 Structure | lines + layout | headings by position (any case, `Dr.`, `I.`, `1)`, `.S` initials); wrapped lines joined (deeper indent, open parenthesis, a surname after a full-width line, hyphenation); URLs and their wrapped tails attached to the item; table rows split at the header's column offsets; sections `MENTIONS`/`TANGENTS`/`AUTHOR DISCUSSION` start member-less groups; a second "by genre" view is not parsed twice; title/author/translator/media split once | `ParsedItem(section, heading, page, line_from, line_to, raw, title, author, translator, media_hint, goodreads_url, flags)` | none |
| 5 Relation checks | items + the DB | **heading to member** (explicit alias from the `aliases` table or `--heading-alias MEETUP:HEADING=Name` for one meetup, exact, first name + initial, alias evidence from other meetups, unique prefix, close spelling = inferred; several or none = unresolved); **book match** (import row's book, exact, article-insensitive, longer title only with 2+ words or an agreeing author word, close spelling with the same digits); fragments, clubs and series mentions skipped; a `Title - Author` line decided by name shape or held | `Op(kind, meetup, heading, title, detail)`: `add_mention`, `attach_reader`, `move_mention`, `held_move`, `link_import_row`, `new_book`, `held_new_book`, `new_member`, `attendance`, `unresolved`, `skip` | see stage 7 |
| 6 Staging diff | the ChangeSet | applied in a transaction, invariants checked, report printed, **rolled back** | the report (counts per op per meetup, every line with its evidence) | none persists |
| 7 Settle | your approval (`--commit`) | automatic backup to `~/bbb_backups/`, the same pass again in one transaction, invariants, commit. Re-crediting a mention to a different reader (`held_move`) and creating a book whose title/author split is unclear are **held** unless you pass `--allow-moves` / decide | see below | see below |
| 8 Identity | new books | `POST /admin/books/lookup` logic: `resolve(title, author, chain)` (Goodreads, Open Library, Inventaire; `names_match`), ISBN rules in `app/identity/isbn.py`; no match means manual entry (publisher and year mandatory) | `Resolution(candidate, trail)` | `work_identifiers`, `editions`, `edition_identifiers` |
| 9 Enrich | books of a meetup | admin button, `POST /admin/meetups/{n}/enrich-goodreads`; retry with backoff; the candidate's title must begin with the book's first two words and its author must agree; a cover is written only if its URL answers 200 now; 3 workers; outcome counted as enriched / skipped / no_result / failed | status per book | `canonical_books.cover_url, thumbnail_url, rating, goodreads_id, publication_year`; description and author only if empty |
| 10 Verify | the live DB | `pytest -q`, `npx tsc --noEmit`, `scripts/compare_db_versions.py before after`, invariants | pass / fail | none |

## Stage 7 writes
| Op | Table(s) | Key columns |
|---|---|---|
| source | `sources` | meetup_number, importer_name |
| import row | `imported_books` | canonical_book_id set when the row had no book |
| new book | `canonical_books`, `authors` | title (translator in the title string), normalized_title, author_id, media_type, language |
| mention | `discussions` | meetup_id, canonical_book_id, member_id (NULL for a general mention), topic, media_type, source_id |
| new reader | `members` | status `guest`, member_code `MMM-NN` (next suffix = max + 1) |
| attendance | `meetup_attendance` | status `attended`, source `backfill` |

Triggers already enforce: one target per mention (book or series), valid media category and member status, delete clears import links.

## Invariants (checked every run)
integrity_check ok; foreign_key_check empty; member codes unique; no PDF source without a meetup number; no book titled like a member (a heading imported as a book).

## What it deliberately does not do
Guess a heading, a title/author order, or a reader move; parse a layout it does not know; create a book for a series (waits for the series table); build a book for a club.
Layouts not parsed automatically: the chat export (#67: headings and items share one indent) and the image-only #97 (its pages have no text layer, and tesseract on this machine has no English data: `sudo pacman -S tesseract-data-eng`). #66, #96 and #99 are read by `name_colon`, `roman_table` and `author_interaction`; re-running the importer over every PDF now proposes nothing except series and club mentions it deliberately skips.

## Operator options of `scripts/import_meetups.py`
`--commit` (backup, then write), `--allow-guest "HEADING=Name"` (a heading that names nobody becomes a guest), `--allow-move MEETUP:TITLE` / `--allow-moves` (re-credit a held mention), `--heading-alias MEETUP:HEADING=Name` (one meetup only), `--creator NAME` (a line that is only a person's name becomes a `creator` row), `--quiet`.
