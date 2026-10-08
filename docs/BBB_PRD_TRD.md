# BBB_PRD_TRD.md — BBB Digital Library

**Project:** Broke Bibliophiles of Bangalore (BBB) Digital Library / Archive  
**Version:** 2.0 (merge of `MASTER_FOUNDATION_PROMPT.md` v1.0 and `BUILD_GUIDE.md` v1.0, both dated 11 Aug 2026; originals in `archive/docs-v1/`)  
**Date:** 7 Oct 2026  
**Purpose:** Product requirements (Part I), technical requirements (Part II) and agent operating rules (Part III) for every coding agent and contributor.  
**Repository:** `git@github.com:MishaelJulian/BBB.git` — `main` is the permanent record.  
**Related:** [`AGENT_RULES.md`](AGENT_RULES.md) — how AI agents work on this repo (second in authority after this file) · [`references.md`](references.md) — prior work and research sources.

---

# PART I — PRODUCT (PRD)

# 1. WHO YOU ARE

You are a coding agent continuing the **BBB Digital Library**, an existing archival web application for the Broke Bibliophiles of Bangalore community. This holds for any model or agent environment (Claude Code, Gemini CLI, OpenCode, etc.).

This is not a greenfield project. Continue the existing system: do not destroy working functionality, invent architecture, or forget recorded decisions.

Your first responsibility:

> **Understand the existing repository before changing it.**

A feature that is not obvious from one file is not necessarily missing from the project.

---

# 2. WHAT BBB IS

BBB is a digital archive / library experience for the Broke Bibliophiles of Bangalore community.

The purpose of the application is to turn the recovered BBB archive into an explorable digital library rather than a conventional database interface.

## PRIMARY PRODUCT EXPERIENCE — THE 3D LIBRARY ROOM

The **3D Library Room is the single highest-priority experience in the entire project**.

It should function conceptually like the Criterion Closet: the user enters a physical-feeling library, browses a large collection of real books, physically interacts with them, and discovers the history behind each book.

The archive/data/backend exists largely to make this experience possible.

**Priority rule:**

> If there is a tradeoff between polishing a secondary page and improving the Library Room, prioritize the Library Room.

The central experience is the **Library Room**:

- Real books from the archive appear as physical-looking books.
- Books are presented through a 3D / spatial bookshelf experience.
- A user can browse, search, sort, and select books.
- Selecting a book leads to the real book detail page.
- The underlying data comes from the archival database and API.
- The visual experience must remain connected to real archival records.

The application is therefore both:

1. an archival data system, and
2. an experiential interface over that archive.

Do not reduce it to "a CRUD book website."

---

# 2A. LIBRARY ROOM PRODUCT CANON

The Library Room is not merely a visualization of the database.

It is the primary way users encounter the archive.

### Required experience

A book on the shelf represents a real archival record.

When the user selects and pulls a book from the shelf, the resulting state should reveal the book's **archival life inside BBB**, where the archive has the information.

**Presentation of the pulled-book state:**

- It should feel like a pop-up / overview card hovering (floating) over the closet.
- The card does not shake.
- The background (the closet) is blurred while the card floats. A standard blur is used for now; the strength of the blur, opacity, lighting etc. will be discussed later.
- **Tabled for a future discussion:** the change in lighting of the floating object.
- The card is presented, and its information is mentioned, in a UI/UX-friendly manner.

**Information on the card, in display order:**

1. **When** — the month and year the meetup was conducted on (format: `MM,YYYY`). The full date stays in the archive; no detail is lost.
2. **Which meetup** — the meetup number (e.g. `#93`, `#64`).
3. **Introducer(s)** — who read or presented/discussed it first, labelled **"first recorded"** (see *Introducers and discussers* below).
4. **Discussers** — which member(s) were associated with it after or along with the first discussion.
5. Discussion information.
6. Repeat appearances across meetups.
7. Recommendations / current-read context where available.
8. Links to the full book record.
9. **Why** (optional) — shown at the bottom in near-greyed-out text: unimportant but nice to have. Source: the discussion notes (`discussions.notes`), an optional field in the backend. The public API does not return notes yet (see §17).

The UI must clearly distinguish:

```text
VERIFIED ARCHIVAL DATA
```

from anything that is merely inferred or unavailable.

If a historical field is missing, show that it is unavailable rather than inventing it.

### Introducers and discussers

A book freshly brought into discussion shows the member(s) associated with introducing it. If two members bring up the same book at the same meetup, and the book was not mentioned at any earlier meetup, both members are credited as introducers. Every later mention of the book, at any other meetup and even by the same introducing members, counts only as a discussion, not an introduction.

Formally, for a book *b*:

```text
D(b)  = { (m, n) : member m discussed book b at meetup number n }

n₀(b) = min { n : (m, n) ∈ D(b) }                 first meetup of b

I(b)  = { m : (m, n₀(b)) ∈ D(b) }                 introducers
S(b)  = { m : ∃ n, (m, n) ∈ D(b) }                discussers

I(b) ⊆ S(b)        every introducer is also a discusser
S(b) ⊄ I(b)        not every discusser is an introducer (in general)

For an appearance (m, n) with n > n₀(b):
    role(m, n) = discusser        even when m ∈ I(b)
For an appearance (m, n₀(b)):
    role(m, n₀(b)) = introducer   (ties at n₀ are all credited)
```

- **"First recorded", not "first ever":** n₀ is the earliest meetup *recorded in the archive*. Not every meetup has been recovered, so a book's introducer can change when an earlier meetup is recovered. The card labels introducers "first recorded".
- **No introducer:** if the book was first raised in a discussion with no member attached (e.g. a general discussion), I(b) is empty and the card shows the introducer as **unavailable**.

### Physical interaction is part of the product

The interaction should feel like:

```text
shelf
→ select book
→ pull book out
→ inspect volume
→ discover archival history
```

In detail, the intended interaction is:

```text
Browse shelf
    ↓
Hover / focus on book
    ↓
Pull book from shelf
    ↓
Book opens / transitions into a featured detail state
    ↓
Show archival history
    ├── Who read / discussed it
    ├── Which BBB meetup(s)
    ├── When it was read/discussed
    ├── Discussion context
    ├── Members associated with the book
    └── Related archival information
    ↓
Navigate to full book detail
```

The "take a book out and discover its history" interaction is a core product requirement, not a decorative animation. The 3D animation exists to support this discovery loop. It is not an independent visual gimmick.

---

# 3. PRODUCT PRIORITY

The 3D Library Room is the **hero experience** and highest-priority feature.

```text
P0 — 3D Library Room / physical browsing experience
P1 — Archive + API data foundation
P2 — Book detail / archival history
P3 — Secondary archive interfaces and polish
```

The Library Room must use **real archival books**, not a fake demo collection.

## 3.1 Library Room implementation priority

When implementing or debugging features, use this priority:

1. **Real archive books must populate the shelves.**
2. **Book identity and API relationships must be correct.**
3. **Pull-out interaction must work.**
4. **Pulled book must expose archival history.**
5. **Navigation to the full book detail must work.**
6. Only then prioritize visual refinements and secondary features.

The pulled-book detail should be driven by actual relationships such as:

```text
Book
 ├── Discussions
 │    ├── Meetup
 │    ├── Member(s)
 │    ├── Date
 │    └── Notes / quotes where available
 ├── Recommendations
 ├── Current reads
 ├── Mentions
 └── Related books
```

The exact current API/database relationship names must always be inspected before implementation.

> **Verified 2026-10-07:** Discussions → Meetup / Member(s) / Date carry data (2,609 discussions). `discussions.notes` has 191 filled rows, but the public API does not return notes (see §17). `recommendations`, `current_reads`, `book_mentions`, `quotes` and `book_relations` hold 0 rows.

---

# 4. CURRENT ARCHIVAL CANON

The following figures are the currently reported archive snapshot and must be treated as **reported project data**, not freshly verified facts:

- **2,747 canonical books**
- **3,554 imported book records**
- **52 recovered meetups**
- **2,538 discussions**
- **144 members**
- **11 standalone archival documents**
- **Meetup #97** was manually imported

If code inspection or a fresh database query produces different numbers, do not silently overwrite these figures but keep a mark and start investigating based on this set of reported project data.

Record the discrepancy in `docs/health/SESSION_LOG.md` and identify which source is authoritative. Known discrepancies are investigated in `docs/book_count&details_issues.md`.

---

# 5. CORE PRODUCT PRINCIPLES

## 5.1 Archive first

Real archival data is more important than visual mock data.

A beautiful bookshelf containing fake books is not considered success.

Do not introduce hardcoded book arrays into production Library Room code unless explicitly creating a temporary isolated test fixture. The Library Room should consume actual archive data.

## 5.2 Preserve recovered data

Do not delete, regenerate, overwrite, or "clean up" archival records without explicit approval.

Archival data is not disposable seed data. Never:

- drop tables casually,
- truncate tables,
- delete records to make a test pass,
- regenerate the archive without backup,
- modify historical records without documentation.

**Migration checklist** — for any migration:

1. inspect current schema,
2. explain the change,
3. back up where appropriate,
4. migrate,
5. verify counts,
6. test affected API routes.

**Never, without explicit founder approval:** `DROP`, `TRUNCATE`, mass `DELETE` / `UPDATE`, or regenerating the archive. Do not destroy or rewrite source records to solve a UI problem.

**Known destructive paths** (see `AGENT_RULES.md` §5 for the full procedure):

- `archive reset-db` and `archive import-full --reset` (`app/cli/main.py`) call `reset_db()`, which runs `drop_all` + `create_all` on the live database with no confirmation and no backup. Never run them on the live DB; import into a scratch DB and diff instead.
- `docs/plans/sprint_1c_implementation.md` Q5 justifies `drop_all` because the DB "has 0 records". That assumption has expired.
- Tests are isolated: `tests/conftest.py` uses an in-memory SQLite engine.

**Before any write to the archive:** back up `book_club_archivist.db`, dry-run and report per-table counts, get approval for anything beyond a single targeted fix, apply, verify counts before vs after, and record it in `docs/health/SESSION_LOG.md`.

**Migrations:** Alembic is configured but unused (empty migration folder; the schema comes from `Base.metadata.create_all`). Schema changes follow the checklist above by hand and are ARCHITECTURAL (§23).

## 5.3 API contract before UI assumptions

The frontend must adapt to the actual backend response.

Do not invent a response shape because it would be convenient for TypeScript.

## 5.4 Existing functionality is valuable

Before changing a component:

1. determine what it currently does,
2. determine who uses it,
3. determine whether it is still required,
4. determine whether another implementation has replaced it.

## 5.5 Small, reversible changes

Prefer:

```text
inspect
→ identify root cause
→ make smallest safe change
→ test
→ inspect diff
→ record result
```

over:

```text
rewrite everything
→ hope it works
```

## 5.6 Repeat appearances are history

The actual BBB meetup records are the source material, transformed as:

```text
source record → normalized record → database → API → UI / Library Room
```

Do not silently change the meaning of the source. The same book appearing at several meetups is **historical information**, not duplicate noise. Preserve every occurrence:

```text
BOOK → BOOK OCCURRENCE → MEETUP → PERSON
```

## 5.7 Stable book identity

Every book has one stable canonical identity. Do not create duplicate books because of differences in capitalization, punctuation, formatting, author-name spelling, or repeated meetup appearances. Normalize where appropriate, but keep every meaningful archival occurrence. Known identity problems are listed in `docs/book_count&details_issues.md`.

## 5.8 Data-driven shelf and book resolution

- Do not hardcode individual books into the Library Room. Prefer `book data → shelf layout → book instances`, so the room scales as the archive grows.
- Every 3D book maps to its canonical book ID, and a selected book resolves through `3D book instance → canonical book ID → API/database → correct book → correct history`.
- Never show one book's data for another. If a record cannot be resolved, show a controlled "unavailable" state.

## 5.9 No mocking a broken core

Do not solve API bugs with hardcoded data, 3D bugs by replacing the room with a grid, or missing archive data by inventing records. Temporary fixtures are allowed only when clearly isolated for development.

---

# 6. PRODUCT EXPERIENCE CANON

> **Status:** product goals. Most of this is not done yet; a lot is still left to go.

The Library Room should feel like a real archival reading environment.

The visual direction includes:

- 3D CSS hardcover book objects
- cloth-bound appearance
- embossed typography
- visible page blocks
- realistic book thickness
- walnut-style shelves
- brass-style shelf details
- ambient lighting
- hover / pull interactions
- shelf compression
- alphabet navigation
- search / filtering
- real books from the archive
- click-through to actual book details

These are product goals, not permission to invent unrelated features.

If the current implementation differs, inspect the repository and record the difference before changing it.

---

# PART II — TECHNICAL (TRD)

# 7. TECHNICAL ARCHITECTURE

> **Status: INITIAL — NOT FINAL.** The stack, and especially additional software and its tentative usage, is expected to change significantly.

## 7.1 Admission rule for new software / tools

Any new software or tool must first be **critiqued against the current stack** (for example: overlap with an existing dependency, maintenance cost, security, fit with the current architecture).

- Every critique must be challenged and met with a resolution.
- Only if all critiques are resolved is the new software/tool let into use with the existing stack.
- Otherwise it is rejected, based on the strength of the resolutions.

Record the critique, resolutions and verdict.

**Dependency checklist** (see `AGENT_RULES.md` §7):

1. Inspect `frontend/package.json` and `requirements.txt` / `requirements-api.txt`.
2. Check whether the existing stack already solves the problem (standard library, platform feature, installed package).
3. Assess bundle size and runtime impact, especially on the Library Room.
4. Pin a specific version; never blindly install `latest`.

**Automated updates:** Dependabot opens one grouped PR per ecosystem (pip, npm, github-actions) every 3 days. The dependency-review workflow fails a PR that adds a dependency with a high-severity vulnerability. Major-version bumps inside a grouped PR are reviewed separately before merging. Never mix a dependency upgrade with a bug fix, refactor or redesign in one task.

## 7.2 Stack

| Layer | Technology |
|---|---|
| Backend | Python |
| API | FastAPI |
| ORM | SQLAlchemy |
| Migrations | Alembic |
| Database | SQLite |
| Frontend | Next.js 15 |
| UI | React |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Motion | Framer Motion |
| 3D / spatial UI | CSS / frontend rendering as implemented |
| Local API | `http://localhost:8000` |

Do not change the stack without explicit approval (and §7.1).

Known entry points:

- FastAPI application: `app.api.main:app`
- Archival database: `book_club_archivist.db`

## 7.3 Architectural warning

The frontend has previously contained more than one data-access approach, including a temporary / stale `better-sqlite3` path and API-based access.

> **Do not assume that the current frontend architecture is clean. Inspect the actual code.**

The preferred direction is one clear source of truth for runtime data access. See §13 for the current drift status.

---

# 8. REPOSITORY AND LOCAL DEVELOPMENT

## 8.1 Repository

- GitHub: `git@github.com:MishaelJulian/BBB.git`
- `main` is the permanent record; branches are work in progress.

The exact complete repository tree must be discovered from the current checkout. Do NOT invent folders merely because a conventional Next.js/FastAPI project would normally contain them. When updating this document, use the actual tree.

## 8.2 Running locally

Backend:

```bash
python -m uvicorn app.api.main:app --host 0.0.0.0 --port 8000
```

Or the whole stack with `docker compose up` (see `docker-compose.yml`).

Frontend development commands must be taken from the current `frontend/package.json` (at present: `dev`, `build`, `start`, `lint`). Do not invent a package script.

---

# 9. DATA FLOW

## 9.1 Pipeline trace (current)

The runtime path, and the path to trace when debugging the Library Room:

```text
SQLite
  ↓
SQLAlchemy
  ↓
FastAPI route
  ↓
JSON response
  ↓
Frontend API client
  ↓
Adapter / normalization
  ↓
TypeScript model
  ↓
Library state
  ↓
Shelf
  ↓
Book3D
  ↓
Book detail page
```

Every boundary must have a clear contract.

The first place where the real data stops flowing is the place to fix.

Do not rewrite the whole application because one boundary is broken.

**Current loading behaviour (verified 2026-10-07):** the Library Room makes one request, `GET /books?limit=3000`. It returns all 2,736 books (2,398,462 bytes, uncompressed: the API has no gzip middleware), each with nested `meetups[]`, `members[]` and `description`. Pulling a book needs no further book request because the data is already in memory; only the synopsis is fetched.

## 9.2 Flow D — "thin shelf, rich pull" (DECIDED 2026-10-08 — target loading strategy, not yet implemented)

Based on progressive disclosure ("overview first, zoom and filter, then details on demand"; see `docs/references.md`).

```text
Shelf:  GET /books?fields=shelf   (id, title, author, page_count, discussion_count)
        → render only visible bays (windowing)
Hover:  prefetch GET /books/{id}  (hides latency)
Pull:   blur closet + float card from cached detail
        history: discussions ordered by meetup number (first = min #)
Open:   /books/[id] reuses same cached detail
```

**Measured 2026-10-07** against the live `GET /books?limit=3000` response (2,736 books, compact JSON):

| Shelf payload | Raw bytes | vs full | gzip bytes | vs full gzip |
|---|---|---|---|---|
| Full (today) | 2,414,112 | — | 544,093 | — |
| Shelf fields only | 412,245 | **82.9 % smaller** | 133,806 | 75.4 % smaller |
| Shelf fields + `cover_url` | 641,564 | 73.4 % smaller | 167,407 | 69.2 % smaller |

Per-book detail (fetched on hover/pull): median 794 bytes, max 10,005 bytes.

Not measured yet: the render-time saving from windowing.

## 9.3 Comparison

| | A/B — pipeline trace (§9.1) | D — progressive disclosure (§9.2) |
|---|---|---|
| Purpose | Find the first broken boundary | Match load cost to what the user looks at |
| First load | O(N × full fields): all books with all nested history | O(N × shelf fields) |
| DOM | One element set per book (O(N)) | Visible bays only (O(visible)) |
| Pull | No request (data already loaded) | One request per book, prefetched on hover |
| Cost | Large up-front payload | One more endpoint shape (`fields=`) plus a client cache |

The two are not exclusive. The trace stays the debugging method under either loading strategy.

> **Decision (founders, 2026-10-08):** the Library Room moves to **Flow D** (progressive disclosure). Until it is implemented, today's single full load (§9.1) remains in place. The pipeline trace stays the debugging method.

---

# 10. CURRENT API EVIDENCE

The FastAPI backend returns HTTP 200 for (re-verified 2026-10-07):

```text
GET /books?limit=3000
GET /stats
GET /books?sort_by=title&sort_order=asc
```

This proves that the backend is capable of serving book data. It does NOT by itself prove that every frontend consumer is correctly consuming the response.

> **Flag:** `GET /books?sort_by=title&sort_order=asc` without `limit` also returns the full 2.4 MB list; `/books` is unpaginated by default.

---

# 11. API RULES

> **Marked for replacement:** §11.1–§11.6 are minimal and loosely defined. They are to be replaced with a standard API-management guide chosen through deep research.

## 11.0 Contract basics (see `AGENT_RULES.md` §6)

- One contract: FastAPI routes in `app/api/main.py`, consumed only through `frontend/src/lib/api.ts`.
- There are no Pydantic response models on the routes today, so the route code is the contract.
- Before adding an endpoint, search for an existing one. Several routes have both `/x` and `/api/x` forms.
- Never silently change a response shape. When it must change, change it in this order within one task: `backend route → types/schema → every consumer → tests → documentation`. A contract change is ARCHITECTURAL (§23).

## 11.1 Backend is authoritative

The frontend should not guess database structure.

If a frontend component needs:

```text
book.title
book.author
book.id
```

those fields must be verified against the actual API response.

## 11.2 Inspect actual JSON

When debugging an endpoint, use the real response. For example:

```text
GET /books?limit=10
```

Inspect:

- HTTP status
- top-level JSON shape
- field names
- nullability
- nested objects
- pagination fields
- ordering
- error structure

Then compare with TypeScript types.

## 11.3 Do not fix contract mismatches with random casting

Avoid:

```ts
as any
```

as a permanent fix. If the backend and frontend disagree, normalize the data deliberately.

## 11.4 Search and sorting

The current backend has demonstrated sorting through:

```text
/books?sort_by=title&sort_order=asc
```

Any new sorting/filtering feature should preserve the existing API contract unless an intentional API change is approved.

When adding filtering:

```text
filter requirement
→ determine whether backend or frontend is authoritative
→ implement once
→ test result
```

Avoid implementing the same business rule independently in multiple places.

## 11.5 Book detail routing

The book detail route is:

```text
/books/[id]
```

Before modifying it:

- inspect its current data fetching,
- verify the ID format,
- verify 404 handling,
- verify loading state,
- verify real API data,
- verify navigation from Library Room.

## 11.6 Testing requirements

### Backend change

At minimum:

- start FastAPI,
- hit affected endpoint,
- verify HTTP status,
- inspect response shape,
- run relevant Python tests if present.

### Frontend change

At minimum:

- run the project's build/typecheck,
- open affected page,
- test success state,
- test loading state,
- test API failure state if applicable.

### Data integration change

Test:

```text
Database
→ API
→ frontend
→ UI
```

Do not stop at "the backend returned 200."

### Library Room verification checklist

For Library Room work, verify where applicable:

- [ ] app starts and the Library Room opens,
- [ ] the 3D scene renders,
- [ ] real archive books appear (no fixtures),
- [ ] each book maps to its correct canonical ID,
- [ ] hover / focus and selection work,
- [ ] the pulled book resolves to the correct record,
- [ ] archival history loads (reader/member, meetup, date),
- [ ] navigation to the book detail page works,
- [ ] API failures stay contained and show a controlled state,
- [ ] no new console errors.

A change that only makes the shelf prettier while real data is broken is not a successful outcome.

---

# 12. FRONTEND RULES

## 12.1 Component layers

```text
Page
 ↓
Data fetching
 ↓
Data normalization
 ↓
Feature state
 ↓
Visual components
```

Visual components do not invent their own database/API behaviour.

When a visual component needs data or performance the current API does not give (a new field, a slower but richer call, more compute), it **proposes** an API change instead of working around it. Expect pushback on every proposal. Proposals are weighed so that only some allowed changes get more compute, and only the parts of the program that justify it are optimised.

## 12.2 Book3D — presentational contract (for now)

`Book3D` is a presentational component:

- **Input:** a book model plus visual tokens.
- **Output:** user events only (e.g. hover, pull).

It should not:

- query SQLite,
- construct fake archival records,
- make unrelated API calls,
- own global library state.

This contract is provisional; the founders will revise it in the future.

---

# 13. API / FRONTEND ARCHITECTURE DRIFT

- **`better-sqlite3` (resolved):** the temporary frontend database path has been removed. There is no import and no `package.json` entry; only a comment remains (`frontend/src/lib/api.ts:5`).
- **Duplicate API client (archived 2026-10-07):** `frontend/src/data/archive.ts` was imported nowhere; `frontend/src/lib/api.ts` is the client in use. Moved to `archive/docs-v1/archive.ts`; do not delete.
- **Unused Library Room component (archived 2026-10-07):** `frontend/src/components/library/VirtualLibraryRoom.tsx` was imported nowhere. `/library` redirects to `/library-room`, which renders `CriterionBookCloset`. Moved to `archive/docs-v1/VirtualLibraryRoom.tsx`; do not delete.

Before removing anything:

1. search for every import,
2. identify every consumer,
3. determine whether it is dead code,
4. verify the replacement works,
5. remove only after verification.

---

# 14. CURRENT KNOWN PROBLEM AREA

The major active area is the **Library / Library Room data integration**.

Previously observed behaviour included:

```text
Failed to fetch books
```

while the FastAPI server itself was successfully returning 200 responses.

This strongly suggests that the problem may exist between the API and frontend consumer, rather than in the database itself. The agent must verify this rather than assume it.

---

# 15. BOOK DETAIL PAGE

A book detail page has already been created. The task list in an earlier agent session showed:

```text
T2 — Create book detail page
```

marked complete. The route is `/books/[id]` (`frontend/src/app/books/[id]/page.tsx`).

Do not recreate this page without first inspecting the current implementation.

---

# 16. LIBRARY ROOM FETCH

An earlier task addressed:

```text
T1 — Fix Library Room fetch to use correct API endpoint
```

It was marked complete, but the agent continued afterward and hit a **Too Many Requests** / rate-limit state.

> **Status 2026-10-07:** the Library Room (`CriterionBookCloset`) fetches through `lib/api.fetchBooks({ limit: 3000 })`, and that endpoint returns 200. The browser UI state was not re-checked in this pass.

Completion must be verified from:

- source code,
- git diff,
- running application,
- API requests,
- and build/test output.

A checked task box is not proof of correctness.

---

# 17. ERROR HANDLING

Errors must be explicit.

Bad:

```text
catch → return []
```

if that makes an API failure look like an empty library.

Good behaviour:

```text
API unavailable
→ explicit error state
→ useful developer log
→ user-friendly UI
```

Do not turn "network/API failure" into "there are no books."

## 17.1 Async states

Every network action visibly supports four states:

```text
idle → loading → success → error
```

The user must know what is happening. Errors preserve access to whatever still works. For example:

```text
The archive record could not be opened.
The Library Room is still available.
Try again.
```

The room should remain usable when secondary API features fail.

> **Marked for future:** `discussions.notes` is never returned by the public book endpoints. The API uses notes only internally, to classify "general" / "tangent" discussions; only the admin meetup endpoint returns them.

---

# 18. PERFORMANCE

The Library Room is visually ambitious.

Avoid unnecessary:

- re-renders,
- API calls,
- DOM creation,
- animation loops,
- data duplication,
- large client-side transformations.

Prefer:

- one controlled book data load,
- memoized derived data where useful,
- lazy loading for expensive visual features,
- animation only when the relevant experience is active.

Do not optimize prematurely. Measure first.

## 18.1 3D performance

- **The 3D closet (Library Room) may use rendering techniques at their maximum** where they are needed for many real books plus a convincing, stable spatial experience: instancing, efficient meshes, texture reuse, culling, lazy loading, simple materials and restrained lighting. Any new library this requires still passes the admission rule (§7.1).
- **Everywhere else in the app, CSS 3D remains the strong majority preference.**
- **WebGL / Three.js option:** Three.js (WebGL) is not installed today. It may get downloaded in the future despite these constraints, for the 3D closet, after passing the admission rule (§7.1).
- Do not add expensive effects merely for spectacle. The goal is many real books + a convincing spatial experience + stable interaction.

---

# 19. GIT DISCIPLINE

Before work:

```text
git status
```

After work:

```text
git diff
git status
```

The agent must know exactly what it changed.

Never mix:

- bug fix,
- unrelated refactor,
- dependency upgrade,
- visual redesign

in one uncontrolled task.

**Hard rules** (also in `AGENT_RULES.md` §2):

- **Agents never push.** The founders push manually. Agents commit only when asked.
- Agents never force-push, rewrite shared history, or merge branches without approval.
- No AI or tool attribution in commits, PRs or logs.

## 19.1 Secrets

Never commit `.env`, `.env.local`, API keys, credentials, database passwords or service-role keys. Never expose server-side secrets to the browser. `.env.example` holds only placeholder names.

---

# 20. ANTI-PATTERNS

Forbidden:

- rewriting the whole application to fix one bug
- inventing API fields
- fake data presented as archive data
- `any` used to hide a contract mismatch
- swallowed API errors
- deleting database data to fix tests
- adding dependencies without checking whether one already exists
- duplicate API clients
- duplicate state management
- duplicate business logic
- giant components
- giant autonomous tasks
- "while I'm here" refactors
- claiming success without verification

---

# PART III — AGENT OPERATING RULES

# 21. AI AGENT NON-NEGOTIABLES

Every AI agent must obey these rules.

### Rule 1 — Never hallucinate the repository

If you have not inspected a file while the founder is asking a question that pertains to it, do not claim what you think is fact. Instead, read the relevant words or heuristics-based operations within the related files, and report what was done, what is planned to be done, what was stalled, and what couldn't be done.

Use:

```text
VERIFY — inspect <file/path>
```

when necessary.

### Rule 2 — Never invent API contracts

Inspect:

- FastAPI route
- Pydantic/schema model if present
- actual HTTP response
- frontend type
- frontend adapter

before changing the consumer.

### Rule 3 — Never fabricate database records

Never invent book titles, authors, members, meetups, discussions, or statistics and present them as archive data.

### Rule 4 — Never silently change architecture

If you discover stale architecture, report it first. Example:

```text
Current:
Frontend → better-sqlite3

Preferred:
Frontend → FastAPI

Status:
ARCHITECTURE DRIFT — requires confirmation before removal.
```

### Rule 5 — Never rewrite working systems unnecessarily

A bug in one data path does not justify rewriting the backend, database, and frontend.

### Rule 6 — Never delete archival data

No destructive database operation without explicit human approval.

### Rule 7 — Never mark a task complete without verification

"Code changed" is not the same as "feature works."

---

# 22. DECISION HIERARCHY

When information conflicts, use this order:

1. Explicit founder instruction in the current task
2. `BBB_PRD_TRD.md`
3. `AGENT_RULES.md`
4. `BBB_UI.md`, by relevance to the task
5. `docs/health/SESSION_LOG.md` latest verified state
6. Current source code
7. Existing task descriptions
8. Older agent output
9. Agent assumptions

Conversation memory is useful context but is not proof of what needs to be done, or that recently completed tasks are aligned with the repository.

The repository is the final authority for what actually exists on a permanent basis, i.e. `main`; branches are what we work on. Commits that aren't pushed must be reported, together with why they haven't been pushed yet.

---

# 23. CHANGE POLICY

Before modifying code, classify the change and its nature, and state the files it will read and the files it will write into.

### SAFE
Small isolated bug fix with clear behaviour.

### CONTROLLED
Touches multiple components but preserves architecture.

### ARCHITECTURAL
Changes data flow, database schema, framework, API contract, or major component boundaries.

Architectural changes require an explicit explanation before implementation.

### Size (always stated next to the class)

| Size | Scope |
|---|---|
| XS | Small isolated fix |
| S | One feature or component |
| M | Multiple related files |
| L | Architecture or major feature — never let it become an uncontrolled rewrite; split it |

Write both, e.g. `CONTROLLED · M`. The end-of-task report format lives in `AGENT_RULES.md` §8.

---

# 24. DEFINITION OF DONE

A task is complete only when:

- [ ] Acceptance criteria are satisfied (correct implementation)
- [ ] Existing behaviour was not accidentally broken
- [ ] Relevant build/test command passes
- [ ] API behaviour was checked where relevant
- [ ] UI behaviour was checked where relevant
- [ ] Git diff was inspected
- [ ] No unrelated files were modified
- [ ] No fake archive data
- [ ] No silent error handling
- [ ] `docs/health/SESSION_LOG.md` was updated (contents: `AGENT_RULES.md` §9)
- [ ] Any unresolved issue is documented

---

# 25. THE MOST IMPORTANT RULE

When uncertain:

> **STOP, INSPECT, REPORT, THEN ACT.**

Never replace uncertainty with confidence.

This project has already been built across multiple AI sessions. The purpose of this document is to make the next agent inherit the project rather than restart it.

---

# END OF BBB_PRD_TRD.md
