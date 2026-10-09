# OMEGA handoff (pending store)

> OMEGA (`omega-memory` MCP) was disconnected on 2026-10-09. When it reconnects (`/mcp`), store each entry below with `omega_store(content, type)`, check `omega_memory(similar)` and link related memories, then delete this file. Facts are dated and sourced; nothing here is new beyond the linked files.

## decision: BBB architecture consult (2026-10-09)
Decisions D1–D36 in `docs/architecture/imperative_decisions.md` §6:
- **Hosting:** Vercel Hobby for the frontend; DigitalOcean BLR1 1 GB droplet ($7.08/mo incl. GST) for FastAPI + SQLite.
- **Auth:** Better Auth (MIT) sidecar with a separate auth.db, passkeys (classical now), PostHog email.
- **Secrets and API:** SOPS + age for secrets; API split by audience; RTIH-style API standard in PRD §11.
- **Data:** one `meetup_attendance` table; presenter-confirmed promotion; SQLite + precomputed stats JSON (no Postgres, no ClickHouse).
- **Frontend:** CSS tokens + shadcn/ui; SemVer + CI build number; PWA (read-only offline + presenter drafts); Core Web Vitals gate.
- **Security and recovery:** ALTCHA; hash-chained audit log; RPO 24 h / RTO 4 h; Opengrep + CodeQL; 4.5 MB upload cap; DB public by intent.

## decision: founder answers Q1–Q10 (2026-10-09)
Details in `FOUNDER_QUESTIONS.md`, Answered table:
- **Q1:** restore the BBB 99 original fully and link its Source.
- **Q3:** moot.
- **Q4:** re-import later, after the import fixes.
- **Q5:** the #86 July 2025 file is real.
- **Q6:** two fuzzy bands (≥ 0.90, 0.75–0.90).
- **Q7:** case by case.
- **Q8:** #62, 63, 66, 67, 87–92 confirmed.
- **Q9:** baseline stamp + drop `books`/`attachments`.
- **Q10:** review queue, a founder approves each merge.

## user_preference: consult sessions
Cover every founder-listed source, tool and question before planning. Use option menus for every big choice. Cite sources. Licences must be MIT-like or forkable and free long term.

## decision: 30-hour launch goal (2026-10-09 22:06 IST)
Functional, accessible, production- and test-ready by **2026-10-11 04:06 IST**. The launch gate is in `docs/plans/backlog.md`. Commits `5f0b33b`, `292559b` were pushed by the founder.
