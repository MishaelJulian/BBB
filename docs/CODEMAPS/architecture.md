<!-- Generated: 2026-10-09 | Commit: 9ee6c4d | Files scanned: 90 -->

# Architecture Codemap

**Last Updated:** 2026-10-09

## Entry Points

- **Backend:** `app/api/main.py:app` (FastAPI app, 2,215 lines, port 8000)
- **CLI:** `app/cli/main.py:app` (Typer CLI, 6 commands: `init-db`, `reset-db`, `check-config`, `stats`, `import-full`, `reports`, `validate`)
- **Frontend:** `frontend/src/app/page.tsx` (Next.js 15, port 3000)
- **Import Pipeline:** `app/pipeline/full_import.py:FullArchivePipeline` (15 methods, 9 phases)

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ Browser                                                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP
┌──────────────────────────▼──────────────────────────────────────┐
│ Next.js 15 Frontend (port 3000)                                 │
│ - 10 pages (/, /library-room, /books/[id], /meetups/[id], ...)  │
│ - 44 components, 10 unreachable library components              │
│ - lib/api.ts (single API client)                                │
│ - Tailwind CSS + Framer Motion                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ /api/:path* rewrites
                           │ next.config.ts
                           │ HTTP/JSON
┌──────────────────────────▼──────────────────────────────────────┐
│ FastAPI Backend (port 8000)                                     │
│ - 33 route decorators (some paths have /api/ aliases)           │
│ - Public read (11 GET routes)                                   │
│ - Admin write (8 POST/PUT/PATCH/DELETE routes)                  │
│ - Media resolution (4 routes)                                   │
│ - Middleware: CORS only (no auth)                               │
└──────────────────┬────────────────────────────────────────────┬─┘
                   │                                            │
        SQLAlchemy │                                            │ External
                   │                                            │
┌──────────────────▼──────────────────────┐           ┌─────────▼──────────┐
│ SQLAlchemy ORM                           │           │ External Services  │
│ - 27 tables (15 empty)                   │           │ - Goodreads (JSON) │
│ - 13,920 total rows                      │           │ - Apple Books API  │
│ - Key tables:                            │           │ - YouTube oEmbed   │
│   canonical_books (2,783)                │           │ - OpenGraph URLs   │
│   discussions (2,686)                    │           │ - cover images     │
│   imported_books (3,637)                 │           │ - DuckDuckGo API   │
│   members (174)                          │           │ - TVMaze API       │
│   meetups (53 of 99)                     │           │ - Apple Podcasts   │
│   sources (1,829)                        │           │ - Resolve URL      │
│   venues (4)                             │           └────────────────────┘
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│ SQLite Database                          │
│ file:book_club_archivist.db              │
│ - 27 tables (one empty baseline migration)
│ - No credentials, no config secrets      │
└──────────────────────────────────────────┘
```

## Data Flow (Library Room)

1. Browser → GET `/library-room`
2. Next.js renders `CriterionBookCloset` component
3. Component calls `lib/api.ts` → GET `/api/books?limit=3000&only_discussed=true&exclude_general=true`
4. FastAPI `GET /books` queries SQLAlchemy → CanonicalBook table
5. Response: 2,018 books, 2,151,353 bytes (uncompressed), 0.51 s locally
6. Frontend draws one section at a time: 3 shelves of 120 books (360 books), 18 sections in total
7. `CriterionDetailModal` opens on spine selection
8. Book detail page (if navigated) calls `GET /books/{id}` then `GET /books/{id}/synopsis`

## Book Flow Through Pipeline

```
Raw Archive Files (TXT/PDF)
   ↓ app/parsers/ (txt_parser, pdf_parser, scanner)
Imported Books (Layer 2) → app/database/models.py:ImportedBook
   ↓ app/pipeline/full_import.py:merge_with_duplicates()
Canonical Books (Layer 3) → app/database/models.py:CanonicalBook
   ↓ app/api/main.py:get_books()
JSON Response → frontend/src/lib/api.ts → React state → UI
```

## External Dependencies

- **Runtime:** FastAPI, SQLAlchemy, Pydantic, typer, rich, loguru, psycopg2
- **Frontend:** Next.js 15, React 19, Framer Motion, Tailwind CSS, Radix UI
- **PDF/Image:** pdfplumber, pillow, reportlab
- **External APIs:** Goodreads (no API key, JSON-LD only), Apple Books, YouTube oEmbed, OpenGraph scraper, DuckDuckGo, TVMaze, Apple Podcasts

## Key Modules (by role)

| Module | Purpose | Stability |
|--------|---------|-----------|
| `app/database/models.py` | 27 ORM entities (Base, UUIDMixin, TimestampMixin) | High (I=0.17) |
| `app/schemas/intermediate.py` | Pydantic models (bridge between parsers and pipeline) | High (I=0.00) |
| `app/parsers/` | Extract books, meetings, members from TXT/PDF files | Moderate (I=0.75) |
| `app/pipeline/full_import.py` | Merge, validate, deduplicate imports to canonical | Low (I=0.86) |
| `app/api/main.py` | 33 REST routes, all in one file | Low (I=1.00) |
| `app/cli/main.py` | CLI for init, reset, import, reports, stats | Low (I=1.00) |
| `app/services/pdf_generator.py` | Generate meetup PDF (367-line function) | Moderate (I=0.67) |
| `app/reports/generator.py` | Archive summary, meeting summaries | Low |

## Related Areas

- See `backend.md` for all 33 API routes and handlers
- See `frontend.md` for Next.js page tree and component hierarchy
- See `data.md` for all 27 tables, relationships, and row counts
- See `dependencies.md` for external services called from main.py (lines 478-2192)
- See `coupling.md` for afferent/efferent coupling per module and comparison with §10.2 of `docs/health/report_insights.md`
