# BBB Architecture Consult: Main Docs vs Revision Requests

## Context

BBB Digital Library is being built for Broke Bibliophiles Bangalore's 100th meetup. It launches first as a Vercel demo, then moves to the club's own website. It will be used mostly in Android mobile browsers, desktop matters equally, and dark mode is planned.

There are seven main architecture docs, and they disagree with each other and with the code. The founders' revision requests add things the docs never planned for:
- user modes: public and presenter/admin;
- a presenter meetup form;
- a scorecard/stats page, gallery and about pages;
- a command palette, a header and footer, and a version scheme;
- Google Forms sync, Goodreads autofill and member promotion;
- OCR, search and genre facets.

Goal of this session: consulting, not code.
- For each main doc, identify which aspects hold up and which need revision against the revision requests, the evidence files and future modularity.
- Present every architectural choice to the founders as options; decide nothing alone.
- Output: a doc-revision plan plus a decision log. No code changes this session.

## Findings: docs vs code (verified 2026-10-09, read-only)

| Fact | Docs say | Code / live DB says |
|---|---|---|
| Book table | DatabaseSchema: `books` with author_id etc. | `books` exists with 0 rows and no ORM class (legacy); the real table is `canonical_books` (2,783 rows) |
| Entity count / path | domain_model: 21 entities in `bbb-library/backend/app/models/` | 25 classes in `app/database/models.py`; that path does not exist |
| Fuzzy rule | domain_model, imperative §2.A.5: ≥85 % Levenshtein | `full_import.py:462`: SequenceMatcher ≥ 0.75; it never runs (RC1) |
| Meetup number | imperative §2.B: required, unique | Same in the model (`nullable=False, unique=True`); A6 needs nullable |
| Archive counts | PRD §4: 2,747 books / 52 meetups / 2,538 discussions / 144 members | Live: 2,783 / 53 / 2,686 / 174 (99 meetups held in real life) |
| API style | architecture: REST, no GraphQL | imperative §4: REST + GraphQL, `/api/v1`, PostgreSQL, Next 14 (roadmap) |
| Enrichment | universal_app_flow: OpenLibrary, Google Books | Code: Goodreads and Apple covers |
| Auth | architecture: "CORS enabled"; PRD §7.0: admin has no login | No users or roles table; CORS is the only boundary |
| Theming | PRD §6: closet look only | Tailwind config has no dark-mode tokens; deps: framer-motion, radix dialog, cva |
| Pages | — | `admin, authors, books, library, library-room, meetups, members`; no about, gallery or scorecard |

## Per-file assessment (aspects, not verdicts)

**BBB_PRD_TRD.md** (authority #2)
- Holds up:
  - §2A introducer formula;
  - §5 data preservation;
  - §7.1 admission rule;
  - §9 trace;
  - §21–23 agent rules and change policy.
- Needs revision:
  - no actors or roles (public vs presenter/admin);
  - no deployment or runtime section (Vercel, mobile-first, responsive, dark mode);
  - §3 priorities miss the Presenter module and the scorecard;
  - §4 counts are stale (log the discrepancy, do not overwrite);
  - §6 and §12 have no theming or design-token layer, which the future UI work needs;
  - §18 has no mobile performance budget;
  - §11 is already marked for replacement.

**bbb-library-architecture.md**
- Holds up: the n-tier model with one API boundary.
- Needs revision:
  - the endpoint table lists 7 of about 33 routes;
  - there is no trust boundary (public vs admin);
  - "Next.js UI only" blocks server-rendered public pages, which suit Vercel and mobile;
  - the deployment section is vague.

**DatabaseSchema.md**
- Weakest file. It describes the legacy `books` table and omits venues, imported_books, possible_duplicates and the meetup photo/pdf fields.
- Proposal: generate it from the models (single source), plus a "planned tables" section.

**domain_model.md**
- Holds up: the three-layer model (fits OAIS SIP/AIP/DIP).
- Needs revision:
  - wrong path and entity count;
  - the threshold claim;
  - no Attendance (attended without discussing), Registration (Google Forms), User/Role or member-promotion rule (≥2 attendances + WhatsApp);
  - the promotion rule itself needs a decision.

**flow_comparison.md**
- Holds up: strong analysis.
- Needs revision:
  - it covers only the read path; it needs a write path (presenter form) and a stats/scorecard compute path;
  - the Flow E threshold should be tied to a mobile network budget;
  - §6.2 item 9 says SQLite suffices for stats, which challenges the founder premise "Postgres for stats" (raise it as a question).

**imperative_decisions.md**
- Holds up: §2 entity specs (required by the founders).
- Needs revision:
  - meetup_number non-null (A6);
  - Source.raw_text "exact substring" vs the 2,000-char cut (A2);
  - §4 roadmap stack (Postgres/GraphQL/Next 14) conflicts with the architecture doc;
  - §5 "Sprint 1A complete" is stale;
  - it has no decisions yet on auth, hosting or the presenter inflow, so it should become the decision log.

**universal_app_flow.md**
- Holds up: the logical pipeline is sound as a target.
- Needs revision:
  - it lacks a structured-entry inflow (the presenter form skips Extract and Normalize-from-text);
  - it lacks an explicit review-queue step before storage;
  - it lacks a dissemination step (precomputed stats/timeline);
  - its enrichers are wrong;
  - remove "enterprise-grade".

## Systems map (thinking-systems)

```text
boundary: a club meetup happens → a record exists → readers and members explore it (public) / the presenter records it (admin)
stocks_flows:
  canonical records ← import (PDF parse, error rates 20/50/63 %) | future presenter form
  duplicate debt (27 title / 106 author groups) ← bad parses, drained only by manual repair
  provenance gaps (52/53 meetups without source_id) ← S1 bug
  doc drift (7 docs, conflicting) ← every session adds explanations
  open founder questions (87)
  shelf payload ≈ N × r ← grows with every meetup
loops:
  - R1 doc drift: conflicting docs → agent follows one → code diverges → new doc explains → more conflict (reinforcing; delay: session to session)
  - R2 data debt: unstructured input → parse error → title-only merge "fix" → wrong merges / lost discussions → repair scripts (reinforcing)
  - B1 review queue: duplicates → PossibleDuplicate → human review (balancing; BROKEN: RC1 means it never fires)
  - R3 participation (desired): presenter records meetup → live scorecard → members see themselves → engagement → more data
  - Limit: N grows → mobile first-load time → Flow D, then E
archetype: Shifting the Burden. Bulk PDF parsing plus repair scripts stand in for the fundamental fix: data born structured at the source
structural_driver: data enters as unstructured documents after the fact, and no single doc owns each concern, so every fix stays local and drifts
interventions_ranked:
  - goals: the presenter form becomes the primary inflow from meetup 100; PDFs/OCR become historical backfill into Layer 2 only
  - rules: one owner doc per concern; schema doc generated from the models; imperative_decisions becomes the decision log
  - loops: restore B1 (RC1 fix) and route every inflow (form, import, OCR, LLM) through Layer 2 review
  - structure: a trust boundary, public read API vs authenticated write API (this is where the router split earns its keep)
  - params: gzip, cache TTLs, Flow D payload
chosen: goals + rules (pending founder answers)
watch: new meetups need 0 repair rows; doc conflicts count drops to 0; public pages never call write routes
```

## Decisions taken (round 1, 2026-10-09)

| # | Decision | Founder answer |
|---|---|---|
| D1 | Hosting | Split host: Vercel for the frontend, the API + SQLite on a VPS. Research Vercel docs pro/con and VPS options |
| D2 | Auth | Clerk vs Auth.js researched with sources. New rule: every tool must be free long term, MIT (or similar) or forkable, with visible source |
| D3 | Docs | One owner per concern |
| D4 | Inflow | Both, form first: the presenter form is primary, the PDF is generated from the form, and the parser is kept for old files |

## Research (sources verified 2026-10-09)

**Vercel Hobby (free)**
- Non-commercial personal use only. "Commercial" means financial gain for anyone involved: payments, ads, selling a product or service, paid developers. Donations are allowed.
- Limits:
  - 100 GB Fast Data Transfer;
  - 10 GB Fast Origin Transfer;
  - 1M function invocations;
  - 4 active CPU-hrs;
  - **5,000 image transformations a month**;
  - function max 300 s;
  - 4.5 MB request/response body.
- If a limit is exceeded, the feature pauses for up to 30 days.
- Functions run in `iad1` (US East) by default.
- Python/FastAPI runs as functions, but there is no persistent disk.
- Sources: vercel.com/docs/plans/hobby, /docs/limits/fair-use-guidelines, /docs/functions/limitations, /docs/functions/runtimes/python, /legal/terms

**Auth options against the licence rule**

| Option | Licence | Status | Free long term? | Fits rule? |
|---|---|---|---|---|
| Clerk | SDK MIT; the service is proprietary SaaS | Active | Free tier has 50K users, but **MFA and passkeys need Pro ($25/mo)**; custom roles are a $100/mo add-on | **No** (can't fork the service; 2FA is paid) |
| Auth.js (NextAuth) | ISC (permissive) | **Maintenance mode** since 2025-09-22 (security fixes only); maintainers tell new projects to use Better Auth | Yes | Partly (frozen) |
| Better Auth | MIT; ~30K stars; active (pushed today) | Joined Vercel 2026-07-07 ("committed to keeping auth open source"; no written licence guarantee) | Yes | **Yes**; the MIT code stays forkable whatever happens later |
| Python-side (FastAPI) | Authlib BSD-3 (active); fastapi-users MIT (maintenance mode) | — | Yes | Yes |

- Better Auth's JWT plugin publishes a JWKS endpoint (EdDSA/Ed25519), so FastAPI can verify tokens without calling back.
- Sources:
  - better-auth.com/blog/authjs-joins-better-auth
  - better-auth.com/blog/better-auth-joins-vercel
  - better-auth.com/docs/plugins/jwt
  - clerk.com/pricing
  - GitHub API licence fields
  - supastarter.dev/blog/better-auth-vs-nextauth-vs-clerk
  - makerkit.dev/blog/tutorials/better-auth-vs-clerk

**VPS / backend host**

| Host | Persistent disk | Cost | Catch |
|---|---|---|---|
| Render free | **No** (data lost on spin-down; sleeps after 15 min, about 1 min to wake) | 0 | Unusable for SQLite |
| Fly.io | Volumes $0.15/GB-mo | No free allowance for new orgs (trial: 2 VM-hrs or 7 days) | Pay as you go |
| Oracle Always Free | Yes | 0 | Cut to 2 OCPU / 12 GB on 2026-06-15 without notice; idle reclaim after 7 days at low use |
| Hetzner CX22-class | Yes | About $4.6–8/mo, **hourly billing** (good for a one-day event) | Prices changed 2026-04-01; Singapore is the closest region |

## Pre-mortem (thinking-pre-mortem): "April 2027, the split-host launch failed"

**Top risks (likelihood × impact):**

1. **Meetup data lost.** The VPS or its disk died, or a rebuild dropped the -wal file (DB4), with no off-box backup. Prevention:
   - nightly `sqlite3 .backup` copied off the box;
   - mount the whole data dir (not just the db file);
   - a restore drill before launch.
2. **Presenters can't log in on Android.** The auth cookie was cross-site (`*.vercel.app` vs the API host), and the browser blocked third-party cookies. Prevention:
   - serve both under the club's domain (`app.` + `api.`), or proxy `/api` through Next.js rewrites so the browser sees one origin;
   - test the login on real Android Chrome before launch.
3. **Covers broke mid-month.** `next/image` on about 2,000 covers burned the 5,000 Hobby image transformations. Prevention:
   - covers served unoptimized, or from the VPS cache;
   - gate: an image-transform count check in the Vercel dashboard after the demo.
4. **Slow pages in Bangalore.** Vercel functions in `iad1` (US) fetched from an Asian VPS, so every SSR request crossed the Pacific twice. Prevention: set the function region to `bom1`/`sin1`, matching the VPS region; measure TTFB from an Indian mobile.
5. **Project disabled.** The site added sponsorship, ticketing or sales, which breaks Hobby's terms. Prevention:
   - a rule in the PRD: no payments, ads or sales on Hobby;
   - move to Pro or the own host before any of that.

Also noted:
- the database is still in the public repo (F8);
- the 2 MB closet payload has no gzip (A3);
- single-writer SQLite is fine at club scale;
- VPS patching and SSH exposure need a hardening checklist.

## Round 2 answers (2026-10-09)

- Rendering: **split by page type** (public pages server-rendered and cached, refreshed on presenter save; closet stays a browser app on Flow D; admin runs in the browser behind login).
- Domain: the demo stays on Vercel plus a VPS. The club site supplies content only (about page) for now.
- Auth: wants the industry standard, PostHog email for registration links, admin oversight of secrets, quantum-resistant transport, passkeys. Not for profit.
- VPS: wants external audits and regulatory compliance. Must run longer than the event.

## Round 2 research (sources verified 2026-10-09)

**Industry pattern for a separate API.** OAuth2/OIDC "resource server": an auth service issues signed tokens and the API verifies them against the issuer's JWKS.
- Better Auth's JWT plugin does this (Ed25519, `/api/auth/jwks`).
- Its passkey plugin is built on SimpleWebAuthn.

**PostHog email**
- Workflows' email channel sends transactional messages.
- 10K emails a month free, then $0.003 each.
- **Needs a verified sending domain (SPF/DKIM DNS records)**. A `*.vercel.app` address cannot send mail, so the club needs a domain it controls for this.
- PostHog code is MIT outside `ee/`.

**Quantum resistance**
- Browser ↔ Vercel: Vercel offers X25519MLKEM768 (Chrome 131+, Firefox 132+, Safari/iOS 26+).
- Vercel ↔ VPS: Caddy 2.10+ (Apache-2.0) offers X25519MLKEM768 by default; nginx does with OpenSSL 3.5+. Whether Vercel's outbound proxy offers it is **unverified** (check with a TLS log on the VPS).
- Hybrid ML-KEM became an IETF RFC (RFC 10024, August 2026).
- **Caveat:** passkeys sign with classical ECDSA/Ed25519; no post-quantum WebAuthn is deployable yet. Transport is PQ-protected; the signatures are not.

**Proxy through Next.js/Vercel rewrites, security review**
- It is first-party for the browser, so the login cookie works on both Android Chrome and Safari (no third-party-cookie blocking). This is safer than calling the API across sites.
- Risks and gates:
  1. **CDN caching of private data.** Projects created after 2026-04-06 cache external rewrites by default when upstream sends cache headers. The API must send `Cache-Control: private, no-store` on auth and admin routes, or turn rewrite caching off for `/api/admin/*` and `/api/auth/*`.
  2. **Origin bypass.** Anyone can hit the VPS directly. Use Vercel's `x-origin-secret` header transform, and reject requests without it (timing-safe compare).
  3. **IP spoofing.** Trust `x-forwarded-for` only on requests carrying the origin secret, or rate limiting can be dodged.
  4. **Middleware-only auth.** CVE-2025-29927 bypassed Next.js middleware; enforce auth in FastAPI on every write and never in middleware alone.
  5. Vercel terminates TLS, so Vercel sees the traffic in plaintext; that rests on its SOC 2 Type 2 / ISO 27001:2022 attestations.

**Law and audits**
- GDPR binds only if EU residents' data is processed.
- **India's DPDP Rules 2025** (notified 2025-11-13) apply to anyone processing personal data in India, with no size exemption. The main duties (notice, consent, erasure, breach notice) apply from about May 2027 (18 months).
- This drives:
  - the privacy policy in the footer;
  - consent on the registration form;
  - an erasure path for members;
  - a breach runbook.

**Host audits**

| Host | Audit | Region | Note |
|---|---|---|---|
| Vercel | SOC 2 Type 2, ISO 27001:2022 | edge, global | — |
| DigitalOcean BLR1 | Facility ISO 27001 + PCI-DSS; platform SOC 2 Type II (Schellman) | **Bangalore** | Data stays in India; lowest latency to members |
| Hetzner | ISO 27001 + C5 for its own EU data centres; DPA in the console | Singapore is colocated | Singapore certificate scope unverified |

**Secrets management (free, forkable)**

| Option | Licence |
|---|---|
| SOPS + age | MPL-2.0 |
| Infisical | MIT outside `ee/` |
| OpenBao | MPL-2.0 |

## Round 3 answers and research (2026-10-09)

Answers:
- Auth: "work out a solution between options 1 and 2, security first, then cut costs".
- Mail domain: **a club domain subdomain**.
- VPS: wants latency, enforcement, high-traffic measures and exact monthly prices including taxes.
- Secrets: wants the time and cost of Infisical vs SOPS+age; can Infisical run on Vercel?

**Latency, measured from the founder's Airtel mobile connection in Bengaluru (TCP connect, median of 5, 2026-10-09)**

| Endpoint | Median |
|---|---|
| Vercel edge | 34 ms |
| DigitalOcean BLR1 | 38 ms |
| DigitalOcean SGP1 | 86 ms |
| Hetzner FSN1 | 189 ms |
| DigitalOcean FRA1 | 220 ms |
| Hetzner SIN | **274 ms** (poor Airtel route) |
| Hetzner HEL1 | 284 ms |

**DigitalOcean prices** (pricing page, 2026-10-09; per-second billing since 2026-01-01; 18 % GST charged to customers in India, removable only with a business GSTIN)

| Droplet | Base | + 18 % GST | With daily backups (+30 %), incl. GST |
|---|---|---|---|
| 512 MB / 10 GB / 500 GiB | $4.00 | $4.72 | $6.14 |
| **1 GB / 25 GB / 1,000 GiB** | $6.00 | **$7.08** | **$9.20** |
| 2 GB / 50 GB / 2,000 GiB | $12.00 | $14.16 | $18.41 |

- The INR amount depends on the card's forex rate on the billing date.
- The page shows one price list; a BLR1-specific price is not stated.

**High traffic and enforcement**

| Platform | Measures |
|---|---|
| DigitalOcean | Free always-on layer 3/4 DDoS protection on all droplets. **No layer-7 protection** (it recommends a WAF or Cloudflare) |
| Vercel Hobby | DDoS mitigation on by default, optional Attack Mode, 3 WAF custom rules, 3 IP blocks |

With the Next.js proxy, public traffic first hits Vercel's layer-7 defences, and the VPS accepts only requests carrying the origin secret. The VPS therefore never faces the public directly.

**Infisical vs SOPS + age**

| | SOPS + age | Infisical Cloud free | Infisical self-hosted |
|---|---|---|---|
| Money | $0 | $0 | Needs Postgres + Redis + the server. Docs: server 2 CPU / 4 GB × 2 containers, Postgres 2 vCPU / 8 GB, Redis 2 vCPU / 4 GB. Far beyond the $6 droplet |
| Runs on Vercel? | n/a | It's their hosting | **No** (long-running server plus Postgres/Redis; no serverless option in its docs) |
| Admin oversight | Per-admin age keys; git history is the audit trail | 5 identities, **no audit-log retention, no versioning, no rotation** on free | Full UI, audit log, rotation |
| Setup time (estimate) | About 1–2 h | About 1 h | A day or more, plus ongoing upkeep |
| Licence | MPL-2.0 | Proprietary service (MIT core) | MIT outside `ee/` |

**Proposed auth synthesis (options 1 + 2)**
- Better Auth (MIT) runs as a sidecar on the same droplet: $0 extra.
- Auth and personal data go in a **separate `auth.db`**. The archive DB `book_club_archivist.db` is tracked in a public repo (F8), so emails, passkeys and sessions must never go there.
- The archive keeps only `members.auth_user_id` (nullable) to link a person to an account.
- FastAPI verifies Ed25519 JWTs via JWKS, with roles `presenter` / `admin` in claims; public routes stay anonymous.
- Email links: Better Auth calls PostHog (Workflows email channel, club subdomain with SPF/DKIM/DMARC).
- Passkeys come from the plugin.
- Backups: both DB files go through the same nightly `.backup`, kept off the box; auth.db is encrypted before upload.
- Erasure (DPDP) means deleting the auth.db row and nulling the link; archive history stays as a display name only.

## Round 4 decisions (2026-10-09)

| # | Decision |
|---|---|
| D5 | Auth: the synthesis as written (Better Auth sidecar, separate `auth.db`, Ed25519 JWT via JWKS, PostHog email on a club subdomain, passkeys, anonymous public reads) |
| D6 | Host: DigitalOcean BLR1, 1 GB droplet, **own backups**: $7.08/mo incl. GST. Nightly `sqlite3 .backup` of both DBs, copied off-box, plus a restore drill |
| D7 | Secrets: SOPS + age, a key per admin |
| D8 | Archive DB stays public **by intent**. The privacy policy must say member names and notes are public, and give a way to request removal (DPDP). Auth data stays private in `auth.db` |

## Via negativa: data model before adding presenter entities

**Goal:** support the presenter form (attendance, registration, member promotion), the auth link and the scorecard without growing debt.

**Remove or merge (evidence from live counts and models.py):**

| Candidate | Evidence | Reversible? | Action |
|---|---|---|---|
| `books`, `attachments` tables | 0 rows, no ORM class (legacy) | Yes, from backup | Drop in the first real migration (Q9) |
| `discussion_participants` | 0 rows; `discussions.member_id` already says who discussed | Yes | Drop or leave dormant (ask) |
| Separate Registration + Attendance tables | — | — | **Don't build two.** One `meetup_attendance(meetup_id, member_id, status: registered / attended / presenter, source: form / gforms)` |
| Member-promotion table | — | — | **Don't build.** Promotion is derived (attended count ≥ 2) plus `members.status` set only after the presenter confirms (founder text: "should we make them a member?") |
| Stats tables / Postgres for the scorecard | flow_comparison §6.2.9: counts and group-bys; the 75,450 co-discussion pairs were measured in SQLite | — | **Don't build.** Compute with SQL; precompute `archive_statistics.json` / `timeline.json` on each presenter save (the reports already exist) |
| `book_relations` as a stored table | Co-discussion is one self-join | Yes | Compute on demand or cache; leave the table dormant |
| 4 title normalizers, 2 noise-rule lists (C1, code quality) | Measured duplicates | Yes | Merge to one each (code task, later) |
| Endpoint table in bbb-library-architecture.md | Lists 7 of about 33 routes and goes stale | Yes | Replace with a link to `/docs` (Swagger) and `/openapi.json` |
| DatabaseSchema.md hand-written fields | Wrong table | Yes | Generate from models |
| imperative §4 roadmap stack, §5 sprint status | Stale | Yes | Move to `archive/docs-v1/` or mark historical |

**Do not touch (load-bearing):** Source provenance, Layer 2 (`imported_books`, `possible_duplicates`), import logs, auth, backups, the §2A introducer formula.

**Dormant, not dropped** (0 rows but named in PRD §3.1 or the roadmap): recommendations, current_reads, book_mentions, quotes, genres (needed for facets), publishers, series, tags.

## Rounds 5–6 decisions (2026-10-09)

| # | Decision |
|---|---|
| D9 | One `meetup_attendance` table with status (registered / attended / presenter) and source (form / gforms) |
| D10 | Promotion: the app suggests when attended ≥ 2, and the presenter confirms (no automatic flip) |
| D11 | Stats: SQLite SQL plus precomputed `archive_statistics.json` / `timeline.json` on each presenter save; Postgres only for RAG/MCP |
| D12 | Router split **by audience, in the same change as auth**: public (GET, cacheable), presenter/admin (auth on every route), health |
| D13 | Theming: CSS-variable tokens (light/dark) + shadcn/ui (MIT, copied into the repo) + cmdk (MIT) for the command palette + lucide (ISC) icons; goes through PRD §7.1 |
| D14 | Versioning: standard SemVer with manual release bumps (alpha/beta tag); the commit count is shown separately as a build number stamped by CI |
| D15 | Basic PWA, with mobile system-design research (below) |
| D16 | `discussion_participants` stays dormant; drop only `books` and `attachments` |

## Mobile-first system design (research 2026-10-09)

Sources:
- web.dev/articles/vitals
- developer.chrome.com/docs/workbox/caching-strategies-overview
- nextjs.org/docs/app/guides/progressive-web-apps
- web.dev/articles/adaptive-loading-cds-2019
- WebKit's ITP storage policy (via searchengineland, magicbell)
- licences from the GitHub API / npm (Serwist MIT, Workbox MIT, shadcn MIT, cmdk MIT, lucide ISC)

**1. Performance budget (Core Web Vitals, p75, measured separately for mobile and desktop):** LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1. Add to PRD §18 as a release gate.

**2. Four cache layers that must invalidate together:**

| Layer | What | Strategy | Invalidation |
|---|---|---|---|
| Service worker (Serwist, MIT; recommended by the Next.js PWA guide) | App shell, hashed JS/CSS, fonts | Cache first | New build hash |
| | Shelf JSON, public stats JSON | Stale-while-revalidate | Data version bump on presenter save |
| | Book detail | Network first, fall back to cache | — |
| | Covers | Cache first with a size cap | LRU |
| | `/api/auth/*`, `/api/admin/*`, presenter pages | **Network only, never cached** | — |
| Vercel CDN | Public GET JSON | `CDN-Cache-Control` + `Vercel-Cache-Tag` | Purge the tag on presenter save |
| Browser HTTP cache | Everything | `ETag` from FastAPI | Conditional GET |
| Server | Precomputed JSON | Rewritten on save | — |

**3. Touch has no hover.**
- Flow D's "prefetch on hover" (PRD §9.2) never fires on Android.
- Replace it with prefetch on `pointerdown`/tap-start plus a small prefetch of the visible row when idle.
- This changes PRD §9.2 and flow_comparison.

**4. Weak signal at the venue.**
- The presenter form may submit on a bad connection, and retries can create duplicates. Each submission needs an **idempotency key**, which FastAPI de-duplicates.
- Background Sync is Chrome-only (not iOS), so the form keeps a local draft and retries visibly.

**5. Adaptive loading.**
- Chrome on Android exposes `navigator.connection.effectiveType` and `saveData` (Safari and Firefox desktop do not).
- Use them to serve smaller covers and skip 3D motion on 2g/3g, with the default experience everywhere else.

**6. iOS.**
- Safari deletes script-written storage (Cache API, IndexedDB) after 7 days without use unless the app is installed to the Home Screen.
- Push works only for installed apps (iOS 16.4+).
- Offline on iPhone therefore depends on installation; the SW cache is a speed-up, not a guarantee.

**7. Layout.**
- CSS grid + container queries; mobile-first breakpoints; 44–48 px touch targets.
- The closet section of 360 spines must stay within the INP budget on low-end Android: measure, then window (D4).

**8. Security.**
- SW scope is `/`.
- The service worker itself is served `no-cache`.
- CSP; `X-Frame-Options: DENY`; never cache auth responses (matches the proxy gate).

## Round 7 decisions (2026-10-09)

| # | Decision |
|---|---|
| D17 | PWA: read-only offline (shell, shelf, stats JSON, opened books) **plus presenter-form drafts** kept on the phone, with visible retry and an idempotency key. No Background Sync. Auth, admin and presenter API calls are never cached |
| D18 | Touch prefetch: on `pointerdown` plus an idle prefetch of the visible row (capped); desktop keeps hover |
| D19 | Adaptive loading: two tiers via `effectiveType` / `saveData` (smaller covers, no 3D motion, no idle prefetch on 2g/3g or Data Saver) |
| D20 | Core Web Vitals p75 (mobile and desktop) as a release gate: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 (Lighthouse CI + Vercel Speed Insights) |

## Founder feedback on the first plan draft (2026-10-09)

The draft was missing:
- PostHog and ClickHouse questions;
- a cross-check of our standards against the evidence and test-report files;
- RTIH's Swagger/API-management standard;
- the full software lists (THINGS_FROM_RTIH, DOMAINS) and the statistics-page tooling;
- Vercel and unpkg as CDN;
- forgot/reset password;
- post-quantum signatures for passkeys;
- a thorough proxy security review;
- the backlog strategy;
- the full Q1–Q10.

Decided in the feedback:
- **D21:** Better Auth (MIT) is final.
- **D22:** gzip moves to the first coding release, after the go-ahead to code (out of P0).

## RTIH sources read (2026-10-09)

| File | What BBB can take |
|---|---|
| `RTIH/proj01/platform_/docker/docker-compose.yml` | Infisical isolated on an `internal: true` network with its own DB (a pattern, if Infisical is ever used); healthchecks on every service; `:?` required-env guards; ClickHouse / Redis / Elasticsearch / Qdrant / MinIO are RTIH-scale services |
| `docs/reference/primers/architecture.md` | **API standard (Stripe 10-year rules):** idempotency keys on all mutations; date-stamped API versions; one error envelope `{error:{type,code,message}}`; cursor pagination; rate-limit headers; never break the contract. "Add ClickHouse only when analytics slow down the OLTP DB"; "never start with multiple DBs" |
| `docs/harness/sdlc-master-plan.md` | ClickHouse pattern: events → queue → ClickHouse HTTP, never the primary DB; OpenAPI generated from routes (`/postman:generate-spec`) as documentation and audit trail; PostHog/GlitchTip in a later phase |
| `specs/backup-dr.md` | 3-2-1 backups; replication is not backup; **tested restores**; RPO/RTO targets; quarterly drills; alert when no backup in 26 h or size deviates ±30 % |
| `docs/notes/security-backlog.txt` | Layers: network (WAF/DNS/DDoS), bots (fingerprinting, limiters), auth (Clerk or Better Auth), XSS (CSP headers, sanitising, auto-escape), header management, secrets in a vault (not .env), monitoring (Sentry) |
| `security_more`, `MLCP Scheming/security-immediate.txt` | Checklists: rate limits, IP blocking, PII retention/deletion, audit trails / tamper-evident logs, RTO/RPO, DR plan, load tests, idempotency, cache invalidation, missing indexes, list virtualisation, no secrets in git or JS, no verbose prod errors |

## Cross-check: decisions vs evidence findings (`docs/health/*`)

| Finding (evidence file) | Status under D1–D22 |
|---|---|
| E1/E2 open admin writes and deletes (security_analysis) | **Closed by D5 + D12** (auth on every admin route); must ship before the public launch |
| F1/E3 SSRF in cover download | Still open; fix before launch (allow-list hosts + scheme check) |
| F2/E8 `href` without scheme check | Still open; fix before launch |
| F3 CORS admits the LAN | **Moot under the proxy** (same origin); remove the wildcard regex |
| F4 upload content check | Size cap done (`33f4c8d`). **New conflict:** a 30 MB upload through Vercel may hit the 4.5 MB function body limit; to verify for external rewrites, else uploads go straight to the VPS with a short-lived token |
| F5 `detail=str(e)` | Replace with the RTIH error envelope |
| F6 root container, F7 dev server | Rebuild for the VPS: non-root `USER`; the frontend no longer runs in Docker (it's on Vercel) |
| F8 DB public | **D8: public by intent**; personal data goes in `auth.db` |
| E4/F9 DNS rebinding | Closes for anonymous users with D5; keep the guard |
| E5/S2 synopsis GET writes | Founder said No (S2); move enrichment to an admin job |
| E6 `/books` no max limit, B1 `/meetups` 6,278 queries in 7 s | **Blocks the D20 CWV gate**; Flow D + a limit cap + an N+1 fix before launch |
| F13 unpinned deps, F14 CI permissions | Pin + lock; `permissions: contents: read` |
| DB4 WAL mount, §14.0 backup procedure | **D6 nightly `.backup` + drill** supersedes; mount the data dir |
| MG4/B8 Alembic baseline | Must precede `meetup_attendance` / `members.status` (D9, D10) |
| MG6 pytest `init_db` on the live DB | Fix before any CI against deploy |
| S1/A9 source_id before flush | Fix before the presenter form writes sources |
| RC1/K1 fuzzy dedup never runs | Needed for Layer 2 review (D4) |
| K6 stale generated PDFs | PDF from the form (D4) needs a content-hash key |
| C10 unbounded suggestion cache | Bound it, or replace it with the CDN tag cache |
| No rate limiting (backlog note), no `/health` (A6) | Add both (RTIH standard: rate-limit headers) |
| No response models (backlog) | Pydantic models = an accurate Swagger (`/docs`) = the RTIH contract rule |

## Software evaluation (PRD §7.1 first pass; licences from the GitHub API, 2026-10-09)

| Tool | Licence | Free long term | Fit for BBB | Proposal |
|---|---|---|---|---|
| Swagger UI / OpenAPI | Built into FastAPI | Yes | Already at `/docs`; accurate once Pydantic models exist | Adopt; hide `/docs` in prod or show public routes only (ask) |
| PostHog | MIT outside `ee/` (posthog-js MIT) | Cloud free tier (email 10K/mo verified) | Analytics + email + feature flags | Adopt for email (D5); analytics needs consent under DPDP (ask) |
| ClickHouse | Apache-2.0 | Self-host free | RTIH's own primer: add only when analytics slow the OLTP DB. PostHog already runs on ClickHouse | **Do not add** (via negativa) unless asked |
| FriendlyCaptcha | Widget MIT, SDK MPL-2.0; **service paid**, free plan non-commercial 1,000 req/mo | Partly | Bot check on registration | Compare with **ALTCHA** (MIT, self-hosted proof-of-work, Python lib MIT) (ask) |
| Unstructured-IO | Apache-2.0 | Yes | Document-to-structure for OCR backfill | Candidate for P5 OCR into Layer 2 only; heavy dependency |
| perspective | Apache-2.0 | Yes | WASM data grid and charts; heavy on low-end Android | Admin desktop stats only, with a canvas-free fallback (founder note) (ask) |
| glide-data-grid | MIT (last push 2026-01) | Yes | Canvas grid for admin tables | Optional for admin; canvas, so privacy browsers matter |
| ory/keto | Apache-2.0 | Yes | Zanzibar RBAC | **Overkill** for 3 roles; roles live in JWT claims (D5) |
| trillian | Apache-2.0 | Yes | Merkle tamper-evident log | Overkill; a hash-chained audit table in SQLite gives tamper evidence (ask) |
| Semgrep | Engine LGPL-2.1 (rules have separate terms); Opengrep fork LGPL-2.1 | Yes | Static analysis in CI | Adopt Opengrep or Semgrep CE in CI next to CodeQL (ask) |
| Sentry | **FSL-1.1** (not OSI; Apache after 2 years) | Self-host heavy | Error tracking | Fails the MIT rule; alternatives: PostHog error tracking, GlitchTip (MIT, on GitLab; not verified today) (ask) |
| Supabase | Apache-2.0 | — | Auth + Postgres | Not needed (D5, D11) |
| Clerk | Proprietary service | No (MFA paid) | — | Rejected (D2) |
| Pinecone | Proprietary | No | Vector DB | Not needed; sqlite-vec or pgvector if RAG comes |
| BullMQ + Redis, PgBouncer, load balancer | MIT / various | — | RTIH-scale | Not needed on one droplet + SQLite |
| Umami | MIT | Self-host | Privacy analytics | Alternative to PostHog analytics |
| OpenPanel | AGPL-3.0 | — | — | Fails the MIT/permissive preference |
| Stripe | Proprietary | — | Payments | Conflicts with Vercel Hobby non-commercial; not needed |
| GoLogin | Proprietary antidetect browser | — | — | Not relevant to the app |
| openclaw, nanoclaw | openclaw MIT (nanoclaw repo moved) | — | Agent tooling | Developer tools, outside app architecture |
| shadcn/ui, cmdk, lucide | MIT, MIT, ISC | Yes | — | Adopted (D13) |
| Serwist, Workbox | MIT | Yes | — | Serwist adopted (D17) |
| **unpkg as CDN** | MIT; single origin behind Cloudflare; 4 outages since 2025-03 | — | Runtime third-party script host | **Avoid at runtime:** bundle from npm and serve from Vercel's CDN (same origin, CSP `'self'`, no extra DNS hop, works in LibreWolf/Zen strict mode). unpkg only for prototypes, with SRI |
| Cloudflare DNS | Free service | Yes | DNS for the club domain | Optional |

**Privacy browsers (LibreWolf/Zen):** they block third-party scripts and canvas readback and resist fingerprinting. So: same-origin assets, no third-party trackers by default, canvas features with a fallback, analytics opt-in.

## Post-quantum status (verified)

- **Transport:** X25519MLKEM768 (RFC 10024) on Vercel and Caddy (see round 2).
- **Passkey signatures:**
  - IANA registered ML-DSA-44/65/87 as COSE −48/−49/−50 (RFC 9964, Recommended).
  - SimpleWebAuthn ≥ 14 (the base of Better Auth's passkey plugin) supports ML-DSA on Node ≥ 24.7, and prefers ML-DSA-44 automatically when the runtime supports it.
  - **No mainstream phone authenticator creates ML-DSA passkeys yet** (only prototypes are reported).
- **Policy:**
  1. Accept ML-DSA (preferred) + EdDSA + ES256, so phones get PQ the day they ship it.
  2. Size the public-key column for ML-DSA (20–40× larger keys).
  3. Keep `auth.db` private: a future quantum forger needs the stored public key, and keys never travel except at registration, which is under PQ TLS.
  4. Short session lifetime; re-register passkeys when vendors ship ML-DSA.
- **Session JWTs:** Ed25519 today. JOSE ML-DSA exists (RFC 9964), but library support in Better Auth / Python is not verified. Plan rotation when it lands.

## Forgot / reset password (verified, Better Auth docs)

- Email + password: `sendResetPassword` callback (link + token); `revokeSessionsOnPasswordReset` option; scrypt hashing by default (Argon2 possible); `requireEmailVerification` hides whether an account exists.
- Passkey-only users recover through a verified-email link, then register a new passkey.
- All emails go through PostHog (D5); the docs advise not awaiting the send, to prevent timing attacks.

## Proxy (Next.js / Vercel rewrites) hardening checklist

1. Strict rewrite patterns: `/api/:path*` maps to a fixed host only; numeric IDs as `:id(\\d+)`; never a destination built from user input (Vercel KB: open redirect / XSS via loose rewrites).
2. Origin lock: the `x-origin-secret` transform; Caddy rejects requests without it (timing-safe); firewall the droplet to 80/443 + SSH by key only; consider Vercel's egress ranges.
3. Caching: auth/admin/presenter responses send `Cache-Control: private, no-store`; `x-vercel-enable-rewrite-caching: 0` on `/api/auth/*`, `/api/admin/*`; public GETs carry `Vercel-Cache-Tag` for purging.
4. Identity headers: trust `x-real-ip` / `x-forwarded-for` only on secret-bearing requests; rate limit per IP + per account at FastAPI (headers per the RTIH standard).
5. Cookies: `__Host-` prefix, `Secure`, `HttpOnly`, `SameSite=Lax`; CSRF: Better Auth origin check plus an `Origin` header check on every FastAPI write.
6. Auth is enforced at FastAPI on every write (CVE-2025-29927 showed middleware-only auth fails); Next.js middleware is UX only.
7. Headers: HSTS (preload later), CSP `default-src 'self'` with explicit cover-image hosts (`i.gr-assets.com`, `mzstatic.com`, per DOMAINS.txt), `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`.
8. Body size: verify whether the 4.5 MB function limit applies to external rewrites; if yes, uploads go direct to the VPS with a short-lived token.
9. TLS: Caddy with X25519MLKEM768; verify the Vercel→VPS handshake group in the Caddy logs.
10. Logs: never log tokens or cookies; Vercel runtime logs on Hobby keep 1 hour, so ship VPS logs locally.
11. WAF: Vercel's 3 custom rules on Hobby: rate-limit `/api/auth/*`, block known bad agents, Attack Mode runbook.
12. Verify on real devices: Android Chrome, iOS Safari 26, LibreWolf; check the login cookie, PQ handshake (Chrome DevTools Security tab), and that no auth response comes back cached (`x-vercel-cache` header).

## Founder answers: Q1–Q10 and tooling (2026-10-09)

| # | Question | Answer |
|---|---|---|
| Q1 | BBB 99 original | **Restore it in full and include all of it.** Revert `74207d7`; add a Source row for the PDF; link `meetups.source_id` for #99 (now NULL; 62 discussions stored); diff the PDF's book list against the 62 discussions and add what is missing (dry run, backup, approval) |
| Q2 | Public DB | Public by intent (D8) |
| Q3 | Runtime | Moot after the move: production is the droplet; local docker is dev-only, with the safe-stop rule |
| Q4 | full_import re-run | **Yes, re-import later.** Fix the import defects first (C4–C6, C8, K1/RC1, RX1–RX12, A3, A9), re-import into a scratch DB, diff against live, then decide |
| Q5 | July 2025 | The `86 - BBB Meetup - Books Discussed - July 2025.pdf` file is real; remove the other file's 74 rows (dry run, backup) |
| Q6 | Threshold | **Two bands:** ≥ 0.90 "likely", 0.75–0.90 "possible"; nothing auto-merges |
| Q7 | Same title, other author | **Case by case:** separate by default; the review queue may merge with a human decision |
| Q8 | Unnumbered PDFs | Confirmed: Jul 2023 = #62, Aug 2023 = #63, BYOB+BBB 25 Nov 2023 = #66, 30 Dec 2023 export = #67, Aug–Dec 2025 = #87–#91, Jan 2026 = #92. meetup_number stays required (no schema change) |
| Q9 | Baseline + legacy tables | Yes to both: backup, drift check, baseline, stamp, then a separate migration dropping `books` + `attachments` |
| Q10 | 27 title / 106 author groups | Review queue; a founder approves each merge in the admin UI; old forms kept as aliases |

**D23–D35 (tooling and standards)**

| # | Decision |
|---|---|
| D23 | PostHog: email + error tracking + feature flags. **No product analytics** on public pages |
| D24 | ClickHouse: not now |
| D25 | API standard (replaces PRD §11): RTIH error envelope + Pydantic response models; cursor (keyset) pagination + a max limit on every list; rate-limit headers + date-stamped versions for breaking changes. Idempotency keys only where D17 needs them (presenter writes) |
| D26 | Swagger: public routes public; admin and presenter routes hidden unless logged in as admin |
| D27 | Stats visuals: server-rendered SVG/HTML for the public scorecard; perspective (lazy, with a table fallback) for the admin desktop |
| D28 | Bot protection: ALTCHA (MIT), verified by FastAPI |
| D29 | CDN: bundle everything from npm and serve from Vercel; no runtime unpkg |
| D30 | Audit trail: a hash-chained audit table in SQLite for every admin/presenter write |
| D31 | Backlog: **launch gate + phase bundles** |
| D32 | Passkeys: classical (ES256/EdDSA) now; revisit ML-DSA when phones ship it (the server library is already able) |
| D33 | Recovery: **RPO 24 h, RTO 4 h**; an extra backup after each presenter save on meetup day; a quarterly restore drill; alert if no backup in 26 h |
| D34 | SAST: Opengrep + CodeQL in CI |
| D35 | Proxy: the 12-point hardening checklist above is part of the launch gate |

## Launch gate (D31): must be done before the public link is shared

E1/E2 closed by auth (D5, D12); F1 SSRF allow-list; F2 href scheme check; F5 error envelope; F6 non-root container; the 12-point proxy checklist (D35); E6/B1 list limits + N+1 fix; off-box backups + restore drill (D33); S1/A9 source_id flush; privacy policy page (D8, DPDP); CWV gate passing on mobile (D20). Moot and closed with a note: F3 (same origin), F7 (frontend on Vercel), E7 (closes with login).

## Target architecture (from D1–D35)

```text
Android / desktop browser ── PQ-hybrid TLS (X25519MLKEM768) ──► Vercel (Hobby, non-commercial)
   service worker (Serwist): shell / shelf / stats SWR / opened books / presenter drafts
   Next.js: public pages server-rendered + cached (tag purge on presenter save)
            closet = browser app on Flow D (tap-start prefetch, adaptive tiers)
            admin/presenter = browser app behind login
   rewrite /api/* + x-origin-secret header ──► DigitalOcean BLR1, 1 GB ($7.08/mo incl. GST)
        Caddy 2.10+ (PQ TLS, rejects requests without the origin secret)
        ├─ FastAPI: public router (GET, ETag, CDN-Cache-Control) │ admin router (JWT role) │ health
        ├─ Better Auth sidecar (passkeys, email links via PostHog on a club mail subdomain, JWKS Ed25519)
        ├─ book_club_archivist.db (public by intent) + auth.db (private)
        └─ nightly sqlite .backup of both → off-box (auth.db encrypted); restore drill
   Secrets: SOPS + age (one key per admin). Law: DPDP Rules 2025 (privacy policy, consent, erasure)
Inflow: presenter form → Layer 2 (staging + review) → Layer 3 → PDF generated from the form
        old PDFs / OCR / LLM → Layer 2 only
```

## Execution plan for this session: doc revisions (no code, DB or dependency changes)

**Rules for every edit:**
- check for `.kate-swp` first;
- quote founder text before changing it and get approval per section (founder review notes stay as they are);
- no em dashes, no "not X but Y" phrasing;
- every number measured, with its source and date;
- commit only when asked, with explicit paths, no AI attribution, never push.

**Doc ownership (D3):** one owner per concern; other docs link to the owner instead of repeating it.

| Order | File | Owns | Changes |
|---|---|---|---|
| 1 | `docs/architecture/imperative_decisions.md` | **Decision log** (ADR style) + entity specs §2 | Add a dated "Decisions 2026-10-09" section: D1–D20, each with context, choice, rejected options and sources. Mark §4 (Postgres/GraphQL/Next 14 diagram) and §5 (sprint status) as historical (ask before moving them to `archive/docs-v1/`). §2.B meetup_number note pending Q8 |
| 2 | `docs/BBB_PRD_TRD.md` | Product, roles, priorities, rules | New §2B "Users and roles" (public, presenter, admin; member lifecycle D10). §3.0: presenter module + scorecard. §4: log the live counts as a discrepancy (2,783 / 53 / 2,686 / 174) without overwriting. §7.0/7.2: stack additions marked "pending §7.1" (Better Auth, Serwist, shadcn/cmdk/lucide, Caddy, SOPS). New §8.3 "Deployment" (one paragraph + link to architecture). §9.2: touch prefetch (D18). New §12.3 "Rendering split" (D12 / round 2). §12.4 "Theming tokens" (D13). §17: privacy and DPDP. §18: CWV gate (D20), adaptive tiers (D19), PWA scope (D17). Versioning rule (D14). Hobby non-commercial rule |
| 3 | `docs/architecture/bbb-library-architecture.md` | Runtime, deployment, trust boundaries | Replace the diagram with the target architecture above. Replace the endpoint table with links to `/docs` and `/openapi.json`. Add sections: trust boundary and proxy gates, cache layers, secrets, backups and restore, hosting costs with sources. Keep the founder review block |
| 4 | `docs/architecture/DatabaseSchema.md` | Physical schema | Regenerate from `app/database/models.py` (25 classes, real types). Sections: Live / Dormant (0 rows, kept) / Planned (`meetup_attendance`, `members.status`, `members.auth_user_id`, separate `auth.db`) / To drop (`books`, `attachments`, pending Q9 + backup) |
| 5 | `docs/architecture/domain_model.md` | Concepts and layers | Fix the path, the entity count and the threshold claim (point to Q6). Add Attendance, member lifecycle, presenter inflow into Layer 2, OAIS mapping (link flow_comparison §6.2.10) |
| 6 | `docs/architecture/universal_app_flow.md` | Logical pipeline (roadmap) | Add the structured-entry inflow, the review step, the dissemination step (precomputed JSON, PDF from form); fix enrichers (Goodreads, Apple); remove "enterprise-grade" |
| 7 | `docs/architecture/flow_comparison.md` | Analysis | Add a write-path section (presenter form, idempotency), a stats path, touch prefetch, the cache-layer table; tie the Flow E threshold to the mobile budget; record that the founders accepted SQLite for stats (D11) |
| 8 | `docs/plans/backlog.md`, `FOUNDER_QUESTIONS.md` | Backlog / questions | R4–R6 → resolved, with links to the decisions; Q1–Q10 moved to the Answered table with the answers above; launch gate (D31) + phase bundles listed; tool evaluation table (§7.1 first pass) added to backlog as "admitted / rejected / deferred" |
| 8b | `docs/BBB_PRD_TRD.md` §11 | API rules | Replace §11.1–§11.6 with the D25/D26 standard (keeping §11.0 contract basics and the §11.6 testing checklist) |
| 8c | new `docs/architecture/security_baseline.md` (or a section of the architecture doc; ask) | Security standard | Proxy checklist (D35), PQ status (D32), password reset flow, CSP host list, audit chain (D30), ALTCHA (D28), RPO/RTO (D33), Opengrep (D34), DPDP duties |
| 9 | `index.md`, `docs/health/SESSION_LOG.md` | Index / log | Rows for the changes; a session entry |

## Code roadmap (later sessions; each step needs founder approval, PRD §23 class + size)

| Phase | Work | Class |
|---|---|---|
| P0 Safety + data | Off-box backup + restore drill (D33); B8 baseline stamp + drop `books`/`attachments` (Q9); A9 flush fix; S2 synopsis GET without writes; Q1 BBB 99 restore + Source link + diff of the 62 discussions; Q5 remove 74 duplicate July rows; Q8 assign numbers #62, 63, 66, 67, 87–92 (each a dry run, backup, approval). gzip moves to the first coding release (D22) | CONTROLLED / ARCH (B8) |
| P0b Import fixes (Q4) | Fix C4–C6, C8, K1/RC1 (two bands, Q6), RX1–RX12, A3; re-import into a scratch DB; diff against live; founders decide | ARCHITECTURAL · L (split) |
| P1 Deploy | DigitalOcean droplet, Caddy, Vercel rewrite + origin secret, cache headers, SOPS secrets | ARCHITECTURAL · L (split) |
| P2 Auth | Better Auth sidecar, `auth.db`, JWT check in FastAPI, router split by audience (D12), login page | ARCHITECTURAL · L |
| P3 Presenter | `meetup_attendance`, `members.status`, form with Goodreads autofill + override, idempotency, promotion prompt, stats JSON precompute, PDF from form | ARCHITECTURAL · L |
| P4 Mobile/UI | Tokens + shadcn + dark mode, command palette, Flow D with touch prefetch, PWA (Serwist), adaptive tiers, CWV gate in CI | CONTROLLED · L (split) |
| P5 Search & data | FTS5 search, genre facets, OCR into Layer 2, RC1 fix, normalizer merge | CONTROLLED / ARCH |

**Still open:**
- the club mail subdomain's DNS owner (who adds the SPF/DKIM records);
- whether the 4.5 MB Vercel body limit applies to external rewrites (to test before upload work);
- the Vercel→VPS PQ handshake (to check in the Caddy logs);
- whether the security baseline gets its own file or a section (8c);
- the remaining 77 founder questions in `FOUNDER_QUESTIONS.md` beyond Q1–Q10.

**Thinking passes used:** systems (structure and leverage), pre-mortem (hosting and auth), via negativa (data model). Each ran before an option menu that changes how the app works.

## Verification

- Each doc claim is re-checked against `app/database/models.py`, `app/api/main.py` and live read-only counts (`file:...?mode=ro`) before writing.
- After edits, grep `docs/` returns 0 contradictions for:
  - "85%" vs 0.75 (both point to Q6);
  - the `books` table as live;
  - "GraphQL" outside historical sections;
  - stale counts outside the logged discrepancy;
  - `bbb-library/backend`.
- Every external fact in the decision log carries its source URL and access date (2026-10-09).
- The founders approve each edited section; `git diff --stat` shows only the files in the table.
