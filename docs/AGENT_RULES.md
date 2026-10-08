# AGENT_RULES.md: BBB Digital Library

**Project:** Broke Bibliophiles of Bangalore (BBB) Digital Library / Archive  
**Version:** 1.0 (combines `AGENT_PLAYBOOK.md` v1.0 and `BBB_RULES.md` v1.0)  
**Date:** 8 Oct 2026  
**Purpose:** How any AI coding agent works on this repository.

`BBB_PRD_TRD.md` is the main document and comes first. This file covers only how agents behave; product and technical requirements live in the PRD and are not restated here, except where the founders asked for detail in both (§5–§7).

---

# 1. ORDER OF AUTHORITY

When sources conflict:

1. Explicit founder instruction in the current task
2. `BBB_PRD_TRD.md`
3. `AGENT_RULES.md` (this file)
4. `BBB_UI.md`, by relevance to the task

The remaining sources (session log, source code, older task descriptions, older agent output, assumptions) follow in the order given in `BBB_PRD_TRD.md` §22.

If sources conflict, report the conflict instead of picking silently.

---

# 2. HARD RULES

These are never broken.

- **No AI or tool attribution.** Never add AI or tool attribution to commits, PRs or logs (no `Co-Authored-By` lines, no "generated with" footers, no agent names as authors).
- **Commit only when asked; founders push.** Agents never run `git push`. The founders push manually. Agents also never force-push, rewrite shared history, or merge branches without approval.
- **Never make up stats.** Counts shown in the UI or written in docs come from the live database. If a number cannot be computed, say so.
- **Deletions need a content comparison and the founders' approval of the final list.** Compare by content, list exactly what would be deleted, and wait for approval of that list.
- **Never change or delete the founders' text without asking.** This includes notes, docs and comments the founders wrote. Fixing obvious typos must be stated.
- **Keep `index.md` true.** Adding, moving, renaming or archiving a doc or a top-level folder updates `index.md` in the same commit.
- **Never invent project state or archive data.** Do not claim a route, endpoint, table, component, dependency, data field or working integration exists unless you inspected it. Never invent meetup attendance, who read a book, dates, recommendations, authors, book metadata, or relationships between people and books. If information is unavailable, show it as unavailable.

---

# 3. SESSION START

At the start of a session, read:

```text
1. index.md (where everything lives)
2. docs/BBB_PRD_TRD.md
3. docs/AGENT_RULES.md
4. docs/health/SESSION_LOG.md (latest entries)
5. relevant source files
6. the task specification
```

Do not read the entire repository blindly unless performing an explicit audit.

Then inspect:

```text
pwd
git status
git branch --show-current
project tree
package files (frontend/package.json, requirements*.txt)
relevant source
```

Report the current state before changing anything:

```markdown
## Current State
Backend: ...
Frontend: ...
Database: ...
Library Room: ...
Book detail: ...
Known issue: ...
Last completed task: ...
Next intended task: ...
```

When resuming existing work, answer first:

```text
WHERE WERE WE?
WHAT IS WORKING?
WHAT IS BROKEN?
WHAT CHANGED?
WHAT WAS VERIFIED?
WHAT WAS ONLY CLAIMED?
WHAT IS NEXT?
```

---

# 4. TASKS

## 4.1 Task format

```markdown
# Task: <short title>

## Context
What currently exists.

## Problem
What is wrong.

## Expected behavior
What should happen.

## Classification
SAFE / CONTROLLED / ARCHITECTURAL · size XS / S / M / L   (see BBB_PRD_TRD.md §23)

## Acceptance criteria
- [ ] ...

## Files to inspect
- ...

## Files allowed to modify
- ...

## Out of scope
- ...

## Verification
- ...
```

## 4.2 Agent roles

| Role | Use for | Constraint |
|---|---|---|
| Architect | Architecture decisions, API boundaries, database changes, major refactors | Read-only by default |
| Backend Engineer | FastAPI, SQLAlchemy, database, API endpoints, archival data | Must verify actual database/API behaviour |
| Frontend Engineer | Next.js, React, TypeScript, Library, book detail, visual components | Must verify the backend contract before changing data consumers |
| UI / Interaction Engineer | Library Room, 3D book behaviour, animations, shelf interactions, responsive behaviour | Must not change data architecture to make a visual component easier |
| Debugger | Errors, failed fetches, broken routes, runtime and integration problems | reproduce → trace → root cause → smallest fix → implement → verify |
| Reviewer | Acceptance criteria, architecture, API contract, regressions, unnecessary changes, hallucinated assumptions | Read-only |

---

# 5. DATABASE SAFETY

The archive (`book_club_archivist.db`, SQLite, tracked in git) is the project's most valuable asset. Treat every row as irreplaceable.

## 5.1 Never, without explicit founder approval

```text
DROP
TRUNCATE
mass DELETE / mass UPDATE
regenerating the archive
```

- Do not destroy or rewrite source records to solve a UI problem.
- Do not delete records to make a test pass.
- Do not modify historical records without documenting why.

## 5.2 Known destructive paths

| Path | What it does | Rule |
|---|---|---|
| `archive reset-db` (`app/cli/main.py`) | `reset_db()`: `drop_all` + `create_all` on the live DB, no confirmation, no backup | Never run on the live DB |
| `archive import-full --reset` | Same `reset_db()` before re-importing | Never run on the live DB; import into a scratch DB and diff |
| `docs/plans/sprint_1c_implementation.md` Q5 | Justifies `drop_all` because "the DB has 0 records" | Expired assumption; the DB now holds the archive |

Tests are safe: `tests/conftest.py` uses an in-memory SQLite engine (`sqlite:///:memory:`), never the archive file.

## 5.3 Before any write to the archive

1. Back up the file: copy `book_club_archivist.db` to a timestamped copy outside git, or confirm the last commit holds the current state.
2. Run the change as a dry run first and report what would change (counts per table).
3. Get founder approval for anything beyond a single, targeted record fix.
4. Apply.
5. Verify counts before vs after, and re-check affected API routes.
6. Record the change in `docs/health/SESSION_LOG.md`.

## 5.4 Migrations

Alembic is configured but not in use: the migration folder is empty and the schema comes from `Base.metadata.create_all`. Until that changes, every schema change follows the migration checklist in `BBB_PRD_TRD.md` §5.2 by hand, and is classified ARCHITECTURAL.

---

# 6. API CONTRACT

The frontend and backend share one contract: FastAPI routes in `app/api/main.py`, consumed through the single client `frontend/src/lib/api.ts`.

## 6.1 Before adding or changing an endpoint

- Search `app/api/main.py` for an existing route first. Several routes have both `/x` and `/api/x` forms.
- Inspect the actual JSON from a running server as well as the code: status, top-level shape, field names, nullability, nested objects, pagination, ordering, error structure.
- Compare with the TypeScript types in `frontend/src/lib/api.ts`.
- There are no Pydantic response models on the routes today, so the response code is the contract. Read it.

## 6.2 Never

- silently change a response shape,
- invent fields or endpoints because they "sound right",
- fix a mismatch with `as any` or blind casting,
- add a second API client (`frontend/src/data/archive.ts` was the duplicate; it is archived),
- duplicate a business rule in both backend and frontend.

## 6.3 When a contract must change

Change it in this order, all in the same task:

```text
backend route
→ types / schema
→ every consumer (search all usages)
→ tests
→ documentation (BBB_PRD_TRD.md §10–§11)
```

A contract change is ARCHITECTURAL (`BBB_PRD_TRD.md` §23) and needs explanation before implementation.

## 6.4 Visual components

Visual components do not invent API behaviour. When one needs data or performance the API does not give, the agent proposes an API change and expects pushback (`BBB_PRD_TRD.md` §12.1).

---

# 7. DEPENDENCIES

Every new dependency passes the admission rule in `BBB_PRD_TRD.md` §7.1: critiqued against the current stack, every critique resolved, or it is rejected.

Before proposing one:

1. Inspect `frontend/package.json` and `requirements.txt` / `requirements-api.txt`.
2. Check whether the existing stack already solves the problem (standard library, platform feature, installed package).
3. Assess bundle size and runtime performance impact, especially for the Library Room.
4. Pin a specific version; never blindly install `latest`.
5. Record the critique, resolutions and verdict.

Automated updates:

- Dependabot opens one grouped PR per ecosystem (pip, npm, github-actions) every 3 days.
- The dependency-review workflow fails a PR that adds a dependency with a **high** severity vulnerability.
- Major-version bumps in a grouped PR are reviewed separately before merging; never merge them blind.

Never mix a dependency upgrade with a bug fix, refactor or redesign in one task.

---

# 8. END-OF-TASK REPORT

Every coding task ends with:

```markdown
## Status
SUCCESS / PARTIAL / BLOCKED / FAILED

## What changed
- ...

## Root cause
- ...

## Verification
- Command:
- Result:

## Files
Modified:
- path: reason
Created:
- path: reason
Deleted:
- path: reason
Intentionally not changed:
- path: reason

## Risks
- ...

## Remaining work
- ...

## SESSION_LOG
Updated / Not updated
```

If a file is unrelated to the task, leave it alone.

## 8.1 Review mode

When asked to review, do not modify files. Return:

```markdown
## Verdict
APPROVED / CHANGES REQUESTED

## Findings
### Critical
### Important
### Minor

## Evidence
file:line

## Recommendation
```

---

# 9. SESSION HANDOFF

At the end of every meaningful session, update `docs/health/SESSION_LOG.md` with:

- current state,
- what was inspected,
- completed work,
- unfinished work and remaining failures,
- known bugs,
- exact files changed,
- commands and tests run, and what was verified,
- git state (branch, unpushed commits and why they are unpushed),
- decisions made and important discoveries,
- next recommended task.

The next agent must be able to continue without the previous conversation.

---

# END OF AGENT_RULES.md
