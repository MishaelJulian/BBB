# Security Analysis

Security reports on the BBB app, one section per tool run. Each section states its date, commit and scope. Findings that change risk scores feed `report_insights.md` §10.5 and §10.8.

**Current decisions and schedule:** see §7 of the security review below.

## Findings register

Every finding from both runs, with its status. Details are in the sections below (F = security review, E = exploitability review). Severity for E items assumes a public API; see "Local network only versus public".

| ID | Severity | Finding | Where | Status (2026-10-09) |
|---|---|---|---|---|
| E1 | Critical | Open admin routes list discussion IDs and delete them: anyone could wipe the meetup history | `main.py:994-995`, `:1371` | Scheduled with login (P12) |
| E2 | High | All admin writes open: books, meetups, photos, flags, enrichment | `main.py` admin routes | Scheduled with login (P12) |
| F1 / E3 | High / Medium | Cover download during PDF generation fetches any URL (blind SSRF; internal images served back) | `pdf_generator.py:72-78`, `main.py:1303-1305` | Fix scheduled later |
| F3 | Medium | CORS regex admits the whole LAN with all methods | `main.py:54-57` | Scheduled with login |
| F2 / E8 | Medium / Low | Stored links rendered as `href` without a scheme check | `admin/page.tsx:873` (live); `ResourceList.tsx:25` is dead code (`pattern_review_analysis.md` D7) | Fix scheduled later |
| F4 | Medium | Uploads: no size limit, no image check | `main.py:1068` | Size capped at 30 MB (`33f4c8d`); image check open |
| F5 | Medium | `detail=str(e)` returns raw errors on 8 routes | `main.py:1095` and 7 more | Fix scheduled later |
| F6 | Medium | Backend container runs as root | `Dockerfile` | Fix scheduled later |
| F7 | Medium | Frontend container runs the dev server with source mounted | `frontend/Dockerfile`, `docker-compose.yml` | Fix scheduled later |
| F8 | Medium to High | Database tracked in git; repository is public | git index | Founder decision |
| E4 / F9 | Medium / Low | DNS rebinding on URL resolution returns internal page titles | `main.py:1632-1660` | Open (closes for anonymous users with login) |
| E5 | Medium | Public synopsis route calls Goodreads or Apple on every request for 2,651 of 2,783 books | `main.py:548-575` | Open |
| E6 | Medium | `GET /books` has no maximum `limit` (2.15 MB per call) | `main.py:378-461` | Open |
| E7 | Low | Repeated PDF regeneration costs CPU and outbound requests | `main.py:1116` | Open (closes with login) |
| F10 | Low | `goodreads_id` inserted unquoted into a fixed-host URL | `main.py:484` | Open |
| F11 | Low | Local file paths accepted as cover URLs | `pdf_generator.py:66-67` | Open |
| F12 | Low | `%` and `_` act as wildcards in name lookups (correctness) | `full_import.py:189`, `main.py:421` and others | Open |
| F13 | Low | Python dependencies unpinned; dev packages in the runtime image | `requirements*.txt` | Open |
| F14 | Low | `ci.yml` has no `permissions:` block | `.github/workflows/ci.yml` | Open |
| F15 to F18 | Info | Path handling sound; no ReportLab markup injection; no secrets found; no `dangerouslySetInnerHTML` | see §2 | No action |

Open items with no schedule yet: E4, E5, E6, E7, F10 to F14. E5 matters even on the local network, because a blocked address breaks enrichment for the founders.

---

## Security review (ecc:security-reviewer)

**Date:** 2026-10-09
**Commit:** c2ba3a7 (`git rev-parse --short HEAD`). The working tree has uncommitted docs changes only.
**Run by:** ecc:security-reviewer agent, read-only. No files were written, no DB was opened, and nothing was installed or run.
**Scope:** `app/` (all, with `app/api/main.py` read most closely), `frontend/src/`, `Dockerfile`, `frontend/Dockerfile`, `docker-compose.yml`, `.github/workflows/`, `.env.example`, `requirements*.txt`, `frontend/package.json`.

**Verified after the run (2026-10-09):** F1 (`pdf_generator.py:72-78` calls `urlopen` with no guard; `main.py:1303-1305` stores `cover_url` unchecked), F5 (`grep -c 'detail=str(e)' app/api/main.py` = 8), and the repository visibility for F8: `gh repo view --json visibility` returns **PUBLIC**, so the tracked database is already published (see F8 and question 1).

**Not checked:**
- No dependency CVE lookup. Versions are listed in section 3 and are marked unchecked.
- No dynamic testing. No requests were sent and the app was not started.
- `app/parsers/`, `app/pipeline/` and `app/reports/` were not read line by line. They were grepped for `text(`, f-string SQL, subprocess, eval, pickle, yaml and urlopen. The only hits are below.
- `docs/BBB_PRD_TRD.md`, `docs/AGENT_RULES.md`, `docs/health/report_insights.md` and `docs/architecture/flow_comparison.md` were not read in this pass, so the PRD §7.1 check on new tools is by judgment.
- The route bodies at lines 1172-1500 (`PUT /admin/books`, `POST /admin/meetups/.../books`) were read only where they touch URLs and covers.
- Git history was not checked for secrets. The frontend runtime was not checked. React 19 handling of `javascript:` hrefs is unverified.

### Summary

- No hardcoded secrets, no shell execution, and no string-built SQL were found. Every `text()` is `SELECT 1` and every `ilike` goes through a bound parameter.
- The main risk is the missing login (P12) combined with the CORS regex. Any page open in a browser on the same LAN (10.x, 192.168.x, 172.16-31.x) or on localhost can call every write and delete route.
- The SSRF guard covers `/admin/media/resolve-url` and its redirects. The cover download in the PDF generator has no guard at all, and the cover URL is admin-writable (F1).
- Stored URLs (`external_url`, resource `url`) are not scheme-checked on the backend. The frontend renders them as `href` in two places without the `safeHttpUrl` check used elsewhere (F2).
- The container runs as root and the frontend container runs the dev server with the host source mounted. The SQLite DB file is tracked in git despite being in `.gitignore`, and the repository is public (F6, F7, F8).

### 1. Route inventory (app/api/main.py)

Auth is none on every route. Line numbers are decorator lines. "Write" means it changes the DB or disk.

| Method | Path | Line | Write | Auth | Input it trusts |
|---|---|---|---|---|---|
| GET | /health | 342 | no | none | none |
| GET | /stats | 355 | no | none | none |
| GET | /books, /api/books | 378-379 | no | none | `search`, `author` into `ilike` (bound) |
| GET | /books/{book_id}, /api/books/{book_id} | 464-465 | no | none | path id |
| GET | /books/{book_id}/synopsis | 548 | yes (sets `book.cover_url`, line 574; commit not checked) | none | `goodreads_id` from DB into an outbound URL |
| GET | /meetups | 607 | no | none | none |
| GET | /meetups/{meetup_id} | 639 | no | none | path id |
| GET | /search | 663 | no | none | `q` into `ilike` (bound) |
| GET | /members | 695 | no | none | `search` |
| GET | /members/{member_id} | 757 | no | none | id or display name (`ilike`, line 765) |
| GET | /authors/{author_id} | 842 | no | none | id or name (`ilike`, line 849) |
| GET | /admin/meetups | 945 | no | none | none |
| PUT | /admin/meetups/{meetup_number} | 1031 | yes | none | JSON body |
| POST | /admin/meetups/{meetup_number}/photo | 1063 | yes (disk and DB) | none | uploaded file |
| DELETE | /admin/meetups/{meetup_number}/photo | 1100 | yes | none | int path |
| POST | /admin/meetups/{meetup_number}/generate-pdf | 1116 | yes (disk) | none | int path |
| GET | /admin/meetups/{meetup_number}/pdf | 1147 | yes (generates PDF and sets `pdf_url` on first call, lines 1158-1161) | none | int path |
| PUT | /admin/books/{book_id} | 1172 | yes | none | JSON body, including `cover_url`, `url`, `goodreads_id` (lines 1301-1311) |
| PATCH | /admin/discussions/{discussion_id}/general | 1322 | yes | none | path id |
| DELETE | /admin/discussions/{discussion_id} | 1363 | yes (delete) | none | path id |
| POST | /admin/meetups/{meetup_number}/books | 1387 | yes | none | JSON body, including `url`, `cover_url`, `goodreads_id` |
| GET | /admin/media/resolve-url, /api/media/resolve-url | 1910-1911 | no (makes outbound requests) | none | `url` query, fetched server side |
| GET | /admin/books/suggest, /api/books/suggest | 1917-1918 | no (outbound) | none | `q` |
| GET | /admin/media/suggest, /api/media/suggest | 1919-1920 | no (outbound) | none | `q` |
| GET | /admin/members/suggest, /api/members/suggest | 2002-2003 | no | none | `q` |
| POST | /admin/books/{book_id}/enrich-goodreads | 2169 | yes | none | path id |
| POST | /admin/meetups/{meetup_number}/enrich-goodreads | 2180 | yes (loops over all books) | none | int path |
| mount | /assets | 46 | no (serves files) | none | `StaticFiles(directory="assets")` |

There are no password or token fields anywhere in the routes. There is no route for `reset_db`; it is reachable only through the CLI (`app/cli/main.py:45`, `:121`, `:140`).

### 2. Findings

| ID | Severity | file:line | Finding | Evidence | Impact | Smallest fix | Effort |
|---|---|---|---|---|---|---|---|
| F1 | High | app/services/pdf_generator.py:72-78, app/api/main.py:1303-1305 | The cover download has no SSRF guard and accepts any URL scheme. `cover_url` is admin-writable with no check. Anyone who can reach `PUT /admin/books` can set it, then trigger the fetch through `GET /admin/meetups/{n}/pdf`. Exploit path in words: the server fetches an internal address or a `file:` URL for the attacker. If the response is a valid image, it is saved under `assets/cache/covers/<md5>.jpg`, which `/assets` serves back. Non-images are deleted (lines 85-95), so this leaks images and probes internal hosts. | `req = urllib.request.Request(url, ...)` then `urllib.request.urlopen(req, timeout=8)` (pdf_generator.py:72, :78). `if req.cover_url: book.cover_url = req.cover_url` (main.py:1303-1304). The guard `_is_public_http_url` is used only in `resolve_media_url` (main.py, general branch near line 1700). | C: medium, I: low, A: low | Check `cover_url` with `_is_public_http_url` on write in main.py and again before `urlopen`. Use `_public_opener` for the fetch. Move the helper out of main.py into `app/core/` so both files can import it. | S |
| F2 | Medium | app/api/main.py:1285-1302, :1411; frontend/src/components/shared/ResourceList.tsx:25; frontend/src/app/admin/page.tsx:873 | Stored URLs have no scheme check on the backend. Two frontend places render them straight into `href`. The same file uses `safeHttpUrl` at admin/page.tsx:1142 and :1391, so the pattern exists and is not applied here. A stored `javascript:` link would run script in the viewer's browser when clicked. Whether React 19 blocks that scheme is unverified. | `book.external_url = req.url` (main.py:1302); `ext_url = req.url.strip() ...` (main.py:1411); `href={resource.url}` (ResourceList.tsx:25); `href={book.url}` (admin/page.tsx:873). | C: medium, I: medium, A: none | Reject non-http(s) URLs in the Pydantic model with a validator. As a second layer, move `safeHttpUrl` to `frontend/src/lib/` and use it at both places. | S |
| F3 | Medium | app/api/main.py:54-57 | The CORS regex allows every origin on localhost and the whole private LAN, with `allow_methods=["*"]` and `allow_headers=["*"]`. Credentials are off and no cookies are used, so this adds no login problem. It does mean any web page open on any machine in the LAN (or on the same machine) can call the unauthenticated write and delete routes from a browser. Combined with P12 this makes the LAN the trust boundary. Judgment: acceptable for a home or club LAN, unacceptable for a shared office or public Wi-Fi. | `allow_origin_regex=r"^https?://(localhost\|127\.0\.0\.1\|10(...)\|192\.168...\|172\.(1[6-9]\|2\d\|3[01])...)(:\d+)?$"`, `allow_methods=["*"]`. | I: high, A: medium, C: low | Limit `allow_methods` to GET, POST, PUT, PATCH, DELETE, OPTIONS. Real fix is the P12 login. Until then, set the regex only when `ENV=development`. | S |
| F4 | Medium | app/api/main.py:1063-1085 | Upload has no size limit and no content check (P11 confirmed). The whole file is read into memory. The extension is forced to `.jpg` if it is outside the allow list, so a script or HTML file cannot be stored with a dangerous extension. The bytes are never checked to be an image, so non-image data is saved and served under `/assets`. Filenames are built from the integer meetup number only, so there is no traversal through the upload name. | `content = await file.read()` then `f.write(content)`. `if ext not in [".jpg", ".jpeg", ".png", ".webp"]: ext = ".jpg"`. | A: medium (memory, disk), I: low | Read in chunks, stop at a cap (for example 10 MB), then open with Pillow `Image.open(...).verify()` before saving. Both are already dependencies. | S |
| F5 | Medium | app/api/main.py:1095 and 7 other places | Raw exception text goes back to the client. Eight routes return `detail=str(e)` on a 500, which can leak file paths, SQL text and library details. | `raise HTTPException(status_code=500, detail=str(e))` (main.py:1095). `grep -c 'detail=str(e)'` returned 8. | C: low | Log the exception with `logger` and return a fixed message. | S |
| F6 | Medium | Dockerfile:1-19 | The backend container runs as root, binds 0.0.0.0, and has no `USER` line. A bug in the PDF or upload code would have root inside the container, with write access to the mounted `assets/` and the DB. | `FROM python:3.11-slim` ... `CMD ["uvicorn", "app.api.main:app", "--host", "0.0.0.0", "--port", "8000"]`. No `USER`. | C/I/A: medium | Add `RUN useradd -m app` and `USER app`, and make `assets/` writable for that user. | S |
| F7 | Medium | frontend/Dockerfile:12-14, docker-compose.yml:31-35 | The frontend container runs `npm run dev` and bind-mounts the host source tree over `/app`. This is a dev setup running as the production compose target. The Next dev server exposes more debug surface and is slower. It is also bound to 0.0.0.0 via `HOSTNAME=0.0.0.0`. | `CMD ["npm", "run", "dev"]`; `volumes: - ./frontend:/app`. | A: low, C: low | Judgment: fine for the current LAN use. Before any public hosting, add a build stage with `next build` and `next start`, and drop the source mount. | M |
| F8 | Medium (High if the database holds private data) | git index (book_club_archivist.db) | The SQLite DB is tracked by git even though `.gitignore` lists it, and the repository is **public** (verified). Every push publishes the current archive. The agent did not inspect what personal data the DB holds. | `git ls-files \| grep -cE '^book_club_archivist.db$'` printed 1; `git check-ignore -v` printed nothing for it (ignore rules do not apply to tracked files); `gh repo view --json visibility` = PUBLIC. The file is 8,683,520 bytes. | C: depends on contents (judgment: member names and notes) | Founder decision first (questions 1 and 2). Options: keep it public on purpose and document that; or `git rm --cached book_club_archivist.db` and keep backups outside git (`report_insights.md` §14.0), plus a history rewrite if past versions must be removed. | S to L |
| F9 | Low | app/api/main.py:1632-1642, :1659-1660 | The SSRF guard on resolve-url has one known gap: DNS rebinding. The host is resolved once in `_is_public_http_url` and again by `urlopen`. The code comment at line 1659 already says so. The guard handles IPv6 (`is_global`), non-http schemes, and redirects (`_PublicOnlyRedirects`). The YouTube branch calls `urlopen` directly on a fixed `www.youtube.com` host, which is fine. | `infos = socket.getaddrinfo(...)`; `return all(ipaddress.ip_address(info[4][0]).is_global ...)`. Comment: "resolve-then-fetch leaves a DNS-rebinding window". | C: low | Only matters if the route is exposed beyond the LAN. Pin the resolved IP in a custom connection, or keep the route LAN-only behind the P12 login. | M |
| F10 | Low | app/api/main.py:484-486 | `goodreads_id` is inserted into the outbound URL path without quoting, and it is admin-writable (line 1311). The host is fixed (`www.goodreads.com`), so this is path manipulation on a fixed host and cannot reach other hosts. `q` in the other outbound calls is quoted. | `url = f"https://www.goodreads.com/book/show/{goodreads_id}"` (main.py:484). | I: low | Validate `goodreads_id` with a regex (digits and dash only) in the Pydantic model. | S |
| F11 | Low | app/services/pdf_generator.py:66-67 | `download_and_cache_image` returns any existing local path as-is. If `cover_url` is set to the path of an image file anywhere the app user can read, the PDF includes it. Non-image files fail at `drawImage`. Impact is limited to readable image files. | `if os.path.exists(url): return url`. | C: low | Require the path to be under `assets/` using the existing `asset_path()` guard. | S |
| F12 | Low | app/pipeline/full_import.py:189 | `ilike(f"%{name}%")` uses the name inside the pattern. It is a bound parameter, so there is no injection. `%` and `_` in a name act as wildcards, so a name containing them can match the wrong venue. Same pattern at main.py:421, 428, 429, 670, 705. This is a correctness issue with no security impact. | `Venue.name.ilike(f"%{name}%")` | I: low | Escape `%` and `_`, or use `func.lower(...) ==` for exact lookups. | S |
| F13 | Low | requirements.txt, requirements-api.txt, frontend/package.json | Python dependencies use lower bounds (`>=`) with no lock file, so a rebuild can pull a new major version. The frontend uses carets and has `package-lock.json` tracked. `psycopg2-binary` and `pytest` go into the runtime image because the Dockerfile installs all of `requirements.txt`. | `fastapi>=0.104.0`, `"next": "^15.0.0"`. | A: low | Generate a pinned constraints file for Python. Split dev-only packages out of the image. | S |
| F14 | Low | .github/workflows/ci.yml:1-12 | `ci.yml` has no `permissions:` block, so the token takes the repo default (may be write). `codeql.yml` and `dependency-review.yml` set `contents: read`. All actions are pinned to tags (`@v4`, `@v5`, `@v3`) instead of commit SHAs. | `uses: actions/checkout@v4`; `ci.yml` starts with `name: CI` / `on:` and no `permissions`. | I: low | Add `permissions: contents: read` at the top of `ci.yml`. SHA pinning is optional (judgment). | S |
| F15 | Info | app/core/paths.py:6-11, app/api/main.py:1072-1077 | Path handling is sound. `asset_path` resolves with `realpath` and refuses anything outside `assets/`. Meetup numbers are typed `int`, so file names cannot carry separators. Upload extension is allow-listed. Caveat: `ASSETS_DIR = os.path.realpath("assets")` depends on the working directory. | `if not path.startswith(ASSETS_DIR + os.sep): raise ValueError(...)` | none | None. | n/a |
| F16 | Info | app/services/pdf_generator.py | No template injection path found in the code read. PDFs are drawn with ReportLab canvas calls (`drawString`, `drawImage`) with no Paragraph markup parsing. The whole file was not grepped for `Paragraph`. | `pdfmetrics.stringWidth(trial, font_name, font_size)` in `wrap_text`. | none | Re-check if `Paragraph` is ever added. | n/a |
| F17 | Info | whole repo | Secrets: no hardcoded keys or passwords found in the files read. `.env.example` has only `ENV`, `DEBUG`, `LOG_LEVEL`, `DATABASE_URL`, `CORS_ORIGINS` and a Postgres placeholder `user:password` (example only). No logging of passwords or tokens found by grep. | `.env.example`: `# DATABASE_URL=postgresql+psycopg2://user:password@localhost:5432/bbb_library` | none | None. | n/a |
| F18 | Info | frontend/src | No `dangerouslySetInnerHTML` or `innerHTML` in `frontend/src` (grep). Deep links `?select=` are built from `book.id` in Links. The library-room page was not opened to see how `select` and `meetup` are read, so open redirects and injection through them are unchecked. Every `window.location` hit is `reload()` or a hostname lookup in `getApiBase`. | grep for `dangerouslySetInnerHTML\|innerHTML\|window\.location` returned only those uses. | none | Read `frontend/src/app/library-room/page.tsx` for how `select` is consumed. | S |

### 3. Dependencies (unchecked for CVEs)

Versions seen with `pip list` in the local environment. Repo pins are lower bounds only, so the Docker image may differ. The local list was not filtered to the project venv. All are unchecked against any vulnerability database.

| Package | Repo spec | Local version |
|---|---|---|
| fastapi | >=0.104.0 | 0.137.1 |
| starlette | via fastapi | 1.3.1 |
| uvicorn[standard] | >=0.24.0 | 0.49.0 |
| sqlalchemy | >=2.0.0 | 2.0.39 |
| python-multipart | >=0.0.9 | 0.0.32 |
| pdfplumber | >=0.11.0 | 0.11.10 |
| pillow | >=10.0.0 | 12.3.0 |
| reportlab | >=4.0.0 | 4.4.10 |
| next | ^15.0.0 | not installed locally, unchecked |
| react, react-dom | ^19.0.0 | not installed locally, unchecked |
| framer-motion | ^11.0.0 | unchecked |

### 4. Already-known issues

| Known issue | Status | Evidence |
|---|---|---|
| P12 admin routes have no login | Confirmed. Every write route in section 1 has no auth. The `/admin` prefix is a name only. | No auth dependency in the route list; CORS comment at main.py:51 says "No cookies are used". |
| P11 uploads have no size limit | Confirmed, plus no content check (F4). | main.py:1079 `content = await file.read()`. |
| API backlog A8: `reset_db` drops all tables unguarded | Confirmed, unchanged. Reachable only through the CLI, not the API. | app/core/database.py:69-76 `Base.metadata.drop_all(bind=eng)`; app/cli/main.py:45, :140. |
| A1 `raw_text` cut at 2,000 chars | Not re-checked in this pass. | not read |
| A3 fuzzy auto-merge without review | Not re-checked in this pass. | not read |
| API backlog A3: no gzip | Confirmed: only `CORSMiddleware` is added (main.py:49-58); no `GZipMiddleware` in the lines read. | main.py:49-58 |
| Spines not keyboard-reachable | Not re-checked (frontend accessibility, outside this review). | not read |

### 5. Proposed FMEA rows for report_insights.md §10.8

S, O, D are judgment calls on a 1-10 scale. D is how hard the failure is to detect (10 means no detection today). RPN = S x O x D.

| Failure mode | Effect | Cause | S | O | D | RPN |
|---|---|---|---|---|---|---|
| Unauthorised data change or deletion through the API | Meetup, book or discussion data edited or deleted by someone on the LAN | No login on write routes (P12) plus the LAN-wide CORS regex (F3) | 8 | 4 | 8 | 256 |
| Server fetches an internal URL during PDF generation | Internal service probed; internal image copied into `assets/cache` and served | `cover_url` set to any URL; no guard in `download_and_cache_image` (F1) | 6 | 3 | 8 | 144 |
| DB with member data pushed to a remote | Personal data exposed | DB file tracked in git despite `.gitignore` (F8); remote verified public, so O is higher in practice | 7 | 3 | 6 | 126 |
| Process compromise has root in the container | Writes to mounted DB and assets, wider blast radius | No `USER` in Dockerfile (F6) | 7 | 2 | 8 | 112 |
| Large or non-image upload | Memory or disk exhausted; junk served from `/assets` | No size cap or content check (F4) | 5 | 3 | 7 | 105 |
| Raw error text shown to clients | Paths or SQL fragments leak, easing other attacks | `detail=str(e)` on 8 routes (F5) | 3 | 5 | 6 | 90 |
| Stored `javascript:` or other non-http link clicked | Script runs in the viewer's browser | No scheme check on `external_url` or resource `url` (F2) | 6 | 2 | 7 | 84 |
| CI token used with write rights | Repo changed through a compromised workflow step | `ci.yml` without `permissions:` (F14) | 5 | 2 | 6 | 60 |

### 6. Open questions for the founders

1. The repository is public (verified), so `book_club_archivist.db` and its history are already published (F8). Is that intended?
2. What is in the DB that is personal (real member names, notes, contact data)? That sets how serious F8 and F3 are.
3. Will the app ever leave the home or club LAN? If yes, P12 (login), F3 (CORS) and F9 (DNS rebinding) become blockers instead of backlog.
4. Who is the admin today: one person, or anyone at a meetup on shared Wi-Fi?
5. Is the frontend container meant to be the real deployment (F7), or only a dev convenience?
6. Do you want a shared admin token (one env var, one header check) as the first P12 step? It is the smallest fix and needs no new tool.

### 7. Decisions and schedule (founders, 2026-10-09)

| Finding | Decision | Status |
|---|---|---|
| F4 / P11 Upload size | Cap uploads at **30 MB** (arbitrary, to be revisited once real photo sizes are known) | **Done in code, uncommitted.** `MAX_UPLOAD_BYTES = 30 * 1024 * 1024` in `app/api/main.py`, checked before any database access; returns HTTP 413. Test: `tests/test_upload_limit.py` (suite: 32 passed). The server still receives the full request body before the check; a reverse-proxy body limit is the hard stop once deployed. Still open from F4: no check that the bytes are an image (Pillow `verify()`) |
| F3 CORS, P12 login | Schedule a CORS rule together with a login page and proper authentication and authorization policies | Scheduled; design to follow |
| F1 Cover download without SSRF guard | Noted | Fix scheduled later |
| F2 Stored links without scheme check | Noted | Fix scheduled later |
| F5 Raw error text returned to clients | Noted | Fix scheduled later |
| F6 Backend container runs as root | Noted | Fix scheduled later |
| F7 Frontend container runs the dev server | Noted | Fix scheduled later (before any public hosting) |
| F8 Database tracked in a public repository | Open | Founder decision needed (§6 questions 1 and 2) |

Side fix in the same change: inside the upload route, an `HTTPException` (for example the 404 "Meetup not found") used to be caught by `except Exception` and returned as a 500. It is now re-raised with its own status code.

**Proposed FMEA rows (§5):** 8 rows, from "unauthorised data change or deletion through the API" (RPN 256) down to "CI token used with write rights" (RPN 60). Status: merged into `report_insights.md` §10.8 as rows 13 to 20 (2026-10-09). After the 30 MB cap, the upload row is expected to drop from 5 × 3 × 7 = 105 to about 5 × 2 × 7 = 70 (judgment: the cap lowers occurrence of memory exhaustion; non-image content is still unchecked).

---

## Exploitable issues (ecc:security-bounty-hunter)

**Date:** 2026-10-09
**Commit:** `33f4c8d`
**Run by:** /ecc:security-bounty-hunter, read-only static review of the code paths below. No requests were sent, nothing was run against a live server, and no exploit code was written. Reproductions are descriptions only.
**Assumed deployment:** Next.js on Vercel or an own site, FastAPI reachable from the internet, SQLite file on the server, one `uvicorn` process (`Dockerfile:17` sets no `--workers`).
**Scope check:** no `SECURITY.md` and no bounty programme exist for this repository; this is an internal assessment.
**Not checked:** live behaviour (timings, Goodreads and Apple responses), React 19 handling of `javascript:` links in a real browser, browser Private Network Access enforcement, the hosting provider's own network rules.

Severity uses CVSS 3.1 style vectors. **The scores are judgment**, assuming the public deployment above.

### Summary

- Anyone on the internet could wipe the meetup history in two steps: list discussion IDs from an open admin route, then delete them one by one (E1).
- Every other admin write is open the same way: edit books and meetups, replace meetup photos, flip discussion flags (E2).
- Two server-side request forgery paths exist: a blind one through cover downloads during PDF generation (E3) and a DNS-rebinding one through URL resolution that returns page titles and descriptions (E4).
- Public read routes can be turned against the server: the synopsis route calls Goodreads or Apple for 2,651 of 2,783 books on every request (E5), and `GET /books` returns 2.15 MB with no upper limit (E6).
- Injection into ReportLab, SQL injection, path traversal and upload-to-code-execution were checked and are not reachable (see "Not exploitable remotely").

### Findings

#### E1. Unauthenticated deletion of the meetup history (Critical when public)

- **Preconditions:** the API is reachable; no credentials needed.
- **Reproduction (description):** 1) Call `GET /admin/meetups`; each meetup's books come with `discussion_id` and `discussion_ids` (`app/api/main.py:994-995`). 2) For each ID, call `DELETE /admin/discussions/{id}` (`app/api/main.py:1371`). The handler deletes every discussion row for that book at that meetup (`main.py:1379-1382`). 3) Repeat for all meetups.
- **Impact on the archive:** destroy. All 2,686 discussions (the link between books, members and meetups) can be removed. Books, members and meetups remain, but the history that connects them is gone. Recovery depends on backups (`report_insights.md` §14.1).
- **Severity:** Critical, about 9.1 (AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:H/A:H). Network reachable, no login, no user action, irreversible without a backup.
- **Smallest fix:** require a login on every `/admin/*` route and every `/api/*` alias of an admin handler (P12, scheduled). Until then, do not expose the API publicly, or block `/admin/` **and** the `/api/` admin aliases at the reverse proxy. A rule on `/admin/` alone misses `/api/media/resolve-url`, `/api/books/suggest`, `/api/media/suggest` and `/api/members/suggest` (`main.py:1911, 1918, 1920, 2003`).

#### E2. Unauthenticated changes to books, meetups and photos (High when public)

- **Preconditions:** API reachable.
- **Reproduction (description):** call any of `PUT /admin/books/{id}` (`main.py:1172`), `PUT /admin/meetups/{n}` (`:1031`), `POST /admin/meetups/{n}/books` (`:1387`), `PATCH /admin/discussions/{id}/general` (`:1322`), `POST /admin/meetups/{n}/photo` (`:1068`), `DELETE /admin/meetups/{n}/photo` (`:1100`), `POST /admin/books/{id}/enrich-goodreads` (`:2169`). Book and meetup IDs come from the public `GET /books` and `GET /meetups`.
- **Impact on the archive:** alter. Titles, authors, links and covers can be rewritten; a meetup's group photo can be replaced with any image up to 30 MB (the upload overwrites `meetup_<n>_photo.<ext>`); books can be added to any meetup or hidden by flagging them as general discussion.
- **Severity:** High, about 8.2 (AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:H/A:L).
- **Smallest fix:** same as E1.

#### E3. Blind server-side request forgery through cover downloads (Medium when public)

- **Preconditions:** API reachable (uses E2 to set the URL).
- **Reproduction (description):** 1) Set a book's `cover_url` to an internal address or a `file:` path with `PUT /admin/books/{id}` (stored unchecked, `main.py:1303-1305`). 2) Add that book to a meetup if needed, then call `POST /admin/meetups/{n}/generate-pdf` (`main.py:1116`). 3) `download_and_cache_image` fetches the URL with plain `urlopen` (`app/services/pdf_generator.py:72-78`), with no address check. 4) If the response is an image, it is saved as `assets/cache/covers/<md5 of the URL>.jpg` and served by the public `/assets` mount; the attacker knows the URL, so they can compute the file name and download it. Non-images are deleted, so text responses (for example cloud metadata) are not returned. Response timing and the PDF outcome still reveal which internal hosts and ports answer.
- **Impact:** read (internal images and image files on disk), internal network mapping. Archive data itself is untouched.
- **Severity:** Medium, about 5.8 (AV:N/AC:L/PR:N/UI:N/S:C/C:L/I:N/A:N).
- **Smallest fix:** run `_is_public_http_url` on `cover_url` when stored and again before the fetch, and use `_public_opener` (F1, scheduled). Reject local paths outside `assets/` (F11).

#### E4. Server-side request forgery through DNS rebinding on URL resolution (Medium when public)

- **Preconditions:** API reachable; attacker controls a domain whose DNS answers alternate between a public and an internal address.
- **Reproduction (description):** 1) Call `GET /api/media/resolve-url?url=http://<attacker domain>/`. 2) `_is_public_http_url` resolves the name and sees a public address (`main.py:1632-1642`). 3) `urlopen` resolves it again; if the second answer is internal, the request goes inside the network. The code comment at `main.py:1659` already notes this window. 4) The handler returns the page's `<title>`, Open Graph description and image URL in its JSON (`main.py`, `resolve_media_url` return block).
- **Impact:** read (title and description of internal web pages). Timing-dependent; may take many attempts.
- **Severity:** Medium, about 5.3 (AV:N/AC:H/PR:N/UI:N/S:C/C:L/I:N/A:N).
- **Smallest fix:** behind the login (E1 fix) this route is no longer anonymous. For full closure, connect to the address already checked instead of resolving twice (F9).

#### E5. Outbound request amplification through the public synopsis route (Medium when public)

- **Preconditions:** none beyond reachability; this is a public read route.
- **Reproduction (description):** 1) List book IDs from `GET /books`. 2) Call `GET /books/{id}/synopsis` (`main.py:548`) for each. 3) For every book missing a description, page count, rating or real cover, the handler calls `fetch_book_metadata_from_web` (`main.py:571`), which contacts Goodreads and then Apple Books. Measured: **2,651 of 2,783 books** meet that condition (read-only query on 2026-10-09). Failed lookups are not remembered, so the same book triggers a new fetch on every call.
- **Impact:** availability. Each anonymous request costs one or more outbound requests and holds a worker thread while they run. Goodreads or Apple may rate-limit or block the server's address, which breaks enrichment for the founders. A public `GET` also writes to the database when a fetch succeeds (`main.py:574`, commit below it).
- **Severity:** Medium, about 5.3 (AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:L).
- **Smallest fix:** stop fetching on public reads: serve what the database holds and run enrichment only from the admin routes or a scheduled job; or record a "last tried" time per book and skip retries for a day.

#### E6. Denial of service through unbounded `GET /books` (Medium when public)

- **Preconditions:** none.
- **Reproduction (description):** call `GET /books` without `limit`, or with a large `limit` (`main.py:378-461`; no maximum). The closet's own request returns 2,151,353 bytes uncompressed and took 0.51 s locally (measured 2026-10-08). Repeat in parallel.
- **Impact:** availability. One process serves every route, so a small stream of these requests slows the whole API. A tiny request produces a 2 MB response, which also costs outbound bandwidth.
- **Severity:** Medium, about 5.3 to 7.5 depending on server capacity (AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:L to H). Judgment; not load-tested.
- **Smallest fix:** cap `limit` (for example 500) with a default page size, add `GZipMiddleware` (API backlog A3), and rate-limit at the proxy. Flow D (PRD §9.2) reduces the payload further.

#### E7. CPU and disk exhaustion through repeated PDF generation (Low when public)

- **Preconditions:** API reachable.
- **Reproduction (description):** call `POST /admin/meetups/{n}/generate-pdf` (`main.py:1116`) repeatedly for meetups with many books. Each call redraws the PDF with ReportLab and may download uncached covers (8 s timeout each, `pdf_generator.py:78`).
- **Impact:** availability.
- **Severity:** Low, about 4.3 (AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:L).
- **Smallest fix:** login (E1 fix); regenerate only when the meetup changed.

#### E8. Stored links rendered without a scheme check (Low)

- **Preconditions:** E2 to store a `javascript:` URL in a book link or resource; a reader must click it.
- **Reproduction (description):** store the link through `PUT /admin/books/{id}` (`main.py:1302`); it is rendered as `href` in `frontend/src/components/shared/ResourceList.tsx:25` and `frontend/src/app/admin/page.tsx:873`.
- **Impact:** script in the reader's browser after a click. The site uses no cookies or login yet, so there is little to steal today. React 19 handling of `javascript:` links was not verified in a browser.
- **Severity:** Low, about 3.5 (requires a click; outside typical bounty scope).
- **Smallest fix:** validate http(s) in the Pydantic model and reuse `safeHttpUrl` (F2, scheduled).

### Not exploitable remotely

- **SQL injection:** every `ilike` and filter uses bound parameters; the only `text()` is `SELECT 1`.
- **Path traversal:** `asset_path` resolves with `realpath` and refuses paths outside `assets/` (`app/core/paths.py:6-11`); upload names are built from an integer meetup number.
- **Upload to code execution:** the extension is forced to `.jpg`, `.jpeg`, `.png` or `.webp`, files are served as static content, and nothing executes them. Size is capped at 30 MB.
- **Injection into ReportLab:** text is drawn with `drawString`, which does not parse markup.
- **CORS regex bypass:** the pattern is anchored (`^...(:\d+)?$`), so look-alike hosts such as `localhost.example.com` fail. When the API is public, CORS is not a defence anyway: an attacker calls it directly without a browser.
- **`goodreads_id` in the outbound URL:** the host is fixed to `www.goodreads.com`; only the path changes (F10).
- **`reset_db` and `import-full --reset`:** command line only, no HTTP route.
- **Database file in the public repository (F8):** a disclosure through GitHub, outside the running app; tracked in §7 for a founder decision.
- **Container runs as root (F6), CI token scope (F14):** matter only after another compromise.

### Local network only versus public

| Finding | API public | API on the local network only |
|---|---|---|
| E1 delete history | Critical: anyone on the internet | High: anyone on the same network. A website opened in a browser on that network cannot send the `DELETE` (it needs a CORS preflight, and only LAN origins pass), so remote reach is lost |
| E2 change data | High | Medium to High: anyone on the network. Exception: `POST` routes with no JSON body (photo upload as a form, `generate-pdf`, `enrich-goodreads`) are "simple" requests that a public website can fire blind from a visitor's browser at `localhost:8000` or a guessed LAN address, without reading the answer. Chrome's Private Network Access rules may block this; not verified (judgment) |
| E3 blind SSRF | Medium | Low: needs `PUT`, which only LAN origins and LAN clients can send |
| E4 DNS rebinding SSRF | Medium | Low: needs network access to the API first |
| E5 outbound amplification | Medium | Low: only local users can trigger it |
| E6 `GET /books` DoS | Medium | Low |
| E7 PDF regeneration | Low | Low, and also reachable blind from a public website as a simple `POST` |
| E8 stored link | Low | Low |

**Reading:** on the local network the main risk is people already on that network (shared club or café Wi-Fi). Going public without the scheduled login turns E1 into a one-request-per-row wipe of the archive by anyone. The login (P12) and the CORS rule (F3) are therefore blockers for public hosting, together with a backup routine (`report_insights.md` §14.0).

### Proposed FMEA rows (merged into report_insights.md §10.8 as rows 21 to 23, 2026-10-09)

S, O, D are judgment on a 1 to 10 scale; RPN = S × O × D. Row 13 in §10.8 already covers unauthorised change and deletion.

| Failure mode | Effect | Cause | S | O | D | RPN |
|---|---|---|---|---|---|---|
| Public synopsis requests trigger mass outbound fetches | Goodreads or Apple block the server; API threads held | Fetch on every public read for 2,651 books; failures not remembered (E5) | 4 | 5 | 6 | 120 |
| Unbounded `GET /books` flood | API slow or down for everyone | No maximum `limit`, no gzip, one process (E6) | 5 | 4 | 4 | 80 |
| Archive history wiped through open admin routes after public launch | All discussions deleted | Discussion IDs listed by `GET /admin/meetups`; open `DELETE` (E1) | 10 | 3 | 7 | 210 |
