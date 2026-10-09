# Founder Questions

Every open question and decision from the health reviews, in one place. Built on 2026-10-09 from the "Open questions for the founders" sections of `docs/health/security_analysis.md`, `pattern_review_analysis.md`, `error_handling.md`, `structures_analysis.md`, and the "Open decisions" in `docs/plans/backlog.md`. Each question links back to its finding ID; the finding's section has the evidence.

**How to answer:** reply with the question number (Q1, Q2, ...) and the decision. Answers are recorded in the "Answered" table and in the finding's status.

## Answered

| # | Question | Answer (date) | Effect |
|---|---|---|---|
| A-S2 | S2: may opening a book (the public `GET /books/{id}/synopsis`) write to the database? | **No** (2026-10-09) | Synopsis enrichment moves off the public GET; saving happens only through the admin enrich route. Also settles Q-error-handling silent failures 2, Q-structures content hashing 4 (enrichment leaves public GET) and the synopsis half of Q-comments 6. Code change not yet made |
| A-CH2 | Delete `sources/BBB 99, Books Discussion List.pdf` | **Requested** (2026-10-09); deleted in its own commit, revertible with `git revert` | See Q1 below: the file turned out to be the original, not app output |
| A-Q1 | BBB 99 original | **Restore it in full and include all of it** (2026-10-09) | Revert `74207d7`; add a Source row and link `meetups.source_id` for #99 (NULL today; 62 discussions stored); diff the PDF against the 62 discussions and add what is missing. Dry run, backup, approval (roadmap P0) |
| A-Q2 | Database in the public repo (F8) | **Public by intent** (2026-10-09) | Privacy policy says so and offers removal; account data only in the private `auth.db` (D8) |
| A-Q3 | How the app runs | **Moot after the move** (2026-10-09) | Production is the DigitalOcean droplet (D6); local docker is dev-only with the safe-stop rule |
| A-Q4 | Will `full_import.py` run again | **Yes, re-import later** (2026-10-09) | Fix C4 to C6, C8, K1/RC1, RX1 to RX12, A3 first; re-import into a scratch DB; diff against live (roadmap P0b) |
| A-Q5 | Which July 2025 file is real | **`86 - BBB Meetup - Books Discussed - July 2025.pdf`** (2026-10-09) | Remove the other file's 74 rows (dry run, backup) |
| A-Q6 | Fuzzy threshold | **Two bands** (2026-10-09) | ≥ 0.90 "likely", 0.75 to 0.90 "possible"; nothing merges automatically |
| A-Q7 | Same title, different author | **Case by case** (2026-10-09) | Separate by default; the review queue may merge with a founder's decision |
| A-Q8 | The unnumbered PDFs | **Confirmed** (2026-10-09) | Jul 2023 = #62, Aug 2023 = #63, BYOB + BBB 25 Nov 2023 = #66, 30 Dec 2023 export = #67, Aug to Dec 2025 = #87 to #91, Jan 2026 = #92; `meetup_number` stays required |
| A-Q9 | Alembic baseline; drop `books`, `attachments` | **Yes to both** (2026-10-09) | Backup, drift check, baseline, stamp, then a separate drop migration |
| A-Q10 | Merge the 27 title and 106 author groups | **Review queue, a founder approves each** (2026-10-09) | Old forms kept as aliases |
| A-Sec3 | Will the app leave the LAN | **Yes** (2026-10-09): public demo on Vercel + droplet | Login (P12), the proxy checklist and the launch gate become blockers (`docs/plans/backlog.md`) |
| A-Sec6 | Shared admin token as the first step | **No: per-person accounts with Better Auth** (2026-10-09, D5) | Every write records who made it |

## Decide first

> **All ten answered on 2026-10-09**; see the Answered table above. Kept below for the evidence links.

Ordered by risk today, then by what they unblock. Several appear more than once in the full list below; the IDs show where.

| # | Question | Why it matters | Finding IDs |
|---|---|---|---|
| Q1 | **Confirm the BBB 99 deletion, or keep the file.** `scripts/ingest_meetup_99.py:37-42` calls it "the genuine PDF for Meetup 99" and copied it into `assets/generated_pdfs/bbb_meetup_99.pdf`, so it is the original publication (the earlier CH2 finding had the direction reversed). It was deleted on founder request (own commit). The only working copy is now the generated file, which the admin "Generate PDF" button overwrites; git history keeps it. Recommendation: restore it with `git revert` of the deletion commit and exclude it from imports instead | Provenance of meetup 99 | CH2 (corrected) |
| Q2 | The database (member names, notes) is tracked in a **public** repository. Intended? | Personal data exposure | F8 |
| Q3 | How is the app run in real use: `docker compose` or `uvicorn` on the host? Does anyone run scripts on the host while the container is up? (Before the deferred rebuild, stop the container cleanly so WAL writes reach the file.) | Edits can be lost on a container rebuild | DB4 |
| Q4 | Will `full_import.py` run again on the full archive? If yes, fix the import defects first; if no, mark it historical and invest in a fixed meetup template | Decides whether ~20 import findings matter | C4 to C6, C8, K1/RC1, RX1 to RX12, A3, A9 |
| Q5 | Which July 2025 file is real: `86 - BBB Meetup - Books Discussed - July 2025.pdf` or `Books Discussed — BBB JULY 2025.pdf`? The other's 74 import rows would be removed | Duplicate import rows | CH1 |
| Q6 | Fuzzy-match threshold: 0.75 (code) or 0.85 (spec)? At 0.85 no pair of different books was flagged; real near-duplicates scored 0.905 or higher | Review-queue noise | RC3 |
| Q7 | Is the same title by a different author a separate book ("1984", "Meditations")? | Unique index, merge rule, add-book matching | S10, DB1, C6, MG8 |
| Q8 | The 11 date-only PDFs: confirm the inferred meetup numbers (no schema change), or allow meetups without a number? | A6 schema decision | A6, MG11 |
| Q9 | May the empty baseline migration be filled with today's schema? Drop the empty `books` and `attachments` tables? | Unblocks B8 and every later migration | MG4, MG3, DB5 |
| Q10 | Merge the 27 title and 106 author duplicate groups? Who approves each merge? | Data repair | C1, DB6, A4 |

## Open decisions (from `docs/plans/backlog.md`)

- F8: the database is in the public repo. (Q2)
- The dead-code deletion list (1,050 lines).
- Whether to merge the 27 title and 106 author duplicate groups (C1). (Q10)
- The fuzzy threshold: 0.75 in the code vs 85% in the spec. (Q6)
- Whether full_import.py will run again. If yes, fix C4–C6, C8 and K1 first. (Q4)
- The deferred container rebuild. (Q3)

## All questions by source

Numbered within each source section as in the original file. Status: Open unless marked.


### Security review (ecc:security-reviewer)

Source: `docs/health/security_analysis.md`, section "Security review (ecc:security-reviewer)".

1. The repository is public (verified), so `book_club_archivist.db` and its history are already published (F8). Is that intended?
2. What is in the DB that is personal (real member names, notes, contact data)? That sets how serious F8 and F3 are.
3. Will the app ever leave the home or club LAN? If yes, P12 (login), F3 (CORS) and F9 (DNS rebinding) become blockers instead of backlog.
4. Who is the admin today: one person, or anyone at a meetup on shared Wi-Fi?
5. Is the frontend container meant to be the real deployment (F7), or only a dev convenience?
6. Do you want a shared admin token (one env var, one header check) as the first P12 step? It is the smallest fix and needs no new tool.

### React review (ecc:react-reviewer)

Source: `docs/health/pattern_review_analysis.md`, section "React review (ecc:react-reviewer)".

1. Should the Library Room be keyboard-complete (R1 to R4) before launch, or is mouse and touch the stated target? PRD §12 would decide this.
2. Do the single-letter shortcuts (`f`, `r`, `v`, `s`, `/`) need to stay, or may they require a modifier or a help overlay (R4)?
3. May an ESLint config be added (needs an install, so a founder action) so `react-hooks` and `jsx-a11y` run in CI (R9)?
4. Should the closet show an error state with retry on fetch failure, as other pages do (R5)? PRD §17.1 says yes for async states.
5. Is the `apiFetch` double try in admin intentional for the Docker proxy setup? If yes, limit it to network errors (R10).

### Backend patterns (ecc:backend-patterns)

Source: `docs/health/pattern_review_analysis.md`, section "Backend patterns (ecc:backend-patterns)".

1. Should B1 (7-second meetup list) be fixed before Flow D, since the meetups page is public and slow today?
2. Is moving bulk enrichment to a CLI command acceptable, or must it stay a button in the admin page (then `BackgroundTasks`)?
3. May the API start writing a log file (B6), and where should it live (`assets/` is served publicly, so somewhere else)?

### FastAPI patterns (ecc:fastapi-patterns)

Source: `docs/health/pattern_review_analysis.md`, section "FastAPI patterns (ecc:fastapi-patterns)".

1. Are the `/api/` aliases still needed once the admin page calls one base URL? If not, the split can drop them (P10).

### Dead code (ecc:refactor-clean)

Source: `docs/health/pattern_review_analysis.md`, section "Dead code (ecc:refactor-clean)".

1. Keep the 11 unused UI components (Hero, FilterPanel, SearchBar, Card, Modal, ViewToggle, ErrorBoundary, PageSkeleton, EmptyState, ResourceList, BookGrid) as a future component kit, or remove them?
2. Is the `BaseImporter` interface plan (D24) still alive? If not, the module and its mention in `universal_app_flow.md` can go.
3. Keep `Alias` and `BookRelation` as planned schema (recommended for now)?
4. One-off ingest, audit and fix scripts (D27, D28): keep as history in `scripts/`, or move to `archive/`?
5. `scripts/scratch/` is in `.gitignore` yet tracked: keep tracking, or untrack?
6. Keep `psycopg2-binary` and `tzdata` until the PostgreSQL move? Move `pytest` and `pytest-cov` to a dev file (needs a CI change)?
7. `get_db` (D21): delete it, or adopt it as backend B7 recommends?

### Comments and docstrings (ecc:comment-analyzer)

Source: `docs/health/pattern_review_analysis.md`, section "Comments and docstrings (ecc:comment-analyzer)".

1. K1: should duplicate detection produce fuzzy candidates? If yes, it must compare each book against other canonicals; A3 and A7 depend on this.
2. PT2 and K2: is `/admin/media/resolve-url` meant to be reachable by anyone who can reach port 8000? Should PDF cover downloads use the same public-address check?
3. PT1: will a reverse proxy sit in front of the API when deployed? Without one, the 30 MB check is the only limit. **Answered 2026-10-09:** yes, Vercel's proxy (4.5 MB body limit) plus Caddy; the API cap now matches at 4.5 MB (D36).
4. K3: apply `safeHttpUrl` at `admin/page.tsx:873`, and reject non-http(s) values for `external_url` in the API?
5. K4: limit the LAN and localhost CORS rule to `ENV=development`?
6. K5 and K6: make the synopsis and PDF routes `POST` or admin-only, or only document the writes? **(Answered by S2: No)**
7. K7: should "Enrich" fill only empty fields, as the add-book route does (`main.py:1453-1469`)?
8. K13: normalization drops Kannada, Malayalam, Devanagari and Bengali script (169 titles contain non-ASCII characters). Add a rule that keeps non-Latin letters?
9. K19: should a meetup with no photo show BBB 99's template photo in its PDF?
10. K21: should the book page show the stored description now that synopsis exists?
11. The closet loads at most 3,000 books (`CriterionBookCloset.tsx:876-880`, `limit: 3000`, sorted by title); past 3,000, the last titles drop out silently. Acceptable?
12. Delete comment references to files outside the repo (video timestamps, drawings, screenshots)?

### Code quality (ecc:plankton-code-quality)

Source: `docs/health/pattern_review_analysis.md`, section "Code quality (ecc:plankton-code-quality)".

1. **Fuzzy-match threshold:** the code uses 0.75 and the specification says 85 %. Which is intended?
2. **Will `full_import.py` run again on the full archive?** If yes, fix C4, C5, C6 and C8 (and K1) first. If no, mark it historical so nobody runs it by mistake.
3. **Duplicate groups:** merge the 27 title groups and 106 author groups (C1)? Who approves each merge, and should merges be logged so they can be undone?
4. **Enrichment:** may it ever overwrite a field an admin has set, or only fill empty fields?
5. **Meaning of "general":** is a book with both proper and general discussions "general"? Which count should the UI show: discussion rows, proper discussions or distinct meetups?
6. **`in_book_section`:** should the "List of Books Discussed" header limit PDF parsing to the lines after it?
7. **Dead components:** can the 13 unimported live-tree files (C14) be deleted with the dead-code list, or are any planned for reuse?
8. **Deployment:** is the backend reached through the Next.js `/api` proxy only? If so, `getApiBase()` should stop pointing browsers at port 8000.

### Error-handling patterns (ecc:error-handling)

Source: `docs/health/error_handling.md`, section "Error-handling patterns (ecc:error-handling)".

1. Is `{"detail": "..."}` acceptable as the one error envelope? Moving to `{"error": {"code", "message"}}` would be a contract change (PRD §11.0, §23) and fixes no defect on its own.
2. Should the API also write to `logs/archivist.json` inside Docker, or is `docker compose logs` enough? Is `logs/` mounted and writable once the container runs as a non-root user (F6)?
3. C14: delete `ErrorBoundary.tsx` in favour of `app/error.tsx`, or keep it in the component kit?
4. During a Goodreads or Apple outage, should enrich say "sources unreachable" (EH3), and should the synopsis route stop trying for a while after a failure (E5)?
5. Is the synopsis fallback text ("Featured and discussed by the Bangalore Book Club community at #...") acceptable given the "no fake archive data" rule in PRD §24?
6. Keep and fill `ImportJob.error_count`, or drop the column?

### Root cause: K1 fuzzy duplicate detection never runs (superpowers:systematic-debugging)

Source: `docs/health/error_handling.md`, section "Root cause: K1 fuzzy duplicate detection never runs (superpowers:systematic-debugging)".

1. Threshold: 0.75 (code) or 0.85 (spec)? Should the spec say SequenceMatcher ratio instead of Levenshtein?
2. Same normalized title, different authors (the Taleb pair): merge automatically as now, or send to review? Today the merge ignores author (C6).
3. Who reviews `possible_duplicates`, and where? No admin screen exists.
4. Will `full_import.py` run again on the full archive? If not, RC1 is low priority and the scratch harness can become the A7 test only.

### Silent failures (ecc:silent-failure-hunter)

Source: `docs/health/error_handling.md`, section "Silent failures (ecc:silent-failure-hunter)".

1. S1: backfill the 52 missing `source_id` values (a data repair, needs approval), or is provenance unused today? Nothing in the UI reads it as far as seen (not exhaustively checked).
2. S2: may opening a book modal write to the database? If not, synopsis fetches stop persisting and saving moves to the admin enrich button. **(Answered by S2: No)**
3. S3: for books with no author match, should enrichment skip, or ask the admin to pick?
4. S4: should an unreadable PDF stop the import, or continue with a warning (suggested: warn)?
5. S6: are the 7 URL-titled books meant to be there (links added as items)?
6. S11: should a meetup with no photo produce a magazine without a photo page, or is meetup 99's photo intended as a placeholder?
7. S10: is the same title by a different author a separate book ("1984", "Meditations")?

### Content hashing and caching (ecc:content-hash-cache-pattern)

Source: `docs/health/structures_analysis.md`, section "Content hashing and caching (ecc:content-hash-cache-pattern)".

1. Which July 2025 file is the real one: `86 - BBB Meetup - Books Discussed - July 2025.pdf` or `Books Discussed — BBB JULY 2025.pdf`? The other's 74 import rows could then be removed (a data write, needs approval).
2. Is `sources/BBB 99, Books Discussion List.pdf` meant to be a source? It is identical to the app-generated meetup 99 magazine.
3. Should `assets/cache/covers/` and `assets/generated_pdfs/` stay tracked in git? About 1.3 MB and 29 MB today; the covers cache could grow to about 154 MB.
4. Is 24 hours an acceptable retry interval for synopsis enrichment, or should enrichment leave public GET entirely (S2, E5)? **(Answered by S2: No)**
5. Should an edit to a meetup or its books regenerate the PDF automatically, or only mark it stale for an admin to regenerate?

### Database review (ecc:database-reviewer)

Source: `docs/health/structures_analysis.md`, section "Database review (ecc:database-reviewer)".

1. DB1, DB2: may merge decisions be proposed for the 11 duplicate canonical groups and the 1 duplicate discussion, or do the founders review each pair?
2. DB5: drop `books` and `attachments` (both empty) or keep them? `media_type` NOT NULL in the database, or only in the model?
3. DB3: set `canonical_book_id = NULL` on the two noise rows ("MEET #98", "JULY 2026"), or delete them?
4. DB4: is the app run with `docker compose` or `uvicorn` on the host for real use? Does anyone run scripts on the host while the container is up?
5. DB9: should deleting a Source ever delete its Meetup? If not, the cascade goes.
6. DB2: for discussions with no member (1,850 rows), is "one row per (meetup, book)" the rule? That decides the unique index shape.
7. DB13: is "firstDiscussedYear" meant to sort by the first meetup date?

### Migrations (ecc:database-migrations)

Source: `docs/health/structures_analysis.md`, section "Migrations (ecc:database-migrations)".

1. May the empty baseline `4b4cb3603d42` be filled with the stamp-time schema? It has never been applied, but it is still an edit to a migration. The alternative is to keep it empty and test migrations only on a copy of the tracked database.
2. `books` and `attachments` (0 rows each): drop them in a later migration (needs approval), or keep and exclude them from checks?
3. `media_type`: enforce NOT NULL in the database (`mg01`), or relax the model?
4. A6: (a) nullable number plus the number-or-date check, (b), or (c) confirm the inferred numbers so no schema change is needed?
5. A2: in-place prefix-checked update of the 30 rows (no schema change), or the append-only `raw_text_full` column?
6. S1: is "earliest source row per meetup" the right provenance rule? How should meetup 99 (no source row) be recorded?
7. C1 index: are the same title by different authors separate books (S10)? Should books with no author count as one author for uniqueness?
8. Is a move to PostgreSQL planned? If so, the baseline and CI step become the PostgreSQL path, and `CONCURRENTLY` matters.
9. May the two dangling `imported_books` references be cleared (plan row 4)?

### Parsing strategy (ecc:regex-vs-llm-structured-text)

Source: `docs/health/structures_analysis.md`, section "Parsing strategy (ecc:regex-vs-llm-structured-text)".

1. Will `full_import.py` run again on the whole archive? If not, the regex fixes matter only for new meetups, and the template (option 3) is the main lever.
2. Can future meetup lists follow a fixed template (columns: member, title, author, Goodreads URL; filename with number, date and venue)?
3. May member names be sent to an external API, even pseudonymised?
4. Should a low-confidence line block an import, or go to a review list while the rest imports?
5. Was #75 held at Samagatha or at Bookworm?
6. Where should reviewed corrections live: a versioned `sources/overrides.csv`, or a database table?
7. Should the hand tables in `ingest_meetup_25.py` and `ingest_meetup_99.py` move into the override format, so a re-import reproduces them through Layer 2 with provenance?
