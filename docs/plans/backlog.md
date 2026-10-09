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

## Resolved by the architecture consult (2026-10-09)

Decisions with sources: `docs/architecture/imperative_decisions.md` §6. Founder answers: `FOUNDER_QUESTIONS.md`.

| Item | Resolution |
|---|---|
| R4 API: Swagger, flexibility, security | API standard in PRD §11 (D25); Swagger public for public routes, admin routes hidden (D26); post-quantum transport via the host's TLS (Vercel and Caddy offer X25519MLKEM768); passkeys classical for now (D32) |
| R5 Protect writes beyond CORS | Better Auth login + role check on every write in FastAPI (D5, D12); proxy hardening checklist (D35) |
| R6 Hosting and database | Vercel Hobby (frontend) + DigitalOcean BLR1 droplet (API, SQLite) (D1, D6); PostgreSQL only for RAG/MCP (D11) |
| F8 database in the public repo | Public by intent; privacy policy and removal on request (D8) |
| Fuzzy threshold 0.75 vs 85 % | Two bands: ≥ 0.90 likely, 0.75 to 0.90 possible (Q6) |
| Will full_import.py run again | Yes, later: fix the import defects, re-import into a scratch DB, diff against live (Q4) |
| Merge the 27 title and 106 author groups | Review queue, a founder approves each, aliases kept (Q10) |
| Deferred container rebuild | Moot for production (droplet); local docker is dev-only (Q3) |

Dead-code deletion list (1,050 lines, `docs/health/pattern_review_analysis.md` D1 to D23): **held until P4** (founders, 2026-10-09). Decide during the UI phase, when shadcn/ui replaces the old components. Nothing has been deleted. Note for that decision: D4 to D6 cover PRD §17.1 states, D21 `get_db` fits the router split (D12), and `@radix-ui/react-dialog` is also used by shadcn/ui.

## Launch gate (D31)

The public link is shared only after all of these are done:

- [ ] Login and role checks on every write (closes E1, E2)
- [ ] F1: cover download allow-list and scheme check (SSRF)
- [ ] F2: scheme check on stored links rendered as `href`
- [ ] F5: error envelope; no raw exception text to clients
- [ ] F6: backend container runs as a non-root user
- [ ] The 12-point proxy hardening checklist (`bbb-library-architecture.md`, D35)
- [ ] E6 and B1: a maximum `limit` on every list; fix the 6,278-query `/meetups` N+1
- [ ] Off-box backups and one timed restore drill (D33)
- [ ] S1 / A9: flush before reading `source.id`
- [ ] Privacy policy page linked from the footer (D8, DPDP)
- [ ] Core Web Vitals gate passing on mobile and desktop (D20)

Closed as moot, with a note in the finding: F3 (same origin through the proxy), F7 (frontend runs on Vercel), E7 (closes with login).

Everything else is bundled into the roadmap phase that touches the same files, highest FMEA risk first (`docs/health/report_insights.md` §10.8).

## Roadmap phases (2026-10-09)

| Phase | Work |
|---|---|
| P0 Safety and data | Off-box backup + restore drill; Alembic baseline stamp + drop `books`/`attachments` (Q9); A9; S2 (no writes on the public synopsis GET); restore the BBB 99 original and link its Source (Q1); remove the 74 duplicate July 2025 rows (Q5); assign meetup numbers #62, 63, 66, 67, 87 to 92 (Q8). Each data step: dry run, backup, founder approval |
| P0b Import fixes (Q4) | Fix C4 to C6, C8, K1/RC1 (two bands), RX1 to RX12, A3; re-import into a scratch DB; diff against live |
| P1 Deploy | Droplet, Caddy, Vercel rewrite + origin secret, cache headers, SOPS secrets; gzip in the first coding release (D22) |
| P2 Auth | Better Auth sidecar, `auth.db`, JWT check in FastAPI, router split by audience, login page, ALTCHA, audit log |
| P3 Presenter | `meetup_attendance`, `members.status`, presenter form with Goodreads autofill, idempotency keys, promotion prompt, statistics JSON, PDF from the form |
| P4 Mobile and UI | Design tokens + shadcn/ui + dark mode, command palette, Flow D with touch prefetch, PWA, adaptive tiers, Core Web Vitals in CI, Opengrep in CI |
| P5 Search and data | FTS5 search, genre facets, OCR into Layer 2, normaliser merge |

## Tool evaluation (PRD §7.1 first pass, 2026-10-09)

Licences from the GitHub API on 2026-10-09. "Admitted" still needs the full §7.1 critique before install.

| Tool | Licence | Verdict | Reason |
|---|---|---|---|
| Better Auth | MIT | Admitted | D5, D21 |
| PostHog | MIT outside `ee/` | Admitted (email, error tracking, flags) | D23; no product analytics on public pages |
| Serwist | MIT | Admitted | D17 |
| shadcn/ui, cmdk, lucide | MIT, MIT, ISC | Admitted | D13 |
| Caddy | Apache-2.0 | Admitted | Post-quantum TLS by default |
| SOPS + age | MPL-2.0 + BSD-3-Clause | Admitted | D7 |
| ALTCHA | MIT | Admitted | D28 |
| Opengrep | LGPL-2.1 | Admitted (CI) | D34 |
| perspective | Apache-2.0 | Admitted (admin desktop only) | D27 |
| Unstructured-IO | Apache-2.0 | Deferred to P5 (OCR into Layer 2) | Heavy dependency |
| glide-data-grid | MIT | Deferred | Canvas grid; only if admin tables need it |
| ClickHouse | Apache-2.0 | Deferred | D24 |
| Infisical | MIT outside `ee/` | Deferred | Needs Postgres + Redis; free cloud plan lacks audit log |
| Sentry | FSL-1.1 | Rejected | Fails the licence rule; PostHog covers errors |
| Clerk | Proprietary service | Rejected | D2 |
| Friendly Captcha | Widget MIT, service paid | Rejected | ALTCHA chosen |
| trillian | Apache-2.0 | Rejected | Hash-chained table chosen (D30) |
| ory/keto | Apache-2.0 | Rejected | Three roles fit in JWT claims |
| unpkg (runtime) | MIT | Rejected | D29 |
| OpenPanel | AGPL-3.0 | Rejected | Licence preference |
| Supabase, Pinecone, BullMQ + Redis, PgBouncer, Stripe, GoLogin | various | Not needed | SQLite on one droplet; non-commercial; out of scope |
