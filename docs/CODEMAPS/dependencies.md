<!-- Generated: 2026-10-09 | Commit: 9ee6c4d | Files scanned: 2 (requirements*.txt, package.json) -->

# Dependencies Codemap

**Last Updated:** 2026-10-09

## Backend (Python)

### Core

| Package | Version | Purpose | Used in |
|---------|---------|---------|---------|
| SQLAlchemy | >=2.0.0 | ORM for 27 tables, all models in app/database/models.py | app/api/main.py, app/pipeline/full_import.py, all CLI commands |
| Pydantic | >=2.7.0 | Request/response schemas (BaseModel subclasses) | app/api/main.py request bodies, response models |
| pydantic-settings | >=2.2.0 | Load config from env vars (app/core/config.py) | app/core/config.py settings.py |
| FastAPI | >=0.104.0 (requirements-api.txt) | HTTP framework, 33 routes in app/api/main.py | app/api/main.py (FastAPI app, middleware, routing) |
| Uvicorn | >=0.24.0 | ASGI server for FastAPI | `uvicorn app.api.main:app` (port 8000) |
| python-multipart | >=0.0.9 | Parse multipart/form-data (file uploads) | app/api/main.py `/admin/meetups/{number}/photo` |

### CLI & Utilities

| Package | Version | Purpose | Used in |
|---------|---------|---------|---------|
| typer | >=0.12.0 | CLI framework, 6 commands | app/cli/main.py (`archive init-db`, `reset-db`, `check-config`, `stats`, `import-full`, `reports`, `validate`) |
| rich | >=13.7.0 | Rich terminal output (colors, tables, panels) | app/cli/main.py (console output), app/reports/generator.py |
| loguru | >=0.7.0 | Structured logging | app/core/logging.py logger |
| psycopg2-binary | >=2.9.0 | PostgreSQL driver (optional, for prod) | Connection string fallback if not SQLite |
| tzdata | >=2024.1 | Timezone data | Alembic and models (DateTime handling) |

### PDF & Image Processing

| Package | Version | Purpose | Used in |
|---------|---------|---------|---------|
| pdfplumber | >=0.11.0 | Extract text/tables from PDFs | app/parsers/pdf_parser.py (parse meetup PDFs, 446 lines) |
| pillow | >=10.0.0 | Image processing (resize, format conversion) | app/services/pdf_generator.py cover images, photo uploads |
| reportlab | >=4.0.0 | PDF generation (create meetup PDFs from data) | app/services/pdf_generator.py `generate_meetup_pdf()` (367-line function, 518-line file) |

### Testing

| Package | Version | Purpose | Used in |
|---------|---------|---------|---------|
| pytest | >=8.0.0 | Test framework | 32 tests pass in 3.23 s (tests/ directory) |
| pytest-cov | >=5.0.0 | Coverage reporting | CI/CD coverage tracking |

## Frontend (TypeScript/JavaScript)

### Core Framework

| Package | Version | Purpose | Used in |
|---------|---------|---------|---------|
| Next.js | ^15.0.0 | React metaframework, routing, SSR | frontend/src/app/ (10 pages, 44 components) |
| React | ^19.0.0 | UI library (hooks, components) | frontend/src/components/ and frontend/src/app/pages |
| react-dom | ^19.0.0 | React DOM bindings | frontend/src/app/layout.tsx, all pages |

### Styling & Animation

| Package | Version | Purpose | Used in |
|---------|---------|---------|---------|
| tailwindcss | ^3.4.0 | Utility CSS framework | frontend/src/components/ (all Tailwind classes) |
| Framer Motion | ^11.0.0 | Animation library | frontend/src/components/library/CriterionBookCloset.tsx (shelf animations) |
| class-variance-authority | ^0.7.0 | Variant utility generator | UI component variants (Button, Card, etc.) |
| clsx | ^2.1.0 | Conditional class merging | Conditional Tailwind classes |
| tailwind-merge | ^2.0.0 | Merge Tailwind conflicting classes | Component prop overrides |

### UI Components

| Package | Version | Purpose | Used in |
|---------|---------|---------|---------|
| @radix-ui/react-dialog | ^1.1.0 | Unstyled dialog/modal primitives | frontend/src/components/ui/Modal.tsx, CriterionDetailModal |
| @radix-ui/react-slot | ^1.1.0 | Slot composition utility | Radix UI components |

### Development Dependencies

| Package | Version | Purpose | Used in |
|---------|---------|---------|---------|
| typescript | ^5.5.0 | TypeScript compiler | frontend/src (all .ts, .tsx files) |
| @types/node | ^22.0.0 | Node.js type definitions | next.config.ts |
| @types/react | ^19.0.0 | React type definitions | All React components |
| @types/react-dom | ^19.0.0 | React DOM type definitions | All React DOM calls |
| postcss | ^8.4.0 | CSS transformation (Tailwind plugin) | tailwind.config.ts |
| autoprefixer | ^10.4.0 | Vendor prefix injection | tailwind.config.ts |

## External API Services

### Active (Called from app/api/main.py)

| Service | Endpoint(s) | Authentication | Purpose | Called from | Lines |
|---------|---|---|---|---|---|
| **Goodreads** | `https://www.goodreads.com/book/show/{id}` | None (JSON-LD scrape, no API key) | Book cover, synopsis, page count, rating | `fetch_book_metadata_from_web()`, `enrich_canonical_book_from_goodreads()` | 484-540, 2104-2178 |
| **Apple Books** | `https://itunes.apple.com/search?term=...&entity=ebook` | None (public API) | Book search fallback | `fetch_book_metadata_from_web()`, `search_external_books()` | 522, 1620-1641 |
| **YouTube oEmbed** | `https://www.youtube.com/oembed?url=...&format=json` | None (public API) | Video metadata (title, author, thumbnail) | `resolve_media_url()` | 1692 |
| **OpenGraph (Generic)** | Any URL with `og:title`, `og:image`, `og:description` | None (HTTP HEAD + regex) | Auto-detect website metadata | `resolve_media_url()` | 1722-1783 |
| **DuckDuckGo API** | `https://api.duckduckgo.com/?q={query}&format=json` | None (public API) | Film/show search | `search_external_media()` | 1821 |
| **TVMaze API** | `https://api.tvmaze.com/search/shows?q=` | None (public API) | TV show metadata | `search_external_media()` | 1845 |
| **Apple Podcasts** | `https://podcasts.apple.com/search?term=...` | None (HTTP scrape + regex) | Podcast search | `search_external_media()` | 1893 |

### Security

**SSRF Protection:** `_is_public_http_url()` (lines 1643-1662) checks that all resolved URLs have public IPs (no 127.x, 10.x, 192.168.x, 172.16-31.x).

**Timeouts:**
- Goodreads: 6.5 s (lines 489, 516)
- Apple Books: 3.5 s (line 525)
- YouTube oEmbed: 3.5 s (line 1694)
- OpenGraph: 4.0 s (line 1721)
- HTTP limit: 800 KB (line 1722)

**No Authentication:** All services are unauthenticated public APIs or scrapes. No API keys stored.

## Environment Variables

Defined in `app/core/config.py` (reads from `.env` via pydantic-settings):

| Variable | Type | Default | Purpose |
|----------|------|---------|---------|
| `DATABASE_URL` | str | `sqlite:///book_club_archivist.db` | SQLAlchemy connection string |
| `ENVIRONMENT` | str | `development` | APP_ENV (for logging, config) |
| `CORS_ORIGINS` | str | `http://localhost:3000,http://localhost:8000` | CSV of allowed CORS origins |
| `ADMIN_TOKEN` | str | (none) | Not used (auth not implemented) |
| `LOG_LEVEL` | str | `INFO` | Logging verbosity |
| `BACKEND_INTERNAL_URL` | str | `http://localhost:8000` | Backend URL from frontend's perspective (next.config.ts) |

## Versioning

### Python

- **Target:** Python 3.9+ (no explicit constraint, but uses modern syntax)
- **Requirements:** `requirements.txt` (base) + `requirements-api.txt` (API-specific)

### Node.js

- **Target:** Node 18+ (implicit from Next.js 15 + React 19)
- **Package manager:** npm (no lock file committed; package.json present)

## Known Issues / Gaps

1. **No authentication library** (`python-jose`, `fastapi-security` not in requirements): admin routes are open
2. **No database migration tool stamping**: Alembic installed but schema never stamped
3. **No rate limiting**: external API calls have timeouts but no global rate limit
4. **No caching**: every book synopsis request re-fetches Goodreads
5. **No monitoring library**: no Sentry, Datadog, etc.
6. **No state management frontend**: no Redux, Zustand, or React Context (hooks only)

## Related Areas

- See `architecture.md` for external service integrations
- See `backend.md` for detailed API call locations (lines 478-2192)
- See `frontend.md` for Next.js and React versions
- Requirements files: `requirements.txt`, `requirements-api.txt`
- Frontend package.json: `frontend/package.json`
- Configuration: `app/core/config.py`, `frontend/next.config.ts`
