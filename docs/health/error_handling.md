# Error Handling

Error-handling reviews of the BBB app, one section per tool run. Each section states its date, commit and scope. Findings that change risk scores feed `report_insights.md` §10.8. Related findings in other files: security F5 (`security_analysis.md`); backend B2, B6, React R5, R6, R10, comments K16, K28, code quality C8, C17, C14 (`pattern_review_analysis.md`).

## Findings register

EH = error-handling patterns, RC = root cause (systematic debugging). Details in the sections below.

| ID | Severity | Finding | Where | Status (2026-10-09) |
|---|---|---|---|---|
| EH1 | Medium | No central exception handler; error responses come in at least five shapes | `app/api/main.py` (0 `exception_handler`) | Open |
| EH3 | Medium | A Goodreads and Apple Books outage is reported as "no match" | `main.py:1608-1610, 1637-1638, 2121-2125`; `admin/page.tsx:421, 444-446` | Open |
| EH4 | Medium | A failed search shows "No results found" (PRD §17 anti-pattern) | `components/search/CommandPalette.tsx:56-57, 83-84, 230-232` | Open |
| EH2 | Low | Single-book enrich returns 200 for a missing book | `main.py:2104-2108` | Open |
| EH5 | Low | A failed URL resolve (including an SSRF block) returns 200 with a stub; admin shows "resolved successfully" | `main.py:1784-1797`; `admin/page.tsx:1165-1172, 1415-1421` | Open |
| EH6 | Low | Synopsis failure and "no synopsis" look the same; nothing is logged | `lib/api.ts:266-275`; `main.py:536-537, 587-592` | Open |
| EH7 | Low | `check-config`, `stats` and `validate` exit 0 on failure | `app/cli/main.py:71-72, 113-115, 224-225` | Open (verified) |
| EH8 | Low | Admin toast shows the backend `detail` verbatim (raw `str(e)` on 500, "[object Object]" on 422) | `admin/page.tsx:275-276, 465-466, 493-494` | Open |
| EH9 | Low | `stats.errors` never filled, so `ImportJob.error_count` is always 0; CLI hides warnings past 10 | `full_import.py:53, 138`; `cli/main.py:166-169` | Open |
| EH10 | Low | Polaroid export failure is console-only; "Copied" shown even when copying fails | `CriterionBookCloset.tsx:570-571, 577-581` | Open |
| EH11 | Low | An invalid meetup date is dropped silently and the route reports success | `main.py:1040-1044` | Open |
| EH12 | Low | PDF degradation goes to `print` or nowhere | `pdf_generator.py:30-45, 87-94, 312-313` | Open |
| EH13 to EH15 | Info | Unused boundary would show raw messages; create routes return 200; health check and session helper keep little context | see section | No action / Open |
| RC1 | High | Fuzzy duplicate detection can never run: the exact-match `continue` fires for every book, because resolve already made a canonical per title | `full_import.py:445-447` (with `:375-393`) | Root cause found; patch proposed, not applied |
| RC2 | Medium | With RC1 fixed, the merge can delete a canonical a review row points to (foreign-key failure, whole import rolls back) | `full_import.py:524-526` | Patch hunk 4, not applied |
| RC3 | Medium | Threshold and measure differ from the spec: `SequenceMatcher >= 0.75` vs "Levenshtein ≥ 85%" | `full_import.py:462`; `imperative_decisions.md:74, 336` | Founder decision |
| RC4 | Medium | The merge leaves the moved imported book unlinked (known C6, A4) | `full_import.py:515-526`; `models.py:240-242` | Reproduced; part of A4 |
| RC5 | Low | Docstring describes a two-phase design that cannot happen | `full_import.py:412-418` | Update with the fix |

---

## Error-handling patterns (ecc:error-handling)

**Date:** 2026-10-09
**Commit:** `fa5ea59`
**Run by:** `/ecc:error-handling`, run in a subagent, read-only.
**Scope:** `app/` (API, CLI, core, parsers, pipeline, services) and `frontend/src/`. The 10 closet components kept by founder choice were skipped.
**Method:** code reading; a Python `ast` walk over every `ExceptHandler` in `app/` (type, bound name, whether the name is used, whether the body logs or prints); `grep` for `exception_handler`, `except Exception`, `logger`, `timeout=`, `retry`, `backoff`, and `catch` / `.catch(` in `frontend/src`; `str(HTTPException(404, ...))` checked against the installed FastAPI 0.137.1 and Starlette 1.3.1; Starlette `ServerErrorMiddleware` and uvicorn `h11_impl` read to confirm unhandled exceptions are re-raised and logged; read-only SQL (`file:book_club_archivist.db?mode=ro`) for discussions per meetup and the `import_jobs` and `import_logs` contents.
**Verified after the run:** `grep -c exception_handler app/api/main.py` = 0; the logger chain (`main.py:28` imports `app.core.database`, which imports `app.core.logging` at line 7; `app/core/logging.py:40` calls `setup_logging()` on import), so loguru is already configured inside the API process; EH7 (`app/cli/main.py:71-72` prints the failure and returns without `typer.Exit(1)`).
**Not checked:** no server or browser was run; no route was called (TestClient would open the database read-write). The 422 and unhandled-500 response bodies come from library source, not a live request. Docker log output was not inspected. Parser fallbacks beyond `pdf_parser.py:26-37` and `utils.py:52-57`, and the closet modal bodies beyond their fetch paths, were not reviewed.

### Summary

- The API has no central exception handler. Errors come back in at least five shapes. The 8 routes that wrap errors in `HTTPException(500, str(e))` also suppress the traceback uvicorn would otherwise log, so the write routes are the least diagnosable part of the API.
- Several failures look like success or like "no data": enrichment during a Goodreads or Apple outage reads as "No Goodreads match"; a failed URL resolve reads as "Link resolved successfully"; a failed search reads as "No results found"; a failed closet load shows an empty room (R5). PRD §17 names this anti-pattern.
- What works: `lib/api.ts` already tells "not found" (`null` on 404) apart from "failed" (throws) for the four detail fetchers; six pages render `ErrorState`; all 10 outbound calls have timeouts and none retries; the import pipeline collects per-file warnings and fails the whole run loudly.
- Smallest fix: one `@app.exception_handler(Exception)` that logs with the loguru logger already configured in the API process and returns the existing `{"detail": ...}` shape, plus deleting the 8 `str(e)` blocks. That closes F5, B2 and B6 together without a contract change. On the frontend: an `app/error.tsx` and a few `catch` blocks that set an error state.

### Checklist

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | No silent catch | Not met | 12 broad `pass`/`continue` handlers in Python (code quality A7), for example `main.py:1608` `except Exception as e: # Fall through ... pass` and `pdf_parser.py:35` `except Exception: pass` (C8). Frontend: `.catch(() => {})` twice in live code (`CriterionDetailModal.tsx:520`, `CriterionListDetailModal.tsx:84`), and the closet load `catch` only calls `console.error` (`CriterionBookCloset.tsx:888`, R5) |
| 2 | Standard error envelope | Partly | FastAPI's `{"detail": ...}` is used by all 25 `raise HTTPException`. Other shapes coexist: plain-text `Internal Server Error` for unhandled exceptions, `{"detail": [...]}` for 422, 200 `{"success": False, "message": ...}` (`main.py:2108`), and 503 `{"status": "error", "database": "unreachable"}` (`main.py:350`) (EH1) |
| 3 | No stack traces or internals in user text | Not met | `raise HTTPException(status_code=500, detail=str(e))` on 8 routes (F5); the admin toast shows that `detail` verbatim (EH8). No stack traces are sent (no debug mode) |
| 4 | Full context logged server-side | Not met | 0 `logger` calls in `main.py` (B6). The 8 F5 blocks turn exceptions into handled `HTTPException`s, so uvicorn's default traceback log never fires for them |
| 5 | Typed errors with a code | Not met (judgment: acceptable at this size) | No error codes; the API uses `HTTPException` with strings, the frontend `new Error('Failed to fetch book')` (`api.ts:169`). Status codes would be enough if they were correct (B2, EH2) |
| 6 | Async errors surface | Partly | `ErrorState` on 6 pages (books, meetups ×2, members ×2, authors). Not surfaced: closet load (R5), sync (R6), command palette (EH4), synopsis (EH6), polaroid export and copy (EH10) |
| 7 | Retries only on retriable errors | Partly | 0 `retry`/`backoff` in `app/`; each of the 10 `urlopen` calls has a timeout (3.0, 3.5, 4.0 or 8 s). The admin `apiFetch` resends any non-OK write, 4xx included (R10, K16, `admin/page.tsx:108-110`) |
| 8 | Components wrapped in an error boundary | Not met | No `app/error.tsx`, `app/global-error.tsx` or `not-found.tsx`; `components/shared/ErrorBoundary.tsx` has 0 importers (C14, D4) |

### Follows the guide

| Practice | Where | Evidence |
|---|---|---|
| Fixed, friendly messages for client errors | `main.py:472, 656, 1073, 1447-1450` | `detail="Book not found"`, `detail="File is larger than 30 MB"`, `detail=f"Item '{book.title}' is already in Meetup #..."` |
| Re-raise `HTTPException` before the broad catch | `main.py:1101-1103, 1533-1535` | `except HTTPException: db.rollback(); raise` (upload photo, add book) |
| Roll back on a failed write | every write route with a `try` | `db.rollback()` before each `raise HTTPException(500, ...)` |
| Correct failure status on the health check | `main.py:349-350` | `return JSONResponse(status_code=503, ...)` |
| Client separates "not found" from "failed" | `lib/api.ts:164-170, 206-212, 357-363, 376-382` | `if (res.status === 404) return null` then `if (!res.ok) throw new Error(...)`; detail pages render `ErrorState` on a throw (`books/[id]/page.tsx:30-31, 51-58`) and a not-found view on `null` (`:63`) |
| Fixed messages on public pages | `lib/api.ts:113, 150, 169` | `'Failed to fetch archive stats'`, `'Failed to fetch books'`; the backend `detail` is not shown there |
| Timeouts on every outbound call | `main.py:491, 524, 1568, 1616, 1694, 1721, 1823, 1854, 1888`; `pdf_generator.py:78` | 10 of 10 calls pass `timeout=` |
| No retry storms | `app/` | 0 matches for `retry`/`backoff` |
| Stale requests aborted, only `AbortError` ignored | `BookAutocompleteInput.tsx:183-186`; `MemberAutocompleteInput.tsx:137-140` | `if (err.name !== 'AbortError') { console.warn(...); setSuggestions([]) }` |
| SSRF guard fails closed | `main.py:1650-1651` | `except (socket.gaierror, ValueError): return False` |
| Pipeline collects per file, fails the run loudly | `full_import.py:91-96, 145-148`; `cli/main.py:177-180` | per-PDF `stats.warnings.append(...)` plus a `WARNING` ImportLog; the run re-raises; the CLI calls `logger.exception("Pipeline failed")` and `raise typer.Exit(code=1)` |
| Session helper rolls back and re-raises | `core/database.py:50-53` | `session.rollback(); logger.error(...); raise` |

### Findings

New findings only; known issues are in "Already-known issues".

| ID | Severity | file:line | Finding | Evidence | Impact | Smallest fix | Effort |
|---|---|---|---|---|---|---|---|
| EH1 | Medium | `app/api/main.py` (whole file); `:350`, `:2108` | No central exception handler; at least five response shapes | `grep -c exception_handler` = 0. Shapes: `{"detail": "<fixed>"}` (404, 400, 413); `{"detail": str(e)}` (500, 8 routes); plain-text `Internal Server Error` for any route without a `try` (Starlette default; for example `delete_meetup_photo` `:1111`, `download_meetup_pdf_endpoint` `:1158`, both enrich routes); `{"detail": [...]}` for 422; `{"success": False, "message": "Book not found"}` with 200 (`:2108`); `{"status": "error", ...}` with 503 (`:350`) | Every consumer must guess the shape; the admin toast turns a 422 list into "[object Object]" (EH8) | One `@app.exception_handler(Exception)` that logs and returns `{"detail": "<fixed text>"}`; keep the `detail` key, the current contract (PRD §11.0) | S |
| EH2 | Low | `main.py:2104-2108, 2180-2189` | A missing book on single-book enrich returns 200 | `if not book: return {"success": False, "message": "Book not found"}`; the route returns it as is | The admin sees "No Goodreads match found" for a deleted book (`admin/page.tsx:445`) | `raise HTTPException(404, "Book not found")` in the route | S |
| EH3 | Medium | `main.py:1608-1610, 1637-1638, 2121-2125`; `admin/page.tsx:421, 444-446` | A Goodreads and Apple Books outage is reported as "no match" | `except Exception as e: # Fall through to Apple Books fallback  pass`, then `except Exception: pass`, then `return results` (empty); enrich returns `{"success": False, "message": "No Goodreads results found"}`; meetup enrich returns 200 "Enriched 0 of N books" | The founders cannot tell a blocked server (security E5) from a real miss | Return `None` from `search_external_books` when every source raised (and log); enrich says "Goodreads and Apple Books could not be reached"; the toast shows `data.message`. Response shape unchanged | S |
| EH4 | Medium | `components/search/CommandPalette.tsx:56-57, 83-84, 230-232` | A failed search shows "No results found" (PRD §17 anti-pattern) | `if (res.ok) { ... }` with no `else`; `catch (err) { console.error('Search failed:', err) }`; then `No results found for &ldquo;{query}&rdquo;`. It also bypasses `lib/api.fetchSearch` (`api.ts:220`) | With the API down, every search says the archive has no match; after a failure following a success, stale results stay on screen | Call `fetchSearch`, keep an `error` state, render "Search is unavailable. Try again." | S |
| EH5 | Low | `main.py:1784-1797`; `admin/page.tsx:1165-1172, 1415-1421` | A failed URL resolve, including an SSRF block, returns 200 with a stub; the admin shows success | `except Exception: ... return {"media_type": m_type, "title": clean_url, ... "source": "url"}`; frontend `if (res.ok) { ... showToast('✓ Link resolved successfully') }` with no `else` | False confirmation: the title becomes the raw URL; a blocked internal URL looks like a working one | Log the exception; frontend checks `data.source === 'url'` and toasts "Could not read that link; fill the fields by hand". Shape unchanged | S |
| EH6 | Low | `lib/api.ts:266-275`; `main.py:536-537, 587-592`; `CriterionDetailModal.tsx:520`; `CriterionListDetailModal.tsx:84` | Synopsis failure and "no synopsis" look the same; the backend fills the gap with stock text | `catch (err) { console.warn(...) } return { description: null }`; backend `except Exception: pass`, then `fallback_desc = f"Featured and discussed by the Bangalore Book Club community{meetup_str}."`; modals use `.catch(() => {})` | Judgment: degrading quietly is acceptable (PRD §17.1 keeps the room usable), but nothing is logged, so repeated lookup failures (E5) stay invisible | Log a warning on the backend; leave the UI | S |
| EH7 | Low | `app/cli/main.py:71-72, 113-115, 224-225` | Three CLI commands exit 0 on failure | `except Exception as e: console.print(f"[bold red][FAIL] Database connection failed: {e}[/bold red]")` with no `raise typer.Exit(code=1)`; same for `stats` and `validate`. `init-db`, `reset-db`, `import-full` and `reports` do exit 1. **Verified** | A script or CI step using `archive check-config` treats a dead database as healthy | Add `raise typer.Exit(code=1)` to the 3 handlers | S |
| EH8 | Low | `frontend/src/app/admin/page.tsx:275-276, 465-466, 493-494` | The admin toast shows the backend `detail` verbatim | `throw new Error(errJson.detail \|\| 'Failed to add item')`, then `showToast(err.message ...)`; on a 500 that is `str(e)` (F5); on a 422 an array, shown as "[object Object]" | Raw exception text (SQL, paths) reaches the UI: the frontend half of F5 | Show `detail` only when it is a string and the status is below 500; otherwise a fixed message | S |
| EH9 | Low | `app/pipeline/full_import.py:53, 138`; `app/cli/main.py:166-169` | `stats.errors` is never filled, so `ImportJob.error_count` is always 0; the CLI prints only the first 10 warnings without saying how many are hidden | No `stats.errors.append` in `app/`; `job.error_count = len(self.stats.errors)`; `for w in stats.warnings[:10]:`. Read-only SQL: `import_jobs` 1 row (COMPLETED); `import_logs` 11 rows, all INFO | An operator can miss failures | Print `... and N more`; fill or drop `errors` / `error_count` | S |
| EH10 | Low | `components/library/CriterionBookCloset.tsx:570-571, 577-581` | Polaroid export failure is console-only; "Copied" appears even when copying fails | `catch (err) { console.error('Failed to export polaroid:', err) }`; `navigator.clipboard.writeText(text)` not awaited, then `setIsCopied(true)` | A click that does nothing, a false "copied", an unhandled rejection when clipboard access is denied | `showToast` in the `catch`; `await` the write inside a `try` | S |
| EH11 | Low | `app/api/main.py:1040-1044` | An invalid date is dropped silently and the route reports success | `try: meetup.date = datetime.strptime(req.date, "%Y-%m-%d").date() except ValueError: pass`, then `"Meetup #... updated successfully"` | Reachable only through a direct API call (the admin form uses `type="date"`, `admin/page.tsx:1026`) | `raise HTTPException(400, "Date must be YYYY-MM-DD")`; needs B2 fixed first, or the 400 becomes a 500 | S |
| EH12 | Low | `app/services/pdf_generator.py:30-45, 87-94, 312-313` | PDF degradation goes to `print` or nowhere | Three `print("Failed to register ... font:", e)`; `except Exception as e:` (e unused) then `return None` on a cover download; `print("Error drawing cover image:", e)` | Judgment: the fallback card is fine; the admin gets "Generated publication PDF" with no hint that covers or fonts are missing, and `print` bypasses the log file | Replace the `print`s with `logger.warning`; log the swallowed download error | S |
| EH13 | Info | `frontend/src/components/shared/ErrorBoundary.tsx:41` | If wired as it is, the unused boundary (C14) would show raw `error.message` to readers | `{this.state.error?.message \|\| 'An unexpected error occurred'}` | None today (0 importers) | Use `app/error.tsx` with a fixed message instead; delete or fix this file per the C14 decision | S |
| EH14 | Info | `app/api/main.py:1398` (add book), `:1068` (upload photo) | Create routes return 200 | No `status_code=201` on any decorator | Style only; the frontend checks `res.ok` | Leave it (a contract change with no defect to fix) | S |
| EH15 | Info | `main.py:349-350`; `core/database.py:52` | Health check and session helper keep less context than they could | `except Exception: return JSONResponse(503, ...)` discards the cause; `logger.error(f"Database session rollback due to error: {e}")` logs no traceback | Slower diagnosis of a database outage | `logger.exception` in both places | S |

Counts: `except Exception` in `main.py`: 20; of these, 9 are `except Exception as e` (8 use `e`, all `detail=str(e)`; 1 does not, `:1608`). Across `app/`, `e` is bound and unused 3 times (`main.py:1608`, `full_import.py:145`, `pdf_generator.py:87`). `raise HTTPException`: 25.

### Proposed policy

One place turns unexpected errors into a fixed message plus a full log, and the code never turns a failure into "empty" or "success". No new dependency: loguru is already in `requirements.txt`, installed in the API image (`Dockerfile:11`) and configured inside the API process through the import chain above. Next.js `error.tsx` is built in. PRD §7.1 is not triggered. A typed exception hierarchy is not recommended: `HTTPException` plus correct status codes removes every defect listed here.

**Backend, `app/api/main.py` (about 15 lines added, about 30 removed)**

1. Add `from app.core.logging import logger` and one handler:
   ```python
   @app.exception_handler(Exception)
   async def unhandled_error(request, exc):
       logger.opt(exception=exc).error("{} {} failed", request.method, request.url.path)
       return JSONResponse(status_code=500, content={"detail": "Something went wrong on the server. The error was logged."})
   ```
   This keeps the `{"detail": ...}` key every consumer already reads, so it is not a contract change under PRD §11.0. Starlette still re-raises after the handler, so uvicorn's own traceback remains.
2. Delete the 8 `except Exception as e: db.rollback(); raise HTTPException(status_code=500, detail=str(e))` blocks (`:1056, 1104, 1151, 1326, 1367, 1391, 1536, 2007`) and the 2 `except HTTPException: ... raise` guards; `finally: db.close()` already rolls back an uncommitted transaction. This fixes F5, B2 and B6 for the API in one change.
3. In the outbound helpers (`fetch_book_metadata_from_web`, `search_external_books`, `resolve_media_url`, `search_external_media`), replace each broad `except Exception: pass` with `logger.warning(...)` (about 10 one-line edits; fallbacks stay). Return `None` from `search_external_books` when every source raised (EH3).
4. Fixed 4xx for client faults: 404 in enrich (EH2), 400 for a bad date (EH11).

**CLI and pipeline (about 5 lines):** exit 1 in `check-config`, `stats`, `validate` (EH7); print the hidden-warning count and fill or drop `stats.errors` (EH9); record failed jobs per C17.

**Frontend (about 60 lines):**
- `frontend/src/app/error.tsx` (about 20 lines, `'use client'`): render the existing `ErrorState` with a fixed message and `onRetry={reset}`, `console.error(error)` in an effect. Optionally `app/global-error.tsx` (about 15 lines). Meets checklist item 8 and settles C14.
- `lib/api.ts` stays the one fetch path with the rule `null` = not found, `throw` = failed; apply it to `fetchBookSynopsis` (EH6); `CommandPalette` uses `fetchSearch` with an error line (EH4).
- Closet: an `error` state rendering `ErrorState`, keeping the room usable (R5); silent loads re-throw so the sync toast is truthful (R6).
- Admin `apiFetch`: fall back to the proxy only on a network error (R10, K16); show `detail` only for string details below 500 (EH8).
- Retry on error pages: `window.location.reload()` (6 pages) works and is acceptable; re-running the effect would be nicer (style).

**Retries:** none. Timeouts (3.0 to 8 s) stay. Any future retry applies only to network errors and 5xx on GETs, never to writes.

### Already-known issues

| ID | Status | Note |
|---|---|---|
| F5 | Confirmed | 8 routes: `main.py:1058, 1106, 1153, 1328, 1369, 1393, 1538, 2008`; the admin toast passes the text on (EH8) |
| B2 | Confirmed, behaviour verified | `update_admin_meetup :1031`, `generate_meetup_pdf_endpoint :1127`, `update_admin_book :1183`, `toggle_admin_discussion_general :1333`, `delete_admin_discussion :1374` (1 lower than in the register). In the installed FastAPI, `str(HTTPException(404, "Meetup not found"))` is `'404: Meetup not found'`, so the client receives a 500 with `detail: "404: Meetup not found"` |
| B6 | Confirmed, changed | 0 `logger` calls in `main.py`, but loguru is already configured in the API process through the `app.core.database` import, so the fix is one import line. Routes without a `try` leave a stderr traceback (Starlette re-raises, uvicorn logs); the 8 F5 routes leave none |
| R5 | Confirmed | `CriterionBookCloset.tsx:888-889`; the exact PRD §17 "Bad" example |
| R6 | Confirmed | `CriterionBookCloset.tsx:904-910`: dead `catch`, stale `books.length` |
| R10, K16 | Confirmed | `admin/page.tsx:104-120`: any 400, 404 or 500 on a write is sent a second time |
| C8, K28 | Confirmed | `pdf_parser.py:30-36` `except Exception: pass`; the per-file warning in `full_import.py:94-96` never fires for an unreadable PDF |
| C17 | Confirmed | `full_import.py:145-148`; the database holds 1 job (COMPLETED) |
| K1 | Confirmed, out of scope here | Logic defect; see the systematic-debugging section when it lands |
| A7 counts | Confirmed | 51 Python handlers (`ast` re-run); 32 frontend `catch` blocks and 7 `.catch(...)` calls |
| C14 | Confirmed | No `app/error.tsx`; `ErrorBoundary` has 0 importers (EH13) |
| B5, P4, E5 | Confirmed, with a measured input | No retry, so no retry storm. Timeouts are per socket operation, not a total deadline. Meetup #24 has 100 discussions (read-only SQL); 53 meetups have discussions, median 51. Meetup enrich calls `search_external_books` per discussion, up to twice, at up to 3 s + 3 s each: a computed (not measured) upper bound of 100 × 12 s = 1,200 s for #24 |

### Proposed FMEA rows (not yet merged into report_insights.md §10.8)

S, O and D are judgment calls on the §10.8 scales. Rows 24 (B6), 29 (R5), 30 (R10), 32 (B2) and 18 (F5) already cover the known issues.

| Failure mode | Effect | Cause | Evidence | S | O | D | RPN | Action |
|---|---|---|---|---:|---:|---:|---:|---|
| Lookup outage reported as "no match" | Founders think a book has no Goodreads record; enrichment silently does nothing | Both sources swallow errors; enrich returns 200 `success: False` | EH3 | 4 | 4 | 7 | **112** | Return `None` when all sources fail; log; toast `data.message` |
| Import failures under-reported | Warnings past 10 hidden; `error_count` always 0 | `[:10]` slice; `stats.errors` never filled | EH9 | 4 | 3 | 7 | **84** | Print the hidden count; fill or drop `errors` |
| Render error blanks the page | Reader sees the Next.js "Application error" screen with no way back | No `app/error.tsx`; the only boundary is unused | EH13, C14 | 5 | 3 | 5 | **75** | Add `app/error.tsx` |
| Search failure shown as "No results found" | Reader concludes the archive lacks a book | `if (res.ok)` with no else; console-only catch | EH4 | 4 | 3 | 6 | **72** | Error state in `CommandPalette` |
| CLI health check passes on a dead database | Scripted checks report healthy | No `typer.Exit(1)` in 3 handlers | EH7 | 3 | 3 | 7 | **63** | Exit 1 |
| Failed link resolve reported as success | Admin saves the raw URL as the title | Stub returned with 200 on any exception | EH5 | 3 | 4 | 5 | **60** | Log; frontend checks `source === 'url'` |

### Open questions for the founders

1. Is `{"detail": "..."}` acceptable as the one error envelope? Moving to `{"error": {"code", "message"}}` would be a contract change (PRD §11.0, §23) and fixes no defect on its own.
2. Should the API also write to `logs/archivist.json` inside Docker, or is `docker compose logs` enough? Is `logs/` mounted and writable once the container runs as a non-root user (F6)?
3. C14: delete `ErrorBoundary.tsx` in favour of `app/error.tsx`, or keep it in the component kit?
4. During a Goodreads or Apple outage, should enrich say "sources unreachable" (EH3), and should the synopsis route stop trying for a while after a failure (E5)?
5. Is the synopsis fallback text ("Featured and discussed by the Bangalore Book Club community at #...") acceptable given the "no fake archive data" rule in PRD §24?
6. Keep and fill `ImportJob.error_count`, or drop the column?

---

## Root cause: K1 fuzzy duplicate detection never runs (superpowers:systematic-debugging)

**Date:** 2026-10-09
**Commit:** `fa5ea59`
**Run by:** `/superpowers:systematic-debugging`, run in a subagent (interrupted once by a usage limit and resumed; no step was repeated).
**Method:** Phase 1 reproduce and instrument; Phase 2 compare with the phase that creates the data; Phase 3 one hypothesis at a time; Phase 4 failing check, one fix in scratch, verify. The first fix exposed a foreign-key failure that needed one companion change; no fix attempt failed outright.
**Where experiments ran:** only in the session scratchpad (`scratchpad/k1_debug/`: `harness.py`, `step1_repro.py`, `step2_evidence.py`, `step3_verify.py`, `step3b_edge.py`, `step4_side.py`, `step5_unlink.py`, `full_import_patched.py`, `k1_fix.diff`). In-memory SQLite with `PRAGMA foreign_keys=ON` (as in `app/core/database.py:19-23`), `DATABASE_URL=sqlite:///:memory:`. The live database was opened once, read-only, for four counts. **No repo file was edited**; `pytest` 32 passed and `git status` showed no tracked change from this run.
**Not checked:** the full `run()` with the TXT and PDF parsers on the real archive; a re-import against a scratch copy of the live database; fuzzy-loop run time at full scale (about 3,637 imports against 2,783 canonicals); PostgreSQL; `_create_discussions_and_resources` after the fix.

### Summary

- `_detect_duplicates` cannot reach its fuzzy loop: `_resolve_canonical_books` has already created a canonical for every non-noise imported book, keyed on its own normalized title, so the exact-match check at `full_import.py:445-447` is always true and always `continue`s.
- Reproduced on a 7-book fixture: 7 exact matches, 0 comparisons, 0 `PossibleDuplicate` rows; a line trace shows line 447 hit 7 times and lines 450 to 474 hit 0 times.
- Proposed fix (scratch only): count the exact match without `continue`, fuzzy-compare against canonicals with a different normalized title, flag each title pair once; plus 2 lines in the merge so a review row never points at a deleted canonical.
- After the fix the fixture gives 1 review row ("The God of Small Things" to "God of Small Things", 0.905); the control gets none; both "Sapiens" rows stay linked to one canonical.
- **Correction to earlier docs:** the fuzzy path never merged anything. All automatic merges (218 in July) come from the title-only exact merge, which ignores author (C6). `report_insights.md` row 1, task A3 and §11, and `security_analysis.md` §4 were corrected on 2026-10-09.

### Reproduction

Fixture (`harness.py`; each row has its own `Source`; `normalized_title = normalize_title(raw_title)`):

| raw_title | raw_author | Role |
|---|---|---|
| Sapiens | Yuval Noah Harari | exact pair |
| Sapiens | Yuval Noah Harari | exact pair |
| Skin in the Game | Nassim Nicholas Taleb | near pair |
| Skin in the game. | Nassim Taleb | near pair |
| The God of Small Things | Arundhati Roy | one-word pair |
| God of Small Things | Arundhati Roy | one-word pair |
| Thinking, Fast and Slow | Daniel Kahneman | control |

Command (`run.sh`): `cd "<repo>" && PYTHONPATH="<repo>:<scratch>" DATABASE_URL="sqlite:///:memory:" uv run --no-project --with-requirements requirements.txt python <scratch>/step1_repro.py`. The script calls `_resolve_canonical_books()` and `_detect_duplicates()` on `FullArchivePipeline(Path("."), session)`, then `_link_imported_to_canonical()` and `_merge_canonical_duplicates()`.

Output (repo code):

```text
--- after resolve + detect (unpatched) ---
canonical_books: 6
possible_duplicates: 0
  warning: Duplicate detection: 7 exact matches, 0 fuzzy candidates from 0 comparisons
--- after link + merge (unpatched) ---
canonical_books: 5
possible_duplicates: 0
  warning: Merged 1 duplicate canonical books
  link: 'Skin in the Game' / Nassim Nicholas Taleb -> None
  link: 'Skin in the game.' / Nassim Taleb -> 'Skin in the game.'
  (other 5 books linked to their own title)
```

Live database (read-only): `possible_duplicates` 0; `imported_books` 3,637; `canonical_books` 2,783; imported books with no canonical: 369.

### Evidence

`step2_evidence.py` traced the real `_detect_duplicates` with `sys.settrace`:

```text
line 439 hits= 7  if self._is_noise_title(ib.normalized_title, ib.raw_title):
line 440 hits= 0  continue
line 445 hits= 7  if norm_title in canonical_by_title:
line 446 hits= 7  exact_matches += 1
line 447 hits= 7  continue  # Will be linked in _link_imported_to_canonical
line 450 hits= 0  best_match = None
line 460 hits= 0  comparisons += 1
line 461 hits= 0  score = SequenceMatcher(None, norm_title, canonical.normalized_title).ratio()
line 462 hits= 0  if score > best_score and score >= 0.75:
line 467 hits= 0  fuzzy_matches += 1
warning: Duplicate detection: 7 exact matches, 0 fuzzy candidates from 0 comparisons
```

Per book: noise 0 of 7, exact-match `continue` 7 of 7, fuzzy loop 0 of 7; 0 `SequenceMatcher` calls.

### Hypotheses tested

| # | Hypothesis | Test | Result |
|---|---|---|---|
| H1 | Every non-noise imported book already has a canonical with its own normalized title, so line 447 always `continue`s | Counted imported books whose title is a canonical key; line trace | **Confirmed:** 7 of 7; line 447 hit 7 times, line 450 hit 0 times |
| H2 | `canonical_by_title` is built from only some canonicals | Compared the table with the dict source (`session.query(CanonicalBook).all()`, `:419`) | **Rejected:** built from all (first per title, `:426-430`) |
| H3 | Noise filtering or normalization merges the pairs before detection | Printed the keys and `_is_noise_title` for each book | **Partly:** noise False for all; "Skin in the Game" and "Skin in the game." both become `skin in the game` with different author keys, so they get 2 canonicals with one title, handled only by the merge |
| H4 | Different normalized titles still each get their own canonical | Listed canonicals after resolve | **Confirmed:** resolve groups on (title, author) (`:368-370`) and creates one canonical per group (`:375-393`) |
| H5 | Books are already linked at detection time | Counted unlinked books at detection | **Rejected:** 7 of 7 unlinked |

### Root cause

- `:363-367` and `:439-440` use the same noise predicate, so a book skipped in one phase is skipped in the other.
- `:368-370`, `:375-393`: `_resolve_canonical_books` creates one `CanonicalBook` per (normalized title, author) group with `normalized_title=norm_title`, and runs before detection (`run()`, `:111-117`).
- `:426-430`: `canonical_by_title` is built from all canonicals, so it contains every non-noise imported title.
- `:445-447`: `if norm_title in canonical_by_title: exact_matches += 1; continue` is therefore always true, and the fuzzy loop (`:450-474`, `>= 0.75` at `:462`) cannot run.

The docstring (`:412-418`) assumes canonicals come from somewhere other than the imported books themselves; here they do not. This is a structural ordering defect that no data condition can trigger around.

### Proposed patch (not applied)

Hunks 1 to 3 fix RC1. Hunk 4 fixes RC2, which the RC1 fix exposes.

```diff
--- a/app/pipeline/full_import.py	2026-10-07 08:35:33.244039582 +0530
+++ b/app/pipeline/full_import.py	2026-10-09 12:48:42.980498226 +0530
@@ -431,6 +431,7 @@
 
         # Phase 2: Check each imported book
         comparisons = 0
+        flagged_pairs = set()
         exact_matches = 0
         fuzzy_matches = 0
 
@@ -441,17 +442,20 @@
 
             norm_title = ib.normalized_title
 
-            # Quick exact match check
+            # Every non-noise book already has a canonical with its own
+            # normalized title (_resolve_canonical_books), so count that as the
+            # exact match and fuzzy-compare against the other titles only.
             if norm_title in canonical_by_title:
                 exact_matches += 1
-                continue  # Will be linked in _link_imported_to_canonical
 
             # Fuzzy match - only compare against titles that are similar length
             best_match = None
             best_score = 0.0
             title_len = len(norm_title)
 
-            for canonical in canonical_list:
+            for canonical in canonical_by_title.values():
+                if canonical.normalized_title == norm_title:
+                    continue
                 # Skip if length difference is too large (>50%)
                 canon_len = len(canonical.normalized_title)
                 if abs(title_len - canon_len) > max(title_len, canon_len) * 0.5:
@@ -463,7 +467,9 @@
                     best_score = score
                     best_match = canonical
 
-            if best_match:
+            pair = frozenset((norm_title, best_match.normalized_title)) if best_match else None
+            if best_match and pair not in flagged_pairs:
+                flagged_pairs.add(pair)
                 fuzzy_matches += 1
                 dup = PossibleDuplicate(
                     imported_book_id=ib.id,
@@ -521,6 +527,9 @@
                 # Move recommendations
                 for rec in merge_into.recommendations:
                     rec.canonical_book_id = keep.id
+                # Re-point review candidates so the delete does not break the FK
+                for pd in self.session.query(PossibleDuplicate).filter_by(candidate_canonical_id=merge_into.id):
+                    pd.candidate_canonical_id = keep.id
                 # Delete the duplicate canonical
                 self.session.delete(merge_into)
                 merged_count += 1
```

**Why this option (judgment):** comparing against canonicals with a different normalized title changes about 10 lines in one method plus 3 in the merge, keeps the phase order, and leaves same-title groups to the merge (which matches A3). `flagged_pairs` stops a pair being flagged in both directions or once per repeated copy. Rejected: excluding only the book's own (title, author) canonical (it would queue same-title pairs the merge already merges, at score 1.0); running detection before canonical creation (`PossibleDuplicate.candidate_canonical_id` is `nullable=False` with a foreign key, `models.py:299-301`, so it needs a schema change).

### Verification in scratch

`step3_verify.py`, same fixture, repo module vs patched copy:

```text
--- BEFORE (repo code): after resolve + detect ---
canonical_books: 6
possible_duplicates: 0
  warning: Duplicate detection: 7 exact matches, 0 fuzzy candidates from 0 comparisons
--- BEFORE (repo code): after link + merge ---
canonical_books: 5
possible_duplicates: 0
  Sapiens links: {True} same canonical: True
  control PD rows: 0 | control as candidate: 0

--- AFTER (scratch patch): after resolve + detect ---
canonical_books: 6
possible_duplicates: 1
  PD: 'The God of Small Things' / Arundhati Roy -> 'God of Small Things' conf=0.905
  warning: Duplicate detection: 7 exact matches, 1 fuzzy candidates from 15 comparisons
--- AFTER (scratch patch): after link + merge ---
canonical_books: 5
possible_duplicates: 1
  PD: 'The God of Small Things' / Arundhati Roy -> 'God of Small Things' conf=0.905
  warning: Merged 1 duplicate canonical books
  Sapiens links: {True} same canonical: True
  control PD rows: 0 | control as candidate: 0
```

The "Skin in the Game" pair is not flagged because its normalized titles are identical; the merge handles it.

Foreign-key edge case (`step3b_edge.py`: "Skin in the Games" imported first, its candidate is the canonical the merge deletes). With hunks 1 to 3 only:

```text
PD: 'Skin in the Games' / Someone Else -> 'Skin in the Game' conf=0.970
merge FAILED: IntegrityError: ['(sqlite3.IntegrityError) FOREIGN KEY constraint failed']
```

In `run()` this would roll back the whole import (`:146-149`). With hunk 4:

```text
PD: 'Skin in the Games' / Someone Else -> 'Skin in the game.' conf=0.970
warning: Merged 1 duplicate canonical books
```

### Side effects and threshold scores

- **C6 (merge):** the fix does not change what gets merged (title-only grouping, Z-to-A first title). One defect is the same before and after (`step5_unlink.py`): `after merge: [('Skin in the Game', 'Nassim Nicholas Taleb')]` is left unlinked. Likely mechanism (judgment, not traced): `CanonicalBook.imported_books` has no cascade (`models.py:240-242`) and the book is still in the deleted canonical's loaded collection, so its foreign key is set to NULL at flush. Matches FMEA row 2 (369 unlinked in the live database) and A4 (RC4).
- **C1 (normalizers):** an admin-style key `'sapiens: a brief history of humankind'` plus an imported "Sapiens: A Brief History of Humankind": before the fix 0 review rows; after the fix 1 (score 0.986). The fix routes punctuation-only differences to review but does not repair C1, which still needs one normalizer everywhere.
- **Threshold:** the code uses `SequenceMatcher.ratio() >= 0.75` (`:462`); the spec says "Levenshtein Distance ≥ 85%" (`imperative_decisions.md:74`) and "Confidence ≥ 85%" (`:336`), a different measure too.

| Title A (normalized) | Title B (as compared) | Score | Skipped by length filter | ≥ 0.75 | ≥ 0.85 |
|---|---|---:|---|---|---|
| sapiens | sapiens | 1.000 | no | yes | yes |
| skin in the game | skin in the game | 1.000 | no | yes | yes |
| skin in the games | skin in the game | 0.970 | no | yes | yes |
| sapiens a brief history of humankind | sapiens: a brief history of humankind | 0.986 | no | yes | yes |
| the god of small things | god of small things | 0.905 | no | yes | yes |
| the name of the wind | the shadow of the wind | 0.810 | no | yes | no |
| a brief history of time | a brief history of humankind | 0.784 | no | yes | no |
| the power of now | the power of habit | 0.765 | no | yes | no |
| harry potter and the chamber of secrets | harry potter and the prisoner of azkaban | 0.684 | no | no | no |
| homo deus | homo sapiens | 0.667 | no | no | no |
| the god of | the god of small things | 0.606 | yes | no | no |
| thinking fast and slow | god of small things | 0.293 | no | no | no |
| thinking fast and slow | skin in the game | 0.263 | no | no | no |
| thinking fast and slow | sapiens | 0.207 | yes | no | no |

At 0.75 three pairs of different books would go to review; at 0.85 none do, and every real near-duplicate tested scores 0.905 or higher. Since review rows merge nothing automatically, 0.75 costs review time without causing wrong merges (judgment). The C4 split ("The God of" vs "The God of Small Things") is skipped by the 50 % length filter, so fuzzy detection would not catch C4.

- **A7:** the scratch harness is a ready template (in-memory engine with foreign keys on, `Source` with `raw_text`, which is `NOT NULL`, methods called directly). A7 would have caught K1 with one assertion (`PossibleDuplicate` count > 0 for the "God of Small Things" pair); it should also cover the foreign-key edge case and assert no imported book is unlinked after a merge (that last assertion fails today, so it belongs with A4).
- **A3:** needs this fix first. Other consumers of the table: `app/cli/main.py:218-219` counts `PENDING_REVIEW` rows; `scripts/audit_meetup_48.py:132` reads it. No admin review screen exists.

### Findings

| ID | Severity | file:line | Finding | Evidence | Impact | Smallest fix | Effort |
|---|---|---|---|---|---|---|---|
| RC1 | High | `app/pipeline/full_import.py:445-447` (with `:375-393`) | The exact-match check always `continue`s, so the fuzzy loop cannot run | Trace: line 447 hit 7 of 7, line 461 hit 0; "7 exact matches, 0 fuzzy candidates from 0 comparisons"; live `possible_duplicates` = 0 | No near-duplicate is ever queued for review; spec §2.A.5 and task A3 are not implemented in practice | Patch hunks 1 to 3 | S |
| RC2 | Medium | `full_import.py:524-526` (exposed by the RC1 fix) | The merge deletes canonicals a `PossibleDuplicate` may reference | `IntegrityError: FOREIGN KEY constraint failed` in `step3b_edge.py` with hunks 1 to 3 | With RC1 fixed and nothing else, a re-import can fail and roll back completely | Patch hunk 4 | S |
| RC3 | Medium | `full_import.py:462`; `docs/architecture/imperative_decisions.md:74, 336` | Threshold and measure differ from the spec | Score table: 3 pairs of different books between 0.75 and 0.85 | Extra review items at 0.75 once RC1 is fixed | Founders choose (0.85 fits every pair tested); align code and spec | S |
| RC4 | Medium (known: C6, A4) | `full_import.py:515-526`; `models.py:240-242` | The merge leaves the moved imported book unlinked | `after merge: [('Skin in the Game', 'Nassim Nicholas Taleb')]`, before and after the fix | Book histories lose entries (369 unlinked live) | Remove the book from the old collection or delete with a query before the flush; part of A4 | S |
| RC5 | Low | `full_import.py:412-418` | Docstring describes a design that cannot happen with this phase order | Root cause above | Misleads readers; part of why K1 went unnoticed | Update with the fix | S |

### Proposed FMEA rows (not yet merged into report_insights.md §10.8)

| Failure mode | Effect | Cause | S | O | D | RPN |
|---|---|---|---:|---:|---:|---:|
| Fuzzy duplicate detection never runs (RC1) | Near-duplicates enter the canonical layer with no review; the review queue stays empty | The exact check `continue`s for every book because resolve already created a canonical per title | 6 | 10 | 7 | 420 |
| Fuzzy threshold too low or spec mismatch (RC3) | Review queue fills with pairs of different books | 0.75 in code vs 85 % in the spec | 3 | 6 | 4 | 72 |
| A review candidate points at a canonical the merge deletes (RC2, only after the RC1 fix) | Import fails and rolls back | Merge deletes canonicals without moving `PossibleDuplicate` rows | 6 | 3 | 3 | 54 |

Overlap: row 41 in §10.8 (K1, RPN 240) describes the same failure from the comments review; RC1 measures it directly (O = 10). Merging RC1 means replacing or re-scoring row 41.

### Open questions for the founders

1. Threshold: 0.75 (code) or 0.85 (spec)? Should the spec say SequenceMatcher ratio instead of Levenshtein?
2. Same normalized title, different authors (the Taleb pair): merge automatically as now, or send to review? Today the merge ignores author (C6).
3. Who reviews `possible_duplicates`, and where? No admin screen exists.
4. Will `full_import.py` run again on the full archive? If not, RC1 is low priority and the scratch harness can become the A7 test only.
