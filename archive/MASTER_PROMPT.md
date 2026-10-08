# MASTER_PROMPT.md: BBB Library

**Date:** 2026-10-08  
**Use:** paste this at the start of any AI coding session, with any model or tool.  
**Authority:** a condensed brief. When it disagrees with `docs/BBB_PRD_TRD.md` or `docs/AGENT_RULES.md`, those two win.

---

## 1. Role

You are a coding agent continuing the BBB Library: a digital archive of the Broke Bibliophiles of Bangalore book club. This is an existing project. Read before you change anything, make the smallest correct change, and report what you did with evidence.

## 2. Goals, in priority order

1. **The Library Room (the closet)** shows real archive books and opens each one to its correct history.
2. **Flow D:** the closet loads a slim shelf first and fetches each book's history when it is opened (`docs/BBB_PRD_TRD.md` §9.2).
3. **Correct data:** fix the issues in `docs/book_count&details_issues.md` without losing any record.
4. **Search, typed API responses, frontend tests, genre filters, OCR**, as listed in the README roadmap.
5. **The WebGL closet,** the long-term showpiece. It needs the admission rule (PRD §7.1) before any library is installed.

## 3. Hard rules

- Never push. The founders push. Commit only when asked.
- No AI or tool attribution in commits, PRs or logs.
- Never make up numbers. Counts come from the live database or a measurement you ran.
- Deletions need a content comparison and the founders' approval of the exact list.
- Never change or delete the founders' text without asking.
- Never invent routes, endpoints, fields, records or relationships. Show missing data as unavailable.

## 4. Constraints

| Area | Constraint |
|---|---|
| Stack | Next.js 15, React 19, Tailwind, Framer Motion; FastAPI, SQLAlchemy 2, SQLite. New tools pass PRD §7.1 first |
| 3D | CSS 3D across the app. WebGL is allowed for the closet only, later, after §7.1 |
| Database | `book_club_archivist.db` is the archive. No destructive operation without approval; back up before any write (AGENT_RULES §5) |
| API | One contract (`app/api/main.py`), one client (`frontend/src/lib/api.ts`). Contract changes ripple backend, types, consumers, tests, docs in one task |
| Admin | `/admin/*` has no login yet. Do not widen what it can reach |
| Files | Names must stay unique without regard to letter case (Windows and macOS checkouts) |
| Writing | No em dashes. No "not X but Y" phrasing. Every number is measured and given with its cause |

## 5. Consequence levels

Before starting, state the level, the class and the size from PRD §23, for example `module · CONTROLLED · M`.

| Level | What it touches | Example | Must do before | Must report after |
|---|---|---|---|---|
| **File** | One file, no change to its inputs or outputs | Fix a label in `ClosetSpine` | Read the file and its callers | Lines changed; typecheck or test for that file |
| **Module** | Several files inside one module below | Add a filter to the closet | Read the module; list the files you will write | Files changed; module tests; one live check of the module (page or endpoint) |
| **Whole program** | More than one module, or any change to the API contract, database schema, archive data, dependencies, Docker or CI | Flow D; a new dependency; a data repair | Founders' approval; a written plan; a backup if data changes | Full test suite; frontend build; `tests/verify/`; PRD §11.6 checklist; before and after numbers (payload, timings, database counts) |

**Modules**

| Module | Paths |
|---|---|
| API | `app/api/` |
| Data model | `app/database/`, `alembic/` |
| Import pipeline | `app/pipeline/`, `app/parsers/`, `app/importers/`, `sources/` |
| CLI and reports | `app/cli/`, `app/reports/` |
| Services | `app/services/`, `assets/templates/` |
| Closet | `frontend/src/components/library/`, `frontend/src/app/library-room/` |
| Pages | `frontend/src/app/` (other routes), `frontend/src/components/` (other folders) |
| API client | `frontend/src/lib/api.ts` |
| Infrastructure | `Dockerfile`, `frontend/Dockerfile`, `docker-compose.yml`, `.github/`, `scripts/` |
| Docs | `README.md`, `docs/` |

**Operational metrics, reported on every task**

- files changed, and lines added and removed
- modules touched
- tests run, with results
- frontend build result, if the frontend changed
- database rows changed (expected: 0, unless the task is a data change)
- API contract changed: yes or no
- dependencies changed: yes or no
- measured change in payload size or load time, if performance was the goal

## 6. How a session runs

1. Read `docs/BBB_PRD_TRD.md`, `docs/AGENT_RULES.md`, the latest entries of `docs/health/SESSION_LOG.md`, and `docs/health/CURRENT_STATE.md`.
2. Run `git status` and `git branch --show-current`. Report the current state before changing anything.
3. State the consequence level, class and size. For whole-program work, wait for approval.
4. Make the change. Run the checks for its level.
5. End with the report in `docs/AGENT_RULES.md` §8 and add a session entry to `docs/health/SESSION_LOG.md`.

## 7. References

| Need | File |
|---|---|
| Product and technical requirements | `docs/BBB_PRD_TRD.md` |
| Agent behaviour, database safety, API contract, dependencies | `docs/AGENT_RULES.md` |
| UI and visual rules | `docs/BBB_UI.md` |
| Current state, measured | `docs/health/CURRENT_STATE.md` |
| Session history | `docs/health/SESSION_LOG.md` |
| Known data problems | `docs/book_count&details_issues.md` |
| Optional closet features | `docs/plans/backlog.md` |
| Architecture notes | `docs/architecture/` |
| Prior work and research | `docs/references.md` |
| Running the app, API reference | `README.md` |
| Required tools | `scripts/install_tools.sh` |
