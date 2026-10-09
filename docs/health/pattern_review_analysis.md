# Pattern Review Analysis

Code pattern reviews of the BBB app, one section per tool run. Each section states its date, commit and scope. Findings that change risk scores feed `report_insights.md` §10.1, §10.2 and §10.8. The FMEA rows from both runs below are merged there as rows 24 to 53 (2026-10-09).

## Findings register

R = React review, B = backend patterns, P = FastAPI patterns, Q = quality gate, D = dead code, K = comments, C = code quality. Details in the sections below.

| ID | Severity | Finding | Where | Status (2026-10-09) |
|---|---|---|---|---|
| B1 | High | `GET /meetups` runs **6,278 queries and takes 7.02 s** for 53 meetups (public route); `GET /admin/meetups` the same count in 8.73 s | `app/api/main.py:634`, `meetup_to_dict` (`:251`), `get_admin_meetups` (`:954`) | Open |
| R1 / R2 | High | Spines and list cards are mouse-only `div`s; no keyboard access | `CriterionBookCloset.tsx:106-133`, `:1975-1978` | Open (known issue) |
| R3 | High | Detail modal has no dialog role and no focus handling | `CriterionDetailModal.tsx:586-596` | Open |
| R4 | High | Closet's letter shortcuts ignore Ctrl and Cmd, so Ctrl+R picks a random book instead of reloading | `CriterionBookCloset.tsx:931-964` | Open (verified) |
| B2 | Medium | Five write routes turn their own 404 and 400 errors into 500s | `main.py:1032, 1128, 1184, 1334, 1375` | Open |
| B3 | Medium | `GET /members` runs 1,290 queries (1.79 s) for 174 members | `main.py:710` | Open |
| B4 | Medium | Two `GET` routes write: synopsis (DB and outbound fetch), meetup PDF (file and DB) | `main.py:548`, `:1147` | Open |
| B5 | Medium | Enrichment and PDF generation run inside the request; meetup enrichment fetches every book in turn | `main.py:2180`, `:1116` | Open |
| B6 | Medium | The API logs nothing: `app/core/logging.py` configures loguru and is used by the CLI and `app/core/database.py`, but `main.py` never imports it (0 logger calls) | `main.py` | Open |
| R5 | Medium | Closet shows an empty room with no message when `/books` fails | `CriterionBookCloset.tsx:880-891` | Open |
| R6 | Medium | "Synced" toast appears even when the sync failed, with a stale count | `CriterionBookCloset.tsx:891-900` | Open |
| R7 | Medium | Book page fetch has no cancel; retry reloads the whole page | `app/books/[id]/page.tsx:20-35` | Open |
| R8 | Medium | Toast and blur timers never cleared | several | Open |
| R9 | Medium | No ESLint config, so hook and accessibility rules never run | `frontend/package.json:9` | Founder action (needs an install) |
| R10 | Medium | Admin client resends a failed write through a second URL | `app/admin/page.tsx:142-144` | Open |
| R11 | Medium | Admin uses `confirm()` and sends no credentials | `app/admin/page.tsx` | Scheduled with login (P12) |
| R12 | Medium | Index keys in a few data lists | several | Open (low risk) |
| R13 | Medium | Very large components: closet 2,337 lines, admin 1,647, modal 900 | `wc -l` | No action until touched |
| B7 | Low | Sessions opened by hand in 26 routes; the `get_db` dependency exists and is unused | `main.py:65` | Open |
| B8 | Low | No service layer: routes hold queries, business rules, outbound HTTP and serialization | `main.py` | Open (with router split) |
| B9 | Low | `GET /books/{id}` 31 queries, `GET /search` 72 queries (fast today) | `book_to_dict` (`main.py:87`) | No action |
| R14 to R16 | Low | Raw `<img>`; search suggestions not keyboard-selectable; search input unlabeled | several | Open |
| P3 | Medium | The only `async` route (photo upload) runs blocking database calls and a file write of up to 30 MB on the event loop, pausing every other request | `main.py:1069` | Open |
| P4 | Medium | 25 sync routes share one worker thread pool; outbound fetches with 8 s timeouts can fill it and stall the API | synopsis, enrich, resolve, suggest routes | Open (with E5, B5) |
| P1 | Medium | No response models: all 33 operations document an empty response in `/docs` | `main.py` | Build phase |
| P2 | Medium | Request models have no constraints (rating, year, URLs, Goodreads id, title) | `main.py:905-942` | Open |
| P7 | Medium | One 2,215-line file, no `APIRouter`, 0 of 33 operations tagged | `main.py` | Router split planned (not scheduled) |
| P10 | Low | Six `/api/` aliases; through the Next.js proxy `/api/media/resolve-url` maps to an undefined backend path (unverified) | `main.py:379, 465, 1911, 1918, 1920, 2003`; `frontend/next.config.ts` | Open |
| P6 | Low | All 5 `POST` routes return 200, including creates | OpenAPI | Open |
| P8 | Low | Directories created and `/assets` mounted at import time, relative to the working directory | `main.py:42-46` | Open |
| Q1 | Medium | Running backend container predates the 30 MB upload cap (image not rebuilt after `33f4c8d`) | `docker compose exec backend grep -c MAX_UPLOAD_BYTES` = 0 | Open: rebuild deferred by the founders (not now) |
| Q2 | Medium | `SESSION_LOG.md` not updated for this session's work (PRD §24) | `docs/health/SESSION_LOG.md` | Done: session 010 entry written |
| Q3 | Low | flake8: 624 style findings, including 26 unused imports, 10 unused variables, 1 redefinition; 0 syntax or undefined-name errors | `app/`, `tests/` | Open |
| D1 to D20 | Low | 20 frontend items with no importer: 14 component files (incl. `ResourceList.tsx`, so security F2 is live only in `admin/page.tsx:873`), 3 type files, 3 `api.ts` and 3 `utils.ts` exports | `frontend/src/` | Deletion list awaiting founder approval |
| D21 to D23 | Low | 3 Python functions never called: `get_db`, `fetch_book_synopsis_from_web`, `_extract_month_year` | `main.py:65, :542`; `scanner.py:29` | Deletion list awaiting founder approval |
| D24 to D30 | Info | Planned or hand-run code with no references: `BaseImporter`, `Alias` and `BookRelation` models, one-off data scripts, scratch scripts, verify scripts | see Dead code | Founder decision; not proposed for deletion |
| D-dep | Low | `psycopg2-binary` and `tzdata` unused; `pytest` and `pytest-cov` in runtime requirements; `@radix-ui/react-dialog` used only by dead `Modal.tsx` | `requirements.txt`, `frontend/package.json` | Founder decision |
| K1 | High | Fuzzy duplicate detection can never run: every imported title already matches its own canonical, so the loop is skipped; the docstring says it works | `full_import.py:411-447` | Open (verified); blocks A3 as written |
| K2 to K4 | High / Medium | Security comments wider than the code: "SSRF guard" covers resolve-url only; admin "only http(s) links are rendered" covers 2 previews, not the table; CORS "Dev:" rule applies in every environment | `main.py:1644, 1656, 51-52`; `admin/page.tsx:9` | Open |
| K5, K6 | High | GET docstrings hide database writes (synopsis, meetup PDF) | `main.py:548-550, 1160` | Open (ties to B4) |
| K8 | High | Closet comment says 90 books per shelf; constant is 120 | `CriterionBookCloset.tsx:1114-1118` | Open (verified) |
| K7, K9 to K35 | Medium / Low | 27 more comments or docstrings that no longer match the code | see Comments and docstrings | Open |
| C1 | High | Four title and name normalizers write the same key columns: 436 of 2,783 titles and 816 of 2,199 authors stored in a form the import dedup cannot match; 27 title and 106 author collision groups | `main.py:1192, 1200, 1247, 1413, 1420, 1427, 1509, 2161`; `app/parsers/utils.py:7, 26` | Open (verified) |
| C2 | High | Enrichment overwrites curated cover, rating, Goodreads id and year with the first search hit, with no title check | `main.py:2104-2168` | Open |
| C4 to C6, C8 | Medium | Re-import risks: PDF parser splits titles into fake authors ("The God of" / "Small Things"), noise filters drop real titles, merge keeps the wrong variant and drops discussions, unreadable PDFs vanish silently | `pdf_parser.py`, `full_import.py` | Open (C4 verified) |
| C3 | Medium | "General discussion" decided by 6 backend copies plus 1 frontend copy; 61 books differ between list and detail | `main.py:128-131, 196-200, 226, 301-304, 396-398, 987-990` | Open |
| C7, C9, C10 | Medium | Un-marking "general" erases notes containing the word; three API base rules; 10-minute unbounded suggestion cache answers "not in archive" after an add | `main.py:1302-1308`; `lib/api.ts:8-22`; `main.py:1941-1951` | Open |
| C11 to C20 | Low | Ignored `year` filter, 3,000-book closet cap, raw text cuts (2,000 and 500), dead frontend files, unused imports, hard-coded "2026", default venue, two-digit year doc, copied "missing synopsis" rule | see Code quality | Open |

---

## React review (ecc:react-reviewer)

**Date:** 2026-10-09
**Commit:** `fe1ddf1`
**Run by:** ecc:react-reviewer agent, read-only, no file written.
**Scope:** `frontend/src/`, focus on `components/library/CriterionBookCloset.tsx`, `components/library/CriterionDetailModal.tsx`, `app/books/[id]/page.tsx`, `app/admin/page.tsx`, `lib/api.ts`.
**Typecheck:** `npx --no-install tsc --noEmit -p .` in `frontend/`: exit 0, no errors.
**Lint:** not run. `package.json:9` has `"lint": "next lint"` but there is no ESLint config in `frontend/`; `next lint` would prompt to create one and install packages, which the rules forbid (R9).
**Sizes:** `wc -l` on every file under `frontend/src/`.
**Verified after the run:** R4 (`CriterionBookCloset.tsx:931-950`: the handler checks only `INPUT` and `TEXTAREA` and has no `ctrlKey`, `metaKey` or `altKey` guard before the letter branches).
**Not checked:** runtime behaviour in a browser, screen-reader testing, bundle size or render timings (no profiler run), the backend. `CriterionListDetailModal.tsx` (454 lines) was only skimmed.
**Unreachable, not reviewed (kept by founder choice):** AlphabetNav.tsx, AmbientLighting.tsx, BookCover.tsx, ClosetPicksTray.tsx, HeroBookModal.tsx, ReadingTable.tsx, Shelf3D.tsx, Shelf.tsx, Book3D.tsx, ShelfBay.tsx.

### Summary

- The data-fetching hooks are mostly sound. The modal (`CriterionDetailModal.tsx:503-530`) uses an `isMounted` guard, and the resize, hash and keydown listeners all have cleanup.
- The main defects are keyboard and screen-reader access. Spines and list cards are `div onClick`, the modal has no dialog role, no focus move and no focus return, and the closet's single-letter shortcuts also fire on Ctrl and Cmd combinations and break browser shortcuts.
- Failure handling is thin. The closet shows an empty room with no message when `/books` fails (PRD §17.1 gap), and stored URLs still go into `href` unchecked.
- Size: `CriterionBookCloset.tsx` is 2,337 lines and `app/admin/page.tsx` is 1,647 lines. Flagged as a risk only because it hides the defects above (judgment).
- No `dangerouslySetInnerHTML` in `frontend/src/`; no `localStorage` use for session tokens (only `bbb_closet_picks`).
- **Verdict: FAIL** under the react-review criteria, because High accessibility issues exist (R1 to R4). Nothing is Critical.

### Findings

| ID | Severity | file:line | Finding | Evidence | Impact | Smallest fix | Effort |
|---|---|---|---|---|---|---|---|
| R1 | High | `components/library/CriterionBookCloset.tsx:106-133` | Spine is a mouse-only `div` (known issue, still true). | `<div className="relative select-none ... cursor-pointer ..." ... onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSelect(book) }}` | Keyboard and assistive-technology users cannot open a book from the closet view. | Add `role="button"`, `tabIndex={0}`, `aria-label={book.title}` and an `onKeyDown` for Enter and Space, or wrap the content in a `<button>`. | S |
| R2 | High | `CriterionBookCloset.tsx:1975-1978` | List-view card is a `div onClick`. | `<div key={book.id} onClick={() => setSelectedBook(book)} className="group flex flex-col cursor-pointer ...">` | Same as R1 for the list view, which is the view a keyboard user would pick. | Change the `div` to `<button type="button">` (keep the classes), or apply the R1 fix. | S |
| R3 | High | `components/library/CriterionDetailModal.tsx:586-596, 538-556` | Modal handles Escape and arrow keys but has no dialog semantics or focus handling. | Outer `<div ref={modalScrollRef} className="fixed inset-0 z-50 overflow-y-auto ...">`; grep for `role="dialog"`, `aria-modal`, `.focus()` in the file returns nothing. Escape is handled at line 541. | Screen readers do not announce a dialog. Focus stays on the spine behind the overlay, closing does not return focus, and Tab walks into the page underneath. | Add `role="dialog" aria-modal="true" aria-label={book.title}`; focus the Close button (`:634`) on open; restore focus on close. A full focus trap is optional (judgment). | S to M |
| R4 | High | `CriterionBookCloset.tsx:931-964` | Single-letter shortcuts ignore modifier keys and the target type. | `if (['INPUT','TEXTAREA'].includes(e.target.tagName)) return` ... `else if (e.key === 'r' \|\| e.key === 'R') { e.preventDefault(); handleRandomPick() }` (also `f`, `v`, `s`) | Ctrl/Cmd+R (reload), Ctrl+F (find), Ctrl+S (save), Ctrl+V (paste) are caught and prevented on the Library Room. Shortcuts also fire from a focused `select` or `button`. | At the top of the handler, return when `e.ctrlKey \|\| e.metaKey \|\| e.altKey` except for the Ctrl/Cmd+K branch; also skip `SELECT` and `isContentEditable`. | S |
| R5 | Medium | `CriterionBookCloset.tsx:880-891, 1580-1587` | A failed books fetch shows an empty closet with no message or retry (PRD §17.1 gap). | `catch (err) { console.error('Failed to load books for closet:', err) }`; no `error` state exists. Other pages use `ErrorState` (for example `app/books/[id]/page.tsx:50-58`). | If the API is down the page looks like an empty library. | Add an `error` state, set it in the catch, render the existing `ErrorState` with `onRetry={() => loadBooks()}`. | S |
| R6 | Medium | `CriterionBookCloset.tsx:891-900` | "Sync" reports success even when it failed. `loadBooks` never throws, so the `catch` in `handleSyncDatabase` is dead. | `await loadBooks(true); showToast(\`Archive synced with database (${books.length...} volumes)\`)`; `loadBooks` swallows errors (line 889). The count reads `books` from before the refetch (stale closure). | The toast says "synced" on failure and shows the old count after success. | Let `loadBooks` rethrow when `silent` is true and read the count from the fetched result. | S |
| R7 | Medium | `app/books/[id]/page.tsx:20-35` | Client fetch in an effect without cancel; navigating between ids can show the wrong book. Retry reloads the page. | `fetchBookData()` has no AbortController or ignore flag; `onRetry={() => window.location.reload()}` (line 56). | Rare stale-response race when `params.id` changes quickly; retry reloads everything. | Add `let ignore = false` with cleanup and check it before `setBook`; make retry call the fetch function. | S |
| R8 | Medium | `CriterionBookCloset.tsx:581, 969, 1327`; `app/admin/page.tsx:102` | Timers are never cleared on unmount, and overlapping toasts clear each other early. | `setTimeout(() => setIsCopied(false), 2500)`; `setTimeout(() => setToastMessage(null), 2500)`; `onBlur={() => setTimeout(() => setIsSearchFocused(false), 250)}`; admin `setTimeout(() => setToast(null), 3000)` | Cosmetic in React 18 and later; an old timer can hide a newer message. | Keep the timer id in a `useRef`, clear it before setting a new one and in an effect cleanup. | S |
| R9 | Medium | `frontend/package.json:9` | No ESLint config, so hook and accessibility rules are not enforced. | `"lint": "next lint"` with no `.eslintrc*` or `eslint.config*` in `frontend/`. | R1 to R4 would have been caught by `jsx-a11y` and `react-hooks`. The agent's criteria rate this High; Medium here because CI has no lint gate (judgment). | Add `eslint.config.mjs` extending `next/core-web-vitals` (includes react-hooks and jsx-a11y). Needs an install, so a founder action. | S |
| R10 | Medium | `app/admin/page.tsx:117-135, 142-144` | `apiFetch` retries a non-OK response through a second URL; `loadData` is missing from effect deps. | `if (res.ok) return res` then falls through to the proxy for any error status; `React.useEffect(() => { loadData() }, [])`. | A 4xx or 5xx from the direct call is repeated against `/api/...`, which doubles write requests (PUT, DELETE, POST) on failure. | Fall back only in `catch` (network error), not on `!res.ok`. | S |
| R11 | Medium | `app/admin/page.tsx:296-298, 511-513` | Native `confirm()` for destructive actions; no credentials sent. | `if (!confirm(\`Are you sure you want to remove "${book.title}" ...\`))`; `apiFetch` sends only `Content-Type`; `Navigation.tsx:13` links `/admin` publicly. | The backend has no login (security E1, E2), so nothing protects these actions. | Scheduled with the login work (P12). Replace `confirm()` with an in-page dialog later (judgment). | S to M |
| R12 | Medium | `app/members/[id]/page.tsx:234`, `app/members/page.tsx:137`, `app/admin/page.tsx:910`, `CriterionDetailModal.tsx:752` | Index keys in lists built from data. | `key={idx}` on `book.meetups.map(...)`; `key={i}` on `book.member.split(',').map(...)` | Lists are read-only and never reordered, so no defect shows today (judgment). | Use `m.meetup_number` and `mName.trim()` as keys when next touching these lines. | S |
| R13 | Medium | `CriterionBookCloset.tsx` (2,337 lines), `app/admin/page.tsx` (1,647), `CriterionDetailModal.tsx` (900) | Very large client components. Closet has 34 or more state and effect blocks; admin has 34 `useState`. | `wc -l`, `grep -c` | No render cost measured, so no performance defect reported. Size makes R4 and R6 easy to miss (judgment). | No refactor requested. When touching, split the keyboard handler or the filter drawer first. | L |
| R14 | Low | `CriterionBookCloset.tsx:1983-1985`; `MeetupCard.tsx:74`; `meetups/[id]/page.tsx:166, 227, 309`; `authors/[id]/page.tsx:156`; `members/[id]/page.tsx:179` | Raw `<img>` instead of `next/image`; `alt` present on the closet card. | `<img src={coverSrc} alt={book.title} loading="lazy" ... />` | Covers load at full size; not measured. | Leave unless a measured payload problem appears (PRD §18). | S |
| R15 | Low | `CriterionBookCloset.tsx:1318-1360` | Search suggestions use `onMouseDown` buttons and a 250 ms blur delay. | `onBlur={() => setTimeout(() => setIsSearchFocused(false), 250)}`; `<button ... onMouseDown={...}>` | Keyboard users cannot pick a suggestion reliably. | Use `onClick` and keep the list open while focus is inside it. | S |
| R16 | Low | `CriterionBookCloset.tsx:1328` | Search input has a placeholder but no label. | `<input id="closet-search-input" type="search" ... placeholder="Title, author, spine #…">` | A placeholder is not an accessible name. | Add `aria-label="Search the closet"`. | S |

**Checked and fine:** hook order (no conditional hooks; `notFound()` at `books/[id]/page.tsx:62` runs after all hooks); listener cleanups (`CriterionBookCloset.tsx:751-760, 839-851, 963-965`; `CriterionDetailModal.tsx:71-72, 555-556`); the modal's synopsis fetch uses an `isMounted` guard; `useMemo` use is limited with no over-memoization; `'use client'` sits on pages that need state and no server-only import is in a client file; `target="_blank"` links set `rel`; the only `NEXT_PUBLIC_*` value is `NEXT_PUBLIC_API_URL`.

### Already-known issues

- **Spines not keyboard-reachable:** confirmed, now `CriterionBookCloset.tsx:106-133` (R1). The list view has the same pattern (R2).
- **Book detail page refetches `/books/{id}`:** confirmed. `app/books/[id]/page.tsx:28` `const data = await fetchBook(params.id as string)`; the closet already holds the full book and `lib/api.ts:160` uses `cache: 'no-store'`.
- **Stored links rendered as `href` without a scheme check (security F2):** confirmed at `components/shared/ResourceList.tsx:25` and `app/admin/page.tsx:873`.

### Proposed FMEA rows (merged into report_insights.md §10.8, 2026-10-09)

S, O, D are judgment scores (1 to 10). RPN = S × O × D.

| Failure mode | Effect | Cause | S | O | D | RPN |
|---|---|---|---|---|---|---|
| Modal gives no dialog announcement or focus return (R3) | Screen-reader and keyboard users lose their place | No `role="dialog"`, no focus handling | 6 | 6 | 5 | 180 |
| Keyboard user cannot open a book (R1, R2) | Library Room unusable without a mouse | `div onClick`, no `tabIndex` | 7 | 6 | 4 | 168 |
| Lint rules not enforced (R9) | New hook or accessibility bugs reach main unnoticed | No ESLint config | 5 | 6 | 5 | 150 |
| Books fetch fails and the closet looks empty (R5) | Readers think the library is empty | Error swallowed, no error state | 6 | 4 | 6 | 144 |
| Admin write sent twice (R10) | Duplicate add or delete on an error status | Fallback retries when `!res.ok` | 6 | 3 | 6 | 108 |
| Browser shortcut hijacked (R4) | Reader cannot reload or search the page | Keydown handler ignores modifiers | 5 | 7 | 3 | 105 |
| "Synced" toast on a failed sync (R6) | False confirmation | Dead `catch`; `loadBooks` never throws | 4 | 4 | 6 | 96 |

The F2 stored-link row the agent proposed is already covered by `report_insights.md` §10.8 row 19.

### Open questions for the founders

1. Should the Library Room be keyboard-complete (R1 to R4) before launch, or is mouse and touch the stated target? PRD §12 would decide this.
2. Do the single-letter shortcuts (`f`, `r`, `v`, `s`, `/`) need to stay, or may they require a modifier or a help overlay (R4)?
3. May an ESLint config be added (needs an install, so a founder action) so `react-hooks` and `jsx-a11y` run in CI (R9)?
4. Should the closet show an error state with retry on fetch failure, as other pages do (R5)? PRD §17.1 says yes for async states.
5. Is the `apiFetch` double try in admin intentional for the Docker proxy setup? If yes, limit it to network errors (R10).

---

## Backend patterns (ecc:backend-patterns)

**Date:** 2026-10-09
**Commit:** `fe1ddf1`
**Run by:** /ecc:backend-patterns, read-only.
**Scope:** `app/` against the backend-patterns guide: layering, sessions, transactions, N+1 queries, pagination, caching, background work, idempotency, logging.
**Method:** code reading; pattern counts with `grep -c` on `app/api/main.py`; an AST scan for queries inside loops and for `try` blocks that catch `Exception` around a raised `HTTPException`; **query counts and timings measured by calling the read-only route functions directly** (no HTTP server) against the database opened with `DATABASE_URL='sqlite:///file:book_club_archivist.db?mode=ro&uri=true'`, counting SQL statements with an SQLAlchemy `before_cursor_execute` listener. Times are single local runs.
**Not checked:** write routes were not executed; HTTP overhead and JSON encoding time are not included in the timings; `enrich_canonical_book_from_goodreads` was not traced line by line.

### Measurements

| Route (function) | SQL queries | Time | Items |
|---|---:|---:|---:|
| `GET /books` closet request (`get_books`) | 3 | 0.54 s | 2,018 |
| `GET /meetups` (`get_meetups`) | **6,278** | **7.02 s** | 53 |
| `GET /admin/meetups` (`get_admin_meetups`) | **6,278** | **8.73 s** | 53 |
| `GET /members` (`get_members`) | 1,290 | 1.79 s | 174 |
| `GET /books/{id}`, most-discussed book (`get_book`) | 31 | 0.04 s | 18 meetups |
| `GET /search?q=the` (`search`) | 72 | 0.07 s | 2 lists |

Pattern counts in `app/api/main.py`: `SessionLocal()` 26, `db.close()` 25, `Depends` 0, `db.commit()` 11, `db.rollback()` 9, `except Exception` 20, `response_model` 0, `BackgroundTasks` 0, caching decorators 0, logger calls 0, `print(` 0.

### Summary

- `GET /books` follows the batching pattern (3 queries for 2,018 books). The other list routes do not: `GET /meetups`, a public route, issues 6,278 queries and takes 7 seconds, which makes it a heavier denial-of-service target than the 2 MB `GET /books` (security E6).
- Write routes use explicit commit and rollback, which keeps data safe; five of them turn their own client errors into 500s.
- There is no service layer, no request-scoped session dependency, no logging and no background work: routes do everything inline, including outbound fetches.
- Two `GET` routes change data, which breaks the expectation that reads are safe to repeat or prefetch.

### Follows the guide

| Pattern | Evidence |
|---|---|
| Batch fetching instead of N+1 | `batch_books_to_dict` (`main.py:159-230`): books, then authors with one `IN` query, then discussions joined with members and meetups in one `IN` query. Measured: 3 queries for 2,018 books |
| Resource-style URLs | `GET /books`, `/books/{id}`, `/meetups/{id}`, `PUT /admin/books/{id}`, `DELETE /admin/discussions/{id}` |
| Request validation with models | Write routes take Pydantic `BaseModel` bodies (for example `AddBookToMeetupRequest` at `main.py:1387`) |
| Explicit transactions on writes | 11 `db.commit()` and 9 `db.rollback()`; writes run inside `try` with `rollback()` in `except` and `close()` in `finally` |
| Partial idempotency on add | `POST /admin/meetups/{n}/books` checks for an existing discussion of the same book at the meetup before inserting (`existing_meetup_disc`, around `main.py:1442`) |
| Path safety for files | `asset_path()` guard (`app/core/paths.py`) |

### Departures

| ID | Severity | file:line | Departure | Evidence | Defect or style | Ties to | Smallest fix | Effort |
|---|---|---|---|---|---|---|---|---|
| B1 | High | `main.py:634` (`get_meetups`), `:251` (`meetup_to_dict`), `:954` (`get_admin_meetups`) | N+1 queries on the meetup lists | AST scan: `db.query` inside `for` loops in `meetup_to_dict` and `get_admin_meetups` (`venue = db.query(Venue)...` and `discussions = db.query(Discussion)...` per meetup, then more per discussion). Measured 6,278 queries, 7.02 s and 8.73 s | **Defect:** a public page takes 7 s to answer, and repeated calls tie up the single process (adds to security E6) | §10.2 (route coupled to row-by-row data access) | Batch like `batch_books_to_dict`: load meetups, then venues, discussions, books and members with one `IN` query each, and group in Python | M |
| B2 | Medium | `main.py:1032, 1128, 1184, 1334, 1375` | Client errors turned into 500s | AST scan: `raise HTTPException(...)` inside a `try` whose handler is `except Exception` with no `except HTTPException` first, in `update_admin_meetup`, `generate_meetup_pdf_endpoint`, `update_admin_book`, `toggle_admin_discussion_general`, `delete_admin_discussion`. The upload route had the same bug, fixed in `33f4c8d` | **Defect:** "not found" and "bad request" arrive as 500 with raw text (security F5); the admin client then retries through its fallback URL (R10) | §10.1 (error handling repeated per route) | Add `except HTTPException: db.rollback(); raise` before `except Exception`, as in the upload route | S |
| B3 | Medium | `main.py:710` (`get_members`) | N+1 on the member list | `discs = db.query(Discussion).filter(Discussion.member_id == m.id).all()` inside `for m in members`. Measured 1,290 queries, 1.79 s for 174 members | Defect (slow public page), smaller than B1 | §10.2 | One query for all discussions of the listed members, grouped in Python | S |
| B4 | Medium | `main.py:548` (synopsis), `:1147` (meetup PDF) | `GET` routes with side effects | Synopsis fetches Goodreads or Apple and commits new cover, description, pages and rating (security E5); `GET /admin/meetups/{n}/pdf` generates the file and stores `pdf_url` on first call | **Defect risk:** link prefetchers, crawlers and retries trigger writes and outbound requests | §10.1 | Move the fetch and the write to `POST` admin routes or a job; `GET` returns what is stored | S to M |
| B5 | Medium | `main.py:2180` (`enrich_meetup_books_endpoint`), `:1116` (generate PDF) | Long work inline in the request | `for d in discussions: res = enrich_canonical_book_from_goodreads(d.canonical_book_id, db)`: one outbound lookup per book, in turn; cover downloads use an 8 s timeout (`pdf_generator.py:78`). `BackgroundTasks` is used 0 times | **Defect risk:** a meetup with many books (the largest has 100) can hold a request for minutes and time out at a proxy; partial results depend on where it stopped | §10.1 | FastAPI's built-in `BackgroundTasks` (no new dependency) or a CLI command for bulk enrichment; return immediately with a status | M |
| B6 | Medium | `main.py` (whole file) | No logging | 0 `logger.` calls and 0 `print(` in `main.py`; `loguru` is in `requirements.txt`. Errors only go back to the client as `detail=str(e)` | **Defect:** failures leave no server-side trace; the F5 fix ("log, then return a fixed message") first needs a logger | §10.1 | `from loguru import logger` and `logger.exception(...)` in each `except Exception` | S |
| B7 | Low | `main.py:65` (`get_db`), 26 routes | Sessions opened by hand; the dependency exists and is unused | `def get_db(): session = SessionLocal(); try: yield session finally: session.close()`; `Depends` used 0 times; 26 `SessionLocal()` calls | Style today (every route closes its session). Makes tests patch module globals (`tests/test_upload_limit.py` had to replace `SessionLocal`) instead of overriding one dependency | §10.1, §10.2 | Use `db: Session = Depends(get_db)` when a route is next changed; tests then use `app.dependency_overrides` | S per route |
| B8 | Low | `main.py` (2,215 lines) | No service or data-access layer | The only service module is `app/services/pdf_generator.py`; routes contain queries, business rules, outbound HTTP (`fetch_book_metadata_from_web`, `resolve_media_url`) and serialization | Style, with a cost: logic cannot be reused or tested without the HTTP layer | §10.1 (coincidental cohesion), §10.2 (`app.api.main` I = 1.0) | Do not add repository interfaces (one implementation each, YAGNI). Move outbound fetching and the serializers into `app/services/` with the router split | M |
| B9 | Low | `main.py:87` (`book_to_dict`), `:684` (`search`) | Per-row queries on detail and search | `meetup = db.query(Meetup)...` and `venue = db.query(Venue)...` per discussion. Measured 31 queries (0.04 s) for the most-discussed book; 72 (0.07 s) for search | Style today: fast at current size (judgment) | §10.2 | Reuse the batch serializer when Flow D reshapes `/books/{id}` | S |
| B10 | Low | `main.py:378-461` | No default or maximum page size on `GET /books` | `limit: Optional[int] = None`; applied only if given | Covered by security E6 | n/a | Default and maximum `limit` (see E6) | S |
| B11 | Low | `main.py` | No caching anywhere, including failed outbound lookups | 0 caching decorators; synopsis retries failures on every call (security E5) | Covered by E5; response caching for `/books` is not needed before gzip (judgment) | n/a | Remember failed lookups per book (see E5) | S |
| B12 | Info | `main.py` | No response models | `response_model` used 0 times | Already planned: Pydantic response models are the first build-phase item | n/a | Build phase | M |

Not applicable at this size (judgment): Redis or shared caches, job queues, structured JSON logging, role-based access control beyond the planned login, rate limiting in application code (the guide itself recommends a gateway or proxy).

### Proposed FMEA rows (merged into report_insights.md §10.8, 2026-10-09)

| Failure mode | Effect | Cause | S | O | D | RPN |
|---|---|---|---|---|---|---|
| Server errors leave no trace | Failures cannot be diagnosed after the fact | No logging in the API (B6) | 5 | 6 | 7 | 210 |
| Meetup list floods the database with queries | `/meetups` takes 7 s; repeated calls stall the API for everyone | N+1 in `meetup_to_dict` and `get_admin_meetups` (B1) | 6 | 6 | 5 | 180 |
| Client error reported as server error | Admin sees 500 for a missing record; client retries the write | `except Exception` swallows `HTTPException` (B2) | 4 | 5 | 5 | 100 |
| Bulk enrichment request times out halfway | Some books enriched, some not; unclear state | Sequential outbound fetches inside the request (B5) | 4 | 4 | 6 | 96 |

### Open questions for the founders

1. Should B1 (7-second meetup list) be fixed before Flow D, since the meetups page is public and slow today?
2. Is moving bulk enrichment to a CLI command acceptable, or must it stay a button in the admin page (then `BackgroundTasks`)?
3. May the API start writing a log file (B6), and where should it live (`assets/` is served publicly, so somewhere else)?

---

## FastAPI patterns (ecc:fastapi-patterns)

**Date:** 2026-10-09
**Commit:** `fe1ddf1`
**Run by:** /ecc:fastapi-patterns, read-only.
**Scope:** `app/api/main.py` against the FastAPI patterns guide; `frontend/next.config.ts` for the `/api/` rewrite.
**Method:** code reading; an AST scan of route functions (sync or `async`, blocking calls inside); the generated OpenAPI schema (`app.openapi()`, imported with the database URL set to read-only) for operation count, tags, descriptions, response schemas and status codes; `grep` for `Query(`, `Field(`, validators, middleware and import-time calls.
**Not checked:** runtime behaviour under load (thread pool exhaustion is reasoned from Starlette's default thread limit, not measured); whether the proxy path in P10 really returns 404.

### Measurements

| Item | Value |
|---|---|
| Route functions | 26 (25 `def`, 1 `async def`) |
| OpenAPI paths / operations | 32 / 33 |
| Operations with a documented 200 response schema | 0 of 33 |
| Operations with tags | 0 of 33 |
| Operations with a description (from docstrings) | 33 of 33 |
| `POST` operations returning 201 | 0 of 5 |
| `response_model` uses | 0 |
| `Depends` uses | 0 |
| `Query(...)` with validation | 4 routes (`search`, resolve-url, books/media suggest, members suggest) |
| `Field(...)` or validators on request models | 0 |
| Middleware | `CORSMiddleware` only; no `GZipMiddleware` |

### Follows the guide

| Pattern | Evidence |
|---|---|
| Settings through `pydantic-settings` | `app/core/config.py` (`settings.DATABASE_URL`, `settings.CORS_ORIGINS`) |
| CORS configured from settings | `main.py:49-58` reads `settings.CORS_ORIGINS` |
| App metadata | `FastAPI(title="BBB Library API", description=..., version="1.0.0")` at `main.py:35-39` |
| Every route documented | 33 of 33 operations carry a description from their docstring |
| Request bodies as Pydantic models | `MeetupUpdateRequest`, `BookUpdateRequest`, `AddBookToMeetupRequest`, `ToggleGeneralDiscussionRequest` (`main.py:905-942`) |
| Sync database access in sync routes | 25 routes are plain `def`, so FastAPI runs them in its thread pool and their blocking SQLAlchemy calls do not stop the event loop. The guide's warning is about sync calls in `async` routes (see P3) |

### Departures

| ID | Severity | file:line | Departure | Evidence | Defect or style | Smallest fix | Effort |
|---|---|---|---|---|---|---|---|
| P1 | Medium | `main.py` (all routes) | No `response_model` on any route | `response_model` 0 uses; OpenAPI shows an empty schema for all 33 operations | **Defect risk:** `/docs` cannot show what the API returns, and `frontend/src/lib/api.ts` types are written by hand, so the contract can drift unnoticed (PRD §11). Also no output filtering | Pydantic response models, the first build-phase item (B12); start with `/books` and `/books/{id}` because Flow D reshapes them | M |
| P2 | Medium | `main.py:905-942`, `:378-389` | Request models and query parameters carry no constraints | `rating: Optional[float]`, `publication_year: Optional[int]`, `date: Optional[str]`, `cover_url`/`url: Optional[str]`, `goodreads_id: Optional[str]`, `title: str`; `limit: Optional[int] = None` | **Defect:** out-of-range ratings and years, malformed dates and any URL scheme are accepted; this is where security F1, F2, F10 and E6 enter | `Field(ge=0, le=5)` for rating, a year range, `datetime.date` for dates, an `http`/`https` validator for URLs, a pattern for `goodreads_id`, `min_length=1` for title, `Query(ge=1, le=500)` for `limit` | S |
| P3 | Medium | `main.py:1069` (`upload_meetup_photo`) | Blocking work inside the only `async` route | `async def upload_meetup_photo(...)`; inside: `SessionLocal()`, `db.query(Meetup)...first()`, `open(dest_path, "wb")`, `f.write(content)` (up to 30 MB), `db.commit()` | **Defect:** these calls run on the event loop, so every other request waits while one upload writes to disk and commits. The guide lists this exact pattern as an anti-pattern | Make it a plain `def` and read with `file.file.read(MAX_UPLOAD_BYTES + 1)`; FastAPI then runs it in the thread pool like the other routes | S |
| P4 | Medium | synopsis (`:548`), enrich (`:2169`, `:2180`), resolve-url (`:1910`), suggest (`:1917-1920`) | Outbound network calls inside sync routes | `fetch_book_metadata_from_web`, `urlopen(..., timeout=8)`, `enrich_canonical_book_from_goodreads` per book | **Defect risk:** sync routes share Starlette's worker thread pool (40 threads by default, not measured here). Slow outbound calls hold threads; enough of them stall every route, including `/health` (ties to security E5 and backend B5) | Fix E5 and B5 (no fetch on public reads, bulk work in the background); keep timeouts short | S to M |
| P5 | Low | `main.py:65` | No dependency injection for the session | `Depends` 0 uses; `get_db` defined and unused | See backend B7 | `Annotated[Session, Depends(get_db)]` as a `DbDep` alias when routes move into routers | S |
| P6 | Low | OpenAPI; `main.py` error handlers | Status codes | All 5 `POST` operations document and return 200, including `POST /admin/meetups/{n}/books`, which creates rows; errors go out as `detail=str(e)` (security F5) and five routes turn 404 into 500 (backend B2) | Style for 201; defect for B2 and F5 | `status_code=201` on create routes; B2 and F5 fixes | S |
| P7 | Medium | `main.py` (2,215 lines) | No `APIRouter`, no tags | 26 route functions and 33 operations in one module; 0 of 33 operations tagged, so `/docs` is one flat list | Style with a cost: a change anywhere touches the one file; a login cannot be applied to "all admin routes" in one place (security E1 fix needs exactly that) | Router split below | M |
| P8 | Low | `main.py:42-46` | Side effects at import time | `os.makedirs("assets/uploads/meetups", exist_ok=True)` and three more, then `app.mount("/assets", StaticFiles(directory="assets"))`, all relative to the working directory, with no `lifespan` | Style; a risk when the module is imported from another directory (three scripts in `scripts/` and `tests/test_ssrf_guard.py` import it) | Build absolute paths from `app/core/paths.py`; move directory creation into a `lifespan` handler | S |
| P9 | Low | `main.py:49-58` | No compression middleware | Only `CORSMiddleware` is added | Measured cost: the closet request is 2,167,473 bytes raw and 523,519 gzip (`flow_comparison.md` §5) | `app.add_middleware(GZipMiddleware, minimum_size=1000)` (API backlog A3) | S |
| P10 | Low | `main.py:379, 465, 1911, 1918, 1920, 2003`; `frontend/next.config.ts` | Duplicate `/api/` path aliases on six routes | Stacked decorators (`@app.get("/books")` and `@app.get("/api/books")`) make 33 operations from 26 functions. The Next.js rewrite sends `/api/:path*` to the backend's `/:path*`, so `/api/media/resolve-url` through the proxy would reach `/media/resolve-url`, which the backend does not define (unverified; the admin client calls the backend directly first) | **Defect risk:** two names per route double what the planned login and any proxy rule must cover (security E1); the proxy path may already be broken | In the split, define each route once and mount the media router under both prefixes with `include_router` if both are still needed; verify the proxy path with a request | S |

### Planned router split (not implemented, not scheduled)

The split below is planned in general. It is not urgent and has no date; it happens when the API next needs a larger change. Goal: one place to attach the planned login (`dependencies=[Depends(require_admin)]` on the admin and media routers covers security E1 and E2 at once), smaller files, and tagged groups in `/docs`. No new dependency; FastAPI's `APIRouter` is built in.

| New file | Takes from `main.py` | Tag |
|---|---|---|
| `app/api/main.py` (kept, about 60 lines) | `FastAPI(...)`, CORS and GZip middleware, `/assets` mount, `include_router` calls, `lifespan` for directory creation | n/a |
| `app/api/deps.py` | `get_db` (exists), `DbDep` alias; later `require_admin` for P12 | n/a |
| `app/api/serializers.py` | `book_to_dict`, `batch_books_to_dict`, `meetup_to_dict` (and the batched meetup serializer from backend B1) | n/a |
| `app/api/routers/public.py` | `/health`, `/stats`, `/books`, `/books/{id}`, `/books/{id}/synopsis` (read-only after B4), `/meetups`, `/meetups/{id}`, `/search`, `/members`, `/members/{id}`, `/authors/{id}` | `public` |
| `app/api/routers/admin.py` | `/admin/meetups` (GET, PUT), meetup photo (POST, DELETE), `/admin/books/{id}`, `/admin/meetups/{n}/books`, `/admin/discussions/{id}` (PATCH, DELETE), both enrich routes | `admin` |
| `app/api/routers/media.py` | resolve-url, books suggest, media suggest, members suggest; mounted once per prefix that is still needed | `media` |
| `app/api/routers/reports.py` | `POST /admin/meetups/{n}/generate-pdf`, `GET /admin/meetups/{n}/pdf` | `reports` |
| `app/services/enrichment.py` | `fetch_book_metadata_from_web`, `enrich_canonical_book_from_goodreads`, `search_external_media` | n/a |
| `app/services/url_safety.py` | `_is_public_http_url`, `_public_opener`, `_PublicOnlyRedirects`; imported by `media.py` and `app/services/pdf_generator.py` (closes security F1 with the existing guard) | n/a |
| `app/schemas/api.py` | the four request models with P2 constraints; response models added in the build phase | n/a |

When it happens: move one router at a time and run the tests plus the verify scripts after each move. Route paths and response shapes stay the same, so the frontend needs no change.

### Proposed FMEA rows (merged into report_insights.md §10.8 as rows 35 to 37, 2026-10-09)

| Failure mode | Effect | Cause | S | O | D | RPN |
|---|---|---|---|---|---|---|
| Worker threads exhausted by slow outbound calls | Whole API stalls, `/health` included | Sync routes fetch Goodreads, Apple and arbitrary URLs with 8 s timeouts (P4) | 6 | 3 | 7 | 126 |
| Frontend and API contract drift unnoticed | Pages break or show wrong fields after a backend change | No response models; hand-written client types (P1) | 5 | 5 | 5 | 125 |
| Upload blocks the event loop | All requests pause during a large upload | Blocking calls inside `async def upload_meetup_photo` (P3) | 5 | 3 | 6 | 90 |

### Open questions for the founders

1. Are the `/api/` aliases still needed once the admin page calls one base URL? If not, the split can drop them (P10).

---

## Quality gate

**Date:** 2026-10-09
**Commit:** `2621ad6`
**Run by:** /ecc:quality-nonconformance, used for the quality-gate checks requested in its arguments; failed gate items are written up as non-conformance records with containment, root cause and corrective action, as that skill prescribes.
**Rules followed:** nothing installed. The frontend build ran on a temporary copy of `frontend/` in the session scratchpad (sharing `node_modules`), because the Docker dev server uses `frontend/.next` and an in-place build would have overwritten it; the copy was deleted afterwards. API checks were `GET` requests to the running backend; the synopsis route was skipped because it writes.
**Not checked:** pages in a browser (success, loading and failure states, console errors, 3D scene, hover and selection), ESLint (no config, R9), ruff (not installed).

### Checks

| Check | Command | Result | Counts | Duration |
|---|---|---|---|---|
| Python tests | `uv run --no-project --with-requirements requirements.txt --with pytest python -m pytest -q` | **Pass** | 32 passed | 2.16 s (5.5 s with startup) |
| Verify: database profiles | `python tests/verify/verify_p0_suite.py` | **Pass** | 10 of 10 profiles | 0.31 s |
| Verify: cross-links over the API | `python tests/verify/verify_p2_pathways.py` | **Pass** | 8 of 8 pathways | 0.80 s |
| Verify: deep links to the Library Room | `python tests/verify/verify_p3_bidirectional.py` | **Pass** | all pathways | 0.72 s |
| Python errors (flake8, errors only) | `flake8 app tests --count --select=E9,F63,F7,F82` | **Pass** | 0 | 2.3 s |
| Python style (flake8, full) | `flake8 app tests --count --statistics` | **Fail** (informational, no project config) | 624 findings: 524 E501 long lines, 36 W293, 26 F401 unused imports, 10 F841 unused variables, 9 E302, 5 E402, 3 E711, 3 E741, 3 F541, 3 E305, 1 F811 redefinition of `date`, 1 W391 | n/m |
| TypeScript | `npx --no-install tsc --noEmit -p .` (in `frontend/`) | **Pass** | 0 errors | 9.2 s |
| Frontend build | `npm run build` (on a scratch copy) | **Pass** | 11 routes; shared first-load JS 102 kB; largest page `/` and `/library-room` 171 kB | 73 s |
| ESLint | `next lint` | **Not run** | no ESLint config in `frontend/` (R9); the build's lint step had no rules to apply | n/a |
| API: health | `GET /health` | **Pass** | 200, 31 B | 0.009 s |
| API: closet list | `GET /books?limit=3000&only_discussed=true&exclude_general=true` | **Pass** | 200, 2,151,353 B; 19 fields per book | 1.32 s |
| API: meetups | `GET /meetups` | **Pass** (slow) | 200, 1,156,181 B | **6.99 s** (confirms B1 over HTTP) |
| API: members | `GET /members` | **Pass** | 200, 60,100 B | 1.67 s |
| API: missing book | `GET /books/does-not-exist` | **Pass** | 404 | 0.009 s |
| API: stats | `GET /stats` | **Pass** | 200, 185 B | 0.09 s |
| Running image is current | `docker compose exec -T backend grep -c MAX_UPLOAD_BYTES app/api/main.py` | **Fail** | 0 (Q1) | n/a |

### Verdict

**Automated gate: PASS.** Every test, verify script, typecheck and build passes, and the API answers with the expected status codes and shape.

**Definition of Done (PRD §24) for the work in this session: NOT MET.** Three items are open.

| §24 item | Status | Evidence |
|---|---|---|
| Acceptance criteria satisfied | Met | 30 MB cap: `tests/test_upload_limit.py` passes |
| Existing behaviour not broken | Met | 32 tests, 3 verify scripts, build and typecheck pass |
| Relevant build/test command passes | Met | Checks table |
| API behaviour checked | Partly met | `GET` routes checked over HTTP; the upload route is covered by a unit test only, and the running container does not have the change (Q1) |
| UI behaviour checked | **Not met** | No browser check in this run |
| Git diff inspected | Met | Commits made with explicit paths after `git status` |
| No unrelated files modified | Met | Commits `4199504` to `2621ad6` contain only the intended files |
| No fake archive data | Met | `verify_p0_suite.py` and `verify_p2_pathways.py` read real records |
| No silent error handling | **Not met** (codebase) | New code passes; existing code swallows errors (R5, R6) and the API logs nothing (B6) |
| `SESSION_LOG.md` updated | **Not met** | No entry for 2026-10-09 (Q2) |
| Unresolved issues documented | Met | `report_insights.md`, `security_analysis.md`, this file |

**Testing requirements (PRD §11.6):**

| Requirement | Status |
|---|---|
| Backend: start FastAPI, hit endpoints, check status and response shape, run Python tests | Met (running container, `GET` routes) |
| Frontend: build and typecheck | Met |
| Frontend: open page; success, loading and failure states | Not met (no browser run); the failure state is missing in the closet (R5) |
| Data integration: database to API to frontend to UI | Partly met: verify scripts cover database to API to deep-link URLs; the UI was not opened |
| Library Room checklist | App starts: met. Real books, correct canonical IDs, navigation by deep link: met (verify scripts). Scene renders, pulled book resolves, history loads in the card, console errors: not checked. Hover and focus: **fails** for keyboard (R1). API failure contained: **fails** (R5) |

### Non-conformance records

| NCR | Non-conformance | Containment | Root cause | Corrective action | Verification of effectiveness |
|---|---|---|---|---|---|
| NCR-QG-01 (Q1) | Running backend serves code older than `main` | None needed for reads; uploads on the running server are still uncapped | The compose file mounts only the database and `assets/`, so code changes need an image rebuild; nothing reminds anyone after a merge | `docker compose up -d --build`; add "rebuild containers after backend changes" to the commit checklist in `AGENT_RULES.md` | The `grep` check above returns 1 |
| NCR-QG-02 (Q2) | Session work not logged | None | The log step sits last in §24 and was skipped while commits were made one at a time | Write the 2026-10-09 entry (reorganised health docs, three reviews, upload cap) | Entry present before the next push |
| NCR-QG-03 | UI not verified in a browser | Changes in this session were docs and one backend route, so reader impact is low | The run had no browser step | Open `/library-room`, a book card and `/admin` with Playwright before the next frontend change; record console errors | Screenshot and console log stored with the run |
| NCR-QG-04 | Hook, accessibility and Python lint rules not enforced | None | No ESLint config (R9); flake8 has no project config and is not in CI | Founder installs ESLint config (R9); add a flake8 or ruff config with line length agreed, and run the errors-only selection in CI first | CI fails on a deliberately broken sample |

### Measurement row (merged into report_insights.md §13, 2026-10-09)

| Date | Commit | Meetups | Canonical | Discussed | Imported | Unlinked | Discussions | Dup groups | Cut sources | Aliases | Tests | Closet bytes | Note |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|---|
| 2026-10-09 | `2621ad6` | n/m | n/m | n/m | n/m | n/m | n/m | n/m | n/m | n/m | 32 pass (2.16 s); verify p0, p2, p3 pass; tsc 0 errors; build 11 routes (73 s); flake8 errors-only 0 | 2,151,353 (1.32 s over HTTP) | Quality gate; `GET /meetups` 6.99 s over HTTP |

Database counts were not re-measured in this run (no import or data change since the 2026-10-09 baseline row).

### Follow-ups from this run

| # | Item | Status (2026-10-09) |
|---|---|---|
| 1 | Merge the measurement row into `report_insights.md` §13 | Done |
| 2 | Write the 2026-10-09 entry in `SESSION_LOG.md` (NCR-QG-02) | Done (session 010) |
| 3 | Rebuild the containers so the running backend has the 30 MB upload cap (NCR-QG-01) | Deferred by the founders: not now |
| 4 | Browser check of `/library-room`, a book card and `/admin`, with console errors recorded (NCR-QG-03) | Pending |
| 5 | ESLint config (R9) and a flake8 or ruff config in CI (NCR-QG-04) | Pending (founder install) |
| 6 | Commit | Done with this section |

Note on the command: this run was started with `/ecc:quality-nonconformance`, a manufacturing quality-management skill (non-conformance reports, CAPA, SPC). The checks follow the quality-gate list in its arguments, and the skill's non-conformance format is used for the failed items. `/ecc:quality-gate` is the matching command for the next gate run.

---

## Dead code (ecc:refactor-clean)

**Date:** 2026-10-09
**Commit:** `9ee6c4d`
**Run by:** ecc:refactor-cleaner agent in **report-only mode**: no file was edited, moved, deleted or installed. Deletions in this project need a content comparison and an explicit founder-approved list.
**Tools:** flake8 (already installed) for F401, F841, F811; Python `ast` for the import graph and functions with one textual reference; a regex scan of `frontend/src` for files with no importer and exports with no outside reference; grep for dynamic uses (string routes, `import()`, `__import__`, CLI entry points, Dockerfile, compose, CI, `package.json` scripts, `next.config.ts` rewrites, pytest settings). vulture, knip, depcheck and ts-prune are not installed.
**Scope:** `app/`, `frontend/src/`, `scripts/`, `tests/`, `alembic/` (for references), `requirements.txt`, `requirements-api.txt`, `frontend/package.json`.
**Excluded:** `archive/`, `docs/reference/`, and the 10 closet components kept by founder choice (AlphabetNav, AmbientLighting, BookCover, ClosetPicksTray, HeroBookModal, ReadingTable, Shelf3D, Shelf, Book3D, ShelfBay).
**Verified after the run:** no importer for `ResourceList`, `EmptyState`, `FilterPanel`, `BookGrid`, `ui/Modal`, `home/Hero` (grep on import paths); `fetchSearch` and `formatNumber` referenced only where defined; `fetch_book_synopsis_from_web` and `_extract_month_year` have no call site; `@radix-ui/react-dialog` is imported only by `components/ui/Modal.tsx:4`.
**Corrections to the agent's text:** it mentions "60+ FastAPI routes"; the measured figure is 26 route functions and 33 operations (FastAPI patterns section). `app/api/main.py` is 2,226 lines after the upload-cap change.
**Not checked:** runtime or data-driven use (for example a script run from outside the repo); untracked `Backend/` and `packages/`; unused local variables, CSS and Tailwind classes; files in `frontend/public/`; which routes have no frontend caller; frontend unused imports (needs `tsc --noUnusedLocals` or ESLint).

### Summary

- 20 frontend items are certain dead code outside the kept closet set: 14 component files and 3 type files with no importer, plus 3 `api.ts` and 3 `utils.ts` exports nothing imports. 17 files (about 982 lines) and 6 exports (about 40 lines) are on the proposed deletion list.
- 3 Python functions in `app/` have no reference: `get_db`, `fetch_book_synopsis_from_web`, `_extract_month_year` (28 lines). `app/importers/base.py` (26 lines) is never imported but is a planned interface (CAUTION). The `Alias` and `BookRelation` models are unused in code but are live tables (DANGER).
- flake8 on `app/`: 34 findings (23 F401, 10 F841, 1 F811).
- Packages: `psycopg2-binary` and `tzdata` are unused; `pytest` and `pytest-cov` sit in the runtime requirements; `@radix-ui/react-dialog` is used only by dead code.
- Scripts: 9 one-off data scripts, 4 scratch scripts and 3 verify scripts are referenced by nothing; none is proposed, because they record data fixes and are run by hand.

### Cross-effects on other findings

- **Security F2:** `components/shared/ResourceList.tsx` (one of the two places that render stored links as `href`) is dead code (D7). F2 is live only at `frontend/src/app/admin/page.tsx:873`.
- **Backend B7:** the unused `get_db` (D21) is the dependency B7 recommends adopting. Deleting it and adopting it are opposite choices; the founders decide (question 7).
- **Backend B6:** logging is configured in `app/core/logging.py` and used by the CLI and `app/core/database.py`; the API simply never imports it.

### Findings

Sizes are line counts of the definition. "0 importers" means the script and grep found no import of that file in `frontend/src`; there are no `index.ts` barrel files and no dynamic `import()` calls.

| ID | Tier | Confidence | file:line | Item | Evidence | Size | Note |
|---|---|---|---|---|---|---|---|
| D1 | SAFE | certain | `frontend/src/components/ui/Card.tsx:1` | Card component | 0 importers | 78 | |
| D2 | SAFE | certain | `frontend/src/components/ui/Modal.tsx:1` | Modal component | 0 importers | 133 | Only user of `@radix-ui/react-dialog` |
| D3 | SAFE | certain | `frontend/src/components/ui/ViewToggle.tsx:1` | ViewToggle | 0 importers | 75 | |
| D4 | SAFE | certain | `frontend/src/components/shared/ErrorBoundary.tsx:1` | ErrorBoundary | 0 importers | 58 | |
| D5 | SAFE | certain | `frontend/src/components/shared/PageSkeleton.tsx:1` | PageSkeleton, BookPageSkeleton, MeetupPageSkeleton | 0 importers; 3 exports with 0 outside references | 71 | |
| D6 | SAFE | certain | `frontend/src/components/shared/EmptyState.tsx:1` | EmptyState | 0 importers | 30 | `ErrorState` and `LoadingState` are used |
| D7 | SAFE | certain | `frontend/src/components/shared/ResourceList.tsx:1` | ResourceList | 0 importers | 53 | One of the two F2 sites |
| D8 | SAFE | certain | `frontend/src/components/book/BookGrid.tsx:1` | BookGrid | 0 importers | 58 | Only importer of `BookCard` (D19) |
| D9 | SAFE | certain | `frontend/src/components/search/FilterPanel.tsx:1` | FilterPanel | 0 importers | 145 | |
| D10 | SAFE | certain | `frontend/src/components/search/SearchBar.tsx:1` | SearchBar | 0 importers (CommandPalette is the live search) | 55 | |
| D11 | SAFE | certain | `frontend/src/components/home/Hero.tsx:1` | Hero | 0 importers; `app/page.tsx` does not import it | 123 | Only importer of `StatCard` (D20) |
| D12 | SAFE | certain | `frontend/src/types/book.ts:1` | Book types file | 0 importers | 35 | |
| D13 | SAFE | certain | `frontend/src/types/meetup.ts:1` | Meetup types file | 0 importers | 39 | |
| D14 | SAFE | certain | `frontend/src/types/collection.ts:15` | `ArchiveManifest` and file | 0 importers | 29 | `api.ts` defines its own types |
| D15 | SAFE | certain | `frontend/src/lib/api.ts:220` | `fetchSearch` | 0 references outside its definition | 16 | Lines 220-235 |
| D16 | SAFE | certain | `frontend/src/lib/api.ts:240` | `fetchFeaturedBooks` | same | 7 | Lines 240-246 |
| D17 | SAFE | certain | `frontend/src/lib/api.ts:251` | `fetchLatestMeetups` | same | 4 | Lines 251-254 |
| D18 | SAFE | certain | `frontend/src/lib/utils.ts:14, 33, 44` | `formatNumber`, `formatDateShort`, `formatMeetupNumber` | 0 references in `src` | 13 | `formatDate` is used and stays |
| D19 | SAFE | certain after D8 | `frontend/src/components/book/BookCard.tsx:1` | BookCard | Only importer is BookGrid (D8) | 127 | Not counted in the list total |
| D20 | SAFE | certain after D11 | `frontend/src/components/shared/StatCard.tsx:1` | StatCard | Only importer is Hero (D11) | 20 | Not counted in the list total |
| D21 | SAFE | certain | `app/api/main.py:65` | `get_db()` | `grep -w get_db` over `app`, `scripts`, `tests`: definition only; no `Depends(get_db)` | 7 | See cross-effect on B7 |
| D22 | SAFE | certain | `app/api/main.py:542` | `fetch_book_synopsis_from_web()` | definition only; wrapper over `fetch_book_metadata_from_web` | 4 | |
| D23 | SAFE | certain | `app/parsers/scanner.py:29` | `_extract_month_year()` | definition only (grep of app, scripts, tests, alembic, docs) | 17 | `_expand_2digit_year` above it is used |
| D24 | CAUTION | likely | `app/importers/base.py:1` | `BaseImporter` (whole module) | 0 importers; docs describe parsers implementing it (`docs/plans/sprint_1c_implementation.md`, `docs/architecture/universal_app_flow.md`) | 26 | Planned design. Founder decision |
| D25 | DANGER | likely | `app/database/models.py:178` | `Alias` model (table `aliases`) | No code reference; table holds 1 row; `report_insights.md` and `flow_comparison.md` propose using it for name variants | 12 | Keep |
| D26 | DANGER | likely | `app/database/models.py:539` | `BookRelation` model (table `book_relations`) | No code reference; table exists with 0 rows | 20 | Keep; removal would need an Alembic migration |
| D27 | CAUTION | likely | `scripts/audit_meetup_45.py` to `audit_meetup_48.py`, `fix_meetup_45.py` | One-off data audit and fix scripts | No reference in CI, Dockerfile, compose, `package.json`, README or tests | about 615 | Record of how data was corrected |
| D28 | CAUTION | likely | `scripts/ingest_meetup_25.py`, `ingest_meetup_99.py`, `enrich_meetup_25.py`, `batch_enrich_all_meetups.py` | Ingest and enrich scripts | Same; `docs/book_count&details_issues.md` references `ingest_meetup_99` | about 1,233 | Provenance for meetups 25 and 99 |
| D29 | CAUTION | likely | `scripts/scratch/` (4 files) | Scratch scripts | No references. `.gitignore:66` lists `scratch/` yet the files are tracked; `test_p2_backend.py` sits outside `testpaths`, so pytest never collects it | 124 | Founder decision |
| D30 | CAUTION | likely | `tests/verify/verify_*.py` (3 files) | Hand-run verification scripts | Not matched by `python_files = ["test_*.py"]`, so CI never runs them | 160 | Keep (used by the quality gate) |
| D31 | n/a | n/a | `scripts/readme_images.py`, `scripts/install_tools.sh` | In use | README and `index.md` reference them | n/a | Not dead |

Also checked and used: every other `app/` module has at least one importer; CLI commands and API routes are decorator entry points; `model_post_init` (config) and `set_sqlite_pragma` (database) are framework hooks.

### Unused imports

flake8 on `app/`: 23 F401, 10 F841, 1 F811 (34 in total). By file: `api/main.py` 6, `pdf_parser.py` 5, `txt_parser.py` 4, `full_import.py` 4, `database.py` 3, `generator.py` 3, `pdf_generator.py` 3, `config.py` 2, `intermediate.py` 2, `cli/main.py` 1, `models.py` 1. Not run on `scripts/`, `tests/` or the frontend.

### Dependencies

Python (imports counted in `app`, `scripts`, `tests`, `alembic`):

| Package | File | Used? | Evidence | Proposal |
|---|---|---|---|---|
| fastapi | requirements-api.txt | yes | `app/api/main.py`, `tests/test_upload_limit.py` | keep |
| uvicorn[standard] | requirements-api.txt | yes | `Dockerfile:17` CMD | keep |
| sqlalchemy | both files | yes | 11 files | keep; listed twice, consolidate |
| pydantic, pydantic-settings | both files | yes | `app/api/main.py`, `app/schemas/intermediate.py`, `app/core/config.py` | keep; minimums differ between the two files, consolidate |
| python-multipart | requirements-api.txt | yes, indirect | needed at runtime by `UploadFile`/`File` (`main.py:8`, `:1069`) | keep |
| pdfplumber | requirements-api.txt | yes | `app/parsers/pdf_parser.py` | keep |
| pillow | requirements-api.txt | yes | `app/services/pdf_generator.py`, `scripts/readme_images.py` | keep |
| reportlab | requirements-api.txt | yes | `app/services/pdf_generator.py` | keep |
| alembic | requirements.txt | yes | `alembic/env.py` | keep |
| typer, rich | requirements.txt | yes | `app/cli/main.py`, `tests/test_cli.py` | keep |
| loguru | requirements.txt | yes | `app/core/logging.py` | keep |
| psycopg2-binary | requirements.txt, pyproject | no | 0 imports; Postgres appears only in a comment in `.env.example:6` | founder decision: remove now or keep until the PostgreSQL move (it adds to the Docker image) |
| pytest | requirements.txt | dev only | tests only; CI runs `pytest -q` after installing `requirements.txt` | move to a dev requirements file and update `ci.yml` |
| pytest-cov | requirements.txt, pyproject dev | no | no `--cov` anywhere | move to dev (pyproject already lists it there) |
| tzdata | requirements.txt | no | no `zoneinfo` use | likely remove; founder call |

npm (`frontend/package.json`):

| Package | Used? | Evidence | Proposal |
|---|---|---|---|
| next, react, react-dom | yes | 21 and 39 files; `react-dom` needed by Next.js at runtime | keep |
| framer-motion | yes | 12 files, including the live closet and modal | keep |
| class-variance-authority, clsx, tailwind-merge | yes | `lib/utils.ts`, `ui/Button.tsx`, `ui/Badge.tsx` | keep |
| @radix-ui/react-slot | yes | `ui/Button.tsx` (used by Navigation and ErrorState) | keep |
| @radix-ui/react-dialog | only by dead code | sole import `ui/Modal.tsx:4` (D2) | remove after D2 is approved (updates `package-lock.json`) |
| typescript, @types/* | yes | build | keep |
| tailwindcss, postcss, autoprefixer | yes | configs | keep |

Observation: `eslint-config-next` is not listed, so `npm run lint` may not run at all (ties to R9).

### Proposed deletion list (SAFE and certain only, for founder approval)

| Files and symbols | Lines |
|---|---|
| D1 to D11: 11 component files | 879 |
| D12 to D14: 3 type files | 103 |
| D15 to D17: 3 `api.ts` functions | 27 |
| D18: 3 `utils.ts` functions | 13 |
| D21 to D23: `get_db`, `fetch_book_synopsis_from_web`, `_extract_month_year` | 28 |
| **Total** | **1,050** |

Eligible after D8 and D11 are deleted: D19 `BookCard` (127 lines) and D20 `StatCard` (20 lines). Before any deletion: a content comparison (project rule), then `tsc --noEmit`, `npm run build` and `pytest`, one deletion at a time.

### Open questions for the founders

1. Keep the 11 unused UI components (Hero, FilterPanel, SearchBar, Card, Modal, ViewToggle, ErrorBoundary, PageSkeleton, EmptyState, ResourceList, BookGrid) as a future component kit, or remove them?
2. Is the `BaseImporter` interface plan (D24) still alive? If not, the module and its mention in `universal_app_flow.md` can go.
3. Keep `Alias` and `BookRelation` as planned schema (recommended for now)?
4. One-off ingest, audit and fix scripts (D27, D28): keep as history in `scripts/`, or move to `archive/`?
5. `scripts/scratch/` is in `.gitignore` yet tracked: keep tracking, or untrack?
6. Keep `psycopg2-binary` and `tzdata` until the PostgreSQL move? Move `pytest` and `pytest-cov` to a dev file (needs a CI change)?
7. `get_db` (D21): delete it, or adopt it as backend B7 recommends?

---

## Codemap summary (ecc:update-codemaps)

**Date:** 2026-10-09
**Commit:** `9ee6c4d`
**Run by:** ecc:doc-updater agent; wrote only `docs/CODEMAPS/` (checked with `git status`). The `.reports/codemap-diff.txt` step was skipped to keep writes inside `docs/CODEMAPS/`.
**Corrections made after the run:** 35 em dashes replaced (writing rule); `architecture.md` said "360 books per shelf", corrected to 3 shelves of 120 books (360 per section); `frontend.md` listed `CriterionBookSpine (x2,018)` and the dead `Hero`, `BookGrid` and `BookCard` in the live tree, corrected to `ShelfWall` (3 per section) and `ClosetSpine` (up to 120 per shelf).
**Not verified:** the agent's route grouping (11 public, 8 admin, 4 media) covers 23 of the 26 route functions; treat `backend.md` grouping as approximate until the router split defines the areas.

| File | Lines | Contents |
|---|---:|---|
| `docs/CODEMAPS/architecture.md` | 113 | System diagram, entry points, Library Room data flow matching PRD §9.1 |
| `docs/CODEMAPS/backend.md` | 114 | Routes by area with `/api/` aliases, helper functions, external calls |
| `docs/CODEMAPS/frontend.md` | about 170 | Page tree, Library Room component tree, API calls per page, unreachable components |
| `docs/CODEMAPS/data.md` | 152 | 27 tables with row counts (13,920 rows in total), relationships, 15 empty tables, Alembic state |
| `docs/CODEMAPS/dependencies.md` | 151 | Libraries and where they are imported; 7 external services (Goodreads, Apple Books, YouTube oEmbed, Open Graph pages, DuckDuckGo, TVMaze, Apple Podcasts), all without credentials |
| `docs/CODEMAPS/coupling.md` | 198 | Ca, Ce and I for 27 modules, measured with an `ast` import scan |

**What the maps show:**
- One FastAPI module serves 33 operations (26 route functions) with no authentication; a Next.js frontend with 10 pages reaches it through one client (`lib/api.ts`) and a `/api/` rewrite.
- Books flow from TXT and PDF sources through the parsers to imported records, automatic merging, canonical books, the JSON API and the closet. The merge step writes straight to canonical tables (B, A3).
- Coupling matches `report_insights.md` §10.2 exactly for all six key modules (`models` I = 0.17, `schemas.intermediate` 0.00, `pdf_parser` 0.75, `full_import` 0.86, `api.main` 1.00, `cli.main` 1.00).
- The backend calls 7 outside services, more than the earlier count of Goodreads, Apple Books and arbitrary URLs: DuckDuckGo, TVMaze and Apple Podcasts are used by the media suggest route, and YouTube oEmbed by URL resolution. All fetch with `urllib` and fixed timeouts; this widens the outbound surface noted in security E5 and FastAPI P4.

---

## Comments and docstrings (ecc:comment-analyzer)

**Date:** 2026-10-09
**Commit:** `9ee6c4d` (the agent read it from `.git/refs/heads/main`; tracked code equals this commit).
**Run by:** ecc:comment-analyzer agent, read-only, no shell; judged by reading.
**Scope:** `app/` (all 28 `.py` files; `main.py`, `full_import.py`, the parsers, `pdf_generator.py`, `models.py`, `config.py` read in full) and `frontend/src/` (`CriterionBookCloset.tsx` mostly, `CriterionDetailModal.tsx` partly, `api.ts`, the top of `admin/page.tsx`, `books/[id]/page.tsx`, `Footer.tsx`, `next.config.ts`; comment-only scans of the rest).
**Method:** each comment or docstring compared with the code beside it; regex scans for TODO, FIXME, XXX, HACK, `ponytail`, "legacy", "previously", "future".
**Verified after the run:** K1 (`full_import.py:385-393` creates a canonical for every title group before detection; `:445-447` then takes the exact-match `continue` for every non-noise book, so the fuzzy loop never runs; consistent with the July fix log's "0 comparisons", `report_insights.md` §6.1); K8 (`CriterionBookCloset.tsx:1103` `BOOKS_PER_SHELF = ... // 120`, comments at `:1114-1118` say 90); K13 data check on the read-only database: 169 of 2,783 canonical titles contain non-ASCII characters, some in Kannada, Malayalam, Devanagari and Bengali script (for example `ಸಾರ್ಥ [Saartha]`); 0 have an empty normalized title today, because these titles carry a romanized form in brackets, but the native script is dropped from the key. Member names: 0 with non-ASCII characters.
**ID note:** the agent labelled its two `ponytail:` items P1 and P2; renamed PT1 and PT2 here to avoid a clash with the FastAPI P findings.
**Not checked:** no code was run; parts of `CriterionBookCloset.tsx` (about lines 1232 to 1440, 1520 to 1940, 1990 to 2270) and the modal bodies were only scanned for comments; `BookSpine`, `CommandPalette`, UI and shared components, autocomplete inputs, tests, untracked `Backend/`, CSS.
**Skipped by founder choice:** the 10 unreachable closet components. `HeroBookModal.tsx:8`, `ClosetPicksTray.tsx:7` and `ShelfBay.tsx:6` still import `./Book3D`. Only `api.ts:5` mentions `better-sqlite3` in a live file; no live file mentions `VirtualLibraryRoom`.

### Summary

- 35 findings: 9 High, 14 Medium, 12 Low; 2 `ponytail:` comments.
- TODO, FIXME, XXX, HACK: confirmed 0 in `.py`, `.ts`, `.tsx`. Two promise-style markers: `app/cli/main.py:205` ("coming in future phase") and `books/[id]/page.tsx:190` ("in a future update").
- The phase comments in `run()` (`full_import.py:116-126`) are accurate (resolve, detect, link, merge), but the detection step itself flags nothing (K1).
- The most dangerous comments describe behaviour the code lacks: duplicate detection (K1), security claims wider than the code (K2 to K4), GET docstrings that hide writes (K5, K6), and a shelf size of 90 where the code uses 120 (K8).

### Cross-effects on other findings

- **K1 changes A3 and FMEA row 1 (`report_insights.md`):** the fuzzy matcher is unreachable, so "route fuzzy matches to the review queue" (A3) first needs detection to compare each book against *other* canonical books. A7's fixture test should cover a near-duplicate pair to prove the branch runs.
- **K3 with D7:** with `ResourceList.tsx` dead, security F2 lives only at `admin/page.tsx:873`, right under a comment claiming links are filtered.
- **K16 confirms R10:** the admin fetch helper resends writes after any non-OK response.
- **K5, K6 confirm B4;** **K23 confirms D21** (`get_db` unused).

### Findings

Ranked by how likely the comment is to lead a future change into a bug.

| ID | Risk | file:line | Comment (quoted) | What the code does (quoted) | Suggested comment fix |
|---|---|---|---|---|---|
| K1 | High | `app/pipeline/full_import.py:411-418, 447` | `"""Find possible duplicates using fuzzy matching. This runs BEFORE linking, so all imported books are unlinked. Uses a two-phase approach: 1. Exact match via dict lookup (fast) 2. Fuzzy match only for non-exact matches..."""` and `continue  # Will be linked in _link_imported_to_canonical` | Every non-noise imported book already has its own canonical with the same normalized title (lines 385-393: `canonical = CanonicalBook(... normalized_title=norm_title ...)`), so `if norm_title in canonical_by_title:` (445) is true for every book and `continue` (447) skips the fuzzy loop. `PossibleDuplicate` stays at 0 rows. **Verified.** | Rewrite: "Currently flags nothing: each imported book already matches its own canonical, so the fuzzy loop is never reached." Or fix the code to compare against other canonicals, then keep the docstring |
| K2 | High | `app/api/main.py:1644, 1656`; `app/services/pdf_generator.py:59-78` | `"""SSRF guard: http(s) only, and the host must resolve solely to public IPs."""`; `"""Re-check every redirect target so a public URL can't bounce to an internal one."""` | The guard is called only in `resolve_media_url` (`:1712`). `download_and_cache_image(url)` fetches `cover_url` with plain `urllib.request.urlopen(req, timeout=8)`; `cover_url` is saved unchecked through `PUT /admin/books/{id}`; existing local paths are returned unchanged (`if os.path.exists(url): return url`) | Add a scope note: "Used only by resolve_media_url. PDF cover download, Goodreads and Apple fetches are not covered." Note in `download_and_cache_image` that the URL is not validated |
| K3 | High | `frontend/src/app/admin/page.tsx:9` | `// Only http(s) links are rendered, so a stored javascript:/data: URL can't run on click.` | `safeHttpUrl` guards only the two preview links (`:1142`, `:1391`); the books table renders `href={book.url}` (`:873`) from `external_url`, stored without a scheme check | Apply `safeHttpUrl` at `:873` and keep the comment, or narrow the comment |
| K4 | Medium | `app/api/main.py:51-52`; `app/core/config.py:33-34` | `# Dev: localhost + private LAN ... Production origins come from CORS_ORIGINS. No cookies are used, so credentials stay off.` | `allow_origin_regex=...` is passed unconditionally; `settings.ENV` is never consulted (only printed at `cli/main.py:62`). CORS also does not protect `/admin` | "Applies in every environment. CORS only limits browsers; /admin has no authentication." Or gate the regex on `ENV` |
| K5 | High | `app/api/main.py:548-550`; `frontend/src/lib/api.ts:256` | `"""Get book synopsis, page count, and rating, fetching from Goodreads if missing in database."""` | This `GET` can commit `cover_url`, `description`, `page_count`, `rating` (`:585-586`); it calls Apple Books for every incomplete book, Goodreads only when `goodreads_id` is set; the public book modal triggers it (`CriterionDetailModal.tsx:511`) | "GET with side effects: fills missing fields from Goodreads (if goodreads_id is set) and Apple Books and saves them. Callable without login." |
| K6 | High | `app/api/main.py:1160` | `"""Download the generated PDF for the meetup, generating it on-demand if not already generated."""` | Writes the file and `meetup.pdf_url` (`:1171-1172`); checks only `os.path.exists(pdf_path)`, so a PDF made before later edits is served stale; the public meetup page links it (`meetups/[id]/page.tsx:131`) | "GET that may generate and save a PDF and update pdf_url; reuses any existing file even if the meetup changed; linked from the public meetup page." |
| K7 | Medium | `app/api/main.py:2105, 2182, 2193` | `"""Enrich a single canonical book by fetching metadata from Goodreads API."""`; `"""Enrich all books in a meetup with Goodreads metadata."""` | No Goodreads API: it scrapes the autocomplete endpoint and falls back to Apple Books; overwrites `cover_url`, `rating`, `goodreads_id`, `publication_year` unconditionally (only `description` is guarded); a miss says "No Goodreads results found" even after Apple Books; the meetup version counts discussion rows, so a book with 3 readers is fetched and counted 3 times | "Replaces cover, rating, goodreads_id and year with the best autocomplete match (Goodreads, else Apple Books); fills description only if empty; meetup totals count readers, not books." |
| K8 | High | `frontend/src/components/library/CriterionBookCloset.tsx:1114, 1116, 1118` | `// Shelf 1 (Left Wall): first 90 books of this section` / `next 90 books` / `next 90 books` | `const BOOKS_PER_SHELF = BOOKS_PER_ROW * ROWS_PER_SHELF // 120` (`:1103`); a section holds 360. **Verified.** A maintainer trusting "90" could hide 30 books per shelf | "first BOOKS_PER_SHELF books", "next BOOKS_PER_SHELF books" |
| K9 | Medium | `app/pipeline/full_import.py:483-488, 505, 512` | `"""Merge canonical books with identical normalized titles. ... (due to casing, punctuation, etc.)."""`; `.order_by(CanonicalBook.title.desc())  # longest title first` | Casing and punctuation variants already share one canonical (grouped on normalized title plus author, `:369`); duplicates reach this step only when the author key differs. The merge ignores author. `title.desc()` sorts Z to A, not by length | "Merges canonicals with the same normalized title but different author keys; ignores author; keeps the Z-to-A first title." Or fix the sort |
| K10 | Medium | `app/api/main.py:78-79` vs `155-156` | `"""Convert CanonicalBook to API response dict."""`; `"""Convert a list of CanonicalBook models to API response dicts efficiently in batch."""` | The batch version excludes general and tangent rows from `members`, `meetups`, `discussion_count` (falls back to the general count only when no proper discussion exists, `:241`) and adds `media_type`; the single version counts all rows. `/books` and `/books/{id}` can disagree on the same book | State the difference in both docstrings, or have one call the other |
| K11 | Medium | `app/api/main.py:1688, 1675-1680` | `# 1. YouTube video, shorts, or playlist via official free oEmbed`; `- YouTube channels (via channel page / handle extraction)`; `IMDb / Letterboxd / Goodreads / Wikipedia` | oEmbed matches only `/watch`, `/shorts/` and youtu.be; playlists and channels go to the generic Open Graph scraper; no handle extraction beyond `creator = title if "@" in clean_url`; no Wikipedia case | "oEmbed for watch, shorts and youtu.be; everything else uses the generic Open Graph scraper." |
| K12 | Medium | `app/api/main.py:1806` | `- youtube / tangent: URL auto-resolver or fallback suggestion` | `tangent` has no branch and falls to `return search_external_books(q_clean)` (`:1917-1918`) | "youtube returns a custom entry; tangent and unknown types fall through to a book search." |
| K13 | Medium | `app/parsers/utils.py:8, 27` | `"""Lowercase, strip accents, remove non-alphanumeric, collapse spaces."""`; `"""Strict normalization: lowercase, strip non-alphanumeric for matching."""` | `re.sub(r"[^a-z0-9\s]", "", title)` deletes every non-ASCII letter. **Data check:** 169 titles contain non-ASCII characters, including Kannada, Malayalam, Devanagari and Bengali script; none has an empty key today because each carries a romanized form, but a title in native script only would become empty and be dropped as noise | "Keeps only a-z and 0-9; non-Latin scripts are removed entirely and can produce an empty string." |
| K14 | Medium | `app/parsers/scanner.py:6, 19-20` | `# Month name to number mapping for 2-digit year expansion`; `"""Heuristic: years 00-30 map to 2000-2030, 31-99 map to 1931-1999. For BBB context (started ~2017), anything > 15 maps to 2000+."""` | `if year <= 30: return 2000 + year else: return 1900 + year`, so "SEP 31" reads as 1931; `MONTH_ABBREVS` is never used and `month_str` is ignored | Delete the "> 15" sentence; note the 2030 cut-off or move it; delete `MONTH_ABBREVS` |
| K15 | Medium | `app/database/models.py:24-28, 52-55, 199`; `app/parsers/pdf_parser.py:406, 359` | `"""Layer 1: Immutable raw source provenance record. Preserves exact original text location..."""`; `doc="Exact unedited original substring from source document"`; `Verified single source of truth` | `raw_text[:2000]` (`full_import.py:251`), `[:500]` for minimal sources (`:307`), `text[:2000]` (`pdf_parser.py:359`); PDF per-book sources store only the title; `pdf_page` is always 1; nothing enforces immutability; no step verifies a canonical | "Truncated excerpt (up to 2,000 chars, 500 for minimal sources, title only for PDF books); line numbers approximate; not enforced as immutable." Drop "Verified" |
| K16 | Medium | `frontend/src/app/admin/page.tsx:105, 109-120` | `// Resilient fetch helper: tries direct backend port first, falls back to Next.js reverse-proxy` | Falls back after any non-OK response: `if (res.ok) return res` then `return fetch(proxyPath, init)`; a failed write (including a 30 MB upload) is sent twice | "Retries once through the proxy on a network error or any non-2xx response; writes can be sent twice." Or retry only on network errors (R10) |
| K17 | Low | `app/api/main.py:1063-1065, 1070, 1073, 1033` | `# ponytail: arbitrary 30 MB cap...`; `"""Upload group picture or media for a meetup."""`; `"""Update meetup date, venue, or title."""` | The 413 message repeats "30 MB" instead of using `MAX_UPLOAD_BYTES`; any file is saved with an image extension; an existing file is overwritten; an invalid date is silently ignored (`except ValueError: pass`); a new venue gets `city="Bangalore"` while seeds use "Bengaluru" | Build the message from the constant; "Saves any uploaded file as meetup_N_photo.<ext>, replacing the previous one; content not checked." |
| K18 | Low | `app/api/main.py:1113` | `"""Remove uploaded group photo for a meetup."""` | Only `meetup.photo_url = None; db.commit()`; the file stays on disk | "Clears the photo link; the file stays in assets/uploads/meetups." |
| K19 | Low | `app/services/pdf_generator.py:117-120, 159, 235-241` | `"""Format date to '23rd August 2026' or similar friendly string."""`; `"""...exact Canva style of BBB 99 & BBB 98..."""`; `# Determine group photo: first existing candidate` | `if not d: return "2026"` (hard-coded year); one candidate path lacks the `meetups` folder the upload writes to; the last candidate is BBB 99's template photo, so a meetup with no photo gets another meetup's picture | Return blank for no date; fix the path; note the BBB 99 fallback; drop "exact" |
| K20 | Low | `CriterionBookCloset.tsx:41, 148, 1026, 1095, 1250, 1445` | `// Heights: 165px to 215px, Widths: 22px to 37px`; `(Flat transform on mobile saves 540 GPU layers)`; `or numeric "45"`; `(Matching User Drawing 2 & 3)`; `(Exact Match with 00:14 of video)` | Formulas give 165 to 212 and 22 to 36; a section holds 360 books; a bare "45" matches as a spine number; the drawings, video and screenshots are not in the repo | Correct the ranges and counts; remove external references |
| K21 | Low | `frontend/src/app/books/[id]/page.tsx:187-190` | `{/* Synopsis placeholder */}` / `Synopsis will be added from external sources in a future update.` | The synopsis feature exists; this page always shows the placeholder even when `book.description` is set | Show `book.description` or fetch the synopsis |
| K22 | Low | `frontend/src/lib/api.ts:5`; `app/api/main.py:1938, 1959` | `* It replaces the previous better-sqlite3 direct database access.`; `Combines local SQLite database with Goodreads...` | Removed-dependency history; the engine supports other databases through `DATABASE_URL` | Delete the `api.ts:5` line; say "local database" |
| K23 | Low | `app/api/main.py:65-66, 75-77, 881-883, 28` | `"""Get database session."""`; `# Response models (simplified for API)`; `# Health check` | `get_db` is unused (D21); the "Response models" section holds dict builders; the "Health check" banner at 881 sits before the Admin banner while `/health` is at 342; `get_engine` imported and unused | Delete or adopt `get_db`; rename the banner "Response builders"; delete the orphan banner |
| K24 | Low | `app/api/main.py:391, 383, 396, 411` | `"""Get all books with optional filtering."""`; `# Filter: only discussed books and/or exclude general discussions & tangents` | `year` is accepted and never used; `elif only_discussed:` (411) is dead, so `only_discussed` alone also drops general and tangent books; `sort_by == "firstDiscussedYear"` sorts on `created_at` (insert time) | List the real filters; note `year` is ignored |
| K25 | Medium | `app/api/main.py:1185, 1400, 1419-1420` | `"""Update book title, author, and meetup discussion contributor/notes."""`; `"""Add a book to a meetup with multi-reader support."""` | Update also changes cover, year, rating, goodreads_id, media type, link and the general flag; both routes set `normalized_title = title.lower()`, unlike the pipeline's `normalize_title`; add matches on title only, ignoring author | List all edited fields; note the different normalization and the title-only match |
| K26 | Low | `app/api/main.py:1547, 1936-1939, 1943-1946` | `"""Live autocomplete suggestion endpoint. Combines local SQLite database with Goodreads, TVMaze, DuckDuckGo Film, and Apple Podcasts."""` | Book searches use the local DB, Goodreads and Apple Books; other types skip the local DB; results cached in `_SUGGESTION_CACHE = {}` for 600 s with no size limit; a cached "in_archive" flag goes stale after an add | Note the 10-minute unbounded in-memory cache and the sources per media type |
| K27 | Low | `app/cli/main.py:205` | `[yellow]Full validation engine coming in future phase.[/yellow]` | The command runs 2 counts | Keep as a visible stub or describe the 2 checks |
| K28 | Low | `app/parsers/pdf_parser.py:26-37, 79-91, 142` | `"""Extract all text from a PDF using pdfplumber."""`; `# author is last 2+ words`; `# Check if last 2-3 words look like an author name` | `except Exception: pass` returns partial or empty text and the caller returns `[]`, so "Failed to parse" never fires; the heuristic takes exactly the last 2 words; `in_book_section` is set and never read | "Returns partial or empty text if the PDF cannot be read; errors are swallowed." Say "last 2 words" |
| K29 | Low | `app/parsers/txt_parser.py:44, 232, 350-356` | `# Book line detection — much stricter`; `# Skip empty lines and short narrative`; `# Calculate line offsets for each section` | Only empty lines are skipped; `current_pos += len(section.split("\n"))` counts the shared line twice, so `start_line` drifts about one per meetup; the pipeline matches sources on `start_line` (`full_import.py:295-298`) | "start_line is approximate and can drift." Delete stale comments |
| K30 | Low | `app/importers/base.py:7`; `app/schemas/intermediate.py:78`; `app/database/models.py:406-407` | `"""Abstract Base Importer interface that all source importers must implement."""`; `"""Standardized record wrapper returned by all importers."""`; `"""Junction table for multi-member panel discussions."""` | The parsers do not subclass `BaseImporter` (D24); `DiscussionParticipant`, `BookMention`, `Quote`, `BookRelation`, `Alias`, `Tag`, `Genre` are not written by any code in `app/`; multi-reader meetups are one `Discussion` row per member | Say which classes implement it; mark unused tables "not populated" |
| K31 | Low | `app/pipeline/full_import.py:69, 146-148, 566` | `"""Execute the full pipeline."""`; `# Verify canonical book exists (cache might be stale after merging)` | `job.status = "FAILED"` is set and then rolled back, so the failure is not recorded; after a merge the cache is keyed by the kept book's author, so a record whose author variant was merged away gets no `Discussion` | "Commits on success; on error rolls back everything, including the job and log rows." Fix the stale-cache comment |
| K32 | Low | `app/reports/generator.py:117`; `app/database/models.py:292` | `Review Queue: {dup_count} possible duplicates pending review` | Counts all rows regardless of status; no route or page reviews them | "possible duplicates flagged" |
| K33 | Low | `app/api/main.py:1316` (`1010`) | `# sort books: ... general discussion books down of the list` | Grammar only; copied in `admin/page.tsx:333` | "at the bottom of the list" |
| K34 | Low | `app/api/main.py:958-964, 970-973` | `# Group discussions by canonical_book_id ...` with `else: grouped_discs[f"disc_{d.id}"].append(d)` | Discussions without a book are dropped later (`if not book: continue`) | Say they are dropped, or remove the branch |
| K35 | Low | `app/api/main.py:1722`; `app/services/pdf_generator.py:8` | `raw_html = resp.read()[:800000]...` | Reads the whole body, then slices; the cap limits parsing, not download | Add "read then truncate" if a download cap is meant |

### Deliberate-simplification comments (`ponytail:`)

| ID | file:line | Comment | Still true? | Ceiling and upgrade path |
|---|---|---|---|---|
| PT1 | `app/api/main.py:1063-1065` | `# ponytail: arbitrary 30 MB cap set by the founders (2026-10-09); revisit once real photo sizes are known. The request body is still received in full by the server; a reverse-proxy limit is the hard stop when deployed.` | Yes: `MAX_UPLOAD_BYTES = 30 * 1024 * 1024` and `await file.read(MAX_UPLOAD_BYTES + 1)` match; the framework spools the upload before the check | The named reverse proxy does not exist yet: `docker-compose.yml` exposes the services directly (`ports:` at lines 8 and 27). The Next.js `/api` rewrite may have its own body limit (not checked). The revisit has no date |
| PT2 | `app/api/main.py:1670` | `# ponytail: resolve-then-fetch leaves a DNS-rebinding window; pin the resolved IP if this endpoint goes public.` | Yes: the host is resolved by the guard and again by `urllib`, also on each redirect hop | "If this endpoint goes public" may already hold: `/admin/media/resolve-url` and `/api/media/resolve-url` have no login and compose publishes the ports (security E4) |

### Proposed FMEA rows (merged into report_insights.md §10.8, 2026-10-09; K7, K9, K15, K16 folded into existing rows)

S, O, D are judgment scores (1 to 10). RPN = S × O × D.

| Failure mode | Effect | Cause | S | O | D | RPN |
|---|---|---|---|---|---|---|
| Duplicate detection stays silent while docs say it works (K1) | Review queue always empty; real near-duplicates reach the library unflagged | Fuzzy branch unreachable; docstring promises it | 5 | 8 | 6 | 240 |
| Security comments trusted as complete (K2 to K4) | Stored `javascript:` link, internal fetch via PDF covers, or a LAN page calling admin routes goes unreviewed | Comments claim more protection than the code has | 7 | 4 | 6 | 168 |
| GET routes treated as read-only (K5, K6) | Opening a book or a PDF link writes to the database and calls outside services; prefetchers and crawlers can trigger it | Docstrings omit the writes | 5 | 5 | 6 | 150 |
| "Enrich" overwrites curated metadata (K7) | Founder-set cover, rating or year replaced by a search match | Docstring says "fetching metadata", code overwrites | 5 | 5 | 5 | 125 |
| Non-Latin titles and names collapse to an empty key (K13) | Native-script-only titles dropped as noise; names merged under one key | Normalization keeps only a-z and 0-9 | 6 | 3 | 6 | 108 |
| Merge step changed on a wrong premise (K9) | Wrong canonical kept; authors merged or split wrongly | Docstring blames casing; real cause is the author key | 5 | 4 | 5 | 100 |
| Source "immutable, exact text" overstated (K15, K29) | Provenance trusted beyond what is stored | Truncated or title-only text; drifting line numbers | 4 | 5 | 5 | 100 |
| Writes sent twice after a failed first try (K16) | Duplicate or conflicting admin writes | Retry on any non-OK response | 4 | 4 | 6 | 96 |
| Shelf slice edited from a wrong comment (K8) | 30 books per shelf disappear from the closet | Comment says 90, constant is 120 | 5 | 3 | 4 | 60 |
| Two-digit year becomes 19xx from 2031 (K14) | "SEP 31" read as 1931 | Docstring claims "> 15 maps to 2000+" | 4 | 2 | 6 | 48 |

Some of these overlap rows already in `report_insights.md` §10.8 (row 1 for K1, rows 14 and 19 for K2 and K3, row 34 area for K16 via R10, row 5 for K15). Merge decision with the founders.

### Open questions for the founders

1. K1: should duplicate detection produce fuzzy candidates? If yes, it must compare each book against other canonicals; A3 and A7 depend on this.
2. PT2 and K2: is `/admin/media/resolve-url` meant to be reachable by anyone who can reach port 8000? Should PDF cover downloads use the same public-address check?
3. PT1: will a reverse proxy sit in front of the API when deployed? Without one, the 30 MB check is the only limit.
4. K3: apply `safeHttpUrl` at `admin/page.tsx:873`, and reject non-http(s) values for `external_url` in the API?
5. K4: limit the LAN and localhost CORS rule to `ENV=development`?
6. K5 and K6: make the synopsis and PDF routes `POST` or admin-only, or only document the writes?
7. K7: should "Enrich" fill only empty fields, as the add-book route does (`main.py:1453-1469`)?
8. K13: normalization drops Kannada, Malayalam, Devanagari and Bengali script (169 titles contain non-ASCII characters). Add a rule that keeps non-Latin letters?
9. K19: should a meetup with no photo show BBB 99's template photo in its PDF?
10. K21: should the book page show the stored description now that synopsis exists?
11. The closet loads at most 3,000 books (`CriterionBookCloset.tsx:876-880`, `limit: 3000`, sorted by title); past 3,000, the last titles drop out silently. Acceptable?
12. Delete comment references to files outside the repo (video timestamps, drawings, screenshots)?

---

## Code quality (ecc:plankton-code-quality)

**Date:** 2026-10-09
**Commit:** `9ee6c4d`
**Run by:** a general-purpose subagent, read-only, using the Plankton categories. Plankton itself (write-time lint hooks) is not installed; this is a manual review.
**Method:** Python `ast` scripts (function length, unused parameters, classification of every `except` handler); `flake8 --select=F app/`; `npx --no-install tsc --noEmit -p .` (exit 0) and a second run with `--noUnusedLocals --noUnusedParameters`; a Node script using `frontend/node_modules/typescript` for TS/TSX function length; Python scripts for unimported frontend files and frontend `catch` blocks; `difflib` on the two book-line parsers; read-only SQLite queries (`file:book_club_archivist.db?mode=ro`); parser and noise functions called directly on sample strings (pure functions, no writes); grep and wc.
**Scope:** `app/` (6,002 lines; `app/api/main.py` is 2,226 lines at this commit) and `frontend/src/` (60 files).
**Skipped:** the 10 closet components kept by founder choice; `scripts/`, `tests/`, `Backend/`.
**Not checked:** the import pipeline at runtime (import-path findings come from code reading plus pure-function probes); ESLint (no config, R9), ruff, vulture, knip (not installed); whether the current database came from `full_import.py` or later scripts; rendering and performance.
**Verified after the run:** C1 (436 of 2,783 titles and 816 of 2,199 authors stored with a key different from `normalize_title` / `normalize_name_for_dedup`; 27 title and 106 author collision groups, read-only query); C4 (`_parse_pdf_book_line("The God of Small Things")` returns title `The God of`, author `Small Things`); the fuzzy threshold (`full_import.py:462`: `score >= 0.75`).
**Corrections to earlier text:**
- The fuzzy-match threshold in the code is **0.75**, not 0.85. The 0.85 in the review brief came from the specification (`imperative_decisions.md` §2.A.5, "≥ 85%"); in the code 0.85 is only a PDF `extraction_confidence` value.
- `report_insights.md` §2 counts 16 duplicate groups using `lower(trim(normalized_title))` on the stored keys; C1 counts 27 using `normalize_title()` on the titles. Both are correct for their key; C1's figure reflects what the import dedup would see.
**Cross-references (not re-reported):** B1, B2, B5, B6, F5, R4, R6, R10, R13, P2, P10, Q3. Overlaps with this session's other runs: C14 matches dead code D1 to D20 (this run also lists `BookSpine.tsx`, used only by the skipped `Shelf.tsx`); C6 matches K9; C8 matches K28; C13 matches A1 and K15; C19 matches K14.

### Summary

- **Biggest live defect: four normalizers write the same `normalized_title` and `normalized_name` columns.** 436 of 2,783 canonical books and 816 of 2,199 authors are stored in a form the import dedup cannot match; the database already holds 27 duplicate title groups and 106 duplicate author groups (C1).
- **Goodreads enrichment overwrites curated covers, ratings and Goodreads ids** with the first search hit and never checks the title (C2).
- **The import path has silent-loss rules that fire on a re-import:** the PDF parser splits "The God of Small Things" into title "The God of" and author "Small Things" (C4); both noise filters drop real titles such as "It", "Book of Dust" and "Harry Potter and the Philosopher's Stone" (C5); the merge keeps the wrong title and drops discussions across authors (C6); a failed PDF text extraction is swallowed (C8).
- **"General discussion" is decided by 6 backend copies and 1 frontend copy with different results;** for 61 books the list and detail endpoints disagree on `is_general_discussion` and `discussion_count` (C3).
- **Dead code:** 13 live-tree frontend files (1,302 lines) are never imported, including the only `ErrorBoundary`; flake8 reports 23 unused imports and 10 unused variables in `app/`; the `year` filter on `/books` is accepted and ignored.
- **Function length:** the 9 Python functions over 100 lines are confirmed; 17 frontend functions are over 150 lines; the closet component body alone is 1,643 lines.

### Findings (ranked by defect risk)

| ID | Defect risk | file:line | Finding | Evidence | Possible wrong outcome | Smallest fix | Effort |
|---|---|---|---|---|---|---|---|
| C1 | High | `app/api/main.py:1192, 1200, 1247, 1413, 1420, 1427, 1509, 2161`; `app/parsers/utils.py:7, 26`; `frontend/src/app/admin/page.tsx:44` | Four normalizers write or compare the same keys. Import uses `normalize_title` (accents and punctuation stripped) and `normalize_name_for_dedup` (all non-alphanumerics stripped). Admin add, admin edit and enrichment use `.strip().lower()`. The admin duplicate warning uses a JS variant; suggestion dedup a fourth (`b.title.lower().strip()`, `main.py:1975, 1996`) | `book.normalized_title = req.title.strip().lower()` (`:1192`); `filter(CanonicalBook.normalized_title == title_clean.lower())` (`:1420`); `Author(full_name=author_name, normalized_name=author_name.lower())` (`:1413`). Measured: 436 of 2,783 canonical books have `normalized_title != normalize_title(title)` (for example `'sapiens: a brief history of humankind'`); 27 title groups (55 rows, 79 discussions) collide under `normalize_title`, 15 including a lowercase-only row; 816 of 2,199 authors mismatched, 106 collision groups (212 rows), for example `R K Narayan` / `R.K. Narayan`, `CS Lewis` / `C.S. Lewis`; members: 24 mismatched, 1 collision (`Rahulkumaresan` with 0 discussions, `Rahul Kumaresan` with 7). Attributing every collision to the admin path is judgment: `scripts/ingest_*.py` also write these columns | Adding a book whose title has punctuation creates a second canonical; counts and author pages split; the closet shows the book twice | Use the two `utils` functions at the 8 write sites and the lookup (`:1420`); look up authors and members by normalized key; then a one-off report of the 27 + 106 groups for founder-approved merges | M |
| C2 | High | `main.py:2104-2168` (`enrich_canonical_book_from_goodreads`), `:478-539` (`fetch_book_metadata_from_web`), `:2170-2205` | Enrichment overwrites curated fields without checking the match is the same book; the meetup loop runs once per discussion row | `best = candidates[0]`, then `book.cover_url = best["cover_url"]`, `book.rating = best["rating"]`, `book.goodreads_id = best["goodreads_id"]`, `book.publication_year = ...`, none guarded by "if empty"; the title is never compared. Apple fallback takes `results[0]` with `limit=1`, and `GET /synopsis` commits it (`:571-585`). Meetup loop: `for d in discussions: ... enrich_canonical_book_from_goodreads(d.canonical_book_id, db)`, `total_books = len(discussions)` | A correct admin-set cover, rating or Goodreads id is replaced by a study guide or another book by the same author; "Enriched N of M books" counts discussion rows | Guard each assignment with `if not book.x` (as `add_book_to_meetup` does, `:1453-1468`); require `normalize_title(best["title"])` to start with `normalize_title(book.title)`; iterate `{d.canonical_book_id for d in discussions}` | S |
| C3 | Medium | `main.py:128-131, 196-200, 226, 301-304, 396-398, 987-990`; `frontend/src/components/library/CriterionBookCloset.tsx:880-884` | "General discussion" has 6 backend copies plus 1 frontend copy with different rules; `discussion_count` has two definitions | `book_to_dict` and `meetup_to_dict` check only `"general" in topic/notes` and any single match makes the book general; `batch_books_to_dict` also checks `"tangent"` and `disc_media == "tangent"` and calls a book general only when `book_proper_count == 0`. Count: all rows (`:81`) vs proper-only, else general (`:241`). Measured: 61 books have both general and proper discussions; in 11 books `discussion rows > distinct meetups`, so `/books/{id}` lists a meetup more than once (no dedupe at `:87-99`) | The same book is "general" with a different count depending on the page; closet and detail disagree | One `is_general(topic, notes, media_type)` helper called from all 6 sites; dedupe meetups in `book_to_dict` | S |
| C4 | Medium | `app/parsers/pdf_parser.py:80-93` vs `app/parsers/txt_parser.py:89-173` | The two book-line parsers diverged (`difflib` ratio 0.54; 46 of 86 lines shared). The PDF copy guesses "last two capitalised words = author" and "(Capitalised) = author" | Probe (verified): `_parse_pdf_book_line("The God of Small Things")` returns `('The God of', 'Small Things')`; the TXT parser returns the full title. `"Dune (Dune Chronicles)"` gives author `Dune Chronicles`. The current database has 0 authors named `Small Things`, `Dune Chronicles` or `Moscow`, so the risk applies to the next import | A PDF re-import creates truncated titles and fake authors | Delete the two-word heuristic (`:80-93`); keep "Title (Author)" only when the parenthesis is not a series marker; sharing one parser with TXT is the larger option (judgment) | S |
| C5 | Medium | `pdf_parser.py:249-262`; `app/pipeline/full_import.py:331-353` | The noise filters drop real titles; some pipeline patterns can never match | The PDF regex is applied with `re.match` and IGNORECASE to raw lines and is prefix-only: `AUTHOR`, `Summary`, `This\s+time`, `^science\s+fiction`, `^Harry\s+Potter\s+and\s+the\s+Philosopher`. Probe: `_extract_books_flat` returns `[]` for "Harry Potter and the Philosopher's Stone by J.K. Rowling", "Authority by Jeff VanderMeer", "Summary of a Life by Ralph Ellison", "Science Fiction Stories by Isaac Asimov", "This Time Is Different by Carmen Reinhart". The pipeline pattern `books?\s*(?:discussed\|mentioned\|read)?` has no end anchor; with `len < 3` it marks "Book of Dust", "Bookshop Memories", "Books v. Cigarettes", "Booked", "It", "Io", "Ok" as noise. `:d`, `\.\.\.`, `---`, `\)$` run against punctuation-free output and can never match. The database has 0 canonical titles starting with "book" (cause not determinable) | Real books vanish on import with only a count in `stats.warnings` | Anchor full-line headers with `$`; drop the 4 dead alternatives; change `< 3` to `< 2`; anchor PDF header words (`^AUTHOR$`, `^Summary$`) and move sentence fragments to a per-file exclusion list | S |
| C6 | Medium | `full_import.py:497-538, 555-565` | The canonical merge contradicts its comment, ignores author and silently drops discussions afterwards | `.order_by(CanonicalBook.title.desc())  # longest title first` sorts alphabetically, so lowercase variants come first; groups use `normalized_title` only, so different books with one title and different authors merge; the cache is rebuilt keyed by the kept book's author and `_create_discussions_and_resources` skips any record whose `(title, author)` key misses (`if canonical and canonical.id in valid_canonical_ids:` with no else and no warning) | The wrong title variant is kept, different books merge, discussions for the second author are lost silently | Order by `func.length(CanonicalBook.title).desc()`; group by `(normalized_title, author_id)`; warn when a record finds no canonical | S |
| C7 | Medium | `main.py:1302-1308, 1352-1358` | Un-marking a general discussion deletes the whole note when it contains the substring "general" | `if d.notes and "general" in d.notes.lower(): d.notes = None`. Measured: 0 notes today contain "general" apart from the marker text | A note such as "argued about general relativity" is erased | Clear the note only when it equals `"General Discussion"`; fix both copies | S |
| C8 | Medium | `pdf_parser.py:28-37`; `full_import.py:89-95` | A PDF text-extraction failure is swallowed, so the pipeline's per-file warning never runs | `except Exception: pass` then `return full_text` (empty); `parse` returns `[]` when `not text.strip()` (`:333-334`); the pipeline only warns on raised errors | A corrupt or encrypted PDF meetup disappears from an import with no message | Let `_extract_text_from_pdf` raise, or return `None` and warn in `parse` | S |
| C9 | Medium | `frontend/src/lib/api.ts:8-22`; `components/search/CommandPalette.tsx:56`; `app/admin/page.tsx:105-121`; `app/meetups/[id]/page.tsx:131, 167` | Three API base rules | `getApiBase()` gives `${protocol}//${host}:8000` in the browser; `API_BASE` gives `'/api'`; CommandPalette hard-codes `fetch(\`/api/search?q=...\`)`; admin, meetup photo and PDF links use port 8000 while public pages use the proxy | Behind an HTTPS proxy without port 8000 exposed, photos, PDF links and admin calls fail or are mixed content; the admin fallback then doubles failed writes (R10) | Use `API_BASE` everywhere; use `getApiBase()` only where an absolute URL is required, returning the same proxy base | S |
| C10 | Medium | `main.py:1547, 1941-1951, 2005` | The autocomplete cache holds archive-membership answers for 600 s and is unbounded | `if now - timestamp < 600: return cached_data`; cached results include `"in_archive": True/False` (`:1999`); no size limit or eviction | Right after an admin adds a book, the same query still says "not in archive" for 10 minutes, so the admin adds it again (feeds C1); memory grows per distinct query | Cache only external results; query the local database every time (0.07 s measured for `/search`, B9) | S |
| C11 | Low | `main.py:378-450` (`get_books`) | One public parameter ignored, one branch dead, one sort key mislabeled | `year: Optional[int] = None` never read; `elif only_discussed:` can never run; `sort_by == "firstDiscussedYear"` orders by `created_at` (import time); unknown `sort_by` falls back to title silently. The only sender of `firstDiscussedYear` is the unimported `FilterPanel.tsx:120` | `?year=2019` returns all books; `only_discussed=true` alone also excludes general and tangent books | Remove `year` or implement it as `/meetups` does (`:626-628`); split the flags; 400 on unknown `sort_by` | S |
| C12 | Low | `CriterionBookCloset.tsx:877` | The closet fetches with `limit: 3000` and gives no sign of truncation | `fetchBooks({ limit: 3000, onlyDiscussed: true, excludeGeneral: true })`; 2,018 matching rows today (67 % of the cap) | Past 3,000, books late in the alphabet disappear | Show a notice when `data.length === limit`, or page the request | S |
| C13 | Low | `pdf_parser.py:359`, `txt_parser.py:245`, `full_import.py:251, 307` | `Source.raw_text` is documented as exact and cut at 2,000 in three places and 500 in a fourth | `models.py:52-54` `doc="Exact unedited original substring from source document"`; `raw_text=rec.source.raw_text[:500]` (`full_import.py:307`). Measured: 30 of 1,829 sources exactly 2,000 characters (11 of 31 PDF sources) | Provenance lost for long sections and PDFs | Remove the cuts (A1 now covers three sites; `txt_parser.py:245` and `full_import.py:307` are additional) | S |
| C14 | Low | 13 frontend files; `components/shared/ErrorBoundary.tsx`; no `app/error.tsx` | Dead frontend code, including the only error boundary | BookGrid, BookCard, Hero, FilterPanel, SearchBar, EmptyState, ErrorBoundary, PageSkeleton, ResourceList, Card, Modal, ViewToggle, BookSpine (used only by the skipped `Shelf.tsx`): 1,302 lines; no `app/error.tsx` | A render error in the closet shows the default Next.js error page | Delete per the D list, or add `app/error.tsx` (smaller, judgment) | S |
| C15 | Low | `app/` (flake8), `frontend/src` (tsc) | Unused imports, variables and parameters; two hide unfinished logic | flake8 F-codes: F401 ×23, F841 ×10, F811 ×1, F541 ×2. `pdf_parser.py:179, 273` `in_book_section` is set and never read, so header detection does nothing; `full_import.py:317` resolves `author` and discards it; tsc `--noUnusedLocals --noUnusedParameters`: 8 errors outside the skipped set, including `CriterionBookCloset.tsx:749` `windowWidth` (set on every resize, never read) and `CriterionDetailModal.tsx:36` `onClose` | Mostly style; `windowWidth` re-renders the closet on every resize (not measured) | Remove them; decide whether `in_book_section` should gate parsing | S |
| C16 | Low | `app/services/pdf_generator.py:117-120` | A missing date prints a hard-coded year | `if not d: return "2026"`; 0 of 53 meetups have a null date today | An undated meetup PDF claims 2026 | Return `""` or `"Date unknown"` | S |
| C17 | Low | `full_import.py:145-148` | A failed import job is never recorded | `job.status = "FAILED"` then `self.session.rollback()` discards it; `e` unused (F841) | No trace of failed imports (adds to B6) | Roll back, then commit a new FAILED job row in a fresh transaction | S |
| C18 | Low | `pdf_parser.py:341-348`; `txt_parser.py:201` | Default venue differs by source | PDF `venue = "Bookworm"  # default for PDFs`; TXT `venue = "Unknown"`. 17 of 31 PDF sources have no venue keyword in their stored text (upper bound, text is cut) | PDF meetups with no venue text are labelled Bookworm | Default to `"Unknown"` | S |
| C19 | Low | `app/parsers/scanner.py:16-27` | Docstring contradicts the code; one parameter unused | "anything > 15 maps to 2000+" vs `if year <= 30`; `month_str` unused | A filename year "31" maps to 1931 | Fix the docstring; drop the parameter (K14) | S |
| C20 | Low | `main.py:558-561, 576, 589`; `CriterionDetailModal.tsx:505-507`; `CriterionListDetailModal.tsx:71-72` | The "synopsis or cover missing" rule is copied with different conditions | Backend: description `> 20` characters, `page_count > 0`, `rating is not None`, `"nophoto" not in cover_url`; detail modal `<= 20` plus pages plus cover; list modal `!book.description` plus cover; `'nophoto'` appears 9 times | The list modal skips fetching for a 5-character description; the detail modal fetches | Let the backend decide; the frontend can always call `/synopsis` | S |

### Measurements appendix

#### A1. Python functions over 100 lines

`ast` over `app/**/*.py`, `end_lineno - lineno + 1`. 9, all confirmed.

| Lines | Location | Function |
|---|---|---|
| 367 | `app/services/pdf_generator.py:152` | `generate_meetup_pdf` |
| 147 | `app/api/main.py:1184` | `update_admin_book` |
| 142 | `app/api/main.py:1399` | `add_book_to_meetup` |
| 140 | `app/parsers/scanner.py:61` | `parse_filename_metadata` |
| 139 | `app/parsers/txt_parser.py:195` | `_parse_meetup_section` |
| 127 | `app/parsers/pdf_parser.py:320` | `PdfMeetupParser.parse` |
| 124 | `app/api/main.py:1674` | `resolve_media_url` |
| 119 | `app/api/main.py:1800` | `search_external_media` |
| 104 | `app/parsers/pdf_parser.py:128` | `_extract_member_books` |

#### A2. Frontend functions over 150 lines

TypeScript compiler API; skipped set excluded. 17.

| Lines | Location | Name |
|---|---|---|
| 1,643 | `components/library/CriterionBookCloset.tsx:695` | `CriterionBookCloset` |
| 1,596 | `app/admin/page.tsx:52` | `AdminDatabasePage` |
| 436 | `components/admin/BookAutocompleteInput.tsx:50` | `BookAutocompleteInput` |
| 435 | `components/library/CriterionDetailModal.tsx:28` | `Rotatable3DBook` |
| 432 | `components/library/CriterionDetailModal.tsx:469` | `CriterionDetailModal` |
| 419 | `components/library/CriterionListDetailModal.tsx:36` | `CriterionListDetailModal` |
| 367 | `components/admin/MemberAutocompleteInput.tsx:52` | `MemberAutocompleteInput` |
| 336 | `app/meetups/[id]/page.tsx:15` | `MeetupPage` |
| 288 | `app/members/[id]/page.tsx:15` | `MemberDossierPage` |
| 287 | `app/books/[id]/page.tsx:16` | `BookPage` |
| 243 | `components/search/CommandPalette.tsx:14` | `CommandPalette` |
| 237 | `components/library/CriterionBookCloset.tsx:453` | `PolaroidModal` |
| 215 | `components/library/BookSpine.tsx:82` | `BookSpine` (dead, C14) |
| 204 | `app/authors/[id]/page.tsx:15` | `AuthorRecordPage` |
| 177 | `app/admin/page.tsx:807` | `currentMeetup.books.map` callback |
| 163 | `components/layout/Navigation.tsx:16` | `Navigation` |
| 162 | `app/members/page.tsx:15` | `MembersPage` |

#### A3. Noise patterns, compared

- **`pdf_parser.py:249-262`:** 41 alternatives, 3 exact repeats (`continued\s+enthusiasm`, `additional\s+books`, `of\s+,`), so 38 distinct; applied with `re.match` and IGNORECASE to each raw stripped line inside `_extract_books_flat` only (`_extract_member_books` does not use it). Groups: table headers (`Member\s+Book\s*Title`, `BOOKTITLE`, `AUTHOR`, `Summary`, `Meetup\s*#`, `BBB\s+Meetup`, `Broke\s+Bibliophiles`, `List\s*of\s*Books?\s*Discussed`); summary sentence fragments (`brought\s+together`, `reading\s+months`, `Several\s+notable`, `presence\s+through`, `authors\s+were`, `others,\s+while`, `history,\s+and`, `continued\s+enthusiasm`, `additional\s+books`, `of\s+,`, `bringing\s+the\s+total`, `noted\s+by`, `Members?\s+who`, `This\s+time`, `In\s+addition`, `^ranging\s+from`, `^science\s+fiction`, `^regional\s+Indian`, `^The\s+modest`, `^participants\s+\d+`); artefacts (`\(Multiple\s+cast`, `\(via\s+ChatGPT`, `The\s+\w+\s+\d{4}\s+edition`, a date pattern, `^st\d{4}`, `^nd\d{4}`, `^rd\d{4}`, `^th\d{4}`); specific content lines (`^Harry\s+Potter\s+and\s+the\s+Philosopher`, `^Turton,\s+Arthur`).
- **`full_import.py:331-341`:** 10 alternatives, applied with `re.match` and IGNORECASE to the normalized title; also a `len < 3` check on normalized and raw titles (`:346-352`), used in `_resolve_canonical_books` and `_detect_duplicates`: `books?\s*(?:discussed|mentioned|read)?`, `other\s+related\s+mentions?`, `general\s+mentions?`, `new\s+entrants?`, `aaanyway.*`, `:d`, `\.\.\.`, `---`, `\)$`, `^[a-z]{1,2}$`.
- **Differences:** the lists share no alternative; the only shared concept is the "books discussed" header (a normalized `list of books discussed` passes the pipeline filter). Input differs (raw line vs normalized title), which makes `:d`, `\.\.\.`, `---`, `\)$` unreachable. Neither anchors the end except `\)$` and `^[a-z]{1,2}$`, so both act as prefix filters (C5). Length rules: PDF `< 5` characters on the raw line (`pdf_parser.py:281`); pipeline `< 2` at ImportedBook creation (`full_import.py:292`) and `< 3` at the canonical stage (`:346, 351`). The TXT parser has neither list (`_is_book_line`, `txt_parser.py:63-86`).

#### A4. Other duplicated logic

| Concept | Copies |
|---|---|
| Title normalization | `app/parsers/utils.py:7`; `main.py:1192, 1420, 1427` (`.strip().lower()`); `main.py:1975, 1996` (`.lower().strip()`); `frontend/src/app/admin/page.tsx:44` (`normalizeBookTitle`) |
| Person-name normalization | `utils.py:26`; `main.py:1200, 1247, 1413, 1509, 2161` (`.lower()`) |
| Find-or-create author | `full_import.py:202-217`; `main.py:1197-1206, 1411-1416, 2158-2163` (`ilike(name)` without escaping `%` and `_`) |
| Find-or-create member | `full_import.py:219-234`; `main.py:1243-1250, 1506-1511` |
| Member list cleanup | `main.py:1222-1231, 1471-1480` |
| General/tangent classification | `main.py:128-131, 196-200, 226, 301-304, 396-398` (SQL), `987-990`; writes `1299-1308, 1349-1358, 1482-1486`; frontend `CriterionBookCloset.tsx:880-884` |
| Book-line parsing | `pdf_parser.py:40-125` vs `txt_parser.py:89-173` (difflib 0.54) |
| Goodreads URL regex | `utils.py:62` (imported and unused in both parsers); `pdf_parser.py:23`; `txt_parser.py:48` |
| Venue detection | `pdf_parser.py:341-348` (default Bookworm); `txt_parser.py:201-222` (default Unknown); seeds `full_import.py:163-168`; lookup `full_import.py:189` (substring `ilike`) |
| Outbound User-Agent | full Chrome string `main.py:488, 1565, 1717`; short `pdf_generator.py:75`; `"Mozilla/5.0"` at `main.py:523, 1693, 1822, 1853, 1887`; none at `main.py:1616` |
| Apple Books lookup | `main.py:521-536` (`limit=1`, header), `:1612-1634` (`limit=6`, no header) |
| Cover URL upgrade and `nophoto` checks | `"100x100bb" -> "600x600bb"` at `main.py:530, 1620`; `._SY450_.` at `:1587`; `nophoto` in 9 places (`main.py:497, 558, 561, 573, 576, 589`; `CriterionDetailModal.tsx:489, 498, 505, 507, 517`; `CriterionListDetailModal.tsx:54, 64, 72, 82`) |
| HTML-strip regex | `main.py:500, 515, 532` (`' '`), `:1873` (`''`) |
| URL safety | backend `_is_public_http_url` (`main.py:1643`) and `_host_is` (`:1664`); frontend `safeHttpUrl` (`admin/page.tsx:10`) and `safeImageUrl` (`:12`). Different jobs (SSRF vs link safety), so not a harmful duplicate (judgment); the PDF cover download uses neither (security F1) |
| API base | `lib/api.ts:8-18` (`getApiBase`), `:20-22` (`API_BASE`), `CommandPalette.tsx:56` (`/api` literal) |
| Date parsing and formatting | `utils.py:35-57` (9 formats), `main.py:1041`, `pdf_generator.py:117-126`; frontend `lib/utils.ts:21, 33` plus inline `new Date(x).getFullYear()` in 8 places |

#### A5. Magic numbers that encode business rules

| Value | Meaning | Locations | Same concept, different value? |
|---|---|---|---|
| 2000 | raw_text cut | `pdf_parser.py:359`, `txt_parser.py:245`, `full_import.py:251` | Yes: 500 at `full_import.py:307` |
| 1000 | meetup description cut | `txt_parser.py:266`, `full_import.py:268` | No |
| 0.75 | fuzzy duplicate threshold (`SequenceMatcher.ratio() >= 0.75`) | `full_import.py:462`; `docs/book_count&details_issues.md:47` | The specification says 85 % (`imperative_decisions.md` §2.A.5); in code 0.85 is only a PDF `extraction_confidence` |
| 0.5 | fuzzy length-difference cutoff | `full_import.py:456` | No |
| 0.95 / 0.90 / 0.85 / 0.80 | hard-coded `extraction_confidence` | `txt_parser.py:252, 321`; `pdf_parser.py:358, 405, 434` | Already noted as "fake confidence" in `docs/book_count&details_issues.md:103` |
| 3 | minimum members for member-grouped PDF extraction | `pdf_parser.py:379` | No |
| 2 / 3 / 5 | minimum title length | `full_import.py:292` (2), `:346, 351` (3); `pdf_parser.py:43` (3), `:281` (5); `txt_parser.py:66` (3); `main.py:2114` (2) | Yes |
| 30 / 50 / 120 / 300 | line-length heuristics | `pdf_parser.py:196`; `txt_parser.py:220, 283, 82, 66` | n/a |
| 30 | two-digit year pivot | `scanner.py:23` (docstring says 15) | Yes (code vs doc) |
| 8 s | cover download timeout | `pdf_generator.py:78` | Yes: other outbound timeouts are 3.0 (`main.py:524, 1568, 1616, 1823, 1854, 1888`), 3.5 (`:491, 1694`), 4.0 (`:1721`) |
| 800000 | HTML read cap | `main.py:1722` | Other reads unbounded (`:492`, `pdf_generator.py:79`) |
| 600 s | suggestion cache TTL | `main.py:1945` | No |
| 8 / 4 / 6 / 15 | suggestion result caps | `main.py:1570, 2000`; `:1969, 1856`; `:1615, 1886`; `:2066, 2071`; member covers `:728` | n/a |
| 30 MB | upload cap | `main.py:1065` | No client-side check in `admin/page.tsx` |
| 3000 | closet fetch limit | `CriterionBookCloset.tsx:877` | n/a (2,018 rows today) |
| 24 × 5 = 120, × 3 = 360 | books per row, shelf, section | `CriterionBookCloset.tsx:1101-1105` | Yes: comments say 90 (K8) |
| 20 | "real" description length | `main.py:558, 576, 589`; `CriterionDetailModal.tsx:505` | Yes: list modal uses any text |
| 250 / 2500 / 3000 ms | blur delay, toast durations | `CriterionBookCloset.tsx:1327, 969, 581`; `admin/page.tsx:102` | Yes (2,500 vs 3,000) |
| `"2026"` | fallback year | `pdf_generator.py:120` | n/a |
| `"Bengaluru"`, `"Bookworm"` | defaults | `full_import.py:163-168, 196`; `pdf_parser.py:342` | Yes (TXT default `"Unknown"`; admin uses `"Bangalore"`, K17) |
| 8000 | backend port | `lib/api.ts:15, 17, 22` | No |

#### A6. Naming inconsistencies with impact

| Concept | Names | Impact |
|---|---|---|
| External link | database `external_url`; request and response `url` (`main.py:924, 939, 1003, 1297, 1313, 1436`; `admin/page.tsx:23`) | Low |
| Meetup number | `number` (`main.py:96, 215, 324, 788, 1017`; TS `MeetupReference.number`) vs `meetup_number` (`main.py:815`; `lib/api.ts:299`) | Low |
| Book count | `book_count` (`main.py:329, 738, 827, 873`) vs `books_count` (`:1023, 2095`; `admin/page.tsx:39`) | Low |
| `discussion_count` | all rows (`main.py:81-83`) vs proper-only (`:241`) | Medium (C3) |
| `is_general_discussion` | any match (`:128`) vs no proper rows (`:226`) | Medium (C3) |
| Sort keys | camelCase values to a snake param (`sort_by=discussionCount`, `firstDiscussedYear`); members use `books`, `name`, `meetups` | Low (C11) |
| `media_type` | returned by `batch_books_to_dict` (`:237`), absent from `book_to_dict` | Low |

#### A7. Error-handling counts

Python (`ast` over every `ExceptHandler` in `app/`, 51 handlers):

| Module | bare `except` | broad: pass or continue | broad: return default | broad: to HTTPException | broad: re-raise | broad: raise other | broad: other (print, append, assign) | narrow |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `api/main.py` | 0 | 10 | 2 | 8 (F5) | 0 | 0 | 0 | 10 |
| `cli/main.py` | 0 | 0 | 0 | 0 | 0 | 4 | 4 | 0 |
| `core/database.py` | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 |
| `parsers/pdf_parser.py` | 0 | 1 (C8) | 0 | 0 | 0 | 0 | 0 | 0 |
| `parsers/utils.py` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| `pipeline/full_import.py` | 0 | 0 | 0 | 0 | 1 | 0 | 1 | 0 |
| `services/pdf_generator.py` | 0 | 1 | 1 | 0 | 0 | 0 | 5 (4 `print`) | 1 |
| **Total** | **0** | **12** | **3** | **8** | **2** | **4** | **10** | **12** |

`raise HTTPException` appears 25 times in `main.py`.

Frontend (32 `catch` blocks, skipped set excluded):

| Pattern | Count | Where |
|---|---:|---|
| toast | 14 | `admin/page.tsx` ×13, `CriterionBookCloset.tsx` ×1 |
| ErrorState | 6 | authors, books, meetups (list and detail), members (list and detail) pages |
| empty `catch {}` | 5 | localStorage ×2 and pointer capture ×2 (acceptable); `admin/page.tsx:112` (R10 fallback) |
| console only | 4 | `CriterionBookCloset.tsx` ×2 (R5), `CommandPalette.tsx`, `lib/api.ts:271` |
| AbortError ignored, else `console.warn` | 3 | autocomplete inputs |

Plus 7 `.catch(...)` calls: `.catch(() => ({}))` on error-body parsing ×3 (`admin/page.tsx:275, 465, 493`); `Footer.tsx:19` sets null; `.catch(() => {})` ×3 (`Hero.tsx:50` (dead), `CriterionDetailModal.tsx:520`, `CriterionListDetailModal.tsx:84`), where the spinner stops with no message.

#### A8. Dead code

- flake8 F-codes in `app/` (36 lines): F401 ×23 (`main.py:12, 14, 28`; `config.py:1, 3`; `database.py:4, 61, 72`; `models.py:3`; `pdf_parser.py:5` ×3; `txt_parser.py:5` ×3; `full_import.py:1, 28`; `generator.py:2, 5`; `intermediate.py:1` ×2; `pdf_generator.py:2, 9`); F841 ×10 (`main.py:1140, 1608`; `cli/main.py:69`; `pdf_parser.py:179, 273`; `txt_parser.py:351`; `full_import.py:145, 317`; `generator.py:244`; `pdf_generator.py:87`); F811 ×1 (`main.py:906` redefines `date`); F541 ×2 (`generator.py:76, 77`).
- Unused parameters: `get_books(year)` (`main.py:380`), `month_str` (`scanner.py:16`); framework-required ones are fine (`importers/base.py:16`, `core/database.py:20`, `core/config.py:37`).
- Python function never called: `fetch_book_synopsis_from_web` (`main.py:542`).
- Frontend unimported files (live tree): the 13 listed in C14, 1,302 lines.
- Unused `lib/` exports: `formatNumber`, `formatDateShort`, `formatMeetupNumber`, `fetchSearch`, `fetchFeaturedBooks`, `fetchLatestMeetups`, `API_BASE` (no use outside `lib/`; C9 proposes using `API_BASE` everywhere).
- tsc unused locals and parameters (8 outside the skipped set): `authors/[id]/page.tsx:12` `formatDate`; `BookCard.tsx:5` `cn`; `CriterionBookCloset.tsx:8` `formatDate`, `:749` `windowWidth`; `CriterionDetailModal.tsx:4` `AnimatePresence`, `:36` `onClose`; `CriterionListDetailModal.tsx:4` `AnimatePresence`; `MeetupCard.tsx:18` `id`.

### Proposed FMEA rows (merged into report_insights.md §10.8, 2026-10-09)

S, O and D are judgment (1 to 10); RPN = S × O × D.

| Failure mode | Effect | Cause | S | O | D | RPN |
|---|---|---|---|---|---|---|
| Admin add creates a second canonical book or author for an existing one | Split counts, duplicate spines, split author pages | `.lower()` keys vs `normalize_title` and `normalize_name_for_dedup` (C1) | 6 | 8 | 7 | 336 |
| Enrichment replaces a curated cover, rating or Goodreads id with another book's data | Wrong metadata shown publicly; curated value lost | First-hit match without a title check; unconditional overwrite (C2) | 6 | 6 | 7 | 252 |
| Re-import drops real titles as noise | Books missing from the archive | Unanchored prefix noise patterns, `len < 3` (C5) | 7 | 5 | 7 | 245 |
| Merge keeps the wrong title variant or merges different books; discussions dropped | Wrong titles, lost discussion links | Alphabetical sort, title-only grouping, silent cache miss (C6) | 7 | 4 | 8 | 224 |
| Re-import splits titles and invents authors | Corrupted catalogue after the next import | PDF two-capitalised-words heuristic (C4) | 7 | 5 | 6 | 210 |
| List and detail disagree on "general" and discussion count | Conflicting numbers across pages | 6 copies of the classification rule (C3) | 4 | 9 | 5 | 180 |
| Unreadable PDF imports as nothing | A meetup silently missing | `except Exception: pass` in text extraction (C8) | 6 | 3 | 8 | 144 |
| Un-marking general erases a real note | Note text lost | Substring `"general"` test (C7) | 5 | 3 | 8 | 120 |
| Photos, PDF links and admin fail behind a proxy | Broken images and links in production | Direct `:8000` base vs `/api` base (C9) | 5 | 5 | 4 | 100 |
| Closet silently truncates past 3,000 books | Books late in the alphabet disappear | Hard-coded `limit: 3000` (C12) | 4 | 2 | 8 | 64 |

### Open questions for the founders

1. **Fuzzy-match threshold:** the code uses 0.75 and the specification says 85 %. Which is intended?
2. **Will `full_import.py` run again on the full archive?** If yes, fix C4, C5, C6 and C8 (and K1) first. If no, mark it historical so nobody runs it by mistake.
3. **Duplicate groups:** merge the 27 title groups and 106 author groups (C1)? Who approves each merge, and should merges be logged so they can be undone?
4. **Enrichment:** may it ever overwrite a field an admin has set, or only fill empty fields?
5. **Meaning of "general":** is a book with both proper and general discussions "general"? Which count should the UI show: discussion rows, proper discussions or distinct meetups?
6. **`in_book_section`:** should the "List of Books Discussed" header limit PDF parsing to the lines after it?
7. **Dead components:** can the 13 unimported live-tree files (C14) be deleted with the dead-code list, or are any planned for reuse?
8. **Deployment:** is the backend reached through the Next.js `/api` proxy only? If so, `getApiBase()` should stop pointing browsers at port 8000.
