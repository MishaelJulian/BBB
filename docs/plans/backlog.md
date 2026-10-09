# Backlog

## Optional closet features

Ideas carried over from the earlier Library Room (`archive/docs-v1/VirtualLibraryRoom.tsx` and its components in `frontend/src/components/library/`). The live closet (`CriterionBookCloset`) does not have them yet. All are optional; each one passes the rules in `docs/BBB_PRD_TRD.md` before it is built.

Measured on 2026-10-08 (development mode, median of 3 loads, same data): the live closet showed its first 50 spines in 6.8 s against 7.9 s, used 4,530 page elements against 7,056, and 57.6 MB of memory against 86.0 MB. It stays the base; these ideas are additions to it.

| # | Feature | Where it came from | Notes |
|---|---|---|---|
| 1 | A to Z index: jump straight to a letter | `AlphabetNav.tsx` | Needs a mapping from letter to closet section, since the closet pages 360 books at a time |
| 2 | "Most discussed volumes" shelf as a curated opening | `VirtualLibraryRoom.tsx` (Bay 1) | Uses `discussion_count`, already in the book list |
| 3 | Lighting moods: afternoon, candlelight, morning, midnight | `AmbientLighting.tsx` | The founders have tabled a separate discussion on lighting (PRD §2A); decide together |
| 4 | Mount shelves only when they scroll into view | `ShelfBay.tsx` (`IntersectionObserver`, 800 px margin) | Only useful if the closet moves from paging to scrolling |
| 5 | Hardcover book look: cloth texture, page block, pull-out | `Book3D.tsx` | Reference for the WebGL closet (PRD §18.1) |

When a feature ships, move it out of this table and record it in `docs/health/SESSION_LOG.md`.

## Architecture research and contention (founder review 2026-10-09)

Open items from the review of `docs/architecture/`. Each one touches the database, the API and the future OCR step, so each gets its own research pass before any schema change.

| # | Item | Why it matters | Where |
|---|---|---|---|
| R1 | Book identity from real-world rules: ISBN rules and procedures (ISO 2108, International ISBN Agency user manual) and legal book-naming practice | An ISBN identifies one edition and format of a book, and the archive tracks the work. Attributes of a book should come from these published rules instead of the current hand-made field and validation list. Deferred to save time; revisit before OCR, since OCR output must map onto these attributes | FRBR answer in `flow_comparison.md` §6.2 item 4. `imperative_decisions.md` §2.A.3 to §2.A.4 |
| R2 | Faster duplicate matching | Today `app/pipeline/full_import.py` compares each new title against canonical titles of similar length with `difflib.SequenceMatcher`, so cost grows with books times canonical books. Needs an indexed approach (blocking key, trigram index or similar) chosen under PRD §7.1 | Blocking method in `flow_comparison.md` §6.1 item 2. `imperative_decisions.md` §2.A.5 |
| R3 | Recommendation, current read and mention taxonomy as a long-lasting recommendation feature | Point of contention: it is the base for recommendations and must stay fast as books grow. Tables exist with 0 rows (API backlog A7) | Co-discussion method in `flow_comparison.md` §6.2 item 6. `imperative_decisions.md` §2.D |
| R4 | API: Swagger docs, flexibility, security | FastAPI already serves Swagger UI at `/docs` and the schema at `/openapi.json`; Pydantic response models (build phase) make them accurate. Quantum-resistant security belongs to the TLS layer of the host (hybrid post-quantum key exchange), independent of REST or GraphQL; confirm on the chosen host | `bbb-library-architecture.md` |
| R5 | Protect writes beyond CORS | CORS only limits which browser pages may call the API; it does not stop other clients. Admin login (P12) and the database backup rule protect create, update and delete | `bbb-library-architecture.md` |
| R6 | Hosting and database | Founder position: SQLite stays for simplicity; PostgreSQL when statistics, RAG or MCP work needs it (SQLAlchemy makes it a connection-string change plus a data migration). Vercel for testing and demo; final home is the project's own website | `bbb-library-architecture.md` |

## Open decisions from the reviews (2026-10-09)

Source: `docs/health/security_analysis.md`, `docs/health/pattern_review_analysis.md`, `docs/health/report_insights.md` §10.8.

Open decisions from the reviews:
- F8: the database is in the public repo.
- The dead-code deletion list (1,050 lines).
- Whether to merge the 27 title and 106 author duplicate groups (C1).
- The fuzzy threshold: 0.75 in the code vs 85% in the spec.
- Whether full_import.py will run again. If yes, fix C4–C6, C8 and K1 first.
- The deferred container rebuild.
