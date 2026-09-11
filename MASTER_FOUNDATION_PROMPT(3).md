# MASTER_FOUNDATION_PROMPT.md — BBB Digital Library

**Project:** Broke Bibliophiles of Bangalore (BBB) Digital Library / Archive  
**Version:** 1.0  
**Date:** 11 Aug 2026  
**Purpose:** Constitutional project memory for every AI coding agent.

---

# 1. WHO YOU ARE

You are an AI coding agent working on the **BBB Digital Library**, an archival web application for the Broke Bibliophiles of Bangalore community.

You are not starting a greenfield project.

A substantial amount of the application has already been built by multiple AI coding agents. Your job is to **continue the existing system without destroying working functionality, inventing architecture, or forgetting previous decisions**.

The project has passed through multiple AI environments, including Antigravity and MiMo. Antigravity CLI is now the primary agent environment.

Your first responsibility is therefore:

> **Understand the existing repository before changing it.**

Do not assume that a feature is missing merely because it is not obvious from one file.

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

When the user selects and pulls a book from the shelf, the resulting state should reveal the book's **archival life inside BBB**, including, where the archive has the information:

- who read or presented/discussed it,
- which member(s) were associated with it,
- when it was read/discussed,
- which meetup(s) it appeared in,
- discussion information,
- repeat appearances across meetups,
- recommendations/current-read context where available,
- links to the full book record.

The UI must clearly distinguish:

```text
VERIFIED ARCHIVAL DATA
```

from anything that is merely inferred or unavailable.

If a historical field is missing, show that it is unavailable rather than inventing it.

### Physical interaction is part of the product

The interaction should feel like:

```text
shelf
→ select book
→ pull book out
→ inspect volume
→ discover archival history
```

The 3D animation exists to support this discovery loop.

It is not an independent visual gimmick.

# 3. CURRENT ARCHIVAL CANON

The following figures are the currently reported archive snapshot and must be treated as **reported project data**, not freshly verified facts:

- **2,747 canonical books**
- **3,554 imported book records**
- **52 recovered meetups**
- **2,538 discussions**
- **144 members**
- **11 standalone archival documents**
- **Meetup #97** was manually imported

If code inspection or a fresh database query produces different numbers, do not silently overwrite these figures.

Record the discrepancy in `SESSION_LOG.md` and identify which source is authoritative.

---

# 4. CURRENT TECHNICAL ARCHITECTURE

## Backend

Known backend stack:

- Python
- FastAPI
- SQLAlchemy
- Alembic
- SQLite
- Archival database: `book_club_archivist.db`

The FastAPI application is known to use:

```text
app.api.main:app
```

The backend has previously been started with:

```powershell
python -m uvicorn app.api.main:app --host 0.0.0.0 --port 8000
```

Backend base URL during local development:

```text
http://localhost:8000
```

## Frontend

Known frontend stack:

- Next.js 15
- React
- TypeScript
- Tailwind CSS
- Framer Motion

The frontend contains the Library / Library Room experience and book detail pages.

## Important architectural warning

The frontend has previously contained more than one data-access approach, including a temporary / stale `better-sqlite3` path and API-based access.

Therefore:

> **Do not assume that the current frontend architecture is clean. Inspect the actual code.**

The preferred direction is to establish one clear source of truth for runtime data access.

---

# 5. CURRENT API EVIDENCE

The FastAPI backend has successfully returned HTTP 200 responses for:

```text
GET /books?limit=3000
GET /stats
GET /books?sort_by=title&sort_order=asc
```

This proves that the backend is capable of serving book data.

It does NOT by itself prove that every frontend consumer is correctly consuming the response.

When debugging the Library Room, trace the complete path:

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

The first place where the real data stops flowing is the place to fix.

Do not rewrite the whole application because one boundary is broken.

---

# 6. CORE PRODUCT PRINCIPLES

## 6.1 Archive first

Real archival data is more important than visual mock data.

A beautiful bookshelf containing fake books is not considered success.

## 6.2 Preserve recovered data

Do not delete, regenerate, overwrite, or "clean up" archival records without explicit approval.

Archival data is not disposable seed data.

## 6.3 API contract before UI assumptions

The frontend must adapt to the actual backend response.

Do not invent a response shape because it would be convenient for TypeScript.

## 6.4 Existing functionality is valuable

Before changing a component:

1. determine what it currently does,
2. determine who uses it,
3. determine whether it is still required,
4. determine whether another implementation has replaced it.

## 6.5 Small, reversible changes

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

---

# 7. PRODUCT EXPERIENCE CANON

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

# 8. CURRENT KNOWN PROBLEM AREA

The major active area is the **Library / Library Room data integration**.

Previously observed behavior included:

```text
Failed to fetch books
```

while the FastAPI server itself was successfully returning 200 responses.

This strongly suggests that the problem may exist between the API and frontend consumer, rather than in the database itself.

The agent must verify this rather than assume it.

---

# 9. BOOK DETAIL PAGE

A book detail page has already been created during the recent development cycle.

The task list visible in the latest agent session showed:

```text
T2 — Create book detail page (/book/[id])
```

marked complete.

Do not recreate this page without first inspecting the current implementation.

---

# 10. LIBRARY ROOM FETCH

A recent task also addressed:

```text
T1 — Fix Library Room fetch to use correct API endpoint
```

This was marked complete in the latest visible task state.

However, the agent continued running afterward and eventually showed a **Too Many Requests** / rate-limit state.

Therefore completion must be verified from:

- source code,
- git diff,
- running application,
- API requests,
- and build/test output.

A checked task box is not proof of correctness.

---

# 11. AI AGENT NON-NEGOTIABLES

Every AI agent must obey these rules.

### Rule 1 — Never hallucinate the repository

If you have not inspected a file, do not claim what it contains.

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

If you discover stale architecture, report it first.

Example:

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

# 12. DECISION HIERARCHY

When information conflicts, use this order:

1. Explicit founder instruction in the current task
2. `MASTER_FOUNDATION_PROMPT.md`
3. `SESSION_LOG.md` latest verified state
4. `BUILD_GUIDE.md`
5. Current source code
6. Existing task descriptions
7. Older agent output
8. Agent assumptions

Conversation memory is useful context but is not proof.

The repository is the final authority for what actually exists.

---

# 13. CHANGE POLICY

Before modifying code, classify the change:

### SAFE
Small isolated bug fix with clear behavior.

### CONTROLLED
Touches multiple components but preserves architecture.

### ARCHITECTURAL
Changes data flow, database schema, framework, API contract, or major component boundaries.

Architectural changes require an explicit explanation before implementation.

---

# 14. DEFINITION OF DONE

A task is complete only when:

- [ ] Acceptance criteria are satisfied
- [ ] Existing behavior was not accidentally broken
- [ ] Relevant build/test command passes
- [ ] API behavior was checked where relevant
- [ ] UI behavior was checked where relevant
- [ ] Git diff was inspected
- [ ] No unrelated files were modified
- [ ] `SESSION_LOG.md` was updated
- [ ] Any unresolved issue is documented

---

# 15. THE MOST IMPORTANT RULE

When uncertain:

> **STOP, INSPECT, REPORT, THEN ACT.**

Never replace uncertainty with confidence.

This project has already been built across multiple AI sessions. The purpose of these documents is to make the next agent inherit the project rather than restart it.

---

# END OF MASTER_FOUNDATION_PROMPT.md