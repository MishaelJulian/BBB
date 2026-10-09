# Pattern Review Analysis

Code pattern reviews of the BBB app, one section per tool run. Each section states its date, commit and scope. Findings that change risk scores feed `report_insights.md` §10.1, §10.2 and §10.8. The FMEA rows from both runs below are merged there as rows 24 to 37 (2026-10-09).

## Findings register

R = React review, B = backend patterns, P = FastAPI patterns. Details in the sections below.

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
| B6 | Medium | The API logs nothing: 0 logger calls although `loguru` is a dependency | `main.py` | Open |
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
