# CURRENT_STATE.md: BBB Digital Library

**Date:** 2026-10-08  
**Main:** `6fe8370` on `origin/main`  
**Previous version:** 2026-08-23 (Antigravity CLI), recoverable with `git show 6fe8370:docs/health/CURRENT_STATE.md`

Every number below was measured on 2026-10-08 against `book_club_archivist.db` or a running build. Main documents: [`../BBB_PRD_TRD.md`](../BBB_PRD_TRD.md) and [`../AGENT_RULES.md`](../AGENT_RULES.md).

---

## 1. Archive counts (live database)

| Entity | Count |
|---|---:|
| Meetups recorded | 53 of 99 held (highest number is #99) |
| Canonical books | 2,783 |
| Books discussed at least once | 2,133 |
| Imported book records | 3,637 |
| Discussions | 2,686 |
| Members | 174 |
| Authors | 2,199 |
| Venues | 4 |
| Resources | 542 |
| Sources | 1,829 |

Known data problems (duplicate and wrongly matched titles, unnumbered PDFs, unlinked imports) are listed in [`../book_count&details_issues.md`](../book_count&details_issues.md). Those counts predate commit `6af556d` (Meetup #25 ingest).

## 2. Running pieces

| Piece | State |
|---|---|
| Backend | FastAPI `app.api.main:app`, 33 routes, port 8000. `GET /health` returns `{"status":"ok","database":"ok"}` |
| Frontend | Next.js 15, `npm run build` exits 0, 11 routes |
| Docker | `docker compose up` runs both; compose mounts only the database and `assets/` |
| CI | GitHub Actions: tests, CodeQL, dependency review; Dependabot grouped every 3 days |

Frontend routes: `/`, `/library` (redirects to `/library-room`), `/library-room`, `/books/[id]`, `/meetups`, `/meetups/[id]`, `/members`, `/members/[id]`, `/authors/[id]`, `/admin`. There is no `/timeline` or `/collections` route.

## 3. The Library Room today

- `/library-room` renders `CriterionBookCloset`, which draws its own book spines and opens `CriterionDetailModal` on selection.
- It loads one request: `/books?limit=3000&only_discussed=true&exclude_general=true`, 2,018 books, 2,151,353 bytes, 0.51 s locally, uncompressed.
- Deep links work through query parameters: `?select=<book id>` opens one book, `?meetup=<number>` shelves one meetup.
- It draws one section at a time: 3 shelves of 120 books (360 books), with Prev/Next paging across the collection ("Shelves 1-3 of 18").
- Flow D (thin shelf, rich pull) is the decided replacement and is not built yet (PRD §9.2).

### Components no longer reachable from any route

Not reachable from any page since `VirtualLibraryRoom.tsx` was archived (10 files): `AlphabetNav.tsx`, `AmbientLighting.tsx`, `BookCover.tsx`, `ClosetPicksTray.tsx`, `HeroBookModal.tsx`, `ReadingTable.tsx`, `Shelf3D.tsx`, `Shelf.tsx` (nothing imports them), plus `Book3D.tsx` and `ShelfBay.tsx` (imported only by those). They stay in `frontend/src/components/library/` until the founders decide, because deletions need an approved list. PRD §9.1 and §12.2 now describe the live closet. Ideas worth keeping from these files are in `docs/plans/backlog.md`.

## 4. Verification run (2026-10-08)

| Check | Result |
|---|---|
| `verify_p0_suite.py` (10 database profiles) | Pass |
| `verify_p2_pathways.py` (book, member, author, meetup links over the API) | Pass |
| `verify_p3_bidirectional.py` (member, author, meetup to `/library-room?select=`) | Pass |
| `npm run build` | Pass, 11 routes |

These scripts confirm that real records come back. They do not check that the records are correct; the sample output shows known bad entries such as "Zeelam" by "Navin WeeraratBneook" and "The Russian" by "Sleep Experiment".

## 5. Rules that still apply

- Do not invent reader names, meetup dates or discussion relationships.
- CSS 3D with Framer Motion stays the default. Three.js (WebGL) is a future option for the closet only, after the admission rule in PRD §7.1 (PRD §18.1).
- Continue and extend; do not restart.
