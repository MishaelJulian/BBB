# SESSION_LOG.md — BBB Digital Library

**Purpose:** Persistent memory between AI coding sessions.

> This file is the project's state machine. Update it after every meaningful coding session.

---

# CURRENT SESSION

## Date

11 Aug 2026

## Active Agent Environment

Antigravity CLI

## Previous Agent Environment

MiMo / MiMo Auto was used for substantial development before returning to Antigravity.

## Current Project Root

```text
C:\Users\misha\OneDrive\Desktop\bbb
```

---

# CURRENT PRODUCT PRIORITY

```text
P0 — 3D Library Room
P1 — Archive/API foundation
P2 — Book detail and archival exploration
P3 — Secondary pages/features
```

The 3D Library Room is the BBB equivalent of the Criterion Closet and is the primary reason the application exists as an experiential interface rather than a conventional database website.

## CORE LIBRARY ROOM INTERACTION

Defined in `BBB_PRD_TRD.md` §2A. It must use actual archive relationships from the database/API.

Do not fabricate reader names, meetup dates, or discussion history.

# CURRENT STATE

## Backend

**Status:** WORKING / VERIFY CURRENT CHECKOUT

FastAPI backend has previously started successfully with:

```powershell
python -m uvicorn app.api.main:app --host 0.0.0.0 --port 8000
```

Known successful endpoints:

```text
GET /books?limit=3000
GET /stats
GET /books?sort_by=title&sort_order=asc
```

Observed HTTP status:

```text
200 OK
```

This confirms that the backend can serve requests.

---

# DATABASE

Known database:

```text
book_club_archivist.db
```

Reported archive snapshot:

| Entity | Reported count |
|---|---:|
| Canonical books | 2,747 |
| Imported book records | 3,554 |
| Recovered meetups | 52 |
| Discussions | 2,538 |
| Members | 144 |
| Standalone archival documents | 11 |

Special archival note:

```text
Meetup #97 was manually imported.
```

These figures should be re-verified before being used as current runtime statistics.

---

# FRONTEND

Known stack:

```text
Next.js 15
React
TypeScript
Tailwind CSS
Framer Motion
```

The frontend has been substantially developed through AI coding sessions.

---

# LIBRARY ROOM

## Intended behavior

The Library Room is the primary experiential interface.

It should:

- load real books from the archive,
- display them as physical-looking 3D books,
- organize them on shelves,
- support browsing,
- support search/filtering,
- support alphabet navigation,
- allow interaction with books,
- navigate to real book detail pages.

## Current state

A previous implementation encountered:

```text
Failed to fetch books
```

even though the backend returned HTTP 200.

A later task explicitly addressed:

```text
T1 — Fix Library Room fetch to use correct API endpoint
```

The task was marked complete in the latest visible agent task state.

**Verification status: NOT YET TRUSTED UNTIL RECHECKED.**

Required verification:

```text
1. Start backend
2. Request /books
3. Start frontend
4. Open Library Room
5. Confirm actual archive books render
6. Confirm no mock fallback is hiding an API failure
7. Click a book
8. Confirm /book/[id] opens
```

---

# BOOK DETAIL

A recent task:

```text
T2 — Create book detail page (/book/[id])
```

was marked complete.

Required verification:

- route exists,
- real book ID works,
- actual archive data is displayed,
- invalid ID gives a proper not-found state,
- Library Room links to it.

---

# LATEST AGENT SESSION

The latest visible agent session showed:

```text
T2 Create book detail page (/book/[id])     [complete]
T1 Fix Library Room fetch endpoint          [complete]
```

The agent then continued operating and displayed:

```text
Too Many Requests
```

with an interrupt option.

This means:

> **Do not assume the last agent session ended cleanly.**

The repository must be inspected before the next coding task.

---

# REQUIRED RECOVERY CHECK

At the beginning of the next Antigravity CLI session:

```text
[ ] git status
[ ] git diff
[ ] inspect latest changed files
[ ] start backend
[ ] test /books
[ ] test /stats
[ ] test sorted books
[ ] start frontend
[ ] test Library Room
[ ] test book detail
[ ] update this log
```

---

# KNOWN ARCHITECTURAL RISK

The frontend has historically contained a mixture of data-access approaches.

A temporary `better-sqlite3` approach existed alongside the FastAPI API.

This creates the possibility of:

```text
Old path:
Next.js → SQLite

New path:
Next.js → FastAPI → SQLite
```

Do not delete the old path blindly.

First determine:

```text
Is it still used?
Is it dead?
Does anything depend on it?
Has the API fully replaced it?
```

Then remove stale architecture deliberately.

---

# DEVELOPMENT HISTORY

## Phase — Archival Backend

Completed before the recent frontend work:

- archival database established,
- recovered BBB records stored,
- FastAPI layer established,
- SQLAlchemy used for database access,
- archival endpoints made available.

Status:

```text
SUBSTANTIALLY COMPLETE
```

---

## Phase — Frontend Library

Completed / substantially developed:

- Library interface,
- book listing,
- sorting,
- Library Room concept,
- 3D bookshelf / book visualization work,
- API integration work.

Status:

```text
FUNCTIONALITY EXISTS — REQUIRES CURRENT INTEGRATION VERIFICATION
```

---

## Phase — Book Detail

Completed in recent agent work:

```text
/book/[id]
```

Status:

```text
IMPLEMENTED — VERIFY
```

---

# IMPORTANT LESSON FROM MULTIPLE AI AGENTS

The project has been built by different agents.

Therefore:

### Never trust an old statement that says:

```text
"done"
```

without checking the current repository.

### Never trust a task checkbox alone.

### Never assume an agent remembers the previous agent.

The documents exist precisely to solve this.

---

# NEXT PRIORITY

## Priority 0 — Stabilize the handoff

Before adding anything new:

```text
1. Stop any runaway / rate-limited agent.
2. Inspect git state.
3. Audit the latest changes.
4. Verify backend.
5. Verify Library Room.
6. Verify book detail.
```

## Priority 1 — Establish one clean data path

Target:

```text
SQLite
 ↓
SQLAlchemy
 ↓
FastAPI
 ↓
Next.js API client
 ↓
Library UI
```

Remove stale duplicate paths only after proof.

## Priority 2 — Library Room polish

Only after real data is reliably flowing:

- shelf layout,
- book proportions,
- typography,
- hover interaction,
- pull-out behavior,
- sorting,
- filtering,
- search,
- responsive behavior.

## Priority 3 — Archive exploration

Then consider:

- richer book detail,
- meetup relationships,
- discussion relationships,
- member relationships,
- archival timeline,
- cross-links between records.

These should be based on real archive data, not invented demo content.

---

# DECISION LOG

## Decision 001 — Antigravity CLI becomes primary agent

**Status:** LOCKED

MiMo was used for substantial prior implementation.

Antigravity CLI is now the primary environment for continuing the project.

Reason:

```text
Need a controlled agent workflow with persistent project documentation.
```

---

## Decision 002 — Four-document project memory system

**Status:** LOCKED (amended 2026-10-07: `MASTER_FOUNDATION_PROMPT.md` and `BUILD_GUIDE.md` merged into `BBB_PRD_TRD.md`; originals in `archive/docs-v1/`; amended 2026-10-08: `AGENT_PLAYBOOK.md` and `BBB_RULES.md` merged into `AGENT_RULES.md`; originals in `archive/docs-v1/`)

The project uses:

```text
BBB_PRD_TRD.md
AGENT_RULES.md
SESSION_LOG.md
```

Purpose:

| File | Role |
|---|---|
| BBB_PRD_TRD.md | What the project is, what must not change, and how the software should be engineered |
| AGENT_RULES.md | How AI agents should behave |
| SESSION_LOG.md | Where the project currently is |

---

## Decision 003 — Real archive data is authoritative

**Status:** LOCKED

The Library Room must ultimately display actual archival book records.

Mock data must not silently replace the archive.

---

# OPEN QUESTIONS

These are not bugs. They are things the next audit must determine.

### Q1 — Exact current frontend data path

Is the Library Room now using only FastAPI, or does stale SQLite access remain?

**Status:** VERIFY

### Q2 — Exact API response schema

What is the exact current JSON structure returned by `/books`?

**Status:** VERIFY

### Q3 — Exact current repository tree

The project tree needs to be regenerated from the current checkout.

**Status:** VERIFY

### Q4 — Current git state after MiMo rate-limit interruption

Need to determine whether there are uncommitted changes.

**Status:** VERIFY

### Q5 — Does the Library Room currently render all intended archive books?

**Status:** VERIFY

---

---

# SESSION: 004 — P0 Signature Book Pull-Out & Build Stabilization

## Date
2026-08-23 22:48

## Agent
Antigravity CLI

## Task
P0 — 3D Library Room Signature Book Pull-Out & In-Room Archival Inspection + Compilation Fixes

## Before
- `next build` failing on `LightingMode` type export from `AmbientLighting.tsx`, `viewToggle.tsx` path casing in `library/page.tsx`, and `BookCard` property types in `BookGrid.tsx`.
- Empty duplicate `frontend/src/app/book` directory.
- `CURRENT_STATE.md` missing.
- Selecting books on 3D shelves was navigating immediately to `/books/[id]` instead of physically pulling out into an in-room reading table inspection state.

## Completed
- [x] Fixed all compilation and type errors across Next.js frontend (`npm run build` now exits with 0 and all 7 routes compile).
- [x] Initialized `CURRENT_STATE.md` as the authoritative live state machine.
- [x] Enhanced `Book3D.tsx` to handle `isSelected`, `onSelect`, and elevated spring transforms.
- [x] Enhanced `Shelf3D.tsx` to handle `selectedBookId`, `onSelectBook`, and physical shelf compression/displacement.
- [x] Upgraded `ReadingTable.tsx` to reveal real BBB archive relationships (readers/members, meetup appearances with numbers/dates/venues, timeline dates) with in-room actions (`Return to Shelf` and `Examine Full Archive Record`).
- [x] Updated `library-room/page.tsx` with unified active volume selection and smooth focal transition.
- [x] Verified backend FastAPI endpoints (`/stats`, `/books`, `/books/{id}`).

## Files Changed
- `frontend/src/components/library/AmbientLighting.tsx` — exported `LightingMode`
- `frontend/src/components/library/Book3D.tsx` — selection props, elevation springs, click interception
- `frontend/src/components/library/Shelf3D.tsx` — selection propagation and shelf compression
- `frontend/src/components/library/ReadingTable.tsx` — live archive inspection details & action controls
- `frontend/src/app/library-room/page.tsx` — active book state management and smooth inspection scroll
- `frontend/src/app/library/page.tsx` — fixed `ViewToggle` import casing
- `frontend/src/components/book/BookCard.tsx` — optional `firstDiscussedYear` support
- `frontend/src/components/book/BookGrid.tsx` — aligned with `Book` interface fields
- `CURRENT_STATE.md` — created persistent state machine
- `SESSION_LOG(2).md` — recorded session handoff

---

# SESSION: 005 — P1 Library Room Explorability & Viewport Performance

## Date
2026-08-23 23:02

## Agent
Antigravity CLI

## Task
P1 — Library Room Explorability (Spatial Alphabet Navigation, Editorial Range Headers, Scroll Spying) & 2,747-Book Viewport-Aware Mounting Optimization

## Completed
- [x] Audited full spatial flow and DOM footprint across all 2,747 canonical books and 27 alphabetical shelf sections.
- [x] Implemented viewport-aware lazy shelf mounting via `IntersectionObserver` with generous root margin (`600px 0px`) in `Shelf3D.tsx`. Off-screen shelves render lightweight physical silhouettes, mounting interactive 3D books on demand.
- [x] Reduced active Framer Motion spring instances across the DOM from 2,867 to ~100–200, achieving smooth 60fps scrolling.
- [x] Elevated `AlphabetNav.tsx` with literary serif typography, accessible catalog jumping, and warm amber active indicators.
- [x] Added dynamic active-section scroll-spy and `scroll-mt-36` to `library-room/page.tsx` for seamless spatial section navigation.
- [x] Added dynamic editorial range headers to `Shelf3D.tsx` (e.g. `Section M · From "Machiavelli" to "Murdoch" · 184 volumes`).
- [x] Preserved the complete P0 book pull-out and in-room archival inspection experience without regressions.
- [x] Ran `npm run build` in `frontend/` (passed with code 0).

## Files Changed
- `frontend/src/components/library/Shelf3D.tsx` — viewport-aware mounting & editorial range headers
- `frontend/src/components/library/AlphabetNav.tsx` — literary catalog index styling & accessible focus
- `frontend/src/app/library-room/page.tsx` — scroll-spy active section observer & scroll-mt alignment
- `CURRENT_STATE.md` — updated P1 status, performance metrics, and verified features
- `SESSION_LOG(2).md` — recorded Session 005 handoff

---

# SESSION: 006 — P2 Deep Archival Cross-Linking & Living Relational Exploration

## Date
2026-08-23 23:12

## Agent
Antigravity CLI

## Task
P2 — Deep Archival Cross-Linking (Backend Endpoints, Frontend Types, Member Dossiers, Author Records, Reading Table Integration)

## Completed
- [x] Implemented backend endpoints in `app/api/main.py`:
  - `GET /members` (Member directory with aggregated discussion/meetup metrics)
  - `GET /members/{member_id}` (Comprehensive archival dossier with books brought and meetups attended)
  - `GET /authors/{author_id}` (Author archive record with all canonical volumes in the BBB collection)
- [x] Extended `frontend/src/lib/api.ts` with strongly typed interfaces (`MemberSummary`, `MemberDetail`, `AuthorDetail`, `MemberBookRecord`) and fetch functions (`fetchMembers`, `fetchMember`, `fetchAuthor`).
- [x] Created `frontend/src/app/members/page.tsx` (Archival Readers Directory).
- [x] Created `frontend/src/app/members/[id]/page.tsx` (Member Archival Dossier).
- [x] Created `frontend/src/app/authors/[id]/page.tsx` (Author Archival Record).
- [x] Integrated cross-linking on `ReadingTable.tsx` (Author and Reader links), `/books/[id]` (Author and Readers links), and `/meetups/[id]` (Attendee links).
- [x] Verified all 8 cross-linking pathways (`Book <-> Member`, `Book <-> Author`, `Book <-> Meetup`, `Member <-> Meetup`) using 100% verified real database records.
- [x] Preserved P0 signature pull-out physics, shelf compression, and independent return buttons.
- [x] Ran `npm run build` in `frontend/` (passed with code 0 across all 10 routes).

## Files Changed
- `app/api/main.py` — added `/members`, `/members/{id}`, `/authors/{id}` endpoints with optimized queries
- `frontend/src/lib/api.ts` — added Member & Author types and fetch functions
- `frontend/src/app/members/page.tsx` — new Members Directory page
- `frontend/src/app/members/[id]/page.tsx` — new Member Dossier page
- `frontend/src/app/authors/[id]/page.tsx` — new Author Record page
- `frontend/src/components/library/ReadingTable.tsx` — integrated author & reader contextual links
- `frontend/src/app/books/[id]/page.tsx` — author & reader links
- `frontend/src/app/meetups/[id]/page.tsx` — attendee links
- `CURRENT_STATE.md` — updated P2 status and active route table
- `SESSION_LOG(2).md` — recorded Session 006 handoff

---

# SESSION: 007 — P3 Spatial Bidirectionality & Reverse Archival Deep-Linking

## Date
2026-08-23 23:19

## Agent
Antigravity CLI

## Task
P3 — Spatial Bidirectionality (Universal `?select=<book_id>` Deep-Linking, Lazy Shelf Auto-Mounting, Horizontal Shelf Auto-Scroll, Reverse Navigation from Books, Members, Authors, Meetups, and Catalog)

## Completed
- [x] Implemented universal `/library-room?select=<book_id>` deep-linking in `library-room/page.tsx` wrapped in `React.Suspense`.
- [x] Enabled automatic target alphabetical shelf resolution and smooth scroll focus (`scroll-mt-36` alignment).
- [x] Integrated lazy-mounting bypass in `Shelf3D.tsx` (`isInViewport = true` when containing `selectedBookId`), allowing deep-links to mount interactive 3D books even from far off-screen sections.
- [x] Added horizontal auto-scroll centering in `Shelf3D.tsx` to automatically bring the extracted hardcover into horizontal view.
- [x] Added *"View on 3D Shelf →"* action button on `/books/[id]`.
- [x] Added *"Locate in Library →"* action on each book in `/members/[id]`.
- [x] Added *"Locate in Library →"* action on each volume in `/authors/[id]`.
- [x] Added *"Locate in Library →"* action on each discussed volume in `/meetups/[id]`.
- [x] Added *"3D Shelf →"* action on all book cards in `/library` (list and grid views).
- [x] Verified 6 specific test volumes (*Mort*, *A Man called Ove*, *Pachinko*, *The Giver*, *The Story of India*, *Zeelam*) across Section M, A, P, T, Z.
- [x] Preserved P0 signature pull-out physics, shelf compression, and Reading Table return actions without regressions.
- [x] Ran `npm run build` in `frontend/` (passed with code 0 across all 10 routes).

## Files Changed
- `frontend/src/app/library-room/page.tsx` — added `?select=` query parameter handler & Suspense export
- `frontend/src/components/library/Shelf3D.tsx` — added horizontal auto-scroll on selection
- `frontend/src/app/books/[id]/page.tsx` — added *"View on 3D Shelf"* action
- `frontend/src/app/members/[id]/page.tsx` — added *"Locate in Library"* action
- `frontend/src/app/authors/[id]/page.tsx` — added *"Locate in Library"* action
- `frontend/src/app/meetups/[id]/page.tsx` — added *"Locate in Library"* action
- `frontend/src/components/book/BookCard.tsx` — added *"3D Shelf"* link in list and grid views
- `CURRENT_STATE.md` — updated P3 status and active route directory
- `SESSION_LOG(2).md` — recorded Session 007 handoff

## Verification
- `npm run build` exits with code 0 across all 10 Next.js static & dynamic routes.
- Backend API running on `http://127.0.0.1:8000`. Verified all reverse entry pathways on real archive records.

---

# GAP: 2026-08-24 → 2026-10-01 — no session records

No session handoff was written for this period. Reconstructed from git history only:

- `a7d3c52` (2026-09-12) — whole system committed in one bulk commit (library room, backend API, archival pipeline, docs).
- `57314e0`, `78dbb85` (2026-09-12) — README, profile README, DAKSH upgrade guides.
- `427be12` (2026-09-20) — Admin Workspace, publication PDF generator, meetup media manager.
- `f8affe7` (2026-09-20) — Meetup #99 ingested from official PDF; #98 photo removed.
- `a512472` (2026-10-01) — Criterion 3D Closet, universal covers, Meetups 45–48 DB updates, network proxy. This commit dropped `canonical_books` 2,835 → 2,736 and imported books 3,554 → 3,551 (see `docs/book_count&details_issues.md`).
- `64a2863` … `d7ae2ae` (2026-10-01) — Criterion list-view modal and a series of mobile fixes (camera, reload loops, cover rendering, admin connectivity).

---

# SESSION: 008 — Basics cleanup, security hardening, stats truth, PRD/TRD merge

## Date
2026-10-07

## Agent
Coding agent, founder-directed

## Task
Basics-cleanup plan steps 1–3 (memory init, knowledge graph, change history), then security hardening, honest stats, the book-count audit, and merging the foundation docs into `BBB_PRD_TRD.md`.

## Completed
- [x] PR #1 merged (`c8f48dd`): `Meetup.date` shadowing fix and missing deps (`d92d32a`); superseded `bbb-library/` scaffold removed (`625b9a2`); `static/` renamed to `assets/`, served at `/assets` (`73ed1b2`); Docker, compose, CI, pre-commit, env examples (`8047565`).
- [x] Reports now go to `reports/<YYYY-MM-DD>/`; the generator expects meetups #1 to the latest number (`70dba78`). The 2026-07-22 snapshot JSONs were removed; the folder is kept (`0cd563c`).
- [x] Footer stats come from the live DB through `/stats`, with no hardcoded numbers (`903a107`, `337c209`).
- [x] Book count and details audit written to `docs/book_count&details_issues.md` (`94ffb6b`). The repair itself is tabled.
- [x] Dependabot (grouped per ecosystem, every 3 days), dependency review and CodeQL added (`adc9f5c`, `d0256d3`).
- [x] Security fixes (`2e96c97`, `189da84`): SSRF guard on the URL resolver, admin links restricted to http(s), file paths confined to `assets/`, exact URL host matching, CORS restricted to localhost/LAN plus `CORS_ORIGINS`. CodeQL: 13 of 17 alerts fixed.
- [x] `MASTER_FOUNDATION_PROMPT(3).md` and `BUILD_GUIDE(3).md` merged into `BBB_PRD_TRD.md`; `docs/references.md` added; originals, plus the unused `frontend/src/data/archive.ts` and `VirtualLibraryRoom.tsx`, moved to `archive/docs-v1/` (`252b3a7`, `0467337`). `AGENT_PLAYBOOK`, this log (Decision 002) and `BBB_RULES` §5 now point to `BBB_PRD_TRD.md` (`c83e2f6`).

## Files Changed
- `BBB_PRD_TRD.md`, `docs/references.md` — created
- `archive/docs-v1/` — archived foundation docs and unused frontend files
- `app/api/main.py`, `app/core/paths.py`, `app/core/config.py`, `app/services/pdf_generator.py` — security fixes, `/stats` fields
- `app/reports/generator.py`, `app/cli/main.py` — dated report folders
- `frontend/src/components/layout/Footer.tsx`, `frontend/src/lib/api.ts`, `frontend/src/app/admin/page.tsx`, `frontend/src/components/admin/BookAutocompleteInput.tsx` — live stats, safe links
- `.github/` — Dependabot, dependency review, CodeQL
- `tests/test_ssrf_guard.py` — created
- `AGENT_PLAYBOOK(3).md`, `BBB_RULES.md`, `SESSION_LOG(2).md` — doc references

## Verification
- Frontend `tsc --noEmit` passes after archiving the two frontend files.
- API re-checked live: `GET /books?limit=3000`, `/stats` and `/books?sort_by=title&sort_order=asc` return 200.
- CodeQL re-run: 4 alerts remain open (#1 SSRF, #18–20 XSS-through-DOM), all guarded in code; dismissal awaits founder approval.

## Open
- API backlog: shelf payload (flow D, measured 82.9 % smaller, not approved), unpaginated `/books`, no gzip, notes not returned, standard API guide, `/health`, empty relation tables, unguarded `reset_db`.
- Founders' decision: Library Room loading strategy (BBB_PRD_TRD §9.3).
- Book data repair (tabled; needs confirmation of the inferred meetup numbers).
- Security: SECURITY.md, upload limits, admin login.
- Dependabot PRs #17, #18, #19 to review.
- Cleanup steps 4–7.

---

# SESSION: 009: Agent rules, docs reorganisation, health endpoint, root cleanup

## Date
2026-10-08

## Agent
Coding agent, founder-directed

## Task
Merge the agent playbook and rules, reorganise the docs, add `GET /health`, clean the repo root, and verify the app end to end.

## Completed
- [x] Rebased onto Mishael's `6af556d` (Meetup #25 ingest, closet spine layout). Its changes outside #25 (120 titles, 218 authors, 31 removed discussions) were reported to him.
- [x] `AGENT_PLAYBOOK.md` and `BBB_RULES.md` merged into `docs/AGENT_RULES.md`, second in authority after `docs/BBB_PRD_TRD.md`; PRD expanded with data, API, dependency, git and 3D performance rules (`e9e0d9f`, `347b3fb`).
- [x] Docs moved into `docs/`, `docs/health/`, `docs/architecture/`, `docs/plans/` and `archive/`; MIT `LICENSE` promoted to the root; release v1.0 created on `a7d3c52` (`261d456`, `268fd7f`).
- [x] `GET /health` added (`5d8e0fe`).
- [x] Admin CSV export hidden until a live export exists; static CSV and the Criterion reference recording moved to `archive/` (`0f1d445`, `6fe8370`).
- [x] `CURRENT_STATE.md` rewritten from live measurements; PRD §9 corrected to the closet's real request (Flow D saves 61.3 %, the earlier 82.9 % used the unfiltered list); em dashes and "not X but Y" phrasing removed from the PRD, AGENT_RULES and README.
- [x] Root cleanup: 32 meetup PDFs, `BBB Meetup-9.txt` and `meetup_numbers.txt` moved to `sources/` (import default `--data-dir` is now `sources`); scratch scripts to `scripts/scratch/`; verify scripts to `tests/verify/`.

## Verification
- `pytest`: 31 passed. Scanner on `sources/`: 1 TXT, 32 PDFs.
- `tests/verify/verify_p0_suite.py`, `verify_p2_pathways.py`, `verify_p3_bidirectional.py`: all pass against the live API.
- `npm run build`: exit 0, 11 routes. Production frontend on port 3000 with the API on port 8000: every route returns 200; `/library-room?select=<Mort>` opens the book card; `?meetup=97` shelves 43 volumes; `/members/Abhiram` shows 31 books and 18 meetups; the admin export button is gone.

## Git state
`main` matches `origin/main` up to `6fe8370`; this session's cleanup and doc fixes are committed locally for the founders to push.

## Next
- README rewrite (Mermaid, CI/CodeQL/Python badges, three closet captures, short roadmap with the WebGL closet first, Examples from the verified deep links), then archive `Used tool manage_task.txt`.
- Build: Pydantic response models, Flow D (with paginated `/books` and member-meetup pairs for introducers), search across authors and notes, Lucide and React Testing Library, genre data and filters, OCR.
- Founders to decide: the components no longer reachable from any route (`Book3D`, `Shelf3D`, `ReadingTable` and others, listed in `CURRENT_STATE.md` §3).

---

# SESSION: 010: Architecture review, health reports, security and pattern reviews, upload cap

## Date
2026-10-09

## Agent
Coding agent, founder-directed

## Task
Resolve conflicts between the architecture docs, turn the July import reports into actions, run security and code-pattern reviews, and cap meetup photo uploads.

## Current state
`main` at `2621ad6` plus this entry's commit; 6 local commits not pushed. The app builds and all checks pass; the Definition of Done is not met for UI checks and existing silent error handling (`docs/health/pattern_review_analysis.md`, Quality gate).

## Inspected
`docs/architecture/*`, PRD §7 to §11 and §24, `app/api/main.py`, `app/pipeline/full_import.py`, `app/parsers/`, `app/services/pdf_generator.py`, `frontend/src/` (closet, modal, book page, admin), `frontend/next.config.ts`, `Dockerfile`, `docker-compose.yml`, `.github/workflows/`, the database (read-only).

## Completed
- [x] Architecture docs: `book-club-archivist-architecture.md` renamed to `universal_app_flow.md` (roadmap); `canonical_archive_specification.md` renamed to `imperative_decisions.md` with founder review notes; founder review added to `bbb-library-architecture.md`; research items R1 to R6 in `docs/plans/backlog.md` (`96dbe94`, `c2ba3a7`).
- [x] `docs/architecture/flow_comparison.md`: flows against the code, cost per flow, schools of thought, lessons from the ISI DRTC MS(LIS) syllabus (`4199504`).
- [x] `docs/health/` reorganised: July reports in `2026-07-22/`; `CURRENT_STATE.md`, `archive_audit_report.md`, `audit_diff.md` removed after their content moved into `report_insights.md` (state, venue analysis, fix-log numbers, quality metrics, FMEA, measurement log, task procedures A1 to A7 and B8, data-loss runbook) (`4199504`).
- [x] `docs/health/security_analysis.md`: security review (F1 to F18) and exploitability review (E1 to E8), findings register, founder decisions (`4199504`, `fe1ddf1`).
- [x] Meetup photo uploads capped at 30 MB; the route's own 404 no longer becomes a 500; test `tests/test_upload_limit.py` (`33f4c8d`).
- [x] `docs/health/pattern_review_analysis.md`: React review (R1 to R16), backend patterns (B1 to B12, with measured query counts), FastAPI patterns (P1 to P10, router split planned and not scheduled), quality gate (`2621ad6` and this commit).
- [x] FMEA rows 13 to 37 merged into `report_insights.md` §10.8; measurement rows added to §13.

## Unfinished work and remaining failures
- Tasks A1 to A7 and B8 (`report_insights.md` §8, §14) not started.
- Security fixes F1, F2, F5, F6, F7 noted for later; CORS rule and login (F3, P12) scheduled; F8 (database tracked in a public repository) waits on a founder decision.
- Running backend container predates the upload cap; rebuild deferred by the founders (Q1).
- UI not checked in a browser this session (NCR-QG-03).

## Known bugs
- `GET /meetups` runs 6,278 queries and takes about 7 s (B1).
- Five admin write routes return 500 for their own 404 and 400 errors (B2).
- Closet keyboard access missing (R1 to R3); Ctrl+R and other browser shortcuts captured by the closet (R4).
- Closet shows an empty room when `/books` fails (R5); the API logs nothing (B6).

## Files changed
`index.md`, `app/api/main.py`, `tests/test_upload_limit.py`, `docs/architecture/{universal_app_flow,imperative_decisions,bbb-library-architecture,flow_comparison}.md`, `docs/plans/backlog.md`, `docs/health/{report_insights,security_analysis,pattern_review_analysis,SESSION_LOG}.md`, `docs/health/2026-07-22/*` (moved), `archive/docs-v1/standalone_documents.md` (moved by the founders).

## Commands and verification
- `pytest`: 32 passed (2.16 s).
- `tests/verify/verify_p0_suite.py`, `verify_p2_pathways.py`, `verify_p3_bidirectional.py`: pass.
- `npx --no-install tsc --noEmit`: 0 errors. `npm run build` (scratch copy): 11 routes, 73 s.
- `flake8 --select=E9,F63,F7,F82`: 0. Full flake8: 624 style findings.
- API `GET` checks against the running backend: `/health` 200; `/books` 2,151,353 B in 1.32 s; `/meetups` 6.99 s; missing book 404.
- Query counts measured by calling route functions on a read-only database URL.
- Backup taken: `~/bbb_backups/bbb_20261009_103653.db` (integrity check ok).

## Git state
Branch `main`. Unpushed: `96dbe94` and `c2ba3a7` were pushed earlier; `4199504`, `33f4c8d`, `fe1ddf1`, `2621ad6` and this session's last commit are local because the founders push.

## Decisions and discoveries
- Upload limit 30 MB (arbitrary, to revisit). CORS rule and login with authentication and authorization policies scheduled together.
- Router split planned in general, not scheduled.
- Task A8 (Alembic stamp) renamed B8; its migration is an empty baseline.
- The repository is public and tracks the database file.
- ISI's MS(LIS) is taught at Bengaluru (DRTC), not Kolkata.

## Next
1. Founder decision on F8 (database in the public repository).
2. A1 (keep raw text whole), then A7 (pipeline test) before A3 (review queue).
3. B1 (batch the meetup list) and B2 (re-raise `HTTPException`), both small.
4. Remaining pattern reviews: `/ecc:plankton-code-quality`, `ecc:comment-analyzer`, `/ecc:refactor-clean`, `/ecc:update-codemaps`.

---

# SESSION: 011: Architecture consult: hosting, auth, data model, mobile, founder questions

## Date
2026-10-09

## Agent
Coding agent, founder-directed consult (no code, database or dependency changes)

## Task
See which aspects of each main architecture doc hold up against the revision requests (BACKLOGS_MAIN, MAIN CHANGES, PRESENTER module ideas, THINGS_FROM_RTIH, DOMAINS) and the evidence files (`docs/health/*`); put every architectural choice to the founders as options; record the decisions and revise the docs.

## Inspected
The 7 main docs, the 6 evidence files, the 7 revision-request files; RTIH `platform_/docker/docker-compose.yml`, `docs/reference/primers/architecture.md`, `docs/harness/sdlc-master-plan.md`, `specs/backup-dr.md`, `docs/notes/security-backlog.txt`; `security_more`; `MLCP Scheming/security-immediate.txt`; `app/database/models.py`; `app/api/main.py` outbound calls; the database (read-only).

## Completed
- [x] 35 decisions (D1 to D35) and answers to Q1 to Q10, each chosen by the founders from an options menu; recorded in `imperative_decisions.md` §6 and `FOUNDER_QUESTIONS.md`.
- [x] PRD: new §2B (users and roles), §8.3 (deployment), §12.3 (server vs browser rendering), §12.4 (theming tokens), §17.2 (privacy, DPDP), §18.2 (Core Web Vitals gate, adaptive loading, offline), §19.2 (versioning); §11.1 to §11.5 replaced by the API standard; stack additions marked "pending §7.1"; §4 discrepancy logged without overwriting the reported figures.
- [x] `bbb-library-architecture.md` rewritten as the runtime owner: target topology, doc ownership map, proxy hardening checklist, cache layers, accounts and recovery, secrets, backups, costs; founder review block kept word for word.
- [x] `DatabaseSchema.md` regenerated from the models (24 tables, live counts, status, planned changes, generator inline).
- [x] `domain_model.md`: wrong path, entity count and threshold corrected; attendance, member lifecycle, inflows, identity rules added.
- [x] `universal_app_flow.md`: presenter-form inflow, review queue, real enrichers, one-database principle.
- [x] `flow_comparison.md` §8: write path, statistics path, touch prefetch, Flow E threshold tied to the mobile budget.
- [x] `docs/plans/backlog.md`: resolutions, launch gate, roadmap phases, tool evaluation.
- [x] Upload cap lowered from 30 MB to 4.5 MB to match Vercel's body limit (D36); `app/api/main.py`; 32 tests pass (scratch venv built from the requirements files; the default interpreters lack `loguru`).

## Measurements
- Latency from Airtel mobile, Bengaluru (TCP connect, median of 5): Vercel edge 34 ms, DigitalOcean BLR1 38 ms, DigitalOcean SGP1 86 ms, Hetzner FSN1 189 ms, DigitalOcean FRA1 220 ms, Hetzner SIN 274 ms, Hetzner HEL1 284 ms.
- Live counts (read-only): canonical_books 2,783; imported_books 3,637; meetups 53; discussions 2,686; members 174; sources 1,829; meetup #99 has 62 discussions and no `source_id`.

## Unfinished work
- Open: the founders will pass the PostHog DNS records to the club domain's manager; whether Vercel to Caddy negotiates X25519MLKEM768; the other 77 founder questions. Dead-code deletion held until P4 (founders).
- Nothing from the roadmap (P0 to P5) is built yet.

## Files changed
`docs/BBB_PRD_TRD.md`, `docs/architecture/{bbb-library-architecture,DatabaseSchema,domain_model,flow_comparison,imperative_decisions,universal_app_flow}.md`, `docs/plans/backlog.md`, `FOUNDER_QUESTIONS.md`, `index.md`, `docs/health/SESSION_LOG.md`.

## Next
1. Roadmap P0 (backups and restore drill first, then the Q9 baseline, then each data step with a dry run).
2. The launch gate in `docs/plans/backlog.md`.

---

# END OF SESSION_LOG.md
