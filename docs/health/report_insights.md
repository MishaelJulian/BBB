# Report Insights

**Date:** 2026-10-09
**Main:** `c2ba3a7` on `origin/main`
**Replaces:** `CURRENT_STATE.md` (last version recoverable with `git show c2ba3a7:docs/health/CURRENT_STATE.md`)

This file holds the measured state of the archive and the app, and turns the July import reports into actions that shape the architecture. Every number was measured on 2026-10-09 against `book_club_archivist.db` (read-only) or the code, unless a row says otherwise. Ratings that are judgment calls are marked as such. Main documents: [`../BBB_PRD_TRD.md`](../BBB_PRD_TRD.md) and [`../AGENT_RULES.md`](../AGENT_RULES.md). The July reports are kept as history in [`2026-07-22/`](2026-07-22/).

---

## Summary (2026-10-09)

**State:** 53 of 99 meetups recorded, 2,783 canonical books (2,133 discussed), 2,686 discussions. 32 tests pass in 3.23 s; none covers the import pipeline.

- **Cohesion (§10.1):** `main.py` is 2,215 lines with 40 functions mixing public reads, admin writes, uploads, PDF generation and enrichment. `FullArchivePipeline` has 15 methods over 9 phases, with merge next to simple record creation. 9 functions exceed 100 lines (`generate_meetup_pdf`: 367). Noise rules sit in 2 modules. Models and parsers each do one job.
- **Coupling (§10.2):** `models` I = 0.17 (5 dependents, correctly stable); `schemas.intermediate` I = 0 (stable contract); `full_import` I = 0.86 and `pdf_parser` I = 0.75 (free to change, fits their roles). The pipeline writes straight to canonical tables because the review step is skipped, so a parser mistake reaches the UI. The frontend depends on the API only.
- **Data quality (§10.3):** meetup completeness 53.5 %, venue completeness 100 %, imports linked 89.9 %, traceability 98.4 % (30 sources cut), 16 duplicate title groups, 0 of 218 merges reviewed.
- **Product quality (§10.4, judgment):** compatibility good; functional suitability, performance, maintainability and flexibility fair; reliability, security and keyboard access weak.
- **Security (§10.5):** integrity first (cut text, unreviewed merges, admin routes with no login), then availability (unguarded `reset_db`; uploads capped at 30 MB with no image check). PDFs as untrusted input are low risk while imports stay local.
- **Functional (§10.6):** 5 reader-facing functions blocked: each book once, full book history, every meetup, introducer by meetup, source tracing.
- **Non-functional (§10.7):** closet 2,151,353 B in 0.51 s; import speed not measured; reliability, recoverability and auditability weak until A1, A3, A7 and B8.
- **FMEA (§10.8):** top risks are wrong automatic merges (RPN 320), merges unlinking imports (252) and partial parsing of a new PDF layout (210), all in the pipeline. A7 lowers detection risk for all three, so it comes before A3.

---

## 1. Archive counts (live database)

| Entity | Count |
|---|---:|
| Meetups recorded | 53 of 99 held (highest number is #99) |
| Canonical books | 2,783 |
| Books discussed at least once | 2,133 |
| Imported book records | 3,637 |
| Imported book records linked to no canonical book | 369 |
| Discussions | 2,686 |
| Members | 174 |
| Authors | 2,199 |
| Venues | 4 |
| Resources | 542 |
| Sources | 1,829 |
| Aliases | 1 |
| Genres | 0 |
| Tables | 27, of which 15 are empty |

Empty tables: `books`, `attachments`, `alembic_version`, `publishers`, `series`, `genres`, `tags`, `validation_errors`, `recommendations`, `current_reads`, `book_relations`, `possible_duplicates`, `discussion_participants`, `book_mentions`, `quotes`.

`alembic_version` being empty means the database was never stamped by Alembic, although `alembic/versions/` holds an initial migration (`2026_07_22_0611-4b4cb3603d42_initial_schema.py`). See FMEA row 10 (§10.8).

Known data problems (duplicate and wrongly matched titles, unnumbered PDFs, unlinked imports) are detailed in [`../book_count&details_issues.md`](../book_count&details_issues.md). Its counts predate commit `6af556d` (Meetup #25 ingest).

## 2. Running pieces

| Piece | State | Last checked |
|---|---|---|
| Backend | FastAPI `app.api.main:app`, 33 route decorators (some paths have an `/api/` alias), port 8000. `GET /health` returns `{"status":"ok","database":"ok"}` | 2026-10-08 |
| Frontend | Next.js 15, `npm run build` exits 0, 11 routes | 2026-10-08 |
| Docker | `docker compose up` runs both; compose mounts only the database and `assets/`; healthcheck on `/health` | 2026-10-08 |
| CI | GitHub Actions: tests, CodeQL, dependency review; Dependabot grouped every 3 days | 2026-10-08 |
| Tests | `pytest`: 32 passed in 3.23 s (31 plus `test_upload_limit.py`) | 2026-10-09 |

Frontend routes: `/`, `/library` (redirects to `/library-room`), `/library-room`, `/books/[id]`, `/meetups`, `/meetups/[id]`, `/members`, `/members/[id]`, `/authors/[id]`, `/admin`. There is no `/timeline` or `/collections` route.

## 3. The Library Room today

- `/library-room` renders `CriterionBookCloset`, which draws its own spines and opens `CriterionDetailModal` on selection.
- It loads one request: `/books?limit=3000&only_discussed=true&exclude_general=true`, 2,018 books, 2,151,353 bytes, 0.51 s locally, uncompressed (measured 2026-10-08).
- Deep links: `?select=<book id>` opens one book, `?meetup=<number>` shelves one meetup.
- It draws one section at a time: 3 shelves of 120 books (360 books), with Prev/Next paging ("Shelves 1-3 of 18").
- Flow D (thin shelf, rich pull) is the decided replacement and is not built yet (PRD §9.2). Cost analysis: [`../architecture/flow_comparison.md`](../architecture/flow_comparison.md).
- Spines are mouse and touch only; they cannot be reached by keyboard (`CriterionBookCloset.tsx:106`).

**Components no longer reachable from any route** (10 files): `AlphabetNav.tsx`, `AmbientLighting.tsx`, `BookCover.tsx`, `ClosetPicksTray.tsx`, `HeroBookModal.tsx`, `ReadingTable.tsx`, `Shelf3D.tsx`, `Shelf.tsx` (nothing imports them), plus `Book3D.tsx` and `ShelfBay.tsx` (imported only by those). They stay in `frontend/src/components/library/` until the founders decide. Ideas worth keeping are in `docs/plans/backlog.md`.

## 4. Verification

| Check | Result | Date |
|---|---|---|
| `pytest` (32 tests) | Pass | 2026-10-09 |
| `tests/verify/verify_p0_suite.py` (10 database profiles) | Pass | 2026-10-08 |
| `tests/verify/verify_p2_pathways.py` (book, member, author, meetup links over the API) | Pass | 2026-10-08 |
| `tests/verify/verify_p3_bidirectional.py` (member, author, meetup to `/library-room?select=`) | Pass | 2026-10-08 |
| `npm run build` | Pass, 11 routes | 2026-10-08 |

**What these checks do not cover:** they confirm that real records come back, not that the records are correct (sample output shows known bad entries such as "Zeelam" by "Navin WeeraratBneook"). **No test touches the import pipeline** (`app/pipeline/full_import.py`): duplicate detection, linking and merging are untested.

---

## 5. The July reports

All reports in `2026-07-22/` were written on one day, 2026-07-22, mostly by the MiMo agent, during the first import sprints (1A to 1.6). They are snapshots, never updated, and the only record from before git. They stay as evidence (for example, the July snapshot counted 63 meetups while the first git database, 2026-09-12, already had 52).

| Report | Kind | What it recorded |
|---|---|---|
| `repository_analysis.md` | Discovery | File inventory, layout of `BBB Meetup-9.txt`, a guessed data model, risks |
| `schema_analysis.md` | Discovery | The old 20-table database and the proposed Sprint 1 schema |
| `validation_summary.md` | Acceptance | Sprint 1.5 checks, review queue counts, one book traced to its source |
| `archive_audit.md` | Audit | Sprint 1.6 audit: sources, meetups, gaps, venue problems |
| `archive_integrity_report.md` | Audit | Completeness, provenance and parser confidence for v1.0.0 |
| `duplicate_detection_report.md` | Investigation | Why duplicate detection found nothing |
| `meetup96_investigation.md` | Investigation | Why meetup #96 showed 4 books instead of 54 |
| `meetup_import_status.md` | Status | Which meetups came from which source; the gaps |

Two more July files, `archive_audit_report.md` (the Sprint 1C audit) and `audit_diff.md` (what Sprint 1.6 changed), are summarised in §6.1 and §7 so their numbers stay readable here.

---

## 6. Findings, then and now

| # | Finding (July) | Status today | Architecture impact |
|---|---|---|---|
| F1 | Duplicate detection ran after every imported book was linked, so it always found 0 candidates | **Order fixed:** phases 5 to 8 of `FullArchivePipeline` now resolve, detect, link, then merge. **Still open:** `possible_duplicates` holds 0 rows; 16 groups of canonical books (32 rows) still share a normalized title; 369 imported books are unlinked | The spec (`imperative_decisions.md` §2.A.5) puts a review step between candidate and canonical. The code merges automatically, so the Layer 2 to Layer 3 boundary exists on paper only |
| F2 | Headers such as "Books" became canonical books | **Fixed:** 0 such rows. Noise checks live in two places (`app/parsers/pdf_parser.py:276`, `app/pipeline/full_import.py:343`) | Two rule sets can drift apart |
| F3 | Meetup #96 had 4 books; the PDF holds 54 | **Fixed for #96:** 59 discussions (#97: 60, #98: 52) | Every new PDF layout has needed parser changes; OCR will add more |
| F4 | `raw_text` kept only the first 2,000 characters | **Still in code:** `[:2000]` at `pdf_parser.py:359` and `full_import.py:251`. 30 of 1,829 sources are exactly 2,000 characters long | Breaks the domain model's first rule: raw source text is kept whole (`domain_model.md`, Layer 1) |
| F5 | 11 PDFs have a date and no meetup number | **Still open:** 53 of 99 meetups recorded; the 11 wait on founder confirmation (`book_count&details_issues.md` §14) | `meetup_number` is the required meetup key, so date-only sources have nowhere to land |
| F6 | Filenames such as "SEP 24" and "BBB 97, June 2026" gave no meetup number | **Fixed** in Sprint 1.6 | None now; the remaining 11 are F5 |
| F7 | Venue gap (see §7) | **Fixed:** all 53 meetups have a venue; Art Studio, Koramangala is linked to #25 | None now |

### 6.1 Exact numbers from the July fix log (`audit_diff.md`)

These are the figures Sprint 1.6 reported. They are copied here so they survive without that file. They are July claims and were not re-measured.

| Fix | July numbers |
|---|---|
| Filename parsing (`app/parsers/scanner.py`) | Meetup number found in 19 of 31 PDF filenames (was 11 of 31): 2-digit years, comma separators, new patterns |
| Noise filtering | 46 noise entries excluded from canonical book creation |
| Canonical merge | 218 duplicate canonical books merged automatically (no review) |
| Canonical book count | 2,909 before, 2,658 after noise filtering and merging |
| Orphaned meetups | 8 meetups given records (#76, #80, #82, #83, #84, #86, #97, #98): 44 to 52 meetups |
| Review queue | 0 possible duplicates. The July explanation: all 3,352 non-noise imported books had exact matches, so fuzzy matching made 0 comparisons |
| Year statistics | 2025 showed 0 books in statistics because PDF-only meetups were not counted (a reporting issue) |

The review-queue explanation matters today: if every title matched exactly, the fuzzy path never ran, so it has never been exercised on real data. Combined with zero pipeline tests (§4), the fuzzy matcher is unverified code.

---

## 7. Venue analysis

| Venue | July, Sprint 1C (`archive_audit_report.md`) | July, Sprint 1.6 (`archive_audit.md` §4.3) | Today |
|---|---:|---:|---:|
| Bookworm | 20 | 20 | 29 |
| Atta Galatta | 19 | 19 | 19 |
| Online | 4 | 4 | 4 |
| Art Studio, Koramangala | 0 (seeded, unused) | 0 | 1 (#25) |
| **Meetups with a venue** | 43 | 43 of 44 (one had none) | **53 of 53** |

July problems and their state:

- **One meetup had no venue** (43 of 44). Today every recorded meetup has one.
- **Meetup #25 names "A Beautiful Art Studio in Koramangala"**, but the venue was unused. Today #25 is linked to Art Studio, Koramangala (commit `6af556d`).
- **`archive_statistics.json` listed only 3 venues**, missing the Art Studio. That file is referenced only by the report generator (`app/reports/generator.py`), not by the API or the frontend.

Open point: venue is a single link per meetup. A meetup held in two places, or a venue that changes name, has no representation. Nothing in the sources needs this yet (YAGNI).

---

## 8. Actions

| # | Action | Size | When |
|---|---|---|---|
| A1 | Remove the two `[:2000]` slices. SQLite `TEXT` has no practical length limit | 2 lines | Now |
| A2 | Re-read the 30 cut sources from `sources/` and store their full text | Data write: back up first (AGENT_RULES §5), founder approval | After A1 |
| A3 | Send fuzzy matches to `possible_duplicates` for review; keep automatic merge only for exact normalized-title matches | Pipeline change, controlled | Before the next full import |
| A4 | Resolve the 16 duplicate groups and 369 unlinked imports through that queue | Data work, founder review | With the tabled book repair |
| A5 | One noise rule list, used by parser and pipeline | Small refactor | Next time either file changes |
| A6 | Let a meetup exist with a date and no number yet, so the 11 PDFs can link | Schema decision, architectural | With the book repair (F5) |
| A7 | Add one test that runs the pipeline on a small fixture with a known duplicate, a near-duplicate and a noise title | One test file | Before A3 |
| B8 | Stamp the database with Alembic at the empty baseline revision `4b4cb3603d42` (its `upgrade()` is `pass`; the schema comes from `create_all`) | One command, after a backup | Before the next schema change, and before A6 |

---

## 9. Effects on the app

### 9.1 Short run (next weeks)

- **Visible data is wrong in places.** Duplicate books can show as two spines; unlinked imports are missing from book histories; meetups without numbers are missing from the closet's meetup filter.
- **The 30 cut sources** do not show in the UI, but any re-parse from stored text loses the tail. A1 stops further loss.
- **A re-import is risky.** Automatic merging, an untested pipeline and the known unlinking bug mean a fresh import can change counts unreviewed (commit `a512472` dropped canonical books from 2,835 to 2,736).

### 9.2 Long run (OCR, more formats, statistics)

- **OCR multiplies F3 and F4.** Noisier text means more near-duplicates and more need for whole raw text. Without A1, A3 and A7, errors enter the canonical layer silently.
- **Statistics inherit duplicate errors.** Counts per book, member and meetup (bibliometrics in `flow_comparison.md` §6.2) are only as good as the duplicate resolution under them.
- **Identity first.** Book identity (backlog R1, FRBR) and meetup identity (A6) set the keys every later feature joins on. Changing keys later costs far more.
- **15 empty tables** describe features that do not exist yet (recommendations, quotes, mentions, tags). They cost nothing at rest but suggest capabilities the app does not have; anyone reading the schema should check §1 first.

---

## 10. Quality metrics

### 10.1 Cohesion (does each part do one job?)

Measured with Python's `ast` module over `app/` (27 files, 5,991 lines).

| Module | Lines | Functions | Longest function | Note |
|---|---:|---:|---|---|
| `app/api/main.py` | 2,215 | 40 | `update_admin_book`, 147 lines | Every route in one file |
| `app/database/models.py` | 628 | 0 | n/a | Data definitions only: cohesive |
| `app/pipeline/full_import.py` | 588 | 16 | `run`, 83 lines | `FullArchivePipeline` has 15 methods covering 9 phases |
| `app/services/pdf_generator.py` | 518 | 7 | `generate_meetup_pdf`, **367 lines** | Longest function in the codebase |
| `app/parsers/pdf_parser.py` | 446 | 5 | `parse`, 127 lines | |
| `app/reports/generator.py` | 384 | 8 | `_archive_summary`, 80 lines | |
| `app/parsers/txt_parser.py` | 362 | 5 | `_parse_meetup_section`, 139 lines | |
| `app/parsers/scanner.py` | 200 | 4 | `parse_filename_metadata`, 140 lines | One function holds most of the file |

Reading the table:

- **Functional cohesion** (one module, one job) holds for `models.py`, `schemas/intermediate.py` and the parsers.
- **Sequential cohesion** (steps that feed each other) describes `FullArchivePipeline`: acceptable in itself, but the riskiest step (merge) sits next to simple record creation and has no test of its own.
- **Coincidental cohesion** (unrelated things together) is the risk in `main.py`: public reads, admin writes, uploads, PDF generation and Goodreads enrichment share one file.
- **Long functions** (over 100 lines: 9 of them, 4 in `main.py`) are where defects hide; `generate_meetup_pdf` at 367 lines is the first candidate to split when it next changes.

LCOM (lack of cohesion of methods) was not computed; the table above gives the same signal with less machinery.

### 10.2 Coupling (how far does a change ripple?)

Afferent coupling **Ca** = how many `app` modules import this one. Efferent coupling **Ce** = how many `app` modules this one imports. Instability **I = Ce / (Ca + Ce)**: 0 means many depend on it and it depends on little (stable, so changes ripple far); 1 means the reverse (free to change).

| Module | Ca | Ce | I | Reading |
|---|---:|---:|---:|---|
| `app.database.models` | 5 | 1 | 0.17 | Stable core: a column change ripples to 5 modules. Correct place for stability |
| `app.schemas.intermediate` | 4 | 0 | 0.00 | Stable contract between parsers and pipeline: good |
| `app.core.config` | 4 | n/a | low | Stable, as configuration should be |
| `app.parsers.scanner` | 2 | 0 | 0.00 | Stable leaf |
| `app.parsers.pdf_parser` | 1 | 3 | 0.75 | Changes freely; matches its role (layouts change) |
| `app.pipeline.full_import` | 1 | 6 | 0.86 | Depends on most of the app; nothing depends on it but the CLI |
| `app.api.main` | 0 | 5 | 1.00 | Top of the tree: free to change, as an entry point should be |
| `app.cli.main` | 0 | 7 | 1.00 | Same |

Beyond the numbers:

- **Data coupling across the API boundary is low.** The frontend never reads the database; one client (`lib/api.ts`) talks to one contract (PRD §7.0).
- **Content coupling inside the pipeline is high.** It writes straight into canonical tables with the review step skipped, so a parser mistake flows to the UI.
- **Parsers are coupled to PDF layouts.** Unavoidable; keep it inside the parsers (I = 0.75 says they are free to change without rippling).
- **Rule duplication** (noise checks in two modules) is hidden coupling: the two must change together but nothing enforces it.

### 10.3 Data quality (ISO/IEC 25012)

The archive is the product, so its data quality is measured on its own. ISO/IEC 25012 defines these characteristics; the values are measured.

| Characteristic | Measure | Value |
|---|---|---|
| Completeness (meetups) | Meetups recorded / meetups held | 53 / 99 = 53.5 % |
| Completeness (venues) | Meetups with a venue / meetups recorded | 53 / 53 = 100 % |
| Completeness (linking) | Imported books linked / imported books | 3,268 / 3,637 = 89.9 % |
| Consistency | Canonical normalized titles shared by more than one book | 16 groups (32 books) |
| Traceability | Sources with whole raw text / sources | 1,799 / 1,829 = 98.4 % |
| Accuracy | Known wrong author or title pairings | Present, not counted (examples in §4) |
| Credibility | Merges reviewed by a person / merges made | 0 / 218 in July (§6.1) |
| Currentness | Highest meetup recorded / highest held | #99 / #99 |

### 10.4 Product quality (ISO/IEC 25010)

| Characteristic | Evidence | Rating (judgment) |
|---|---|---|
| Functional suitability | 5 reader-facing functions blocked (§10.6) | Fair |
| Performance efficiency | 2,151,353 B first load in 0.51 s locally; no gzip | Fair now, weak on slow mobile links |
| Compatibility | Frontend uses the API only; Docker runs both | Good |
| Interaction capability (usability) | Spines not keyboard-reachable | Weak for keyboard users |
| Reliability | Re-imports can change counts unreviewed; pipeline untested | Weak |
| Security | Admin routes open, uploads capped at 30 MB with no image check, destructive reset unguarded, database in a public repository (§10.5, `security_analysis.md`) | Weak, mitigated by local use |
| Maintainability | 2,215-line API file, 9 functions over 100 lines, 0 pipeline tests | Fair |
| Flexibility (portability) | SQLAlchemy allows PostgreSQL by connection string; Alembic unstamped | Fair |

### 10.5 Security (confidentiality, integrity, availability)

| Area | Risk | State |
|---|---|---|
| Integrity | Truncated raw text (F4) | 30 sources affected |
| Integrity | Unreviewed automatic merges (F1) | 218 merges in July, 0 reviewed |
| Integrity | Admin routes have no login (P12) | Can write photos, books, PDFs; reachable on the local network |
| Availability | `reset_db()` and `import-full --reset` drop all tables with no backup or confirmation (API backlog A8) | One wrong command loses the archive |
| Availability | Uploads capped at 30 MB since 2026-10-09 (P11); content is not checked to be an image | Junk files can still be stored under `/assets` |
| Untrusted input | PDFs parsed by third-party libraries | Low exposure while imports run locally from the CLI |
| Confidentiality | Member names are public by design; no credentials stored | No current issue |

### 10.6 Functional performance (does it do the right thing?)

| Function | Today | Blocked by |
|---|---|---|
| Show every discussed book once | 16 duplicate groups can appear twice | A3, A4 |
| Show a book's full history | 369 imports unlinked | A4 |
| Show every meetup | 53 of 99; 11 PDFs unplaced | A6, F5 |
| Show who introduced a book at which meetup | API lists members and meetups separately | Flow D task D2 |
| Trace any record back to its source text | 30 sources cut | A1, A2 |

### 10.7 Non-functional performance (how well does it do it?)

| Attribute | State | Note |
|---|---|---|
| Import speed | Not measured | Fuzzy matching grows with new titles times canonical titles; blocking (`flow_comparison.md` §6.1) if a timed import shows a need |
| Closet speed | 2,151,353 B, 0.51 s locally | Gzip, then Flow D (`flow_comparison.md` §5) |
| Test speed | 32 tests in 3.23 s | Fast; coverage of the pipeline is the gap |
| Reliability | Unreviewed re-imports | A3, A7 |
| Recoverability | Manual backups only | API backlog A8 (guard `reset_db`), AGENT_RULES §5, §14.1 |
| Auditability | 98.4 % of sources whole | A1, A2 |
| Maintainability | See §10.1 | Split merge logic and long functions when they next change |

### 10.8 FMEA (failure mode and effects analysis)

Each row is a way the system can fail. **S** = severity of the effect, **O** = how likely it is to occur, **D** = how hard it is to detect before a reader sees it; each from 1 (best) to 10 (worst). **RPN** (risk priority number) = S × O × D, from 1 to 1,000; higher means fix sooner. **The S, O and D ratings are judgment calls**; the evidence column is measured.

Scales used: S 10 = archive lost, 7 to 8 = wrong history shown, 4 to 6 = incomplete data, 1 to 3 = cosmetic. O 8 to 10 = happens on most imports, 4 to 7 = has happened, 1 to 3 = possible. D 8 to 10 = no check would catch it, 4 to 7 = caught by manual review or counts, 1 to 3 = obvious at once.

| # | Failure mode | Effect | Cause | Evidence | S | O | D | RPN | Action |
|---|---|---|---|---|---:|---:|---:|---:|---|
| 1 | Two different books merged into one | Wrong history on the card; a book disappears | Fuzzy auto-merge, no review | 218 merges unreviewed; fuzzy path never exercised; 0 pipeline tests | 8 | 5 | 8 | **320** | A3, A7 |
| 2 | Imported rows unlinked by a merge | Book histories lose entries | Known merge bug | 369 unlinked now; bug documented in `book_count&details_issues.md` | 7 | 6 | 6 | **252** | A4, A7 |
| 3 | New PDF layout parsed partly | Meetup shows a fraction of its books | Layout-specific parser | #96 showed 4 of 54 in July | 7 | 6 | 5 | **210** | A7; per-meetup count check after import |
| 4 | Name edits overwrite authors and members | Old forms lost; re-imports stop matching | No authority control | 218 author names changed in `6af556d`; `aliases` holds 1 row | 6 | 5 | 6 | **180** | Use `aliases` (`flow_comparison.md` §6.2 item 5) |
| 5 | Raw source text cut | Provenance incomplete; re-parse loses books | `[:2000]` slice | 30 of 1,829 sources | 6 | 4 | 7 | **168** | A1, A2 |
| 6 | Admin route used by someone unintended | Archive data changed | No login | Reachable on the local network | 8 | 3 | 7 | **168** | P12 |
| 7 | Migration run against an unstamped database | Schema change fails or duplicates tables | `alembic_version` empty | Measured: 0 rows | 7 | 4 | 5 | **140** | B8 |
| 8 | Unnumbered PDF never placed | Meetup missing from the archive | `meetup_number` required | 11 PDFs | 6 | 5 | 3 | **90** | A6 |
| 9 | Whole archive dropped | Total loss | `reset_db` / `--reset` with no guard | Code path exists | 10 | 2 | 3 | **60** | API backlog A8; backups |
| 10 | Noise title becomes a book | Junk spine | Rule drift between two modules | 0 today | 4 | 3 | 4 | **48** | A5 |
| 11 | Oversized upload | Server slows or fails | No size limit | Code path exists | 5 | 2 | 4 | **40** | P11 |
| 12 | Closet slow on mobile | First shelf delayed | 2.15 MB uncompressed | Measured locally only | 4 | 3 | 3 | **36** | Gzip, Flow D |
| 13 | Unauthorised data change or deletion through the API | Meetup, book or discussion data edited or deleted by someone on the LAN | No login on write routes (P12) plus the LAN-wide CORS regex | `security_analysis.md` F3; every write route has auth none | 8 | 4 | 8 | **256** | CORS rule + login (scheduled) |
| 14 | Server fetches an internal URL during PDF generation | Internal service probed; internal image copied into `assets/cache` and served | `cover_url` accepts any URL; no guard in `download_and_cache_image` | `security_analysis.md` F1 | 6 | 3 | 8 | **144** | F1 fix (scheduled) |
| 15 | Database with member data published | Personal data exposed | DB tracked in git; repository verified public | `security_analysis.md` F8 | 7 | 3 | 6 | **126** | Founder decision |
| 16 | Process compromise has root in the container | Writes to mounted DB and assets | No `USER` in Dockerfile | `security_analysis.md` F6 | 7 | 2 | 8 | **112** | F6 fix (scheduled) |
| 17 | Large or non-image upload | Memory or disk strained; junk served from `/assets` | No content check; size now capped at 30 MB (2026-10-09) | `security_analysis.md` F4; was 5 × 3 × 7 = 105 before the cap | 5 | 2 | 7 | **70** | Pillow `verify()` (open) |
| 18 | Raw error text shown to clients | Paths or SQL fragments leak | `detail=str(e)` on 8 routes | `security_analysis.md` F5 | 3 | 5 | 6 | **90** | F5 fix (scheduled) |
| 19 | Stored `javascript:` or other non-http link clicked | Script runs in the viewer's browser | No scheme check on stored URLs | `security_analysis.md` F2 | 6 | 2 | 7 | **84** | F2 fix (scheduled) |
| 20 | CI token used with write rights | Repo changed through a compromised workflow step | `ci.yml` without `permissions:` | `security_analysis.md` F14 | 5 | 2 | 6 | **60** | Add `permissions: contents: read` |
| 21 | Archive history wiped through open admin routes after public launch | All discussions deleted | `GET /admin/meetups` lists discussion IDs; `DELETE /admin/discussions/{id}` is open | `security_analysis.md` E1 | 10 | 3 | 7 | **210** | Login (P12) covering `/admin/*` and `/api/*` aliases |
| 22 | Public synopsis requests trigger mass outbound fetches | Goodreads or Apple block the server; API threads held | Fetch on every public read; 2,651 of 2,783 books qualify; failures not remembered | `security_analysis.md` E5 | 4 | 5 | 6 | **120** | Enrich from admin or a job only, or remember failed tries |
| 23 | Unbounded `GET /books` flood | API slow or down for everyone | No maximum `limit`, no gzip, one process | `security_analysis.md` E6 | 5 | 4 | 4 | **80** | Cap `limit`, gzip, proxy rate limit |
| 24 | Server errors leave no trace | Failures cannot be diagnosed after the fact | No logging in the API; `loguru` installed, 0 logger calls | `pattern_review_analysis.md` B6 | 5 | 6 | 7 | **210** | `logger.exception` in every `except Exception` |
| 25 | Detail modal gives no dialog announcement or focus return | Screen-reader and keyboard users lose their place | No `role="dialog"`, no focus handling | `pattern_review_analysis.md` R3 | 6 | 6 | 5 | **180** | Dialog role, focus on open and return on close |
| 26 | Meetup list floods the database with queries | `/meetups` takes 7.02 s (6,278 queries); repeated calls stall the API | N+1 in `meetup_to_dict` and `get_admin_meetups` | `pattern_review_analysis.md` B1 | 6 | 6 | 5 | **180** | Batch queries like `batch_books_to_dict` |
| 27 | Keyboard user cannot open a book | Library Room unusable without a mouse | Spines and list cards are `div onClick` without `tabIndex` | `pattern_review_analysis.md` R1, R2 | 7 | 6 | 4 | **168** | Button semantics and key handlers |
| 28 | Lint rules not enforced | Hook and accessibility bugs reach main unnoticed | No ESLint config in `frontend/` | `pattern_review_analysis.md` R9 | 5 | 6 | 5 | **150** | `eslint.config.mjs` with `next/core-web-vitals` (founder install) |
| 29 | Books fetch fails and the closet looks empty | Readers think the library is empty | Error swallowed, no error state | `pattern_review_analysis.md` R5 | 6 | 4 | 6 | **144** | Render `ErrorState` with retry |
| 30 | Admin write sent twice | Duplicate add or delete on an error status | `apiFetch` retries through a second URL when `!res.ok` | `pattern_review_analysis.md` R10 | 6 | 3 | 6 | **108** | Fall back on network errors only |
| 31 | Browser shortcut hijacked | Ctrl+R picks a random book; reload, find, save blocked | Keydown handler ignores modifier keys | `pattern_review_analysis.md` R4 | 5 | 7 | 3 | **105** | Return early on Ctrl, Cmd, Alt |
| 32 | Client error reported as server error | Admin sees 500 for a missing record; client retries the write | `except Exception` swallows `HTTPException` in 5 routes | `pattern_review_analysis.md` B2 | 4 | 5 | 5 | **100** | `except HTTPException: raise` first |
| 33 | Bulk enrichment request times out halfway | Some books enriched, some not; unclear state | Sequential outbound fetches inside the request | `pattern_review_analysis.md` B5 | 4 | 4 | 6 | **96** | `BackgroundTasks` or a CLI command |
| 34 | "Synced" toast on a failed sync | False confirmation | Dead `catch`; `loadBooks` never throws | `pattern_review_analysis.md` R6 | 4 | 4 | 6 | **96** | Rethrow on silent loads; count from the result |
| 35 | Worker threads exhausted by slow outbound calls | Whole API stalls, `/health` included | Sync routes fetch Goodreads, Apple and arbitrary URLs with 8 s timeouts | `pattern_review_analysis.md` P4 | 6 | 3 | 7 | **126** | Fix E5 and B5; short timeouts |
| 36 | Frontend and API contract drift unnoticed | Pages break or show wrong fields after a backend change | No response models; hand-written client types | `pattern_review_analysis.md` P1 | 5 | 5 | 5 | **125** | Pydantic response models (build phase) |
| 37 | Upload blocks the event loop | All requests pause during a large upload | Blocking calls inside `async def upload_meetup_photo` | `pattern_review_analysis.md` P3 | 5 | 3 | 6 | **90** | Make the route a plain `def` |

The top three rows all sit in the import pipeline. A7 (one fixture test) lowers D for rows 1 to 3 at once, which is why it comes before A3. Rows 13 to 20 come from the security review and rows 21 to 23 from the exploitability review (`security_analysis.md`, merged 2026-10-09). Row 13 (RPN 256) ranks second overall, level with the import pipeline risks; row 21 (RPN 210) is the public-launch form of row 13. Rows 24 to 37 come from the pattern reviews (`pattern_review_analysis.md`: React, backend and FastAPI, merged 2026-10-09).

---

## 11. Order of work

1. **A1** now: two lines, stops further provenance loss.
2. **A7** then **A3** before any new full import: a test first, then the review queue in place of fuzzy auto-merge.
3. **B8** before the next schema change (A6 needs it).
4. **A2, A4, A6** together with the tabled book repair, once the founders confirm the inferred meetup numbers.
5. **A5** and the cohesion splits (§10.1) before OCR work begins.

## 12. Rules that still apply

- Do not invent reader names, meetup dates or discussion relationships.
- CSS 3D with Framer Motion stays the default. Three.js (WebGL) is a future option for the closet only, after the admission rule in PRD §7.1 (PRD §18.1).
- Continue and extend; do not restart.
- Refresh the Summary and §1 to §4 when the numbers change, give the date, and add a row to §13.

---

## 13. Measurement log

One row per measurement run, newest last. Never edit old rows; they are the history. Add a row after any import, data repair, test change or release.

| Date | Commit | Meetups | Canonical | Discussed | Imported | Unlinked | Discussions | Dup groups | Cut sources | Aliases | Tests | Closet bytes | Note |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|---|
| 2026-10-08 | `6fe8370` | 53 | 2,783 | 2,133 | 3,637 | n/m | 2,686 | n/m | n/m | n/m | 31 pass; verify p0, p2, p3 pass; build 11 routes | 2,151,353 | From `CURRENT_STATE.md` |
| 2026-10-09 | `c2ba3a7` | 53 | 2,783 | 2,133 | 3,637 | 369 | 2,686 | 16 | 30 | 1 | 31 pass (1.47 s) | not re-measured | Baseline for A1 to A7 and B8 |
| 2026-10-09 | `c2ba3a7` + upload cap | 53 | 2,783 | 2,133 | 3,637 | 369 | 2,686 | 16 | 30 | 1 | 32 pass (3.23 s) | not re-measured | 30 MB upload cap; security review rows merged into §10.8 |
| 2026-10-09 | `2621ad6` | n/m | n/m | n/m | n/m | n/m | n/m | n/m | n/m | n/m | 32 pass (2.16 s); verify p0, p2, p3 pass; tsc 0 errors; build 11 routes (73 s); flake8 errors-only 0 | 2,151,353 (1.32 s over HTTP) | Quality gate; `GET /meetups` 6.99 s over HTTP; DB counts unchanged since the baseline |

n/m = not measured that day.

### How to measure

Database counts (read-only):

```bash
python3 - <<'PY'
import sqlite3
c = sqlite3.connect("file:book_club_archivist.db?mode=ro", uri=True)
q = lambda s: c.execute(s).fetchone()[0]
print("meetups", q("select count(*) from meetups"))
print("canonical", q("select count(*) from canonical_books"))
print("discussed", q("select count(distinct canonical_book_id) from discussions where canonical_book_id is not null"))
print("imported", q("select count(*) from imported_books"))
print("unlinked", q("select count(*) from imported_books where canonical_book_id is null"))
print("discussions", q("select count(*) from discussions"))
print("dup_groups", q("select count(*) from (select 1 from canonical_books group by lower(trim(normalized_title)) having count(*) > 1)"))
print("cut_sources", q("select count(*) from sources where length(raw_text) = 2000"))
print("aliases", q("select count(*) from aliases"))
PY
```

Tests: `uv run --no-project --with-requirements requirements.txt --with pytest python -m pytest -q`

Closet bytes (API running on port 8000): `curl -s "http://localhost:8000/books?limit=3000&only_discussed=true&exclude_general=true" | wc -c`

After A1 ships, "cut sources" should stop growing; after A2 it should read 0.

---

## 14. Actionable insights based on aforementioned test data

This section turns the measurements in §1 to §13 into procedures. Each task lists the evidence behind it, the steps, how to verify, what can go wrong and how to respond, other ways to reach the same goal, and how much archive data it puts at risk. Task IDs match §8; B8 was A8 before 2026-10-09 (renamed to avoid a clash with API backlog A8, the `reset_db` guard).

### 14.0 Shared safety procedure

Every task that writes to `book_club_archivist.db` follows these steps. They extend AGENT_RULES §5.3.

1. **Stop other writers.** The admin routes can write while you work: `docker compose stop` (or stop the local `uvicorn`).
2. **Back up with SQLite's backup API.** The database runs in WAL mode (measured: `journal_mode = wal`), so recent commits may sit in `book_club_archivist.db-wal` instead of the main file. A plain `cp` of the main file alone can miss them. The backup API copies a consistent whole:
   ```bash
   mkdir -p ~/bbb_backups
   python3 -c "import sqlite3,datetime as d; s=sqlite3.connect('book_club_archivist.db'); t=sqlite3.connect(d.datetime.now().strftime('$HOME/bbb_backups/bbb_%Y%m%d_%H%M%S.db')); s.backup(t); t.close(); print('ok')"
   ```
   Backups live outside the repository (8.3 MB each today).
3. **Check the backup.** Open it read-only and run `pragma integrity_check` (must print `ok`) and the §13 count block against it. The counts must equal the live file's.
4. **Record the baseline.** Save the §13 count output before the change.
5. **Dry run on a copy.** Run the change against a copy of the backup first and report the count differences per table.
6. **Apply, then verify.** Run the §13 block again; every difference must be one the dry run predicted. Re-check the affected API routes.
7. **Log.** Add a §13 row and a `SESSION_LOG.md` entry.

### 14.1 If data is lost during an operation

**Recovery objectives.** RPO (how much work can be lost) = everything since the last backup or the last commit that included the database. RTO (time to restore) = minutes, since the file is 8.3 MB. Taking a backup before every write (§14.0) keeps RPO near zero.

1. **Stop.** Stop the API and any script. Do not run further commands against the file.
2. **Keep the WAL files.** Do not delete `book_club_archivist.db-wal` or `-shm`; they may hold committed data. Copy all three files aside together (`cp book_club_archivist.db* ~/bbb_backups/damaged_$(date +%Y%m%d_%H%M%S)/`).
3. **Measure the damage.** Run `pragma integrity_check` and the §13 count block. Compare with the last §13 row and the pre-operation backup output.
4. **Restore, choosing the first option that applies:**

   | Option | When | How | What is lost |
   |---|---|---|---|
   | a. Nothing to restore | The failing step raised an error inside a transaction, so SQLite rolled it back | Counts equal the baseline | Nothing |
   | b. Pre-operation backup | A backup from §14.0 exists | Copy the backup over `book_club_archivist.db` with the API stopped; remove the old `-wal`/`-shm` only after the copy-aside in step 2 | Nothing since the backup |
   | c. Last git commit | No fresh backup | `git show HEAD:book_club_archivist.db > restored.db`, check it, then move it into place | Every change since that commit |
   | d. Rebuild from sources | No usable copy | Import `sources/` into a **scratch** database (never `--reset` on the live file) and compare | Every manual edit ever made (for example `6af556d`); last resort |
   | e. July snapshots | Evidence only | `docs/health/2026-07-22/` | Not a restore; use to check meetup-level facts |

5. **Reconcile.** Re-apply manual edits made after the restored point, using `SESSION_LOG.md` and `git log`.
6. **Record.** Add a §13 row with a note, a `SESSION_LOG.md` entry with the cause, and a new FMEA row (§10.8) if the failure mode is new.

### 14.2 Task procedures

#### A1: Keep raw source text whole

- **Evidence:** 30 of 1,829 sources are exactly 2,000 characters (§13); slices at `app/parsers/pdf_parser.py:359` and `app/pipeline/full_import.py:251`. The column is already `Text` with no length limit (`app/database/models.py:52`).
- **Procedure:** delete `[:2000]` in both places. Search the parsers for any other slice of raw text.
- **Verify:** `pytest` passes; parse the meetup #96 PDF into a scratch database and check its stored `raw_text` is longer than 2,000 characters.
- **Failure management:** if a future PostgreSQL column were declared with a length, long text would fail to insert; keep the column `Text`. Rollback is reverting the commit.
- **Alternatives:** store the full text in a file under `assets/` with its path and a SHA-256 hash in the row; or keep the slice but store the full length and hash so a cut is detectable. Both are weaker than keeping the text.
- **Data at risk:** none. Code only; existing rows are fixed by A2.

#### A7: One test for the import pipeline

- **Evidence:** 32 tests, 0 touch `app/pipeline/full_import.py` (§4); FMEA rows 1 to 3 all sit there.
- **Procedure:** add `tests/test_pipeline_dedup.py` using the in-memory database from `tests/conftest.py`. Feed a small fixture: an exact duplicate ("Sapiens" twice), a near duplicate ("Skin in the Game" and "Skin in the game."), and a noise title ("Books"). Assert: one canonical book for the exact pair, the near pair handled as the pipeline currently does (documenting today's behaviour), the noise title excluded, every non-noise imported book linked.
- **Verify:** the test fails if `_detect_duplicates` runs after linking again (temporarily swap the two calls to see it fail, then restore).
- **Failure management:** if the pipeline cannot run without real files, write a tiny text fixture in `tmp_path`, or test the phase methods directly.
- **Alternatives:** a snapshot test that imports all of `sources/` into a scratch database and compares counts with the §13 baseline. It catches more regressions but is slower and breaks on every legitimate data change.
- **Data at risk:** none (in-memory database).

#### A3: Review queue in place of fuzzy auto-merge

- **Evidence:** `possible_duplicates` holds 0 rows; 218 merges in July with none reviewed (§6.1); the fuzzy path has never run on real data.
- **Procedure:** in `_detect_duplicates`, link exact normalized-title matches as today; for fuzzy matches at or above the threshold, insert a `possible_duplicates` row and leave the book unlinked. Limit `_merge_canonical_duplicates` to exact groups. Add a CLI command to list, approve (merge) and reject queue rows. Update A7's assertion for the near pair to expect a queue row.
- **Verify:** A7 passes; an import of `sources/` into a scratch database fills the queue and leaves the live file untouched.
- **Failure management:** if the queue floods (hundreds of rows), raise the threshold or add fingerprint blocking (`flow_comparison.md` §6.1) as an exact-enough tier. If a reviewer approves a wrong merge, the merge log (below) undoes it.
- **Alternatives:** (1) three tiers: auto-merge at 0.95 and above, queue from 0.85 to 0.95, ignore below; (2) keep auto-merge but write every merge to a log of before and after IDs so it can be undone; (3) fingerprint key collision as the only automatic tier.
- **Data at risk:** none on the live file; imports run into a scratch database first.

#### B8: Stamp the Alembic baseline

- **Evidence:** `alembic_version` has 0 rows; the only migration, `4b4cb3603d42`, has an empty `upgrade()`, so it is a baseline, and the schema comes from `Base.metadata.create_all`. `alembic/env.py` reads the URL from `settings.DATABASE_URL`, so an environment variable can point it elsewhere. AGENT_RULES §5.4 still says the migration folder is empty; update that line.
- **Procedure:** back up (§14.0). Run `alembic current` and confirm it names `book_club_archivist.db` and shows no revision. Run `alembic stamp 4b4cb3603d42`. Then run `alembic check` to list any differences between the models and the database, and record them.
- **Verify:** `alembic current` shows `4b4cb3603d42`; `alembic_version` has 1 row; §13 counts unchanged.
- **Failure management:** if the wrong file was stamped, delete its single `alembic_version` row. If `alembic check` reports drift, write it down and resolve it with the first real migration (A6), never by hand edits.
- **Alternatives:** (1) leave it unstamped and keep the hand checklist (AGENT_RULES §5.4); every schema change then stays manual; (2) replace the empty baseline with an autogenerated full migration against an empty database, then stamp. More work, and it would not change the live schema.
- **Data at risk:** one row in one table.

#### A2: Restore the 30 cut sources

- **Depends on:** A1.
- **Procedure:** back up (§14.0). List the 30 rows (`length(raw_text) = 2000`) with `file_path` and page. Re-extract each text with the fixed parser into a scratch copy. **Prefix check:** the first 2,000 characters of the new text must equal the stored text exactly; that proves it is the same source. Dry-run report, founder approval, then update only the rows that pass.
- **Verify:** `cut_sources` in §13 reads 0; all other counts unchanged.
- **Failure management:** prefix mismatch (the parser changed since July) or a missing file: skip that row and list it for manual review; never overwrite on a mismatch.
- **Alternatives:** add a new column `raw_text_full` and leave the original untouched (append-only, safest, costs a schema change via B8); or store only the file path, page and hash and re-read on demand.
- **Data at risk:** 30 rows; text is only extended. Restore option b if anything looks wrong.

#### A6: Meetups with a date and no number

- **Evidence:** 11 PDFs carry a date and no number; `Meetup.meetup_number` is required (`app/database/models.py:323`); 53 of 99 meetups recorded.
- **Decision (founders), options:** (a) make `meetup_number` nullable, keep it unique when present (a partial unique index), and require `date` when it is missing; (b) keep the column required and attach the 11 PDFs' books to their `Source` only until a number is confirmed; (c) confirm the inferred numbers (`book_count&details_issues.md` §14) so nothing changes in the schema. (c) is the least work if the founders can confirm them.
- **Procedure for (a):** after B8, write an Alembic migration; search the API and frontend for code that assumes a number (sorting, closet meetup filter, URLs `/meetups/[id]`) and handle the missing case.
- **Failure management:** a page that crashes on a missing number shows up in `npm run build` and the verify scripts; roll back with the migration's `downgrade()` and the backup.
- **Data at risk:** a schema change on the table every other table joins to; back up first.

#### A4: Clear duplicates and unlinked imports

- **Depends on:** A3, A6, founder confirmation of inferred meetup numbers.
- **Evidence:** 16 duplicate groups (32 books), 369 unlinked imports.
- **Procedure:** load the 16 groups and candidate matches for the 369 into the review queue. Founders review in small batches (for example 25 rows). Apply each approved batch with the merge log from A3. Run §13 after every batch.
- **Verify:** `dup_groups` and `unlinked` fall by exactly the approved amounts; spot-check 5 merged books in the closet.
- **Failure management:** a wrong merge is undone from the merge log; a bad batch is undone by restoring that batch's backup (one backup per batch).
- **Alternatives:** (1) merge the 16 exact groups first and leave the 369 for later; (2) hide duplicates at query time (group by normalized title in the API) without changing data. Fully reversible, but the database stays inconsistent.
- **Data at risk:** highest of all tasks: a mass update, which needs explicit founder approval (AGENT_RULES §5.1).

#### A5: One noise rule list

- **Evidence:** `NOISE_PATTERNS` exists separately in `app/parsers/pdf_parser.py` (line filter) and `app/pipeline/full_import.py` (`_is_noise_title`).
- **Procedure:** compare the two pattern lists first. Move one shared `is_noise_title()` into `app/parsers/utils.py` (already imported by 3 modules) and call it from both. Extend A7 with each pattern.
- **Verify:** A7 passes; a scratch import gives the same counts as before.
- **Failure management:** if the lists differ, merging them changes which lines are skipped; decide the union or intersection explicitly and check the scratch import diff.
- **Alternatives:** keep both lists and add a test that both reject the same sample titles.
- **Data at risk:** none (code only).

### 14.3 Expected risk after each task

Re-score the FMEA (§10.8) after each task; the expected values below are judgment and must be confirmed against new measurements.

| FMEA row | Now (S × O × D) | After | Expected |
|---|---|---|---|
| 1. Two books merged into one | 8 × 5 × 8 = 320 | A7 (D 8 to 4) | 160 |
| | | A7 + A3 (O 5 to 2) | 64 |
| 2. Imports unlinked by a merge | 7 × 6 × 6 = 252 | A7 + A3 + A4 | about 7 × 2 × 4 = 56 |
| 3. New layout parsed partly | 7 × 6 × 5 = 210 | A7 plus a per-meetup count check | 7 × 6 × 3 = 126 |
| 5. Raw text cut | 6 × 4 × 7 = 168 | A1 (O 4 to 1), A2 | 42 |
| 7. Migration on unstamped DB | 7 × 4 × 5 = 140 | B8 (O 4 to 1) | 35 |
| 8. Unnumbered PDF unplaced | 6 × 5 × 3 = 90 | A6 | 6 × 1 × 3 = 18 |
| 10. Noise title becomes a book | 4 × 3 × 4 = 48 | A5 + A7 (D 4 to 2) | 24 |
