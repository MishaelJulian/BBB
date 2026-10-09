# Launch plan: 30 hours

> **Goal (founders, 2026-10-09 22:06 IST):** functional, accessible (WCAG 2.2 AA on public pages), production- and test-ready by **2026-10-11 04:06 IST**.
> **Scope:** the full launch gate (`docs/plans/backlog.md`), including Better Auth. The presenter form, PWA and theming come after.
> Decisions: `docs/architecture/imperative_decisions.md` §6. Runtime design: `docs/architecture/bbb-library-architecture.md`.
> Tick each box when done and verified; record the commit hash.

## Cut from the 30-hour gate (founders, 2026-10-09)

Deferred, not dropped:
- passkeys (launch with email + password);
- the hash-chained audit log (plain who/when logging of writes instead);
- rate-limit headers (basic per-IP limiting stays);
- Opengrep in CI;
- the full WCAG audit (launch covers the closet keyboard path and labels; contrast and motion come after).

## Founders' checklist (only you can do these)

- [ ] **Vercel:** sign up at vercel.com with the GitHub account that owns `MishaelJulian/BBB` (Hobby plan); import the repo; set the root directory to `frontend`.
- [ ] **DigitalOcean:** sign up, add a card, create a droplet: Ubuntu 24.04 LTS, Basic, Regular, 1 GB / 25 GB ($6 + GST), region **Bangalore (BLR1)**, SSH key login only (no password). Send me the droplet's IP.
- [ ] **SSH key:** if you have none, run `ssh-keygen -t ed25519` and paste the `.pub` file into DigitalOcean when creating the droplet.
- [ ] **DNS (later, needed for email):** ask the club domain's manager to add the SPF/DKIM/DMARC records PostHog shows, plus an `api` A record pointing at the droplet if a club subdomain is used.
- [ ] **PostHog:** sign up (free); create a project; add the sending domain once DNS is possible.

## Build order (each step: tests green, then commit)

| # | Step | Closes | Status |
|---|---|---|---|
| T0 | Backup script for both databases (`sqlite3 .backup`), restore drill on a scratch copy, timed | D33, launch gate | [x] `scripts/backup_db.py`; drill 0.15 s, all table counts match (2026-10-09). Off-box copy + cron: T4 |
| T1 | API safety: one error envelope (F5), list `limit` cap (E6), `/meetups` N+1 fix (B1), gzip (D22), F1 cover allow-list, F2 link scheme check, security headers, tightened CORS, simple per-IP rate limit | F1, F2, F5, E6, B1 | [x] 2026-10-09: `/meetups` 6,278 queries / 6.89 s down to 6 / 0.29 s (identical output); 40 tests pass; F6 moves to T4 |
| T2 | Auth: Better Auth sidecar (`auth/`, own `auth.db`), email + password (passkeys deferred), plain who/when write log, JWT plugin (JWKS); FastAPI verifies tokens; router split by audience (public / admin / health); every write needs role `admin` or `presenter` | E1, E2, D5, D12 | [ ] |
| T3 | Frontend: login page; admin pages gated; error and loading states (PRD §17.1); keyboard-reachable closet (R1 to R4) + labels; privacy page + footer link; footer version (SemVer + build number) | WCAG AA, D8, D14 | [ ] |
| T4 | Deploy: non-root backend image (F6), production compose (API + auth + Caddy), Caddyfile (TLS, origin-secret check), `vercel.json` (rewrites + origin secret header + no caching of auth/admin), SOPS + age secrets | D1, D6, D7, D35 | [ ] |
| T5 | Tests: pytest kept green; Playwright smoke (closet opens, pull a book, book page, API failure state, login); React Testing Library closet test; axe checks on public pages; CI updated | D20, D34 | [ ] |
| T6 | Club test: test URL, phone checklist (Android Chrome, iPhone Safari), feedback channel | Testing | [ ] |

## Known constraints

- **Email depends on DNS.** Decided: admin-managed accounts at launch. No public sign-up; the first admin is created by a one-time server command; admins create presenter accounts with temporary passwords and reset forgotten ones. Email reset switches on when the club domain's records are in.
- **Database rules:** back up before any write; dry run first; founder approval for data changes (PRD §5.2).
- The founders push. No AI attribution in commits.
