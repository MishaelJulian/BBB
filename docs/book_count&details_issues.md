# Book Count & Details — Issues

**Measured:** 2026-10-07, against `book_club_archivist.db` at commit `903a107`.
**Rule:** every number below was queried from the DB, the source files, or the code. Nothing is estimated unless it is labelled **INFERRED**.

---

## 1. The numbers at a glance

| Measure | Value | Note |
|---|---|---|
| Meetups held | 99 | #1–#99; numbers are sequential |
| Meetups in archive | 53 | #4–#99 with gaps |
| Meetups missing | 46 | #1–3, 6–7, 10, 27–30, 32–33, 35–36, 38–39, 41–44, 51, 53, 55–64, 66–69, 77–79, 81, 87–92 |
| Source records (`sources`) | 1829 | all created 2026-07-22 |
| Imported books (`imported_books`) | 3551 | every book *mention* in a source file; all created 2026-07-22 |
| Imported → linked to a canonical | 3175 | |
| Imported → **unlinked** | 376 (+2 pointing at deleted canonicals) | §5 |
| Canonical books (`canonical_books`) | 2736 | unique books after resolution |
| Canonical with ≥1 discussion | 2111 | shown in footer as "Books" since `903a107` |
| Canonical with **no discussion** | 625 | §8 |
| Canonical with **no imported row** (admin/script-entered) | 104 | §7 |
| Canonical with **no author** | 373 | |
| Canonical with **no person** on any discussion | 2015 | |
| Discussions | 2609 | one row per (meetup, book, member) |
| Discussions with a member | 836 | 32% |
| Authors | 2045 | 294 have no book; ≥95 duplicate groups |
| Members | 174 | 85 have no discussion |
| Possible-duplicate review queue | 0 | 217 in the first 2026-07-22 run |

**Why 3551 vs 2736:** imported rows are mentions; one book discussed at 3 meetups = 3 imported rows, 1 canonical. Linked imported rows per canonical: 1 → 2236 books, 2 → 299, 3 → 70, 4 → 19, 5 → 7, 6 → 2, 8 → 1. The 8-mention "book" is `∙ The` — a parsing fragment (§4).

---

## 2. How a book gets into the archive

Two write paths exist, and they do not agree with each other.

**Path 1 — Import pipeline** (`archive import-full`, `app/pipeline/full_import.py`, run once on 2026-07-22 21:32, import job `FULL_ARCHIVE`):

| Phase | Method | What it does |
|---|---|---|
| 1 | `TxtMeetupParser`, `PdfMeetupParser` | Parse `BBB Meetup-9.txt` + every PDF in the root into intermediate records (3954 total) |
| 3 | `_create_sources_and_meetups` | One `Source` + `Meetup` per meetup-level record **with a meetup number** |
| 4 | `_create_authors_members_books` | One `ImportedBook` per book record; skips normalized titles < 2 chars |
| 5 | `_resolve_canonical_books` | Group imported rows by `(normalized_title, normalized_author)` → one canonical per group; drops "noise" titles |
| 6 | `_detect_duplicates` | Fuzzy-match unlinked rows (≥0.75) into `possible_duplicates` |
| 7 | `_link_imported_to_canonical` | Set `imported_books.canonical_book_id` from the phase-5 cache |
| 8 | `_merge_canonical_duplicates` | Merge canonicals sharing a normalized title (different author spellings) |
| 9 | `_create_discussions_and_resources` | One `Discussion` per book record whose meetup exists |

**Path 2 — Admin & scripts** (`POST /admin/meetups/{n}/books`, `PUT /admin/books/{id}`, `scripts/ingest_meetup_99.py`, `scripts/fix_meetup_45.py`): write `CanonicalBook` + `Discussion` directly. No `Source`, no `ImportedBook`.

---

## 3. Source files (input)

All in the repo root: 1 TXT + 33 PDFs.

### 3.1 Eleven PDFs have no meetup number → their books belong to no meetup

The filename patterns in `app/parsers/scanner.py:parse_filename_metadata` (lines 138, 146, 154, 162) extract only month/year for date-named files. The fallback in `pdf_parser.py:337` searches the text for `Meetup?\s*#?(\d+)` only.

| File | Imported rows | Unlinked | Date in file text | Meetup # |
|---|---|---|---|---|
| BBB Books Discussed - Jul 2023.pdf | 67 | 8 | none (a table: Title/Author/Type/Link) | **INFERRED** #62 |
| BBB Books Discussed - Aug 2023.pdf | 119 | 6 | 26/8/2023 | **INFERRED** #63 |
| BYOB +BBB - Nov 2023 (25th Nov Meet) - Copy.pdf | 46 | 2 | 25 Nov 2023, "BYOB + BBB Crossover Meet" | **INFERRED** #66 — confirm a crossover counts as a BBB meetup |
| 30_12_2023 15_33.pdf | 44 | 4 | 30/12/2023 15:33 (a notes/chat export, not a list) | **INFERRED** #67 |
| Books Discussed — BBB JULY 2025.pdf | 74 | 10 | 27 July 2025 | **duplicate of #86** (same md5 `877cd2df`) |
| BBB AUG 2025 - BOOKS DISCUSSED.pdf | 38 | 6 | 24-8-25 | **INFERRED** #87 |
| BBB SEPT 2025 - BOOKS DISCUSSED.pdf | 78 | 7 | 28 Sep 2025 | **INFERRED** #88 |
| BBB OCT 2025 - BOOKS DISCUSSED (1).pdf | 62 | 8 | 26 Oct 2025 | **INFERRED** #89 |
| BBB NOV 2025 - BOOKS DISCUSSED LIST.pdf | 44 | 7 | 30 Nov 2025 | **INFERRED** #90 |
| BBB DEC 2025 - BOOKS DISCUSSED LIST.pdf | 66 | 10 | 21 Dec 2025 | **INFERRED** #91 |
| BBB JAN 2026 - BOOKS DISCUSSED LIST.pdf | 62 | 15 | 18 Jan 2026 | **#92 — stated in the PDF ("BBB #092")**, missed by the regex |

Inference basis: meetups are monthly; #65 = Oct 2023 (from its own PDF), #70 = Mar 2024, #86 = 27 Jul 2025, #93 = Feb 2026. #87–#91 fill Aug–Dec 2025 exactly, and #92 is confirmed. 2023 numbers follow the same count back/forward from #65 and need confirmation.

Effect: these files produced ~700 imported rows whose books got **no discussion and no meetup** — the main cause of §8. Recovering them would restore 10 meetups (#62, 63, 66, 67, 87–92 minus any not confirmed).

### 3.2 Same file imported twice
`Books Discussed — BBB JULY 2025.pdf` and `86 - BBB Meetup - Books Discussed - July 2025.pdf` are byte-identical. The copy was imported as a second, unnumbered source: 74 duplicate imported rows.

### 3.3 Link to the July data loss
The first 2026-07-22 run (snapshot formerly in `docs/reference/snapshots/2026-07-22-run1`, recover with `git show 625b9a2:…`) had **63** meetups; the later run has **52**. 63 − 52 = 11 = the number of unnumbered files above. That run also had a meetup #30 where the later one has #65, consistent with `30_12_2023 15_33.pdf` being read as #30. The parser that produced run 1 is not in git.

---

## 4. Parsing (`app/parsers/`)

| Issue | Where | Evidence |
|---|---|---|
| Meetup number regex misses `BBB #092` | `pdf_parser.py:337` | Jan 2026 PDF |
| Date-only filenames never yield a number | `scanner.py:138–162` | §3.1 |
| Day-less dates stored as the 1st | `utils.py:parse_meetup_date` (`%B %Y`, `%b %Y`) | 10 meetups dated on the 1st: #65, 74, 83, 84, 86, 93, 94, 95, 96, 98 — #86's PDF says 27 July 2025, DB says 2025-07-01 |
| PDF text loses spaces | `pdfplumber.extract_text()` default tolerance | 20 space-stripped titles: `ThreeBodyProblem`, `NotesonGrief`, `DaevabadTrilogy`, `TheLunchBox,movie`, `IWanttoDiebutIWanttoEatTteokbokki` … and authors like `AnuradhaRoy`, `AmarChitraKatha` |
| Member names parsed as book titles | `_extract_member_books` / `_extract_books_flat` | 37 canonical titles equal a member's name (`Abhiram`, `ANAND`, `Anindita`, `Irene` …); 4 still have discussions |
| Bullet/glyph prefixes kept in titles | flat extractor | 38 titles start with `∙`, `♫`, `✎`, `●` (e.g. `∙ Notes on Grief`, `♫ https://www.vox.com/recode-decode-podcast-kara-swisher`, `✎ waitbutwhy.com`) |
| Headers / metadata parsed as books | flat extractor | `@ The Bookworm`, `BBB-83`, `Joy 30/12/2023 17:48`, `Meeting #80 BBB Jan 2025 2`, `(translator:NeilSmith)` (5 translator lines), `(hottige_mithraru, Kannada book club)`, `(Purple noon?)`, `ure`, `/22/63` (fragment of *11/22/63*), `@@ TT HH EE BB OO OO KK WW OO` |
| URL slugs as titles | flat extractor | `rgot-to-invent-facebook-and-other-stories` |
| Private-use Unicode left in text | PDF fonts | `Meeting #80  BBB Jan 2025 2` |
| Fake confidence | `pdf_parser.py:358, 405, 434` | `extraction_confidence` hardcoded 0.85 / 0.80, never measured |
| Venue defaulted | `pdf_parser.py:342` | every PDF without a venue keyword becomes "Bookworm" |
| "Noise" filter also drops real books | `full_import.py:331–354` | 46 imported rows dropped as noise, including `IT` (Stephen King), `Book 3 of Riftwar Saga`, `Book 4 of Malazan` |
| Noise filter misses real noise | same | everything in the "headers" row above got through |

---

## 5. Processing — why 376 imported rows are unlinked

| Cause | Rows | Evidence |
|---|---|---|
| **Merge step un-links rows (bug)** — title exists as canonical, same author | 108 | e.g. *Ghachar Ghochar*, *Meditations*, *Oathbringer*, *Neverwhere* |
| **Same bug** — title exists, author spelled differently | 147 | e.g. *Steve Jobs* / "Walter Issacson", *Men without women* |
| No canonical with this title | 70 | e.g. *Sapiens* ("Harari" and "Hariri"), *Looking Away*, *Deep Work* |
| Dropped by the noise filter | 46 | §4 |
| Title exists only as an admin-created canonical | 5 | *The Dresden Files*, *Blind Willow Sleeping Woman*, *84 ,Charing cross road* |
| Points at a deleted canonical | 2 | `MEET #98`, `JULY 2026` (junk rows deleted in `427be12`) |

**The merge bug (reproduced):** `_merge_canonical_duplicates` (`full_import.py:516`) does

```python
for ib in merge_into.imported_books:
    ib.canonical_book_id = keep.id
self.session.delete(merge_into)
```

It changes the foreign-key column but leaves `ib` in `merge_into.imported_books`. When SQLAlchemy deletes `merge_into`, it nulls the FK of every child still in that collection, overwriting `keep.id`. Reproduced in an in-memory DB with the project's models: after the merge, `canonical_book_id = None`. Fix: `ib.canonical_book = keep` (move through the relationship) or set `passive_deletes`.

Other processing defects:
- **Group key includes the author.** Phase 5 groups by `(title, author)`, so one book with two author spellings becomes two canonicals, which phase 8 then merges by title alone. Different books that share a normalized title would also be merged into one.
- **"Longest title first" is wrong.** Phase 8 sorts with `order_by(CanonicalBook.title.desc())`, which is reverse-alphabetical, not by length.
- **Discussion matching uses a rebuilt cache.** Phase 9 looks up `(normalized_title, normalized_author)` from the raw record, but after merging, the cache is keyed by the *kept* canonical's author. Records whose author spelling differs find nothing, and no discussion is created.
- **Duplicate detection ran but nothing survives.** 217 candidates in run 1, 0 now; the review queue was never used.
- **Import job counters disagree.** `import_jobs.processed_items` = 3495 vs 3551 imported rows created on the same day. Unexplained.
- **`import-full --reset` drops every table.** Any re-run wipes all admin edits made since (120 canonicals, 282 discussions, photos/PDF links).

---

## 6. Classification

| Issue | Evidence |
|---|---|
| `media_type` is almost all default | book 2727, movie 3, podcast 2, tangent 2, youtube 2; many movies/series/podcasts are typed "book": `TheLunchBox,movie`, `TheOne,seriesonNetflix`, `LettersfromIojima(movie)`, the `♫` podcast links |
| `language` hardcoded | `full_import.py:390` sets `"en"` for all 2736, including Kannada/Malayalam/translated works |
| Series and multi-book entries as single books | `The Dresden Files Series`, `The Bourne Series`, `DaevabadTrilogy`, `Book 3 of Riftwar Saga` |
| Merged/combined titles | `fix_meetup_45.py` writes normalized titles like `the widows of malabar hill murder on malabar hill` and `works of anand teltumbde persistence of caste republic of caste` |
| Short real titles look like junk | `1984`, `2666`, `1929`, `11/22/63`, `Fox 8`, `We3`, `IT`; abbreviations `HP1`, `GoT`, `H2G2` |
| No genres, tags, series, publishers | all 0 rows |
| Metadata sparse | cover 1781, goodreads_id 1622, publication_year 215, ISBN-13 0 |

---

## 7. Admin-entered books (no source)

**104 canonical books** have no imported row. All were created between 2026-09-19 and 2026-10-01 (7 + 72 + 8 + 2 + 25 + 6 by day) and all 104 have discussions, so they are real. Their discussions: 282 created after 2026-07-22.

Defects in the admin path (`app/api/main.py`):
- **No provenance.** `add_book_to_meetup` (line 1367) and `scripts/ingest_meetup_99.py` create `CanonicalBook` + `Discussion` but no `Source`/`ImportedBook`.
- **Different normalization.** Admin uses `title.strip().lower()`; the pipeline uses `normalize_title()` (accents/punctuation stripped). 286 canonical rows hold a lower()-style normalized title with punctuation, so the pipeline can't match them, and admin lookups can't match pipeline rows with punctuation. 4 normalized-title duplicate groups exist.
- **Authors/members by exact `ilike`.** New `Author` / `Member` rows get `normalized_name = name.lower()`, not `normalize_name_for_dedup()`, which creates duplicates.
- **Edit endpoint re-normalizes** (`PUT /admin/books/{id}`, line 1152) the same lower() way.
- **One-off scripts with hardcoded IDs** (`fix_meetup_45.py` uses literal UUIDs; `audit_meetup_45–48.py` are read-only and hardcode meetup numbers; `audit_meetup_48.py` also hardcodes 2 UUIDs). They can't be re-run after a re-import.

---

## 8. Books with no person, author, meetup or source

Association of each canonical book (author / meetup via discussion / person on a discussion / source via imported row):

| Author | Meetup | Person | Source | Books |
|---|---|---|---|---|
| ✓ | ✓ | ✗ | ✓ | 1140 |
| ✓ | ✓ | ✓ | ✓ | 653 |
| ✓ | ✗ | ✗ | ✓ | 467 |
| ✗ | ✓ | ✗ | ✓ | 212 |
| **✗** | **✗** | **✗** | ✓ | **158** |
| ✓ | ✓ | ✓ | ✗ | 66 |
| ✓ | ✓ | ✗ | ✗ | 37 |
| ✗ | ✓ | ✓ | ✓ | 2 |
| ✗ | ✓ | ✗ | ✗ | 1 |

Only **653 of 2736 (24%)** are fully associated.

**No meetup (625):**
- 457 come from sources with no meetup number (§3.1).
- 168 come from numbered meetups but have no discussion:
  - 112 *had* discussions until commit `a512472` (2026-10-01), which deleted junk discussions but left the junk canonical rows behind. Examples: `Vinay`, `Leah`, `Fantasy`, `nice`, `@ The Bookworm`, `VII. Padmaja`. Meetups affected: #9, 49, 54, 65, 70, 71, 73, 74, 75, 76, 80, 82, 83, 84, 85.
  - The rest hit the discussion cache-key bug (§5).

**No author (373):** 158 also have no meetup or person, so they are mostly junk. 212 are discussed books where the source gave no author.

**No person (2015):**
- All 32 meetups from #4 to #54 (the TXT archive plus #25) have zero member-linked discussions: the TXT records books per meetup, not per reader.
- `discussion_participants` has 0 rows. The person is stored on `discussions.member_id`, as one row per member.

---

## 9. Canonical-table history

| Commit | Date | Canonical | Change |
|---|---|---|---|
| `a7d3c52` | 09-12 | 2747 | first commit; 473 undiscussed |
| `427be12` | 09-20 | 2790 | +45 admin, −2 junk (`MEET #98`, `JULY 2026`) |
| `f8affe7` | 09-20 | 2835 | +45 (meetup #99 ingest) |
| `a512472` | 10-01 | 2736 | **−140, +41**; undiscussed 528 → 625 |

131 canonicals present at the first commit are gone now; they had 137 discussions and 145 linked imported rows. The deleted rows include space-stripped duplicates (`ThreeBodyProblem`, `ProjectHailMary`) and real titles (`Prisoners Of Geography`, `The Priory of the Orange Tree`, `Central Asia`, `The Master and Margarita (`). The script that did this cleanup is not in the repo.

---

## 10. Authors and members

- **Authors:**
  - 95 groups are identical after removing spaces and punctuation (`A.R. Torre` / `AR Torre`, `Arthur C Clarke` / `Arthur C. Clarke`, `Anuradha Roy` / `AnuradhaRoy`).
  - At least 81 near-duplicate pairs are misspellings (`Adrian Tchaikovsky` / `Tchiakovsky`, `Alex Michaelides` / `Michealides`, `Anthony Loewenstein` ×3 spellings).
  - 294 authors have no book.
  - Multi-author strings are stored as one author (`Aravind Narayanan, Sayash Kapoor`).
- **Members:**
  - 85 of 174 have no discussion.
  - `Books Mentioned` is a member (a parsed header).
  - Member names also appear as book titles (§4).
- **Aliases:** 1 row; the alias system is unused.

---

## 11. Meetups, venues, dates

- **Unused venue:** 4 venues exist, but `Art Studio, Koramangala` (seeded in `full_import.py:168`) has 0 meetups.
- **Missing venue:** 1 meetup has no venue.
- **Meetup with no books:** #25 has 0 discussions.
- **Fabricated day:** 10 meetups are dated on the 1st (§4).
- **Fixed in `70dba78`:** `missing_meetups` used to assume #1–#98.

---

## 12. Schema / integrity

- **Leftover tables:** `books` (0 rows) and `attachments` (0 rows) exist in the DB but not in `models.py`.
- **Migrations not in use:** `alembic_version` is empty and the alembic migration is empty, so the schema comes from `create_all`.
- **Dangling links:** 2 `imported_books.canonical_book_id` values point to deleted canonicals, because there are no FK constraints and no `ON DELETE` handling.
- **Duplicate discussion rows:** 11 groups (12 extra rows) share the same meetup + book + member, e.g. #86 `George and` ×2.
- **No uniqueness constraints** on `canonical_books.normalized_title`, on `(meetup_id, canonical_book_id, member_id)`, or on author/member `normalized_name`.

---

## 13. Effect on what users see

- **Footer:** shows `books_discussed` = 2111 since `903a107`. It still counts discussed junk, at least 12 rows (the `♫`/`✎` links, `∙ Notes on Grief`, `HP1`…), alongside the real short titles.
- **Closet and `/books`:** `GET /books` returns all 2736 canonicals with no filter, including the 625 undiscussed books and the junk titles. These render as spines in the 3D closet.
- **`Hero.tsx` and `data/archive.ts`:** unused, and still read `canonical_books`.

---

## 14. Fix order (proposed)

1. **Fix the merge bug** (`ib.canonical_book = keep`) and the discussion lookup (match by canonical id, not by the rebuilt author cache). Add a test that an imported row whose normalized title has a canonical is always linked.
2. **Assign meetup numbers to the unnumbered PDFs.**
   - Fix the `BBB #092` regex.
   - Add a filename-or-date → number map for #62, 63, 66, 67, 87–91. The INFERRED rows need your confirmation.
   - Drop the duplicate July 2025 file.
3. **Repair script, dry run first** (`scripts/repair_books.py`; the report goes to `reports/<date>/`, and nothing changes without `--apply` plus a DB backup):
   - **Automatic:**
     - Relink the 255 exact-title rows.
     - Create the 10 meetups once confirmed, with discussions from their imported rows.
     - Add an "admin entry" `Source` + `ImportedBook` for the 104.
     - Delete the 2 dangling refs and the 12 duplicate discussions.
   - **Needs review, per row:**
     - Junk titles (member names, headers, translator lines, glyph prefixes).
     - Space-stripped titles.
     - Author duplicate groups.
     - The 70 unmatched titles.
4. **Unify normalization.** Admin and scripts call `normalize_title()` / `normalize_name_for_dedup()`, then add unique indexes.
5. **Dates and classification.**
   - Store real meetup days from the PDF text.
   - Set `media_type` from the `(movie)` / `series` / `♫` / `✎` markers.
   - Stop hardcoding `language` and `extraction_confidence`.
6. **Never re-run `import-full --reset`** on the live DB. Make the pipeline incremental, or run it into a scratch DB and diff.

---

## How these were measured

Queries were run with `sqlite3` against `book_club_archivist.db`. History comes from the DB as committed at `a7d3c52`, `427be12`, `f8affe7` and `a512472` (`git show <commit>:book_club_archivist.db`). PDF facts come from `pdfplumber` text and `md5sum` of the root PDFs. The merge bug was reproduced with an in-memory SQLite DB, `app.database.models`, and the exact loop from `full_import.py:516–525`.
