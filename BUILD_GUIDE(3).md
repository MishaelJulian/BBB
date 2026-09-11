# BUILD_GUIDE.md — BBB Engineering Operating Manual

**Project:** BBB Digital Library  
**Version:** 1.0  
**Date:** 11 Aug 2026

This document defines how the BBB application should be built and maintained.

---

# 0. PRODUCT PRIORITY

The 3D Library Room is the **hero experience** and highest-priority feature.

Think of it as the BBB equivalent of the Criterion Closet.

Engineering priorities are:

```text
P0 — 3D Library Room / physical browsing experience
P1 — Archive + API data foundation
P2 — Book detail / archival history
P3 — Secondary archive interfaces and polish
```

P1 exists to make P0 possible. Do not spend substantial engineering effort on P3 while P0 is incomplete or unreliable.

The Library Room must use **real archival books**, not a fake demo collection.

## Book interaction model

The intended interaction is:

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

The "take a book out and discover its history" interaction is a core product requirement, not a decorative animation.

# 1. STACK

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

Do not change the stack without explicit approval.

---

# 1A. LIBRARY ROOM IMPLEMENTATION PRIORITY

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

# 2. KNOWN REPOSITORY SHAPE

The project root is:

```text
C:\Users\misha\OneDrive\Desktop\bbb
```

Known backend entry point:

```text
app.api.main:app
```

Known database:

```text
book_club_archivist.db
```

The exact complete repository tree must be discovered from the current checkout.

Do NOT invent folders merely because a conventional Next.js/FastAPI project would normally contain them.

When updating this document, use the actual tree.

---

# 3. LOCAL DEVELOPMENT

Backend has previously been started using:

```powershell
python -m uvicorn app.api.main:app --host 0.0.0.0 --port 8000
```

Successful requests previously included:

```text
GET /books?limit=3000
GET /stats
GET /books?sort_by=title&sort_order=asc
```

Frontend development commands must be taken from the current `package.json`.

Do not invent a package script.

---

# 4. DATA ARCHITECTURE

The desired runtime flow is:

```text
SQLite archive
     ↓
SQLAlchemy
     ↓
FastAPI
     ↓
JSON API
     ↓
Next.js data client
     ↓
TypeScript normalization
     ↓
UI state
     ↓
Library / Library Room
     ↓
Book
     ↓
Book detail
```

Every boundary must have a clear contract.

---

# 5. API RULES

## 5.1 Backend is authoritative

The frontend should not guess database structure.

If a frontend component needs:

```text
book.title
book.author
book.id
```

those fields must be verified against the actual API response.

## 5.2 Inspect actual JSON

When debugging an endpoint, use the real response.

For example:

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

## 5.3 Do not fix contract mismatches with random casting

Avoid:

```ts
as any
```

as a permanent fix.

If the backend and frontend disagree, normalize the data deliberately.

---

# 6. DATABASE RULES

The archive is valuable data.

Never:

- drop tables casually,
- truncate tables,
- delete records to make a test pass,
- regenerate the archive without backup,
- modify historical records without documentation.

For any migration:

1. inspect current schema,
2. explain the change,
3. back up where appropriate,
4. migrate,
5. verify counts,
6. test affected API routes.

---

# 7. FRONTEND RULES

## 7.1 Real data over mock data

Do not introduce hardcoded book arrays into production Library Room code unless explicitly creating a temporary isolated test fixture.

The Library Room should consume actual archive data.

## 7.2 Component responsibilities

A useful conceptual separation is:

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

Visual components should not independently invent their own database/API behavior.

## 7.3 Book3D

The 3D book component should receive a book model.

It should not:

- query SQLite,
- construct fake archival records,
- make unrelated API calls,
- own global library state.

---

# 8. API / FRONTEND ARCHITECTURE DRIFT

A previous implementation included a temporary `better-sqlite3` approach in the frontend.

This is considered a **known architectural risk**, not automatically something to delete.

Before removing it:

1. search for every import,
2. identify every consumer,
3. determine whether it is dead code,
4. verify API replacement works,
5. remove only after verification.

---

# 9. ERROR HANDLING

Errors must be explicit.

Bad:

```text
catch → return []
```

if that makes an API failure look like an empty library.

Good behavior:

```text
API unavailable
→ explicit error state
→ useful developer log
→ user-friendly UI
```

Do not turn "network/API failure" into "there are no books."

---

# 10. PERFORMANCE

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

Do not optimize prematurely.

Measure first.

---

# 11. SEARCH AND SORTING

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

---

# 12. BOOK DETAIL ROUTING

A book detail route exists in the current project direction:

```text
/book/[id]
```

Before modifying it:

- inspect its current data fetching,
- verify the ID format,
- verify 404 handling,
- verify loading state,
- verify real API data,
- verify navigation from Library Room.

---

# 13. TESTING REQUIREMENTS

## Backend change

At minimum:

- start FastAPI,
- hit affected endpoint,
- verify HTTP status,
- inspect response shape,
- run relevant Python tests if present.

## Frontend change

At minimum:

- run the project's build/typecheck,
- open affected page,
- test success state,
- test loading state,
- test API failure state if applicable.

## Data integration change

Test:

```text
Database
→ API
→ frontend
→ UI
```

Do not stop at "the backend returned 200."

---

# 14. GIT DISCIPLINE

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

---

# 15. FILE CHANGE RULE

For every task the agent must report:

```markdown
Files modified:
- path — reason

Files created:
- path — reason

Files deleted:
- path — reason
```

If a file is unrelated to the task, leave it alone.

---

# 16. ANTI-PATTERNS

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

# 17. DEFINITION OF DONE

```text
[ ] Correct implementation
[ ] Relevant tests/build pass
[ ] API verified if relevant
[ ] UI verified if relevant
[ ] Git diff reviewed
[ ] No unrelated changes
[ ] No fake archive data
[ ] No silent error handling
[ ] SESSION_LOG updated
```

---

# END OF BUILD_GUIDE.md