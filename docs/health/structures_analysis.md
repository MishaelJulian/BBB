# Structures Analysis

Reviews of BBB's data structures: database schema and queries, migrations, parsing strategy, content hashing and caches. One section per tool run; each states its date, commit and scope. Findings that change risk scores feed `report_insights.md` §10.8.

## Findings register

DB = database review, MG = migrations, RX = parsing strategy, CH = content hashing and caching. Details in the sections below.

| ID | Severity | Finding | Where | Status (2026-10-09) |
|---|---|---|---|---|
| DB4 | High | Docker bind-mounts only the `.db` file; in WAL mode the `-wal` and `-shm` files stay inside the container, so committed writes can be lost when the container is recreated | `docker-compose.yml:10-11` | Open (verified) |
| DB1 | High | Canonical key `(normalized_title, author)` not unique in the database; 11 duplicate groups; add-book matches by title only | `models.py:253-255`; `main.py:1420` | Open (verified) |
| DB2 | High | No unique key on discussions `(meetup, book, member)`; 1 exact duplicate | `models.py:363-403`; `main.py:1442` | Open (verified) |
| DB3 | High | Two `imported_books` rows point at canonical books that no longer exist (`PRAGMA foreign_key_check`) | `imported_books` rowids 2729, 2730 | Open (verified) |
| MG1 | High | No schema change has ever gone through a migration; 4 columns were added by hand-run `ALTER TABLE` with no record in the repo | live `sqlite_master`; `app/core/database.py:65` | Open |
| MG4 | High | Empty baseline migration: a database built from migrations has no tables, so CI and a PostgreSQL move cannot use them | `alembic/versions/2026_07_22_0611-4b4cb3603d42_initial_schema.py:21-23` | Open; founder decision |
| DB7 | Medium | Minimal per-book Sources drop `start_line`, `end_line`, `pdf_page`: 1,797 of 1,829 sources have no line number | `full_import.py:295, 302-309` | Open (verified) |
| MG6 | Medium | A test module runs `init_db()` (`create_all`) on the default database, the live archive, whenever `pytest` runs | `tests/test_meetup97_regression.py:76` | Open (verified) |
| DB5, MG2, MG3 | Medium | Drift: `books` and `attachments` exist with no model; `media_type` is nullable in the database and NOT NULL in the models | live schema; `models.py:233, 382` | Decide before B8 |
| DB6 | Medium | Unique indexes on author and member keys give false assurance: 84 author groups collide after removing spaces and dots (extends C1) | `authors.normalized_name`, `members.normalized_name` | Open |
| MG5 | Medium | `alembic/env.py` has no `render_as_batch`, no `include_object`; SQLite runs migrations without a transaction and without the foreign-key pragma | `alembic/env.py:25-29, 47-49` | Open |
| MG8 | Medium | Documented canonical uniqueness not enforced; the unique index fails today with `UNIQUE constraint failed` (same 11 groups as DB1) | `models.py:253-255` | After A4 and C1 |
| MG11 | Medium | Admin routes address meetups by number, so a meetup without one (A6) cannot be edited | `main.py:951, 1031, 1158` | Before A6 |
| DB8 to DB10 | Medium | Bulk delete skips cascades (all 35 foreign keys are NO ACTION); ORM `Source` cascade deletes meetups while the database blocks it; tests and raw scripts never enable the foreign-key pragma | `main.py:1383-1386`; `models.py:61-66`; `tests/conftest.py:12` | Open |
| DB11 to DB17, MG7, MG9, MG10 | Low / Info | 5 s lock timeout; failed import job not recorded; mixed timestamp formats; no CHECK constraints; 26 redundant id indexes; `/members` N+1 and `ilike` wildcards; stale migration docs; merge sort comment | see sections | Open |
| RX1 | High | Free-text parsing far below the 95 % bar with no stage that catches bad lines: sampled error rates TXT 20 %, flat PDF 50 %, member PDF 63 % | `pdf_parser.py:40-312`; `txt_parser.py:89-173` | Open |
| RX2 to RX8, RX11 | Medium | Glued words in 6 PDFs (one-argument fix, verified); member grouping discarded; URL regex swallows `)` (236 titles, 240 URLs, verified); unknown-venue meetup yields 0 books; every TXT line after the first book becomes a book; `by` matched before the dash; member headers missed; 0 parser tests | parsers | Open |
| RX9, RX10, RX12 | Low | `church street` mapped to Bookworm; scanner is a per-file regex table; no parsing metrics | parsers | Open |
| CH1 | Medium | The same July 2025 PDF sits in `sources/` under two names and was imported twice (74 `imported_books` rows each) | `app/parsers/scanner.py:53-54`; `sources/` | Open (verified); founder picks which file to keep |
| CH2 | Medium | `sources/BBB 99, Books Discussion List.pdf` and `assets/generated_pdfs/bbb_meetup_99.pdf` are byte-identical. **Corrected 2026-10-09:** `scripts/ingest_meetup_99.py:37-42` copied the source file into `generated_pdfs`, so the source is the original publication and the "generated" file is its copy | `sources/`; `scripts/ingest_meetup_99.py:37-42` | Source file deleted on founder request (own commit, revertible); see `FOUNDER_QUESTIONS.md` Q1 |
| CH7 | Medium | Generated PDFs are reused whenever the file exists, and the public `/assets` mount serves them directly; 2 of 3 are older than a later change to a book they show (confirms K6) | `app/api/main.py:1168-1172, 46` | Open |
| CH8 | Medium | Synopsis has no negative cache: 2,698 of 2,783 books refetch on every request (confirms E5 with an updated count) | `app/api/main.py:557-571` | Open |
| CH3 | Low | A source records only the file's base name; nothing records its content | `pdf_parser.py:323`; `txt_parser.py:345` | Open |
| CH5 | Low (Medium with F1) | Covers cache keyed on md5 of the URL, never revalidated, any file over 100 bytes counts as valid | `pdf_generator.py:66-69, 79-81` | Open (after F1) |
| CH6 | Low | Covers cached for only 15 of 54, 16 of 48 and 3 of 56 books of meetups 97 to 99; 4 orphan files | `assets/cache/covers/` | Open |
| CH9 | Low | Suggestion cache key has no archive version and caches empty results (confirms C10, S5) | `main.py:1941-1951, 2005` | Open |
| CH4 | Info | Re-import re-extracts all text (33 s for 32 PDFs vs 0.12 s to hash); the A2 prefix check passes for all 30 cut sources | `full_import.py:251`; parsers | No action (A2 unblocked) |

---

## Content hashing and caching (ecc:content-hash-cache-pattern)

**Date:** 2026-10-09
**Commit:** `9535f04` at start; `ce2c176` (docs only) was committed during the run; all code citations hold for both.
**Run by:** `/ecc:content-hash-cache-pattern`, run in a subagent, read-only.
**Scope:** `sources` table (`raw_text`, `file_path`), import pipeline, `assets/cache/covers`, the suggestion cache in `main.py`, the synopsis enrichment path, generated meetup PDFs.
**Method:** code reading; read-only SHA-256 (64 KB chunks, `hashlib`) of every file in `sources/`, `assets/cache/covers/` and `assets/generated_pdfs/`; first-page and full-text extraction with `pdfplumber` (the parser's own library); database opened only as `file:book_club_archivist.db?mode=ro`; cross-check against git blob ids (`git ls-files -s`). Scripts in the session scratchpad (`ch_audit/measure.py`, `measure2.py`), run with `python3 -I`; nothing installed.
**Verified after the run:** CH1 (`sha256sum` gives `3eb64f0ba2488161…` for both `86 - BBB Meetup - Books Discussed - July 2025.pdf` and `Books Discussed — BBB JULY 2025.pdf`; read-only query: 74 `imported_books` for each file); CH2 (`sources/BBB 99, Books Discussion List.pdf` and `assets/generated_pdfs/bbb_meetup_99.pdf` both `c391e5be0ea27fbe…`).
**ID note:** the agent's proposals P1 to P8 are renamed CHP1 to CHP8 here, to avoid a clash with the FastAPI P findings.
**Not checked:** no network calls (remote cover changes, whether cached covers still match their URLs, Goodreads and Apple behaviour); the API was not run, no PDF generated, no `import-full` timed; generated PDFs not opened; the frontend.

### Summary

- BBB has no content hash anywhere. `Source.file_path` stores only the base name, and nothing records what the file contained when it was imported.
- One PDF sits in `sources/` under two names and was imported twice: 74 extra `imported_books` rows (CH1). The generated meetup 99 magazine is also in `sources/`, byte for byte, so the next full import would read the app's own output back in as a source (CH2). A SHA-256 check at scan time catches both; git's blob ids already catch both today with no code.
- The A2 prefix check passes for all 30 cut sources (11 PDF, 19 TXT), measured read-only. A hash of the stored `raw_text` cannot show that a cut happened; only a hash or length of the full text taken at parse time can.
- The covers cache is keyed on the URL, never refreshes, never evicts, and counts any file over 100 bytes as valid. Meetups 97, 98 and 99 have only 15 of 54, 16 of 48 and 3 of 56 covers cached, so regenerating their PDFs triggers about 124 outbound fetches.
- The smallest fixes need no migration: a `sha256sum` manifest (or `git ls-files -s`), a `.sha256` sidecar next to each generated PDF, and an in-memory "last tried" dict for synopsis. Hash columns in the database wait for B8.

### Cache inventory

| Cache | Key | Location | Invalidation | Size measured | Follows guide? |
|---|---|---|---|---|---|
| Cover images | `hashlib.md5(url)` + `.jpg` (`pdf_generator.py:66-67`) | `assets/cache/covers/` (tracked in git, served publicly by `/assets`, `main.py:46`) | None: a hit if the file exists and is over 100 bytes (`:68`); no TTL, no eviction | 34 files, 1,292,729 B; 4 orphans; 2 PNG files saved as `.jpg` | Partly: `{hash}.ext` lookup and directory creation (eager, at import, `:56`); keys on the URL instead of content, cache logic inside the download function, a corrupt file over 100 bytes counts as a hit, no hit or miss logging |
| Generated meetup PDFs | `bbb_meetup_{n}.pdf` | `assets/generated_pdfs/` (tracked, public) | Only "file exists" (`main.py:1169`), or an explicit `POST .../generate-pdf` | 3 files, about 29 MB | No: keyed on the meetup number, so edits never invalidate it (K6) |
| Suggestion cache | `f"{media_type}:{q.lower()}"` (`main.py:1941`) | Process memory, `_SUGGESTION_CACHE = {}` (`:1547`) | 600 s age check on read (`:1945`); no size cap, no eviction | Not measurable offline | Not applicable: the data must stay fresh and depends on database state (outside the guide's scope) |
| Synopsis enrichment | None: refetches whenever `has_full_info` is false (`main.py:557-562`) | Results written into `canonical_books` columns | None: a failed fetch is not remembered | 2,698 of 2,783 books refetch on every call | No cache, no negative cache |
| Import lookups (`_venue_cache`, `_author_cache`, `_member_cache`, `_canonical_cache`) | Normalized name or (title, author) (`full_import.py:63-66`) | Memory, one import run | Rebuilt after the merge (`:530-538`) | One run only | Not applicable: per-run memos |

### Measurements

**M1. `sources/` hashes.** 34 files, 29,062,764 B; SHA-256 of all 34 took 0.123 s. Exact duplicates: 1 group, `3eb64f0ba248…` = `86 - BBB Meetup - Books Discussed - July 2025.pdf` and `Books Discussed — BBB JULY 2025.pdf`. Near-duplicates by same byte size, same whitespace-normalised first page, and same full extracted text: only that pair (88,050 B; 906 characters on page 1). `sources/BBB 99, Books Discussion List.pdf` has the same SHA-256 (`c391e5be0ea27fbe…`) as `assets/generated_pdfs/bbb_meetup_99.pdf`. Git confirms both (`git ls-files -s sources | awk '{print $2}' | sort | uniq -d` prints `0044668dba9a…`; both 99 files carry blob `8efd954e4ff6…`). Re-parse cost: `pdfplumber` extraction of all 32 PDFs (128 pages) took 33.02 s, hashing 0.123 s.

**M2. Imports of the duplicate pair.**

| file_path | Source.meetup_number | raw_text length | imported_books | linked to canonical |
|---|---|---:|---:|---:|
| `86 - BBB Meetup - Books Discussed - July 2025.pdf` | 86 | 2,000 | 74 | 64 |
| `Books Discussed — BBB JULY 2025.pdf` | NULL | 14 (`'Following Fish'`, one book line) | 74 | 64 |

**M3. `file_path` validity.** 1,829 sources point at 32 distinct `file_path` values; all 32 resolve under `sources/`, none at the repo root. Values are base names (`source_file = path.name`, `pdf_parser.py:323`, `txt_parser.py:345`). Files in `sources/` that no Source references: `BBB 99, Books Discussion List.pdf` and `meetup_numbers.txt`.

**M4. Cut `raw_text` and the A2 prefix check.** Rows with `length(raw_text) = 2000`: 30 (`>= 2000`: 30; `= 500`: 0); 19 from `BBB Meetup-9.txt`, 11 from PDFs. For all 11 PDFs, today's `pdfplumber` text starts with the stored text (0 mismatches, 0 missing files). All 19 cut TXT rows, and all 1,798 TXT rows, appear verbatim in `sources/BBB Meetup-9.txt`. Largest losses (current extraction length minus 2,000): October 2023 3,630 characters; BBB 85 3,178; #96 2,342; Jan 2025 1,831; July 2025 1,104. Distinct SHA-256 values of `raw_text`: 1,734 of 1,829; 171 rows share a hash (short repeated lines such as `'Books discussed:'` ×9, `'Deep Work'` ×4), so `raw_text` alone cannot identify a source.

**M5. Covers folder.** 34 files, 1,292,729 B (largest 249,726 B, smallest 599 B). All files have the same mtime (2026-10-07 12:26:44 +0530), so mtimes show a bulk copy, not download age. Distinct `cover_url` and `thumbnail_url` values in `canonical_books`: 4,046; cached files matching one: 30; orphans: 4 (`5d32e012…`, `b726c69e…`, `33c29e01…`, `test.jpg`). Distinct content: 33 of 34 (`test.jpg` is identical to `c4ebe37d…`). Real type by magic bytes: 32 JPEG, 2 PNG, all named `.jpg`. Coverage for books of meetups with a PDF: 97 has 15 of 54 URLs cached, 98 has 16 of 48, 99 has 3 of 56. URL hosts: `i.gr-assets.com` 3,643; `is1-ssl.mzstatic.com` 371; `m.media-amazon.com` 30; `duckduckgo.com` 2. Projection (not measured): 4,046 URLs × 38,021 B average is about 154 MB if every cover were cached.

**M6. Generated PDFs** (`updated_at` is UTC, `base.py:12-14`).

| PDF | mtime (UTC) | meetup.updated_at | max discussions.updated_at | Books shown | Books updated after the PDF |
|---|---|---|---|---:|---:|
| 97 | 2026-10-07 06:56:44 | 2026-09-20 16:36 | 2026-09-20 09:37 | 59 | 1 |
| 98 | 2026-10-07 06:56:44 | 2026-09-20 16:27 | 2026-09-20 15:07 | 52 | 0 |
| 99 | 2026-10-07 09:44:11 | 2026-09-20 17:54 | 2026-09-20 17:54 | 61 | 1 |

2 of 3 PDFs are older than a later change to a book they show. An upper bound: `updated_at` changes on any column, including synopsis writes that do not appear in the PDF. The 97 and 98 mtimes are a copy time, so their real age is unknown. `meetups.pdf_url` is set for 97, 98 and 99 only.

**M7. Synopsis retry set.** The predicate from `main.py:557-562`, run in SQL: `canonical_books=2783 has_full_info=85 would_fetch=2698`. `canonical_books` has no "enriched", "fetched" or "tried" column. `alembic_version` has 0 rows.

### Proposals (smallest first)

| # | Proposal | Problem fixed | Where the hash is stored | Needs migration? | Cost | Smallest version |
|---|---|---|---|---|---|---|
| CHP1 | Content manifest for `sources/` | Changed, duplicated or foreign files go unnoticed (CH1, CH2, CH3) | Git blob ids (already there), or a text file `sources/SHA256SUMS` | No | 0 to 5 min | Before any import: `git ls-files -s sources \| awk '{print $2}' \| sort \| uniq -d` must print nothing and `git status sources` must be clean. Optionally `sha256sum sources/* > sources/SHA256SUMS` once, then `sha256sum -c` before each import |
| CHP2 | Duplicate guard in `ArchiveScanner.scan` | CH1, CH2 | Memory during the scan | No | About 10 lines, stdlib `hashlib` | Hash each file in 64 KB chunks; skip and warn on a hash already seen; also skip any hash that matches a file in `assets/generated_pdfs/` |
| CHP3 | Hash sidecar for generated PDFs | K6, CH7 | `bbb_meetup_{n}.pdf.sha256` next to the PDF | No | About 20 lines | SHA-256 of `json.dumps(inputs, sort_keys=True)` over the meetup fields, the book list (title, author, cover_url, member, is_general), the chosen photo path and its file hash, and a template version string; the GET route regenerates when the sidecar is missing or different. A purer split has `generate_meetup_pdf` take the inputs and a wrapper own the check |
| CHP4 | In-memory "last tried" dict for synopsis | E5 retry storm | Process memory, `{book_id: timestamp}` | No | About 6 lines | Skip `fetch_book_metadata_from_web` when the last try was under 24 h ago; resets on restart (acceptable first step) |
| CHP5 | Archive version counter for suggestions | C10 stale `in_archive` | Process memory, an integer bumped on every book write route | No | About 8 lines | Add `_ARCHIVE_VERSION` to the key. C10's own fix (cache only external results, query SQLite every time) is smaller; prefer it. Also S5: do not store empty lists; cap the dict |
| CHP6 | Cover cache keyed by SHA-256 of the URL, real extension, revalidation | Theoretical md5 collision, stale image, PNG named `.jpg`, corrupt file counted as a hit | File name in `assets/cache/covers/` | No | About 15 lines | `sha256` instead of `md5`; `Image.verify()` on a hit, delete on failure; write to a temp file and `os.replace`; delete the 4 orphans. Only after F1 is fixed |
| CHP7 | `sources.content_sha256` and `sources.full_text_length` columns | Proves which file version a row came from; makes any future cut detectable (A1/A2 alternative) | Database columns | Yes: see the Migrations section; needs B8 first | Migration plus importer change, S to M | Fill at import from CHP2's hash and `len(text)` before any slice. Not needed if A1 ships and CHP1 is kept |
| CHP8 | `canonical_books.metadata_checked_at` | E5 across restarts | Database column | Yes (B8, then a migration) | S | Only if CHP4 proves too short-lived |

None of these needs a new tool: every proposal uses `hashlib`, `json` and `os`, so PRD §7.1 is not triggered.

### Findings

| ID | Severity | file:line | Finding | Evidence | Impact | Smallest fix | Effort |
|---|---|---|---|---|---|---|---|
| CH1 | Medium | `app/parsers/scanner.py:53-54`; `app/pipeline/full_import.py:88-92` | The same PDF exists under two names and was imported twice; the scanner globs `*.pdf` with no content check | `pdf_files = sorted(data_dir.glob("*.pdf"))`; SHA-256 `3eb64f0ba248…` shared by both July 2025 files; 74 `imported_books` each, 64 linked (M2). **Verified** | 74 duplicate import rows; the second copy's Source has `meetup_number` NULL and a 14-character `raw_text`. Effects on screens not measured | CHP1 now; founders choose which file to keep; CHP2 next | XS (CHP1), S (CHP2) |
| CH2 | Medium | `app/parsers/scanner.py:54`; `sources/BBB 99, Books Discussion List.pdf` | The generated meetup 99 magazine sits in `sources/` and will be parsed as a source on the next `import-full` | SHA-256 `c391e5be0ea27fbe…` matches `assets/generated_pdfs/bbb_meetup_99.pdf`; same git blob; no Source references it yet (M3). **Verified** | Circular provenance: app output recorded as Layer 1 raw text; meetup 99's books added a second time | Move it out of `sources/`, or keep it and have CHP2 skip hashes found in `generated_pdfs`. Founders decide whether it is a real source | XS |
| CH3 | Low | `app/parsers/pdf_parser.py:323`; `app/parsers/txt_parser.py:345`; `app/database/models.py:32-35` | A Source records only the base name; nothing records its content | `source_file = path.name`; no hash column; all 32 `file_path` values resolve today (M3) | A rename breaks the link; an edit cannot be detected; a re-import cannot tell changed from unchanged | CHP1; later CHP7 | XS |
| CH4 | Info | `full_import.py:251`; `pdf_parser.py:359`; `txt_parser.py:245` | Re-import re-extracts all text; the A2 prefix check is already provable | `pdfplumber` 33.02 s for 32 PDFs vs 0.123 s hashing (M1); prefix check 11 of 11 PDF and 19 of 19 TXT (M4) | A hash-keyed extraction cache would save about 33 s per import; imports are rare (judgment), low value. A2 can proceed on all 30 rows | No cache for now; use M4's method as A2's dry run | None |
| CH5 | Low (Medium with F1) | `app/services/pdf_generator.py:66-69, 79-81` | Covers cache keyed on md5 of the URL, never revalidated, any file over 100 bytes valid | `url_hash = hashlib.md5(url.encode("utf-8")).hexdigest()`; `if os.path.exists(cached_path) and os.path.getsize(cached_path) > 100: return cached_path`; 2 of 34 files are PNG named `.jpg` | A changed remote image is never refreshed; a truncated file over 100 bytes is reused. With F1, an internally fetched image stays publicly served after `cover_url` is corrected, because nothing evicts it. md5 collision poisoning is theoretical here (judgment) | CHP6 after F1; delete orphans by hand meanwhile | S |
| CH6 | Low | `pdf_generator.py:299, 79` (`timeout=8`); `assets/cache/covers/` | Low cache coverage for the three meetups with PDFs; orphans | 15 of 54, 16 of 48, 3 of 56 covers cached for 97, 98, 99; 4 orphans incl. `test.jpg`; 34 files, 1.29 MB; full size about 154 MB (estimate) | Regenerating 99 inside a GET makes up to 53 fetches, up to 424 s at 8 s each (calculation, not measured); worse once CHP3 regenerates more often | Warm the cache from an admin action, not a public GET; delete the 4 orphans; decide whether `assets/cache` stays tracked in git | S |
| CH7 | Medium (confirms K6) | `app/api/main.py:1168-1172, 46` | The generated PDF is reused whenever the file exists; the public static mount serves it directly, bypassing even that check | `if not os.path.exists(pdf_path):`; `app.mount("/assets", StaticFiles(directory="assets"), ...)`; `pdf_url` points at `/assets/generated_pdfs/...`; 2 of 3 PDFs older than a later change (M6) | Readers can get an old magazine after admin edits | CHP3; also point `pdf_url` at the route, or have edit routes delete the file | S |
| CH8 | Medium (confirms E5; count changed) | `app/api/main.py:557-571` | No negative cache: every book missing any of four fields refetches on each request | Predicate at `:557-562`; 2,698 of 2,783 books (M7); no "tried" column | Outbound amplification and repeated writes on GET (S2); books for which neither provider has a page count never leave the set | CHP4 now; CHP8 after B8 | XS |
| CH9 | Low (confirms C10, S5) | `app/api/main.py:1941-1951, 2005` | Suggestion cache key has no archive version; empty results cached | `cache_key = f"{media_type}:{q_clean.lower()}"`; `_SUGGESTION_CACHE[cache_key] = (now, results)` | A stale `in_archive` answer for up to 600 s; an outage that looks like "no results". A content hash does not fit this data ("must always be fresh") | C10's fix; otherwise CHP5 | XS |

### Already-known issues

| ID | Status | Note |
|---|---|---|
| A1, C13 (raw_text cut) | Confirmed | 30 rows at exactly 2,000 characters, 0 at 500 (M4); slices still at `pdf_parser.py:359`, `txt_parser.py:245` (`raw_text = section[:2000]`), `full_import.py:251` and `:307` |
| A2 (restore 30 cut sources) | Confirmed and unblocked | Prefix check passes 30 of 30 read-only; all 30 files exist under `sources/`. Watch CH1: one of the 11 cut PDFs is the duplicated July 2025 file |
| F1, E3 (cover SSRF) | Confirmed | `urllib.request.urlopen(req, timeout=8)` with no URL check (`pdf_generator.py:72-79`); CH5 adds that a leaked image stays cached with no eviction |
| C10, S5, K26 (suggestion cache) | Confirmed | `main.py:1547, 1941-1951, 2005` unchanged |
| K6 (stale PDF) | Confirmed, measured | 2 of 3 PDFs older than a later change (M6); static mount bypass (CH7) |
| E5 (synopsis retries) | Changed | 2,698 of 2,783 books with the exact code predicate today; `security_analysis.md` E5 says 2,651 (the data moved or E5 used a slightly different predicate) |
| S2 (synopsis writes on GET) | Confirmed | `if updated: db.commit()` at `main.py:585-586` |
| S11 (template photo fallback) | Confirmed, not re-measured | Candidate list at `pdf_generator.py:236-248` still ends with `templates/bbb99/page_12_img_1.jpeg`; CHP3 should hash the chosen photo so a later real upload invalidates the PDF |
| B8 (Alembic unstamped) | Confirmed | `alembic_version` has 0 rows; CHP7 and CHP8 depend on it |
| K35 (read then truncate) | Related | `resp.read()` in the covers download (`pdf_generator.py:79`) has no size cap either |

### Proposed FMEA rows (merged into report_insights.md §10.8 on 2026-10-09: rows 68 to 91, plus re-scores of rows 3 and 22)

S, O and D (1 to 10) are judgment; RPN = S × O × D.

| Failure mode | Effect | Cause | S | O | D | RPN |
|---|---|---|---:|---:|---:|---:|
| Stale magazine PDF served | Public readers see old books or covers | Cache keyed on file existence (K6, CH7) | 5 | 6 | 8 | 240 |
| Synopsis refetch on every view | Outbound storm, rate limiting, repeated writes on GET | No negative cache (E5, CH8) | 5 | 7 | 6 | 210 |
| The same source file is present under two names | Duplicate `imported_books` (74 measured), weaker provenance | No content check at scan (CH1) | 5 | 4 | 7 | 140 |
| A source file is edited after import | Database rows no longer match the file; A2-style checks break silently | No stored content hash (CH3) | 5 | 3 | 9 | 135 |
| Generated output placed in `sources/` | App output imported as Layer 1 raw text; meetup 99 books doubled | No hash check against `generated_pdfs` (CH2) | 6 | 3 | 7 | 126 |
| A bad or internal cover image stays cached | Leaked or wrong image publicly served indefinitely | URL key, no eviction, no revalidation (CH5 with F1) | 4 | 2 | 8 | 64 |

Overlaps: §10.8 row 22 already covers E5 (synopsis outbound fetches, RPN 120) and row 46 covers K6 (GET writes). Merging the first two rows means re-scoring those rows.

### Open questions for the founders

1. Which July 2025 file is the real one: `86 - BBB Meetup - Books Discussed - July 2025.pdf` or `Books Discussed — BBB JULY 2025.pdf`? The other's 74 import rows could then be removed (a data write, needs approval).
2. Is `sources/BBB 99, Books Discussion List.pdf` meant to be a source? It is identical to the app-generated meetup 99 magazine.
3. Should `assets/cache/covers/` and `assets/generated_pdfs/` stay tracked in git? About 1.3 MB and 29 MB today; the covers cache could grow to about 154 MB.
4. Is 24 hours an acceptable retry interval for synopsis enrichment, or should enrichment leave public GET entirely (S2, E5)?
5. Should an edit to a meetup or its books regenerate the PDF automatically, or only mark it stale for an admin to regenerate?

---

## Database review (ecc:database-reviewer)

**Date:** 2026-10-09
**Commit:** `ce2c176`
**Run by:** ecc:database-reviewer agent, read-only.
**Scope:** `app/database/models.py`, `app/database/base.py`, `app/core/database.py`, the queries in `app/api/main.py` and `app/pipeline/full_import.py`, and the live schema (all 27 tables). Also read: `alembic/env.py`, `docker-compose.yml`, `tests/conftest.py`, `scripts/fix_meetup_45.py`, the head of `scripts/ingest_meetup_99.py`.
**Method:** database opened as `file:book_club_archivist.db?mode=ro` (sqlite3, `uri=True`); PRAGMA reads, `EXPLAIN QUERY PLAN` and SELECTs only; for the drift check `Base.metadata` was built from the models with `DATABASE_URL` set to the read-only URI, with no sessions created. Labels: "measured" is a query result, "computed" is arithmetic on measured counts, "judgment" is the reviewer's call.
**Verified after the run:** DB3 (`PRAGMA foreign_key_check` returns `('imported_books', 2729, 'canonical_books', 0)` and `('imported_books', 2730, 'canonical_books', 0)`); DB4 (`docker-compose.yml` mounts `./book_club_archivist.db:/app/book_club_archivist.db` only); DB7 (1,797 sources with `start_line` NULL); DB1 (11 groups on `(normalized_title, author_id)`); DB2 (1 duplicate group on `(meetup_id, canonical_book_id, member_id)`).
**Correction:** the reviewer's note on K1 ("compares against canonicals before any exist for new titles") differs from the reproduced root cause: every imported title already has its own canonical when detection runs, so the exact-match check always `continue`s (`error_handling.md` RC1).
**Not checked:** no live API query log, so N+1 counts other than B1 are computed lower bounds; SQLite has no index-usage statistics, so "unused" indexes are judged from code; no backup restore test; no PostgreSQL instance; Alembic not run; `scripts/ingest_*.py` and `batch_enrich_all_meetups.py` not read line by line (session and lookup patterns only); routes outside the hot paths skimmed for database access only.

### Summary

- `PRAGMA integrity_check` returns `ok`. `PRAGMA foreign_key_check` returns 2 violations: two `imported_books` rows point at canonical books that do not exist (DB3).
- The database enforces only the keys on `authors.normalized_name`, `members.normalized_name` and `meetups.meetup_number`. The canonical book key, the discussion key and the member-name key are code-only, and the data shows the cost: 11 duplicate `(normalized_title, author_id)` groups and 1 exact duplicate discussion (DB1, DB2).
- The live schema matches the models for every column, index, unique constraint and foreign key, with 4 exceptions: two stray tables (`books`, `attachments`) with no model, and two `media_type` columns added by a manual `ALTER` that are nullable where the model says NOT NULL. B8 must settle these before stamping (DB5).
- New High-risk operational item: `docker-compose.yml` mounts only the `.db` file, so SQLite's `-wal` and `-shm` files stay inside the container (DB4).
- Indexes are adequate at this size; every hot path uses an index except the `%x%` searches, which scan. No new index is needed before the PostgreSQL move; 26 redundant `id` indexes could be dropped.

### Findings

Ranked by data-integrity risk. Schema changes are ARCHITECTURAL under PRD §23 (migration plan, backup, founder approval).

| ID | Severity | file:line or table.column | Finding | Evidence | Impact | Smallest fix | Effort |
|---|---|---|---|---|---|---|---|
| DB1 | High | `models.py:253-255`; `main.py:1420, 1427, 1192`; `canonical_books` | The canonical key `(normalized_title, author)` is not unique in the database (`ix_canonical_books_norm_author` is a plain index). `add_book_to_meetup` finds a book by title only; `update_admin_book` can rename a book onto an existing title with no check | Measured: 11 groups on `(normalized_title, author_id)`; 16 groups on title alone, 5 of them with 2 different authors; 182 books with `author_id` NULL (NULLs are distinct in a SQLite unique index). `main.py:1420` `.filter(CanonicalBook.normalized_title == title_clean.lower()).first()` | Split discussion history and closet counts; a second author's same-title book attached to the first (related to C1, C6) | Review or merge the 11 groups, then `CREATE UNIQUE INDEX ... ON canonical_books(normalized_title, COALESCE(author_id,''))`; admin routes catch `IntegrityError` and return 409 | M |
| DB2 | High | `models.py:363-403`; `main.py:1442, 1490, 1514`; `discussions` | No uniqueness on `(meetup_id, canonical_book_id, member_id)`; routes check, then insert; `member_id` is NULL on many rows | Measured: 1 exact duplicate (meetup 86, book "George and", 2 rows with NULL member); 1,850 of 2,686 discussions have no member; 11 groups on `(meetup, book)` alone, most legitimate multi-reader rows | Doubled counts for a book at a meetup; "George and" looks like a parser cut (judgment) | Remove the duplicate, then a unique expression index on `(meetup_id, canonical_book_id, COALESCE(member_id,''))` | M |
| DB3 | High | `imported_books.canonical_book_id` | Two rows point at canonical books that no longer exist, although the app runs with `foreign_keys=ON` | `PRAGMA foreign_key_check`: rowids 2729 and 2730, `raw_title` "MEET #98" and "JULY 2026", `raw_author` NULL, both on meetup 98's source; missing ids `f0aa68c7-8e0b-4d30-891c-cee6891556b2`, `c29d8bb8-f074-4ce1-b2c5-904b3f370ec6`; no file mentions them. **Verified** | Joins from `imported_books` to `canonical_books` drop these rows. Cause unknown; a connection with the pragma off (raw `sqlite3` scripts) is likely (judgment) | Set `canonical_book_id = NULL` on both (data fix, after a backup); add `PRAGMA foreign_key_check` to the quality gate | S |
| DB4 | High (judgment) | `docker-compose.yml:10-11` | Only the file `./book_club_archivist.db` is bind-mounted; in WAL mode the `-wal` and `-shm` files are created inside the container | `volumes: - ./book_club_archivist.db:/app/book_club_archivist.db`; `database.py:23` sets `journal_mode=WAL`; host `-wal` is 0 bytes (checkpointed), `-shm` 32,768 bytes. **Verified** | While the container runs, committed writes can sit in a WAL file that exists only inside it; recreating the container loses them. A host script opening the same file at the same time uses a different WAL and shm, which risks corruption (judgment, from SQLite's documented rules). The §14 backup procedure does not cover this | Mount the directory that holds the database; until then stop the container before host scripts, or run scripts inside it | S |
| DB5 | Medium | `canonical_books.media_type`, `discussions.media_type`; tables `books`, `attachments` | Live schema and models differ in 4 places (drift table) | `CREATE TABLE canonical_books (... media_type VARCHAR(32) DEFAULT 'book', external_url VARCHAR(1024), PRIMARY KEY ...)`: the columns sit after `updated_at`, the signature of `ALTER TABLE ADD COLUMN`; no `ALTER` in any `.py` file; 0 NULLs in either column; `books`, `attachments` 0 rows, no model | `alembic revision --autogenerate` would propose dropping both tables and changing both columns; a stamp without a decision gives a misleading baseline | Before B8: decide drop or keep for the two tables, and NOT NULL via a batch migration or a relaxed model | S |
| DB6 | Medium | `authors.normalized_name`, `members.normalized_name` (unique indexes) | The unique indexes give false assurance: writers use different key formats, so one person can exist twice (extends C1) | Measured: authors colliding after removing spaces and dots: 84 groups; members: 1; authors with a space in `normalized_name`: 816; members: 24. `main.py:1200, 1247` write `lower()`; the pipeline writes `normalize_name_for_dedup` | Duplicate authors and members split their books and counts | One normalizer for all writers (C1), then rebuild the keys | M |
| DB7 | Medium | `full_import.py:302-309, 295`; `sources.start_line` | The minimal Source made for each imported book drops `start_line`, `end_line` and `pdf_page`; the lookup at line 295 filters on `start_line`, so it never matches these rows and every book gets a new Source. Layer 1 is documented as keeping line numbers (`models.py:26-27`) | Lookup `filter_by(file_path=..., start_line=rec.source.start_line)`; the created `Source(...)` has no `start_line`. Measured: 1,797 of 1,829 sources have `start_line` NULL (1,766 TXT); 1,798 share the path `BBB Meetup-9.txt`. **Verified.** Not covered by A1, C13 or K15 | Provenance cannot point to a line for 98 % of sources; the import scans about 1,800 rows per book | Copy `start_line`, `end_line`, `pdf_page` into the minimal Source | S |
| DB8 | Medium | `main.py:1383-1386`; `models.py:395-403` | "Delete discussion" uses a bulk `.delete(synchronize_session=False)`, skipping ORM cascades; all foreign keys are NO ACTION | All 35 live foreign keys `on_delete = NO ACTION`; `quotes`, `discussion_participants`, `book_mentions` have 0 rows | Once those tables hold data, deleting a discussion with children raises `IntegrityError`, returned as a 500 | Per-row `db.delete(d)` (as `update_admin_book` does at `:1238`), or `ondelete="CASCADE"` in the next schema change | S |
| DB9 | Medium | `models.py:61-66, 345-356` | `Source` cascades `all, delete-orphan` to Meetup, which cascades to discussions and more; the database blocks the same delete (NO ACTION). The two layers disagree | No code path deletes a Source today (latent) | A future cleanup script deleting sources could remove whole meetups (judgment) | Remove `delete-orphan` from `Source.meetups` | S |
| DB10 | Medium | `tests/conftest.py:12`; `tests/test_models.py:23`; `scripts/fix_meetup_45.py:6`; `scripts/audit_meetup_4*.py` | Several connection paths never set `PRAGMA foreign_keys=ON` | Only `get_engine` registers the listener (`database.py:19-24`); `fix_meetup_45.py` runs raw `UPDATE`/`INSERT` with `datetime.utcnow().isoformat()` timestamps | Foreign-key bugs (RC4, DB3) cannot be caught by tests; raw scripts can create DB3-style rows | Build test engines with `get_engine("sqlite:///:memory:")`; raw scripts run the pragma first | S |
| DB11 | Low | `database.py:17`; `main.py:1326-1328` and 5 more routes | No explicit busy timeout (Python driver default 5 s); one writer under WAL; write routes turn any error into a 500 | `create_engine(url, connect_args={"check_same_thread": False})` | API and a batch script writing together can fail with "database is locked" after 5 s (judgment) | `connect_args={"check_same_thread": False, "timeout": 30}` | S |
| DB12 | Low | `full_import.py:145-148` | On failure the job row and its logs are rolled back with the transaction (same as C17) | One `import_jobs` row (COMPLETED), 11 `import_logs` | A failed import leaves no audit record | Commit the job row in its own session first | S |
| DB13 | Low | `models.py:575-576, 595`; `base.py:27-30`; `main.py:448` | Timestamps stored as naive text; `DateTime(timezone=True)` has no effect on SQLite; scripts write ISO with `T`, the ORM a space; "firstDiscussedYear" sorts by import time | Rows with `T` in `created_at`/`updated_at`: discussions 62, imported_books 8, canonical_books 7, authors 6; `meetups.date` 53 of 53 well formed | Mixed formats sort wrongly; the year sort is wrong (judgment on intent) | Sort by the earliest linked `meetups.date`; one timestamp format at the next schema change | S |
| DB14 | Low | rating, score and status columns | No CHECK constraints | `canonical_books.rating` 2.0 to 5.0 (1,877 rated); `discussions.rating` never set; `confidence_score` 0.8 to 1.0; `media_type` values book, movie, podcast, tangent, youtube; `meetups.format` IN_PERSON, ONLINE; no violations today | Bad API input could store any value | Validate in request models now (P2); CHECKs on PostgreSQL | M |
| DB15 | Low | `base.py` `UUIDMixin` `index=True`; `models.py:204-205, 72, 253` | 26 indexes duplicate the primary key; 2 more are redundant prefixes | 26 indexes `like '%(id)'`; `ix_canonical_books_normalized_title` prefixes `ix_canonical_books_norm_author`; `ix_sources_file_path` prefixes `ix_sources_file_meetup`; 0 ISBNs stored | Extra write cost and file size only | Drop with the DB1 migration | S |
| DB16 | Low | `main.py:695-755, 1196, 1243, 1411, 1507` | `/members` repeats B1's N+1 pattern; name lookups use `ilike(name)`, where `%` and `_` are wildcards | Computed lower bound: 1,011 queries per call; 15 canonical titles contain `_` or `%`. Backend B3 measured 1,290 | Slow members page; a name with `_` could match the wrong row (rare) | Batch like `batch_books_to_dict`; exact `func.lower(col) == name.lower()` | M |
| DB17 | Info | `full_import.py:505, 535` | Merge orders by `title.desc()` while the comment says "longest title first"; `Session.query().get()` is legacy; merge groups by title only | Code read (C6, K9) | No data effect beyond C6 | Fix with A4 | S |

### Drift table (model vs live schema)

| Object | Model | Live | Verdict |
|---|---|---|---|
| 24 model tables | present | present | Match |
| `books` | none | 0 rows, 28 columns (JSON `genres`/`subjects`, `translator`, `volume`, ...), 3 foreign keys | Live only: a removed model |
| `attachments` | none | 0 rows, 1 foreign key to `sources` | Live only: a removed model |
| `alembic_version` | none | 0 rows | Expected (B8) |
| `canonical_books.media_type` | `String(32)`, NOT NULL, Python default `book` | `VARCHAR(32) DEFAULT 'book'`, nullable | Drift (0 NULLs today) |
| `discussions.media_type` | same | same | Drift |
| All other columns, types, NOT NULL | | | Match |
| Indexes and unique constraints | | | Match (the live `ix_*_id` indexes come from `UUIDMixin`) |
| Foreign keys | 31 | 35 (31 plus 3 on `books`, 1 on `attachments`) | Match for the 24 model tables |
| ON DELETE | none set | all NO ACTION | Match |
| `Alias`, `BookRelation` | present | present (1 and 0 rows) | Match (D25, D26 stand) |

For B8: stamping is safe as bookkeeping; decide DB5 first, or the next autogenerate proposes dropping both tables and altering `media_type`. `alembic/env.py` has no `render_as_batch=True`, so later column changes on SQLite need hand-written batch operations.

### Index table (hot queries, read-only `EXPLAIN QUERY PLAN`; SQL written by hand to mirror the ORM)

| Hot query | Plan (quoted) | Index used | Proposal |
|---|---|---|---|
| `/books` closet, sort by title | `SCAN canonical_books USING INDEX ix_canonical_books_title` | `ix_canonical_books_title` | None |
| `/books?only_discussed` or `exclude_general` | `SEARCH canonical_books USING INDEX sqlite_autoindex_canonical_books_1 (id=?)`; `LIST SUBQUERY 1`; `SCAN discussions`; `USE TEMP B-TREE FOR ORDER BY` | primary key; the subquery scans `discussions` (`LIKE '%general%'`) | None at 2,686 rows; revisit on PostgreSQL |
| `/books?search=` (`ilike '%x%'`) | `SCAN canonical_books USING INDEX ix_canonical_books_title`; `SEARCH authors USING INDEX sqlite_autoindex_authors_1 (id=?) LEFT-JOIN` | none for the filter | None on SQLite; `pg_trgm` GIN on PostgreSQL |
| `/books?sort_by=discussionCount` subquery | `SCAN discussions USING INDEX ix_discussions_canonical_book_id` | `ix_discussions_canonical_book_id` | None |
| `batch_books_to_dict` discussions join | `SEARCH d USING INDEX ix_discussions_canonical_book_id (canonical_book_id=?)`; primary-key searches on `members`, `meetups`, `venues` | foreign-key index and primary keys | None |
| `/meetups` list | `SCAN meetups USING INDEX ix_meetups_date` | `ix_meetups_date` | None |
| `/meetups?year=` (`strftime`) | `SCAN meetups USING INDEX ix_meetups_date` | scan in date order | None (53 rows); a range filter would be indexable |
| `/meetups/{number}`, `/search` number | `SEARCH meetups USING INDEX ix_meetups_meetup_number (meetup_number=?)` | unique index | None |
| `meetup_to_dict` per meetup (B1) | `SEARCH discussions USING INDEX ix_discussions_meetup_id (meetup_id=?)` | `ix_discussions_meetup_id` | Each query indexed; the cost is the count (B1) |
| `/members` per member | `SEARCH discussions USING INDEX ix_discussions_member_id (member_id=?)` | `ix_discussions_member_id` | Same (DB16) |
| `/members?search=`, `/search` title | `SCAN members`; `SCAN canonical_books` | none (`%x%`) | None |
| Name lookups (`lower(display_name) LIKE`, `authors.full_name LIKE`, `venues.name LIKE`) | `SCAN members`; `SCAN authors`; `SCAN venues` | none (`ilike` wraps the column) | Look up by `normalized_name` once C1 is fixed |
| Admin `normalized_title = ?` | `SEARCH canonical_books USING INDEX ix_canonical_books_norm_author (normalized_title=?)` | `ix_canonical_books_norm_author` | Single-column index redundant (DB15) |
| Admin `(meetup_id, canonical_book_id[, member_id])` | `SEARCH discussions USING INDEX ix_discussions_canonical_book_id (canonical_book_id=?)` | book index, then a filter | DB2's unique index would serve it exactly |
| Import `sources WHERE file_path AND start_line` | `SEARCH sources USING INDEX ix_sources_file_meetup (file_path=?)` | prefix only; 1,798 rows share the path | Fixed by DB7 |
| `imported_books WHERE canonical_book_id IS NULL` | `SEARCH imported_books USING INDEX ix_imported_books_canonical_book_id (canonical_book_id=?)` | foreign-key index | None |

Missing indexes: none that matter now (only `canonical_books.publisher_id`, `series_id` and `quotes.member_id` lack one; all empty and unqueried). Redundant: the 26 `ix_*_id` and two prefix indexes (DB15). Unused (judgment): ISBN indexes (0 ISBNs), `ix_canonical_books_goodreads_id`, the three `aliases` indexes, `sources.source_type`.

### Integrity check results (read-only)

| Check | Query or pragma | Result |
|---|---|---|
| Page integrity | `PRAGMA integrity_check` | `ok` |
| Foreign keys | `PRAGMA foreign_key_check` | 2 rows, both `imported_books` (DB3) |
| WAL state | `PRAGMA journal_mode` | `wal`; `-wal` 0 bytes; `freelist_count` 0; `page_count` 2,120; file 8,683,520 bytes |
| Discussions without a meetup / a book | left join; `canonical_book_id is null` | 0 / 0 |
| Discussions with no member | `member_id is null` | 1,850 of 2,686 (by design) |
| Discussions with a dangling `source_id` | `not in (select id from sources)` | 0 (S1 is NULLs, not dangling ids) |
| `imported_books` with no canonical | `canonical_book_id is null` | 369 (RC4, C6) |
| `imported_books` pointing at a missing canonical | left join | 2 (DB3) |
| Canonical books with no discussion | `not exists` | 650, all with an imported book |
| Canonical books with no author | `author_id is null` | 182 |
| Sources with no meetup, imported book or discussion | three `not exists` | 34, all TXT |
| Sources whose `meetup_number` matches no meetup | `not in` | 0 (11 sources have `meetup_number` NULL: the 11 PDFs of A6) |
| Meetups | count, min, max | 53, numbers 4 to 99; `source_id` NULL on 52; `date`, `venue_id` never NULL |
| Duplicate canonical key / discussion key | group by | 11 groups (DB1) / 1 group (DB2) |
| Duplicate member display names (case-insensitive), resources `(meetup, url)`, ISBN | group by | 0 / 0 / 0 |
| Row counts | counts | sources 1,829; authors 2,199; canonical_books 2,783; imported_books 3,637; meetups 53; discussions 2,686; members 174; resources 542; venues 4; aliases 1; import_jobs 1; import_logs 11; the other 12 tables 0 |

### SQLite settings and the PostgreSQL move

- **Foreign keys:** `PRAGMA foreign_keys=ON` only in `get_engine`'s connect listener (`database.py:19-24`): covers the API, CLI and scripts that import `SessionLocal`; not test engines (`tests/conftest.py:12`, `tests/test_models.py:23`) or raw `sqlite3.connect` scripts (`fix_meetup_45.py:6`, `audit_meetup_45` to `48`, `tests/verify/verify_p0_suite.py:5`).
- **WAL:** set on every connect (harmless); automatic checkpointing (1,000 pages); see DB4 for Docker.
- **Busy timeout:** driver default 5 s (DB11).
- **On PostgreSQL:** UUIDs become native `uuid`; `Date` and `DateTime(timezone=True)` become real types, so the mixed timestamp text (DB13) must be cleaned before loading; `%x%` searches need `pg_trgm`; foreign keys are always enforced, so DB3's 2 rows and the 369 unlinked rows must be fixed first; the expression unique indexes (DB1, DB2) work as written; the SQLite pragma branch falls away and Alembic no longer needs batch mode; ratings should become `numeric(3,2)` with CHECKs (DB14); replace the legacy `Session.query().get()` (`full_import.py:535`).

### Already-known issues

| ID | Status | Note |
|---|---|---|
| C1 | Confirmed, extended | 84 author groups and 1 member group collide after removing spaces and dots (DB6) |
| K1, RC1 | Confirmed | `PossibleDuplicate` has 0 rows (root cause per RC1; see the correction above) |
| RC4, C6 | Confirmed | 369 unlinked; matches `full_import.py:515-526` (the delete nulls the foreign key because the row is still in the deleted canonical's collection) |
| S1 | Confirmed | 52 of 53 meetups, 2,541 of 2,686 discussions |
| A1, C13, K15 | Confirmed | 30 sources at 2,000 characters; the 500 cut at `full_import.py:307` |
| A6 | Confirmed | `meetups.meetup_number` `NOT NULL UNIQUE` (`models.py:323-325`); 11 sources with `meetup_number` NULL |
| B8 | Confirmed, with preconditions | See DB5 and the drift table |
| 15 of 27 tables empty | Wording | 12 empty model tables plus `alembic_version`, `books`, `attachments` |
| D25, D26 | Confirmed | `aliases` 1 row, `book_relations` 0 |
| K13 | Not re-measured | |
| B1 | Confirmed in structure | Each per-meetup query is indexed; the cost is the count; `/members` has the same pattern |
| RC3 | Confirmed | `full_import.py:462` `score >= 0.75` |
| F8 | Confirmed | `git ls-files` lists `book_club_archivist.db` |

### Proposed FMEA rows (merged into report_insights.md §10.8 on 2026-10-09: rows 68 to 91, plus re-scores of rows 3 and 22)

| Failure mode | Effect | Cause | Source | S | O | D | RPN |
|---|---|---|---|---:|---:|---:|---:|
| Same person stored twice under different name keys | Split counts for authors and members | Different normalizers per writer | DB6 (C1) | 5 | 8 | 6 | 240 |
| Source rows have no line number | Provenance cannot be traced to a line | Minimal Source drops `start_line` | DB7 | 5 | 9 | 5 | 225 |
| Duplicate canonical book rows | Split history and counts; wrong author attached | No unique key; admin lookup by title only | DB1 | 6 | 6 | 5 | 180 |
| Committed writes stranded in the container WAL | Lost edits after a container rebuild; corruption if host and container both write | Single-file bind mount of a WAL database | DB4 | 8 | 3 | 7 | 168 |
| Dangling reference to a deleted canonical | Joins silently drop rows | Writes with foreign keys off | DB3, DB10 | 5 | 3 | 7 | 105 |
| Duplicate discussion row for one book and member | Doubled counts at a meetup | No unique key; check-then-insert; NULL member | DB2 | 5 | 4 | 5 | 100 |
| Autogenerate proposes dropping `books` and `attachments` after the stamp | A routine migration drops tables or fails | Stray tables and manual `ALTER` | DB5 | 5 | 4 | 4 | 80 |
| Delete fails or leaves child rows once children exist | 500 on admin delete; orphans if foreign keys are off | Bulk delete skips cascades; NO ACTION | DB8 | 4 | 3 | 5 | 60 |
| Mixed timestamp formats | Wrong sort by `created_at` | Scripts write `T`, ORM a space | DB13 | 2 | 6 | 5 | 60 |
| Failed import leaves no audit row | No record of why a run stopped | Job row rolled back | DB12 | 3 | 3 | 6 | 54 |
| "Database is locked" on an admin write | Admin sees a 500 | 5 s timeout, one writer | DB11 | 3 | 3 | 4 | 36 |

Overlaps: row 38 in §10.8 (C1) covers DB6 and part of DB1; DB12 duplicates C17.

### Open questions for the founders

1. DB1, DB2: may merge decisions be proposed for the 11 duplicate canonical groups and the 1 duplicate discussion, or do the founders review each pair?
2. DB5: drop `books` and `attachments` (both empty) or keep them? `media_type` NOT NULL in the database, or only in the model?
3. DB3: set `canonical_book_id = NULL` on the two noise rows ("MEET #98", "JULY 2026"), or delete them?
4. DB4: is the app run with `docker compose` or `uvicorn` on the host for real use? Does anyone run scripts on the host while the container is up?
5. DB9: should deleting a Source ever delete its Meetup? If not, the cascade goes.
6. DB2: for discussions with no member (1,850 rows), is "one row per (meetup, book)" the rule? That decides the unique index shape.
7. DB13: is "firstDiscussedYear" meant to sort by the first meetup date?

---

## Migrations (ecc:database-migrations)

**Date:** 2026-10-09
**Commit:** `9535f04`
**Run by:** `/ecc:database-migrations`, run in a subagent.
**Scope:** how BBB changes its schema today against the guide; a schema-vs-model drift check; the B8 procedure tested on a scratch copy; an ordered migration plan for A6, the A2 alternative, the C1 follow-up, RC2, S1 and the drift fixes.
**Method:** read `alembic.ini`, `alembic/env.py`, the baseline migration, `app/core/database.py`, `app/database/{base,models}.py`, `app/cli/main.py`, `tests/`, `.github/workflows/ci.yml` and the docs named in the brief; `git log` on `models.py` and the database file; compared the schema at commits `a7d3c52`, `427be12`, `a512472` (extracted with `git show` into scratch); copied the live database with the SQLite backup API (opened `mode=ro`); on the copy: `alembic heads/history/current/check/stamp`, PRAGMA reads, comparison with `Base.metadata`; five sketch migrations in a scratch copy of the alembic folder, offline SQL for SQLite and PostgreSQL (`alembic upgrade --sql`), the SQLite SQL applied to a further copy.
**Where commands ran:** every Alembic command and every write in the session scratchpad (`mg_audit/`), with `DATABASE_URL` set to a scratch file. The live file was opened read-only; its SHA-256 (`e3d1f989…c4befc`) was the same before and after, and its `alembic_version` still has 0 rows.
**Verified after the run:** MG6 (`tests/test_meetup97_regression.py:76` calls `init_db()` in a module fixture; `init_db` runs `create_all` on the default database).
**Not checked:** online `alembic upgrade` or `downgrade` (offline SQL only; the SQLite SQL was run by hand on a copy with foreign keys off, as on Alembic's connection); downgrade SQL not generated; no PostgreSQL server (PostgreSQL SQL is offline output); frontend code that assumes `meetup_number`. The database review ran in parallel; both drift checks agree.

### Summary

- No schema change in BBB has ever gone through a migration. The real schema source is `Base.metadata.create_all`; the 4 columns added since the first commit reached the live file by hand-run `ALTER TABLE`, with no script left in the repo (MG1).
- Drift after stamping the scratch copy: `alembic check` reports 2 tables the models no longer have (`books`, `attachments`, both empty) and 2 NOT NULL mismatches (`media_type`). Indexes and foreign keys match; `foreign_key_check` finds the 2 known dangling rows.
- B8 works on the scratch copy: stamping adds 1 row, every other count is unchanged, rollback is one `DELETE`. B8 alone is not enough: the baseline is empty, so a fresh database built with `alembic upgrade head` has no tables (MG4), and CI cannot test migrations.
- Pending changes in order: B8, the drift fix, A6, A2 (only if the founders choose the new column), S1 (code fix first, then a data backfill), the C1 unique index (only after the A4 cleanup). RC2 needs no schema change. Tested: the C1 index fails today with `UNIQUE constraint failed` (11 groups).
- `tests/test_meetup97_regression.py` runs `create_all` against the live file whenever `pytest` runs (MG6): a new model table would appear in the archive without any migration.

### Guide checklist vs BBB today

| Guide item | Status | Evidence |
|---|---|---|
| Every change is a migration, no manual SQL in production | Not met | Baseline `upgrade()` is `pass` (`alembic/versions/2026_07_22_0611-4b4cb3603d42_initial_schema.py:21-23`); `photo_url`, `pdf_url` (commit `427be12`) and `media_type`, `external_url` (`a512472`) appear tacked onto the live DDL (`updated_at DATETIME NOT NULL, media_type VARCHAR(32) DEFAULT 'book', external_url VARCHAR(1024),`); `git log --all -S "ALTER TABLE"` finds nothing (MG1) |
| Forward-only in production | Not applicable yet | No migration has ever been applied (`alembic_version` 0 rows in the live file and at `a7d3c52`, `427be12`, `a512472`) |
| Schema and data migrations separate | Not met in practice | Data repairs run as one-off scripts with no backup (S17); schema changes as hand-run SQL |
| Never edit a migration once run | Met by default | The only migration has never been applied |
| UP and DOWN, or marked irreversible | Partly | Both exist; both are `pass` |
| No long locks | Low risk at this size | Rebuilding `canonical_books` (2,783 rows) and `discussions` (2,686) took 248 ms on the copy |
| New columns nullable or with a default | Met for the hand-added columns, with drift | Live `media_type VARCHAR(32) DEFAULT 'book'` (nullable); model `nullable=False, default="book"`, no `server_default` (`models.py:233, 382`) (MG2) |
| Indexes created without blocking | Not applicable on SQLite | PostgreSQL plan: `CREATE UNIQUE INDEX CONCURRENTLY` in an autocommit block |
| Backfill as its own migration | No mechanism yet | S1 and A2 planned as separate data steps |
| Tested on a copy of production data | Never for a schema change before this run | `report_insights.md` §14.0 step 5 asks for it |
| Rollback plan documented | Partly | `report_insights.md` §14.1; no per-migration rollback |
| Expand/contract for renames and removals | Not used | `books`, `attachments` dropped from the models, left in the database (MG3) |
| SQLite batch mode (`render_as_batch=True`) | Not set | `alembic/env.py:25-29, 47-49`: `context.configure(connection=connection, target_metadata=target_metadata)` with no `render_as_batch`, `include_object` or `compare_server_default` (MG5) |
| `create_all` outside migrations | Present | `app/core/database.py:65` `init_db`, `:76-78` `reset_db`; `app/cli/main.py:38, 50, 142, 145`; `tests/test_meetup97_regression.py:76` (MG6) |

### Drift check result (models vs live schema, via the scratch copy)

Stamped scratch copy, `alembic check` (repo config, Alembic 1.20.0):

```text
Detected removed table 'attachments'
Detected removed table 'books'        (plus their 9 indexes)
Detected NOT NULL on column 'canonical_books.media_type'
Detected NOT NULL on column 'discussions.media_type'
FAILED: New upgrade operations detected: ...
```

PRAGMA vs `Base.metadata` (`mg_audit/drift.py`):

```text
model tables: 24  live tables: 27
in live not model: ['alembic_version', 'attachments', 'books']
in model not live: []
  canonical_books.media_type: nullable model=False live_notnull=False live_default='book'
  discussions.media_type: nullable model=False live_notnull=False live_default='book'
```

Columns: all present; 0 NULLs in either `media_type`. Indexes: match; none missing that matter (judgment); 26 `ix_<table>_id` duplicate the primary-key autoindex (MG10). Foreign keys: match, all NO ACTION. `integrity_check` = `ok`; `foreign_key_check` = 2 rows (`imported_books` 2729, 2730), present since `427be12` (MG9). The documented canonical uniqueness (`imperative_decisions.md` §2.A.4) is not enforced: 11 groups share `(normalized_title, author_id)` (MG8).

**B8 precondition verdict:** the drift is small and recorded and does not block stamping. Resolve it with the first real migration (plan row 3) and the `books`/`attachments` decision, never by hand.

### B8 procedure (tested on scratch)

**Preconditions:** stop writers (`report_insights.md` §14.0 step 1); back up with the SQLite backup API and check it (`integrity_check` = `ok`, §13 counts equal); record the drift (done).

**Commands** (repo root; `DATABASE_URL` must name the intended file):

```bash
export DATABASE_URL="sqlite:///./book_club_archivist.db"   # explicit, never rely on .env
uv run --no-project --with-requirements requirements.txt alembic current   # expect: no revision line
uv run --no-project --with-requirements requirements.txt alembic heads     # expect: 4b4cb3603d42 (head)
uv run --no-project --with-requirements requirements.txt alembic stamp 4b4cb3603d42
uv run --no-project --with-requirements requirements.txt alembic current   # expect: 4b4cb3603d42 (head)
uv run --no-project --with-requirements requirements.txt alembic check     # expect: the drift list above, nothing else
```

**Output on the scratch copy:**

```text
$ alembic heads    -> 4b4cb3603d42 (head)
$ alembic history  -> <base> -> 4b4cb3603d42 (head), Initial schema
$ alembic current  -> INFO ... Will assume non-transactional DDL.        (no revision)
$ alembic check    -> FAILED: Target database is not up to date.          (before stamp)
$ alembic stamp 4b4cb3603d42 -> INFO ... Running stamp_revision  -> 4b4cb3603d42
$ alembic current  -> 4b4cb3603d42 (head)
scratch alembic_version: [('4b4cb3603d42',)]   live alembic_version: []
count diffs pristine vs stamped: {'alembic_version': (0, 1)}
$ alembic upgrade 4b4cb3603d42:head --sql  -> (no statements: nothing to run)
```

**Rollback** (tested on a further copy): `DELETE FROM alembic_version WHERE version_num='4b4cb3603d42'` leaves 0 rows; `alembic current` shows no revision. Data at risk: one row.

**Needed with B8 (MG4):** on a fresh database, `alembic upgrade head --sql` emits only `CREATE TABLE alembic_version (...)` and the version insert, so a database built from migrations has no tables and every later migration would fail on a fresh database, in CI or on PostgreSQL. Fix in the same task: fill `4b4cb3603d42.upgrade()` with `create_table` calls reproducing the stamp-time schema (24 tables, `media_type` nullable with `server_default 'book'`) and `downgrade()` with the drops. Editing the migration is safe because no database has applied it and every stamped database already has that schema (judgment; founder approval, question 1). Do not copy `docs/reference/migrations/aa4ad2c46b33_initial_canonical_schema.py` into `alembic/versions`: it is a second root (`down_revision = None`) and its types (for example `DateTime(timezone=True)`) do not match the live DDL.

**CI** (`.github/workflows/ci.yml:18-20` today: install, `python -c "import app.api.main"`, `pytest -q`). After the baseline is filled:

```yaml
- run: alembic upgrade head && alembic check
  env: { DATABASE_URL: "sqlite:///./ci_fresh.db" }
```

While the database stays in git (F8), a second step can test migrations on production data: copy it with the backup API, then `alembic upgrade head && alembic check && sqlite3 copy "pragma foreign_key_check"` (fails today on the 2 dangling rows, MG9; fix those first).

### Ordered migration plan

| Order | Change | Type | Depends on | Batch mode (SQLite) | Downgrade | PostgreSQL note |
|---|---|---|---|---|---|---|
| 1 | B8: back up, stamp `4b4cb3603d42` | Version row only | Backup (§14.0) | No | Delete the row | Same command |
| 2 | Fill the empty baseline; `env.py`: `render_as_batch=True`, `include_object` skipping `books`/`attachments` until decided; add the CI step | Code | 1 | No | Revert the commit | Baseline becomes the PostgreSQL create script |
| 3 | `mg01`: `media_type` NOT NULL on `canonical_books`, `discussions` (drift fix) | Schema | 1, 2 | Yes (rebuild) | Batch back to nullable | `ALTER COLUMN … SET NOT NULL` |
| 4 | Fix the 2 dangling `imported_books.canonical_book_id` rows | Data (approval) | 1 | No | Restore backup | Same |
| 5 | A6 expand, `mg02`: `meetup_number` nullable plus `CHECK (meetup_number IS NOT NULL OR date IS NOT NULL)` | Schema | 1 to 3; id-based admin routes first (MG11) | Yes | Batch back to NOT NULL; refuse while NULL numbers exist | `DROP NOT NULL` instant; CHECK `NOT VALID` then `VALIDATE` |
| 6 | A2 alternative only, `mg03`: `sources.raw_text_full TEXT NULL`, then a separate fill step | Schema, then data | A1 code fix; founders choose this over the in-place update | No to add; yes to drop | Batch `drop_column` | `ADD COLUMN` nullable is instant |
| 7 | RC2: code hunk 4; no migration | Code | RC1 fix | n/a | Revert | n/a |
| 8 | S1: code fix (A9), then `mg04` backfill | Data | A9 merged first | No | Irreversible; restore backup | Plain `UPDATE` |
| 9 | C1 follow-up, `mg05`: unique index on `(normalized_title, coalesce(author_id,''))` | Schema | A4, C1 unification, founders' answer on same-title books | No | `drop_index` | `CREATE UNIQUE INDEX CONCURRENTLY` outside the transaction |
| 10 | Contract: drop `books`, `attachments` | Schema (DROP needs approval) | 2; founders' decision | No | Recreate from the baseline | `DROP TABLE` |

Offline SQL for sketches `mg01` to `mg05` was generated in scratch (`mg_audit/sketch/`; `upgrade_sqlite.sql` 165 lines). Offline batch mode cannot reflect the table, so the sketches pass `copy_from` reflected from the pristine copy; real migrations run online and do not need it. Applied to a stamped copy (foreign keys off, as on Alembic's connection):

```text
4b4cb3603d42 -> mg01: ok (248 ms); version=[('mg01',)]; fk_violations=2
mg01 -> mg02: ok (10 ms); version=[('mg02',)]; fk_violations=2
mg02 -> mg03: ok (6 ms);  version=[('mg03',)]; fk_violations=2
mg03 -> mg04: ok (19 ms); version=[('mg04',)]; fk_violations=2
mg04 -> mg05: FAILED: UNIQUE constraint failed: index 'uq_canonical_books_norm_author'
count diffs: {}        integrity: ('ok',)
```

After `mg01` the drift script shows no column differences.

- **Row 3, `mg01`:** SQLite cannot change NOT NULL in place, so batch mode rebuilds the table (`CREATE TABLE _alembic_tmp_canonical_books (... media_type VARCHAR(32) DEFAULT 'book' NOT NULL ...); INSERT INTO ... SELECT ...; DROP TABLE canonical_books; ALTER TABLE _alembic_tmp_canonical_books RENAME TO canonical_books;` then all 8 indexes recreated). The model gets `server_default="book"` in the same commit. Smaller alternative: relax the model to `nullable=True` (judgment: prefer `mg01`). PostgreSQL: `ALTER TABLE canonical_books ALTER COLUMN media_type SET NOT NULL;`.
- **Row 5, `mg02` (A6 expand):** first id-based admin routes next to `PUT /admin/meetups/{meetup_number}` (`main.py:1031`) and `.../pdf` (`:1158`), and None-safe sorting (`:951`; 49 `meetup_number` references in `main.py`); then `mg02`; then dated meetups without a number. No contract step: `ix_meetups_meetup_number` already accepts many NULLs on both engines. Tested: two dated meetups with no number inserted; a row with neither was rejected (`CHECK constraint failed: ck_meetups_number_or_date`). A partial unique index adds nothing (judgment). If the founders choose option (c), this row disappears.
- **Row 6, `mg03`:** `ALTER TABLE sources ADD COLUMN raw_text_full TEXT;`. The fill reads files, so it is a reviewed script with a dry run and the A2 prefix check, not SQL in a migration (judgment). The smallest path needs no schema change: A1, then the in-place prefix-checked update of the 30 rows.
- **Row 7, RC2:** `PossibleDuplicate.candidate_canonical_id` is `nullable=False` with a plain foreign key (`models.py:299-301`); `ondelete="CASCADE"` would silently delete review rows, `SET NULL` needs the column nullable, both need a rebuild. Hunk 4 fixes it in code: prefer that. RC4 is ORM collection handling and needs no migration.
- **Row 8, `mg04` (S1 backfill):** measured, 51 of the 52 meetups with no `source_id` have sources with the same `meetup_number`, each mapping to exactly 1 distinct `file_path`. The rule "earliest source row per meetup" is a judgment call. On the copy: meetups without a source drop from 52 to 1 (meetup 99, ingested by script); discussions from 2,541 to 62 (all meetup 99). Irreversible; run only after the A9 code fix.
- **Row 9, `mg05`:** `coalesce(author_id,'')` because 182 canonicals have no author. SQLite: `CREATE UNIQUE INDEX uq_canonical_books_norm_author ON canonical_books (normalized_title, coalesce(author_id, ''));`. PostgreSQL: `COMMIT; CREATE UNIQUE INDEX CONCURRENTLY uq_canonical_books_norm_author ON canonical_books (normalized_title, coalesce(author_id, '')); BEGIN;`. Fails today on the 11 groups; order: C1, re-measure, A4, then the index; later drop the redundant `ix_canonical_books_norm_author`.
- **Transactions on SQLite:** every Alembic run printed `Will assume non-transactional DDL`; the SQLite offline SQL has no `BEGIN`/`COMMIT` (PostgreSQL wraps everything in one). A batch rebuild failing between `DROP TABLE` and `RENAME` could leave the table missing (judgment, not reproduced). Always back up first; consider `transaction_per_migration=True` with SQLite DDL in a transaction (needs a test).

### Findings

| ID | Severity | file:line | Finding | Evidence | Impact | Smallest fix | Effort |
|---|---|---|---|---|---|---|---|
| MG1 | High | `app/core/database.py:65`; live `sqlite_master` for `meetups`, `canonical_books`, `discussions` | Schema changes reach the live database as hand-run SQL; the repo keeps no record | DDL tail `updated_at DATETIME NOT NULL, photo_url VARCHAR(512), pdf_url VARCHAR(512),`; `a7d3c52` has no `photo_url`, `427be12` has it, `a512472` adds `media_type`; `git log --all -S "ALTER TABLE"` empty | Schema history cannot be replayed or reviewed; drift follows | B8, then every change as an Alembic migration | S |
| MG2 | Medium | `app/database/models.py:233, 382` | Model and live schema disagree on `media_type` (same as DB5) | `alembic check`: `Detected NOT NULL on column 'canonical_books.media_type'` and `'discussions.media_type'`; 0 NULLs | `create_all` builds a different schema; the first autogenerate includes it | `mg01` plus `server_default="book"` | XS |
| MG3 | Low | live tables `books`, `attachments` | Two tables with no model | `in live not model: ['alembic_version', 'attachments', 'books']`; 0 rows; present since `a7d3c52` | Autogenerate drafts `DROP TABLE`; `alembic check` never passes | `include_object` now; founder-approved drop later | XS |
| MG4 | High | `alembic/versions/2026_07_22_0611-4b4cb3603d42_initial_schema.py:21-23` | Empty baseline: migrations cannot build a database | Fresh `upgrade head --sql` emits only `CREATE TABLE alembic_version` and the version insert | No CI test of migrations; a PostgreSQL move or new install gets no tables | Fill the baseline with the stamp-time schema | S |
| MG5 | Medium | `alembic/env.py:25-29, 47-49` | No `render_as_batch`, no `include_object`; SQLite runs without a transaction; foreign keys off during migrations | `context.configure(connection=connection, target_metadata=target_metadata)`; `Will assume non-transactional DDL`; `env.py` uses `engine_from_config`, so the pragma listener (`database.py:19-24`) is not attached (judgment from code) | Autogenerate writes plain `ALTER` that SQLite rejects; a failed rebuild may leave a half state; foreign-key breaks go unnoticed | `render_as_batch=True`, `include_object`; `pragma foreign_key_check` after each migration | XS |
| MG6 | Medium | `tests/test_meetup97_regression.py:76`; `docs/AGENT_RULES.md:168` | A test module runs `create_all` on `settings.DATABASE_URL`, the live file by default (and CI's checked-out copy) | `def db_session(): init_db()` and `with get_db_session() as session:`; AGENT_RULES says "Tests are safe: … never the archive file". **Verified** | `pytest` would create any new model table in the archive outside a migration | Point the test at a backup copy or drop `init_db()` from it; correct AGENT_RULES §5.2 | XS |
| MG7 | Low | `docs/AGENT_RULES.md:181`; `docs/BBB_PRD_TRD.md` §5.2; `docs/CODEMAPS/data.md:13` | Docs say the migration folder is empty and Alembic unused | `the migration folder is empty and the schema comes from Base.metadata.create_all` | Agents follow a stale rule | Update the three lines when B8 lands | XS |
| MG8 | Medium | `models.py:253-255`; `imperative_decisions.md` §2.A.4 | Documented canonical uniqueness not enforced (same as DB1) | Plain index only; 11 groups, 22 rows; `mg05` on the copy: `UNIQUE constraint failed` | Duplicates enter freely (C1, row 38) | `mg05` after A4 and C1 | S |
| MG9 | Low (known) | `imported_books` rowids 2729, 2730 | Two foreign keys point to deleted canonicals (same as DB3) | `pragma foreign_key_check` 2 rows; present in `427be12` and later | Blocks a strict foreign-key check in CI | Null or delete both (approval), plan row 4 | XS |
| MG10 | Info | `app/database/base.py:43` | 26 `id` indexes duplicate the primary-key autoindex (same as DB15) | `UUIDMixin.id` `index=True` | Small extra write cost | Leave; revisit on PostgreSQL | XS |
| MG11 | Medium | `app/api/main.py:951, 1031, 1158` | Admin routes address meetups by number, so a meetup without one cannot be edited | `@app.put("/admin/meetups/{meetup_number}")`; `filter(Meetup.meetup_number == meetup_number)` | A6 data unreachable from admin | Id-based routes before `mg02` | S |

### Already-known issues

| ID | Status | Note |
|---|---|---|
| B8 | Confirmed | Live `alembic_version` 0 rows; the stamp works on scratch; comes with MG4 |
| F8 | Confirmed (not re-checked) | The CI production-data test depends on the tracked file; switch to the fresh-database step if F8 removes it |
| C1 | Confirmed, extended | `(normalized_title, author_id)` duplicates 11 groups / 22 rows; title only 16 / 32 (matches A4); unique index blocked (MG8) |
| RC1, RC2 | Confirmed (code) | RC2 needs no schema change; hunk 4 preferred |
| RC4, C6 | Confirmed | 369 unlinked; ORM issue, no migration |
| A1, C13 | Confirmed | 30 sources at 2,000 characters; the column is `TEXT`, no schema change needed |
| A6 | Confirmed | `NOT NULL` plus unique index; `mg02` tested; see MG11 |
| S1 | Confirmed | Backfill measured: 51 of 52 recoverable |
| 15 of 27 tables empty | Confirmed | Including `alembic_version`, `books`, `attachments` |
| D25, D26 | Confirmed | `aliases` 1 row, `book_relations` 0 |
| Dangling refs (`book_count&details_issues.md:119`) | Confirmed | MG9 |

### Proposed FMEA rows (merged into report_insights.md §10.8 on 2026-10-09: rows 68 to 91, plus re-scores of rows 3 and 22)

| Failure mode | Effect | Cause | S | O | D | RPN |
|---|---|---|---:|---:|---:|---:|
| Hand-run `ALTER` on the live file differs from the model | `create_all`, tests and the live database disagree; later migrations misfire | No migration path used (MG1, MG2) | 5 | 5 | 6 | 150 |
| `pytest` creates a new table in the archive | Schema changes outside any migration; drift | `init_db()` in a test module (MG6) | 4 | 4 | 7 | 112 |
| A database built from migrations has no tables | New install, CI or PostgreSQL move fails or runs on an empty schema | Empty baseline (MG4) | 5 | 6 | 3 | 90 |
| Batch rebuild fails mid-way on SQLite | Table missing or half-copied | Non-transactional DDL, no backup (MG5) | 8 | 2 | 3 | 48 |
| Autogenerated migration drops `books`/`attachments` unreviewed | Unplanned DROP (empty tables today) | No `include_object` (MG3) | 3 | 3 | 4 | 36 |

Existing row 7 (migration on an unstamped database, RPN 140) drops to 7 × 1 × 5 = 35 after B8, as §14.3 expects; with the baseline filled and the CI step, D drops further (judgment: 7 × 1 × 2 = 14).

### Open questions for the founders

1. May the empty baseline `4b4cb3603d42` be filled with the stamp-time schema? It has never been applied, but it is still an edit to a migration. The alternative is to keep it empty and test migrations only on a copy of the tracked database.
2. `books` and `attachments` (0 rows each): drop them in a later migration (needs approval), or keep and exclude them from checks?
3. `media_type`: enforce NOT NULL in the database (`mg01`), or relax the model?
4. A6: (a) nullable number plus the number-or-date check, (b), or (c) confirm the inferred numbers so no schema change is needed?
5. A2: in-place prefix-checked update of the 30 rows (no schema change), or the append-only `raw_text_full` column?
6. S1: is "earliest source row per meetup" the right provenance rule? How should meetup 99 (no source row) be recorded?
7. C1 index: are the same title by different authors separate books (S10)? Should books with no author count as one author for uniqueness?
8. Is a move to PostgreSQL planned? If so, the baseline and CI step become the PostgreSQL path, and `CONCURRENTLY` matters.
9. May the two dangling `imported_books` references be cleared (plan row 4)?

---

## Parsing strategy (ecc:regex-vs-llm-structured-text)

**Date:** 2026-10-09
**Commit:** `ce2c176` (the run started at `9535f04`; `ce2c176` is docs only and touches no file under `app/`, `tests/` or `sources/`).
**Run by:** `/ecc:regex-vs-llm-structured-text`, run in a subagent.
**Scope:** `app/parsers/txt_parser.py`, `pdf_parser.py`, `scanner.py`, `utils.py`; `app/schemas/intermediate.py`; the source files in `sources/` (32 PDFs, `BBB Meetup-9.txt`, `meetup_numbers.txt`); the parts of `app/pipeline/full_import.py` that consume parser output (lines 38-140, 236-360, 530-588).
**Method:** code and docs read; pure parser functions run in memory on sample strings and on text read from `sources/`; database opened read-only; for accuracy, a random sample of 30 source lines per parser judged by hand against the source text (judgment) and compared with the stored `imported_books` row; all 32 filenames checked for the scanner. Scripts in the session scratchpad (`rx_audit/`: `extract_pdfs.py`, `pdf_paths.py`, `sample.py`, `probes.py`, `db_suspects.py`; cached PDF text in `pdftext.json`), run with the system interpreter (`python3 -I`, Python 3.13.5, pdfplumber 0.11.10, pydantic 2.13.4, already installed). No import, no script in `scripts/`, no external API or LLM was run.
**Verified after the run:** RX2 (`sources/70 - …` gives 101 words with default `extract_text()` and 281 with `x_tolerance=1.5`); RX4 (read-only: 236 `imported_books.raw_title` end in `(`; 240 `resources.url` end in `)`).
**ID note:** the agent's regex inventory labels (T1 to T9, P1 to P12, S1 to S15, U1 to U3) are local to this section; P and S here are not the FastAPI P or silent-failure S findings.
**Not checked:** whether the 240 Goodreads URLs ending in `)` still resolve (needs a network call); the columns of the empty `validation_errors` table; the parser version that built today's `imported_books` rows (not in git, `book_count&details_issues.md` §3.3); recall of TXT member extraction; OCR quality; current LLM prices (cost is given as token volume only); `full_import.py` outside the line ranges above, so the "never mutate" and "metrics" rows rest on the lines read.

### Summary

- **Fields with a fixed shape are mostly reliable.** TXT meetup number and date: 32 of 32 sections correct; the scanner finds the meetup number in 19 of the 20 filenames that contain one. The weak point is PDF dates: 27 of 32 PDFs state the full date in their text, the parser reads none of them, takes the month from the filename and stores the day as the 1st.
- **Free-text fields are far below the guide's 95 % bar.** Share of sampled lines handled wrongly: TXT 6 of 30 (20 %), flat PDF 15 of 30 (50 %), member-grouped PDF 19 of 30 (63 %). The guide's next step would be an LLM for the edge cases, but BBB's smaller steps (a text cleaner, tests, a per-file table) are not built yet, so those come first.
- **The guide's architecture is mostly missing.** A regex stage exists; there is no text cleaner and no programmatic confidence score (the `extraction_confidence` values are fixed numbers), no metric of how many lines each regex parsed, and 0 parser tests.
- **Two cheap fixes need no new tool:** `page.extract_text(x_tolerance=1.5)` restores the missing spaces in all 6 affected PDFs (#70: 101 words become 281); pdfplumber's built-in `extract_table()` returns member, number, title and author as separate columns for the ruled-table PDFs (#93 page 1: 18 rows).
- **The member grouping the PDF parser works out is thrown away:** the pipeline never writes `member_id`; all 836 member links in the database came from admin routes and scripts, so a re-import cannot reproduce them.
- **An LLM step fails PRD §7.1 today (judgment):** about one PDF a month, and a fixed template at the source removes the free-text problem for new meetups. Reconsider only if the OCR backlog brings many free-form scans.

### Guide vs BBB

| Stage or practice | Status | Evidence |
|---|---|---|
| Regex parser first | Present | `txt_parser.py:28-143`, `pdf_parser.py:40-312`, `scanner.py:61-200` |
| Text cleaner (noise, page numbers, artefacts) | Partial | One bullet strip only (`pdf_parser.py:56` `^[•●\-\d\.]+`); misses `∙` and U+F0B7 (53 stored titles start with a glyph); no page-footer removal (`Meeting #80  BBB Jan 2025 1` read as a line); no joining of wrapped lines; default spacing glues words in 6 of 32 PDFs |
| Confidence scorer | Missing | Fixed `extraction_confidence=0.95` / `0.90` (`txt_parser.py:252, 321`) and `0.85` / `0.80` (`pdf_parser.py:358, 405, 434`); the database holds only these 4 values across 1,829 sources |
| Confident results pass, the rest go to a validator | Missing | Every parsed line becomes an `ImportedBook` (`full_import.py:282-305`), then auto-merge (RC1) |
| LLM validator (Haiku class) | Absent | None in code or requirements; acceptable under PRD §7.1 until an LLM is admitted |
| Start with a regex baseline | Met | As above |
| Score confidence in code | Not met | Fixed values only |
| Never mutate parsed items | Met in parsers | Parsers build new dicts and Pydantic models; records are only read in the pipeline lines read (the merge's in-place changes are C6, out of scope) |
| Test-driven parsers | Not met | 0 tests call `txt_parser`, `pdf_parser` or `scanner`; `tests/test_meetup97_regression.py:25` imports only the normalizers |
| Log metrics (success rate, LLM calls) | Not met | `PipelineStats` (`full_import.py:38-53`) counts created rows and warnings only |
| Anti-pattern: all text to an LLM | Avoided | n/a |
| Anti-pattern: regex on free-form text | Present | Member names pulled from TXT narrative (`txt_parser.py:273-288`); member grouping on PDF text that has lost its layout (`pdf_parser.py:128-231`) |
| Anti-pattern: no confidence scoring | Present | As above |
| Anti-pattern: edge cases untested | Present | 0 parser tests |
| Decision framework | Below the bar | TXT book lists mostly follow one pattern (`Title – Author`) and reach 80 % line accuracy; the PDFs have several layouts across 31 text PDFs and reach 37 to 50 % |

### Regex and heuristic inventory

Probes on sample strings (`probes.py`); the last column is how many source files depend on each pattern.

| ID | file:line | Extracts | Failure cases (probe output) | Files depending |
|---|---|---|---|---|
| T1 | `txt_parser.py:28-31` `BOUNDARY_RE` | Meetup number and section split | Prose also splits: `"We loved BBB meetup 3 times"` gives `3` | 1 file, 32 sections |
| T2 | `txt_parser.py:38-41` `DATE_RE` + `utils.py:35-57` | Meetup date | `"24th Feb 2018"` no match; `"Feb 24 2018"` matches but parses to `None`; `"Book 2 2019"` matches | 1 file; 32 of 32 correct |
| T3 | `txt_parser.py:206-222` known venues (substring) | Venue | Any other venue gives `"Unknown"` | 1 file; 31 of 32 |
| T4 | `txt_parser.py:231` venue and date gate | Start of the book list | With venue `Unknown`, `book_start_idx` stays 0, the loop meets the boundary line and stops (`:296-297`), so the meetup gets 0 books (#25) | 1 file |
| T5 | `txt_parser.py:51-86` `_is_book_line` | First book line only | `"The Hobbit"` gives False ("the" is in the blocklist); after the first book line every non-empty line is parsed with no check (`:291-301`) | 1 file |
| T6 | `txt_parser.py:48`, `pdf_parser.py:23` `goodreads\.com/\S+` | Goodreads URL | `\S+` swallows the closing `)`: `"Train to Pakistan (https://…Train_to_Pakistan)"` gives title `"Train to Pakistan ("` and URL `…Train_to_Pakistan)` | TXT and 9 PDFs with URLs (judgment) |
| T7 | `txt_parser.py:108-143` 7 ordered patterns, first match wins | Title, author | `" by "` beats the dash: `"Stand by Me - Stephen King"` gives `("Stand", "Me - Stephen King")`; `"Death by Black Hole – Neil deGrasse Tyson"` gives `("Death", …)`; trailing chatter kept as author | 1 file, 1,767 records |
| T8 | `txt_parser.py:114, 154` | Series name | `"Wolves of the Calla (The Dark Tower #5)"` gives series `"The Dark Tower"`; the title keeps the parenthesis | 1 file |
| T9 | `txt_parser.py:273-276` member patterns, `re.I` | Member names from narrative | `re.I` makes `[A-Z][a-z]+` case-blind; `:283` keeps capitalised pairs; 5 members produced, 1 not a person (`"Bibliophiles Bangalore"`, judgment) | 1 file |
| P1 | `pdf_parser.py:337` `Meetup?\s*#?(\d+)` | Meetup number from text | `"BBB #092"`, `"Meet #93"`, `"Meet-up 72"` give `None`; `"Meetup 2 of the year"` gives `2` | 12 PDFs without a number in the filename; recovers #65 and #99 |
| P2 | `pdf_parser.py:342-348` | Venue | `"@Samagatha, Church Street"` gives `Bookworm`; `"Venue: Atta Galatta, Church Street"` gives `Bookworm`; no keyword gives `Bookworm` | All 31 text PDFs |
| P3 | `pdf_parser.py:56` bullet strip | Cleaning | Misses `∙` and U+F0B7; strips leading digits (`"1984 George Orwell"` gives `("George Orwell", None)`) | 25 flat-path PDFs |
| P4 | `pdf_parser.py:62` ", by" | Title, author | `"Death by Black Hole, by Neil deGrasse Tyson"` gives `("Death", "Black Hole, by Neil deGrasse Tyson")` | Flat and member paths |
| P5 | `pdf_parser.py:68` `(Capitalised)` | Author in parentheses | `"Dune (Dune Chronicles)"` gives author `Dune Chronicles` (C4) | Flat and member paths |
| P6 | `pdf_parser.py:79-91` last two capitalised words = author | Author | C4: `"The God of Small Things"` gives `("The God of", "Small Things")`; `"A Man Called Ove"` gives `("A Man", "Called Ove")`; `"Never Let Me Go"` gives `("Never Let", "Me Go")` | Flat and member paths |
| P7 | `pdf_parser.py:146-153, 196-199` `MEMBER_RE`, `ROMAN_MEMBER_RE`, next-line check | Member header | Misses glued `"DeeptiSrivatsan"`, ALL CAPS `"MADHUSUDHAN"` and `"NIVEDITA .G"`, and `"Shivankar:"`; accepts `"Rebel Sultans"` before a numbered line | 6 member-path PDFs |
| P8 | `pdf_parser.py:156-158` `BOOK_DASH_RE` | Title, author with an en or em dash | Hyphen not accepted; `" - X"` falls to P4 to P6 | Member path |
| P9 | `pdf_parser.py:161-166` `HEADER_RE` | Header skip | `"@ The Bookworm, 15th June 2025"` and `"Book & Media Mentions by Members"` pass as books | Member path |
| P10 | `pdf_parser.py:249-264` `NOISE_PATTERNS` | Header skip | C5: drops `"Harry Potter and the Philosopher's Stone by J.K. Rowling"`, `"Summary of a Life…"`, `"This Time Is Different…"`, `"Authority…"`; keeps `"BBB AUG 2025 - BOOKS DISCUSSED"` and `"BOOKS MENTIONED"` | 25 flat-path PDFs |
| P11 | `pdf_parser.py:281, 285, 290, 299` length < 5, Roman prefix, number prefix | Line filters | `"It"`, `"Dune"`, `"Emma"` give `[]` | Flat path |
| P12 | `pdf_parser.py:379` `len(member_books) >= 3` | Path switch | At least 6 flat-path files have member headers in a form P7 misses (#71 `1) Smriti`, #74, #80 `Name:`, #93 table, DEC and SEPT 2025 ALL CAPS), so their member names become books | Member path for 6, flat for 25 of 31 text PDFs |
| S1 to S14 | `scanner.py:74-194`, 14 ordered regexes | Meetup number, month, year | 3 regexes match no file (`:101`, `:170`, `:178`; the last two shadowed by `:146`); 6 match exactly one file each; `"BBB 99, Books Discussion List.pdf"` matches none; `"BBB 100 - Sep 2026.pdf"` gives no number; the catch-all `:186` gives month `"Scan"` for `"Scan 2017 notes.pdf"` | 32 PDFs: 7, 6, 1, 0, 4, 1, 2, 6, 1, 1, 0, 0, 1, 1 per regex in order; 1 unmatched |
| S15 | `scanner.py:16-26` 2-digit year pivot | Year | `"31"` gives 1931; docstring says 15 (K14, C19) | 1 file (`SEP 24`) |
| U1 | `utils.py:35-57` `parse_meetup_date` | Date | `"SEPT 2025"`, `"24-3-2024"` give `None`; month-only input gives day 1 | All PDFs |
| U2 | `utils.py:7-14` `normalize_title` | Dedup key | `"ಸಾರ್ಥ"` gives `""` (K13) | All |
| U3 | `utils.py:66-71` `extract_goodreads_id` | Goodreads ID | `/series/41-x` gives `None` (correct) | TXT and URL PDFs |

### Field reliability (from the hand-judged samples)

| Field | Structured or free text | Parser | Measured accuracy |
|---|---|---|---|
| Meetup number | Structured | TXT boundary | 32 of 32 sections |
| Meetup number | Structured | Filename scanner | 19 of 20 filenames that contain a number; `BBB 99, …` missed, recovered by P1; #92 stated only in text (`BBB #092`) missed (known) |
| Meetup date | Structured | TXT | 32 of 32 full dates match the database |
| Meetup date | Structured | Scanner + `parse_meetup_date` | Month and year for 29 of 32 (`SEPT 2025`, `BBB 85`, `BBB 99` fail); day correct for 1 of 32 (`30_12_2023`); the full date is in the PDF text for 27 of 32 and never read |
| Venue | Semi-structured | TXT | 31 of 32 (#25 `Unknown`) |
| Venue | Semi-structured | PDF | Of 20 numbered PDF meetups: 13 match a venue word in the text, 1 wrong (#75 `@Samagatha` stored as Bookworm), 6 defaulted with no evidence (#71, 74, 80, 82, 97, 98) |
| Goodreads URL | Structured | TXT | 5 of 5 captured, 3 of 5 with a stray `)`; database: 240 of 542 resource URLs end in `)` |
| Goodreads URL | Structured | PDF member path | 1 of 7 sampled entries; URLs on their own line are dropped |
| Title | Free text | TXT | 24 of 27 book lines (89 %) |
| Title | Free text | PDF flat | 13 of 19 (68 %) |
| Title | Free text | PDF member path | 7 of 15 (47 %); 14 of 15 if glued words are ignored |
| Author | Free text | TXT | 13 of 14 lines that name one (93 %) |
| Author | Free text | PDF flat | 14 of 17 (82 %) |
| Author | Free text | PDF member path | 6 of 13 (46 %); 12 of 13 if glued words are ignored |
| Book vs not-book | Free text | TXT | 2 false positives in 30 lines |
| Book vs not-book | Free text | PDF flat | 8 of 11 non-book lines emitted as books |
| Book vs not-book | Free text | PDF member path | 3 of 3 emitted |
| Member grouping | Free text / layout | PDF member path | Headers detected 5 of 6; attribution 14 of 15 book lines; flat path: none; pipeline: none stored |
| Member grouping | Free text / layout | TXT narrative | 4 of 5 are people (judgment); recall not measured |

### Accuracy measurement

**Method.** Sampling rule: all non-empty source lines in scope per parser, `random.Random(20261009).sample(lines, 30)`; repeat with `sample.py txt|flat|member` from the repo root. Scope: TXT 1,974 non-empty lines of `BBB Meetup-9.txt`; PDF flat 2,144 lines from the 25 flat-path PDFs (#97 excluded, 159 characters); PDF member-grouped 544 lines from #70, 72, 75, 76, 82, 85; filename scanner all 32 filenames (census). A line counts as wrong if any of book-or-not, title, author, Goodreads URL or member is wrong (judged by hand). Faithfulness: line-by-line flat parsing equals the whole-file result on all 25 files (asserted); a copy of the member loop reproduces `_extract_member_books` exactly on all 6 files (asserted). Each line was also looked up in `imported_books` by raw title for the same file.

**Results** (95 % Wilson intervals, computed by hand):

| Parser | Lines wrong | Error rate (95 % interval) | Agrees with database |
|---|---|---|---|
| TXT | 6 of 30 | 20 % (10 to 37 %) | 30 of 30 |
| PDF flat | 15 of 30 | 50 % (33 to 67 %) | 19 of 19 rows found; 6 parser rows have no database row |
| PDF member-grouped | 19 of 30; 12 of 30 if words were not glued | 63 % (46 to 78 %) | 15 of 15 rows found |
| Filename scanner (census) | Number: 1 of 32 missing; day of month: 31 of 32 missing | 3 % (number) | Database dates on the 1st for 10 meetups (known) |

The stored PDF rows come from a parser run not in git: current per-file counts differ from the stored counts in 23 of 31 imported PDFs (for example #80: 116 parsed today against 85 stored), so the database is not a reliable reference for PDF accuracy.

**Examples of errors (input, then output):**
- TXT URL: `"Train to Pakistan (https://www.goodreads.com/book/show/785454.Train_to_Pakistan)"` (L699) gives title `"Train to Pakistan ("`, URL ending `)` (also L776, L791); database: 236 imported titles end in `(`, 0 canonical titles do.
- TXT header as a book: `"Books discussed:"` (L1499), in 9 sections.
- TXT author with chatter: `"Notes of a Dirty Old Man - Charles Bukowski...i hope you are keeping track of all the data im giving you, cuz more is yet to vome"` (L1924); the tail is stored as `raw_author`.
- TXT mention as a book: `"Books by Saul Bellow"` (L2073) gives `("Books", "Saul Bellow")`.
- Flat header as a book: `"BBB AUG 2025 - BOOKS DISCUSSED"` gives `("BBB AUG 2025", "BOOKS DISCUSSED")`.
- Flat members as books: `"MADHUSUDHAN"`, `"SINDHUJA"`, `"KRISHNA"` (SEPT 2025), `"ANUJ .N"`, `"PRIYANKA .B"` (DEC 2025).
- Flat bullet glyph kept: `" Ella Minnow Pea by Mark Dunn"` gives title `" Ella Minnow Pea"`.
- Flat two columns as one: `"The Right Stuff Tom Wolfe Book https://…"` gives `("The Right Stuff Tom", "Wolfe Book")`; 32 canonical rows have an author ending in `Book`.
- Flat wrapped lines: `"The Wonderful Story of Henry Sugar and six more, by"` (author on the next line); `"Beef, Brahmins and Broken Men, by BR Ambedkar (ann. Alex"` gives author `"BR Ambedkar (ann. Alex"`.
- Member path glued words: `"4. TheMemoirsofValmikiRao(LindsayPereira)"` (7 of 30 sampled lines).
- Member path invented author (C4): `"29. The Impending Blindness of Ellie Scott"` gives `("The Impending Blindness of", "Ellie Scott")`.
- Member path missed header: `"DeeptiSrivatsan"` (#75 L56) is emitted as a book under Shivankar, and books 18 to 20 that follow are filed under Shivankar.
- Member path URL on its own line dropped (6 of 30 lines).
- Member path section header as a book: `"Book & Media Mentions by Members"`; the next lines are filed under Leah.
- Carried into Layer 3: `Irene 1` by `Beartown FrederikBackman`, `Title Author` by `Type Link`, `TheLunchBox,movie`; `Anuj` became a canonical book and enrichment attached the author `Meena Nayyar`.

### Options per field (smallest first)

| Field | 1. Tighter regex with tests | 2. Per-file override table | 3. Structured input at source | 4. LLM on free text plus review queue |
|---|---|---|---|---|
| Meetup number | One pattern `(?:BBB\|Meet(?:-?up\|ing)?)\s*[-#]?\s*0*(\d{2,3})\b` on filename, then text; test all 32 filenames | `sources/overrides.csv` (file, number, date, venue, layout) for the 12 files without a number | Filename `BBB-100_2026-09-27_Bookworm.pdf` | Not needed |
| Date | Read the first full date in the PDF text (27 of 32 have one); add `%d-%m-%Y`, `Sept`; store month and year only when no day exists, never the 1st | Same file | Same filename | Not needed |
| Venue | Separate `Samagatha` from `church street`; `Unknown` instead of `Bookworm` with no keyword | Same file | Same filename | Not needed |
| Goodreads URL | `goodreads\.com/[^\s)]+`; attach a URL-only line to the previous book | Not needed | URL column | Not needed |
| Title / author split | Cleaner first: `x_tolerance=1.5`, all bullet glyphs, page footers, join wrapped lines; delete P6 (C4); try the dash before `by`; `extract_table()` for ruled tables; score each line by the rule that fired | Line-level corrections keyed by (file, raw line) | Template with separate title and author columns | Only for lines scoring below a threshold |
| Member grouping | Header rule for ALL CAPS, `Name:`, glued and table forms; carry the member on each book record and into `Discussion.member_id` | Per-file member list | Member column | Only below the threshold; member names pseudonymised first |
| Book vs not-book | One anchored noise list (A5, C5); ALL-CAPS-only and `@` lines treated as headers | Exclusion lines per file | Template has no free lines | Only below the threshold |

**Confidence scorer (smallest form).** Score each line from the rule that fired: explicit `by`, a dash, or a parenthesis with a capitalised author, and no glyph, wrap or ALL CAPS: 0.95; plain-title fallback: 0.7; two-word guess: 0.4; header-like lines: 0.1. Lines below 0.95 go to a review list (the empty `validation_errors` table is a possible home; its columns were not checked).

**LLM option in detail:**
- **Token volume (estimate):** extracted source text totals 197,393 characters (TXT 104,139, PDFs 93,254), about 49,000 input tokens for one full pass at about 4 characters per token. Free-text PDF lines only: about 23,000 input tokens plus about 16,000 of prompt overhead (500 × 31 files) and about 45,000 output tokens (1,788 PDF rows × about 25). One new meetup: 1,300 to 7,700 characters (measured range), about 0.3k to 1.9k tokens in and 1.5k out. Cost is this volume times the current rate of the cheapest Haiku-class model (not looked up).
- **Privacy:** member names leave the machine (174 member rows; names in 6 member-path PDFs, at least 6 flat-path PDFs and the TXT narrative, for example `"Aarzu Sadana"`, `"Rahul Kondi"`). Mitigation: replace member header lines with local placeholders (M1, M2) before sending and map back locally; never send group photos or PDF images.
- **PRD §7.1 critique and resolutions:** (1) overlaps the regex parsers: regex stays first, only lines below 0.95 are sent; (2) maintenance (API key, pinned model id, retirement): an offline script outside `app/api`, model id pinned and recorded per row, `requirements.txt` checklist (AGENT_RULES §7); (3) it can invent data (AGENT_RULES §2 forbids invented authors; the hand table in `ingest_meetup_99.py` already widens `"Tiger Lessons (Reddy)"` to `"Srinath Reddy"`, a name the PDF does not contain): reject any output field that is not a substring of the source line after whitespace normalisation, leave enrichment to the Goodreads step; (4) output not reproducible: temperature 0, store prompt, model id and raw response with the source line, a person approves each row; (5) privacy: pseudonymise, founder consent (question 3); (6) volume does not justify it: about one PDF a month of 50 to 100 lines, which a person types in minutes, and option 3 removes the free text at the source. **No strong resolution for (6).** Verdict (judgment): rejected for now; revisit for an OCR backlog of free-form scans.
- **Entry into Layer 2:** each accepted line creates a `Source` (exact source line as `raw_text`, `importer_name="llm_assist_v1"`, validator score as `extraction_confidence`) and an `ImportedBook` (`raw_title`, `raw_author`) with `canonical_book_id` empty; nothing creates or merges a `CanonicalBook` until a person approves the row. This depends on the review queue working (RC1, A3); until then, output goes to a CSV for review.

### OCR impact

- **Today's need, measured:** `BBB 97, June 2026, Books Discussed.pdf` pages 2 to 7 have 0 characters and 1 image each, page 1 text is doubled glyphs (`"MM EE EE TT ## 99 77"`), and the parser emits 5 junk rows with no warning (same silent path as S4); `BBB 99, …` has rotated lines read backwards (`"kohsA"`, `"ayimwoS"`). 1 of 32 PDFs needs OCR today; it was entered by hand.
- **Option 1 (regex):** OCR adds character errors and loses columns and line order; the cleaner and the confidence score become required before any OCR import.
- **Option 2 (override table):** still works; effort grows with the number of scanned files.
- **Option 3 (template):** removes OCR for future meetups if lists stay digital; no effect on old scans.
- **Option 4 (LLM):** gains the most on noisy OCR text; a vision model on page images would also send group photos and handwriting, which widens the privacy risk; the substring check still applies against the OCR text.
- **All options:** whole raw text (A1) matters more, because OCR output cannot be re-derived cheaply.

### Findings

| ID | Severity | file:line | Finding | Evidence | Impact | Smallest fix | Effort |
|---|---|---|---|---|---|---|---|
| RX1 | High | `pdf_parser.py:40-312`; `txt_parser.py:89-173, 291-331` | Free-text parsing is far below the guide's 95 % bar, and no stage catches low-quality lines | Sample error rates: TXT 20 %, flat PDF 50 %, member PDF 63 % (seed 20261009) | Most PDF rows in Layer 2 are wrong in some field; automatic merge carries them into Layer 3 (`Irene 1`, `Title Author`, `Anuj` → `Meena Nayyar`) | A per-line confidence score from the rule that fired; lines below 0.95 to a review list; golden tests from this sample | M |
| RX2 | Medium | `pdf_parser.py:33` | Default `extract_text()` glues words in 6 of 32 PDFs; one argument fixes it | Word counts default vs `x_tolerance=1.5`: #70 101 vs 281 (**verified**), #75 144 vs 334, #76 136 vs 332, #93 208 vs 392, #98 439 vs 582, #99 330 vs 386; 23 files unchanged | 13 glued canonical titles, 18 glued authors (pattern count, judgment) | `page.extract_text(x_tolerance=1.5)`; diff the parser output on the 7 other files whose counts change by 2 to 28 words before adopting | S |
| RX3 | Medium | `pdf_parser.py:382-415`; `full_import.py:541-588` | Member grouping is worked out, then discarded | Book records carry no member; `Discussion(...)` is built without `member_id`; all 836 links come from `main.py:1274, 1523` and `ingest_meetup_99.py:235` | A re-import cannot reproduce who brought which book (the "introducer by meetup" reader function) | Put the member on each book record; set `member_id` when creating the discussion | S |
| RX4 | Medium | `txt_parser.py:48, 96-101`; `pdf_parser.py:23` | The URL regex swallows `)` and leaves `(` in the title | 236 imported titles end in `(`; 240 of 542 resource URLs end in `)` (**verified**) | Wrong Layer 2 titles; links carry a stray character (resolution not checked) | `goodreads\.com/[^\s)]+` | S |
| RX5 | Medium | `txt_parser.py:231, 291-297` | A TXT section with an unknown venue yields 0 books | #25 (`Art Studio, Koramangala`): venue `Unknown`, 0 book records; later hand-entered (`ingest_meetup_25.py`, 86 discussions) | Silent loss of a whole meetup's books | Start the book search after the date line whatever the venue; warn on any section with 0 books | S |
| RX6 | Medium | `txt_parser.py:291-301` | After the first book line, every non-empty TXT line becomes a book | `"Books discussed:"` in 9 sections; 7 raw titles over 120 characters are narrative (`"We also had Rahul Kondi join us…"`) | Noise in Layer 2; relies on the pipeline's noise filter (C5, A3) | Apply `_is_book_line` and the shared noise list per line | S |
| RX7 | Medium | `txt_parser.py:108-133`; `pdf_parser.py:62` | Matching `by` before the dash splits titles that contain "by" | `"Stand by Me - Stephen King"` gives `("Stand", "Me - Stephen King")`; 4 stored TXT authors contain a dash (`"WoT - Robert Jordan"`) | Wrong title and author | Split on a dash separator first; add tests | S |
| RX8 | Medium | `pdf_parser.py:146-153, 196-204, 379` | Member header detection misses common forms and accepts book titles | Misses `DeeptiSrivatsan`, `MADHUSUDHAN`, `NIVEDITA .G`, `Shivankar:`; accepts `Rebel Sultans`. 40 of 174 members are not people (judgment: `Airplane Mode`, `Tangents`, `Name`, `Roald Dahl` …); 85 have 0 discussions; `GET /members` (`main.py:695-707`) lists all | Fake people on the members page; books filed under the wrong member | Header rule for ALL CAPS, `Name:`, table forms; `extract_table()` for ruled tables; a per-file member list | M |
| RX9 | Low | `pdf_parser.py:343` | The venue regex maps `church street` to Bookworm | #75 text `"@Samagatha,ChurchStreet,25-08-2024"` stored as `Bookworm` | One wrong venue; future Church Street venues collapse | Match the venue name before the street; no keyword gives `Unknown` | S |
| RX10 | Low | `scanner.py:74-194` | The scanner is a per-file table written as regex | 3 of 14 regexes match no file; 6 match one file each; `BBB 99, …` matches none; `"BBB 100 - Sep 2026.pdf"` gives no number | Each new filename style needs a code change (F3, F6) | One number pattern plus `sources/overrides.csv` | S |
| RX11 | Medium | `tests/` | 0 parser tests | No test imports `txt_parser`, `pdf_parser` or `scanner` | Regressions in RX1 to RX10 go unseen | Golden-line tests from this run's 90 sampled lines plus the probe strings | S |
| RX12 | Low | `full_import.py:38-53` | No parsing metrics | `PipelineStats` holds created-row counts only | Regex success rate cannot be tracked | Count lines seen, parsed, skipped per file and the PDF path chosen | S |

### Already-known issues

| ID | Status | Evidence this run |
|---|---|---|
| C4 | Confirmed | `pdf_parser.py:79-91`; in the sample: `"The Impending Blindness of Ellie Scott"`, `"The Right Stuff Tom"` / `"Wolfe Book"` |
| C5 | Confirmed | The 5 probe titles return `[]` from `_extract_books_flat` |
| C8, K28, S4 | Confirmed, widened | `pdf_parser.py:30-37` unchanged; #97 (image only) shows the same symptom for another cause: 159 characters, 5 junk rows, no warning |
| K29 | Confirmed, measured | `start_line` 17 for #8 against file line 16; 2123 for #50 against 2092; drift reaches 31 lines by the last section |
| C13, A1, F4 | Confirmed | `txt_parser.py:245`, `pdf_parser.py:359` unchanged; PDF book sources carry only the title as `raw_text` (`:406, 435`) |
| F3 | Confirmed, measured | Flat-path error rate 50 %; several layouts across 31 text PDFs |
| S12 | Confirmed, widened | `txt_parser.py:299-301`; the member path drops URL-only lines silently (6 of 30 sampled) |
| K13 | Confirmed | `normalize_title("ಸಾರ್ಥ")` gives `""` |
| Fixed confidence values | Confirmed | 4 distinct values in `sources`: 0.80 ×3, 0.85 ×28, 0.90 ×1,766, 0.95 ×32 |
| OCR planned | Confirmed | PRD §3.0 item 4; measured need: 1 of 32 PDFs today |
| `book_count&details_issues.md` §4: `BBB #092` missed | Confirmed | Probe gives `None` |
| §4: day-less dates stored as the 1st | Confirmed, widened | 27 of 32 PDFs state the full date in their text; the parser reads none (#93 says 22nd February 2026, stored 2026-02-01) |
| §4: PDF text loses spaces | Confirmed; fix measured | RX2 |
| §4: member names as titles | Confirmed | 5 of 30 flat-sample lines |
| §4: bullet glyphs | Confirmed | 53 imported titles start with a glyph |
| §4: headers parsed as books | Confirmed | `BBB AUG 2025`, `@ The Bookworm, 15th June 2025` |
| §4: venue defaulted | Confirmed, widened | RX9 (#75 Samagatha) |
| §3.2: duplicate July 2025 file | Confirmed | Both 3,105 characters, both stored with 74 rows (CH1) |
| §2: scripts bypass Layer 2 | Confirmed | #99 has 62 discussions with no source |

Nothing on this list is fixed.

### Proposed FMEA rows (merged into report_insights.md §10.8 on 2026-10-09: rows 68 to 91, plus re-scores of rows 3 and 22)

| Failure mode | Effect | Cause | S | O | D | RPN |
|---|---|---|---:|---:|---:|---:|
| A new PDF layout is mostly mis-parsed (re-score of §10.8 row 3, RPN 210, with a measured occurrence) | Fake books, members and authors enter the archive | No cleaner, confidence score or tests (RX1, RX11) | 7 | 8 | 6 | 336 |
| A meetup stored on the 1st of the month although its PDF gives the day | Wrong dates in timelines and statistics | Date read from the filename only | 5 | 9 | 7 | 315 |
| A re-import loses every member link | Introducer and discusser history gone | Member grouping discarded (RX3) | 7 | 3 | 8 | 168 |
| Goodreads URL lost or altered | Missing or stray-character links | URL-only lines dropped; `\S+` swallows `)` (RX4) | 3 | 6 | 8 | 144 |
| An LLM step, if adopted, fills in author names the source lacks | Invented data in Layer 2 | No substring check | 7 | 4 | 5 | 140 |
| Words glued in extracted text | Unmatchable titles; duplicates | Default `x_tolerance` (RX2) | 5 | 5 | 5 | 125 |
| A TXT meetup at an unknown venue loses all its books | Meetup silently empty | Venue gate (RX5) | 7 | 2 | 7 | 98 |
| Wrong or invented venue | Wrong venue statistics | `church street` match and default `Bookworm` (RX9) | 3 | 4 | 8 | 96 |

### Open questions for the founders

1. Will `full_import.py` run again on the whole archive? If not, the regex fixes matter only for new meetups, and the template (option 3) is the main lever.
2. Can future meetup lists follow a fixed template (columns: member, title, author, Goodreads URL; filename with number, date and venue)?
3. May member names be sent to an external API, even pseudonymised?
4. Should a low-confidence line block an import, or go to a review list while the rest imports?
5. Was #75 held at Samagatha or at Bookworm?
6. Where should reviewed corrections live: a versioned `sources/overrides.csv`, or a database table?
7. Should the hand tables in `ingest_meetup_25.py` and `ingest_meetup_99.py` move into the override format, so a re-import reproduces them through Layer 2 with provenance?
