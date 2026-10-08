# BBB Library — Architecture

## Overview

The BBB Library is a digital archive of the Broke Bibliophiles of Bangalore book club.

## Architecture

```
Browser
   │
   ▼
Next.js (UI only)
   │
   ▼
HTTP (fetch)
   │
   ▼
FastAPI (REST API)
   │
   ▼
SQLAlchemy (ORM)
   │
   ▼
SQLite (book_club_archivist.db)
```

## Running the Application

### Backend (FastAPI)

```bash
# Install dependencies
pip install -r requirements-api.txt

# Run the server
uvicorn app.api.main:app --reload --port 8000
```

The API will be available at http://localhost:8000

### Frontend (Next.js)

```bash
cd frontend

# Install dependencies
npm install

# Run the development server
npm run dev
```

The frontend will be available at http://localhost:3000

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/stats` | GET | Archive statistics |
| `/books` | GET | List books with filtering |
| `/books/{id}` | GET | Get single book |
| `/meetups` | GET | List meetups |
| `/meetups/{id}` | GET | Get single meetup |
| `/search?q=` | GET | Search books and meetups |
| `/health` | GET | Health check |

## Project Structure

```
bbb/
├── app/                      # Python backend
│   ├── api/                  # FastAPI application
│   │   └── main.py          # API endpoints
│   ├── core/                 # Configuration
│   │   ├── config.py        # Settings
│   │   └── database.py      # SQLAlchemy engine
│   ├── database/             # ORM models
│   │   ├── base.py          # Base classes
│   │   └── models.py        # All models
│   ├── parsers/              # Archive parsers
│   ├── pipeline/             # Import pipeline
│   └── reports/              # Report generation
│
├── frontend/                 # Next.js frontend
│   ├── src/
│   │   ├── app/             # Routes (UI only)
│   │   ├── components/      # React components
│   │   ├── lib/             # Utilities
│   │   │   └── api.ts       # API client
│   │   └── types/           # TypeScript types
│   └── package.json
│
├── book_club_archivist.db   # SQLite database
├── requirements-api.txt     # Python dependencies
└── docs/architecture/bbb-library-architecture.md  # This file
```

## Data Flow

1. User interacts with Next.js UI
2. UI calls FastAPI endpoints via fetch()
3. FastAPI queries SQLAlchemy models
4. SQLAlchemy reads from SQLite database
5. Response flows back to UI

## Key Decisions

- **No direct database access from frontend** — All database operations go through the API
- **Reuse existing models** — The Python project already had complete SQLAlchemy models
- **Simple REST API** — No GraphQL, no complex middleware
- **CORS enabled** — Frontend on port 3000, backend on port 8000

## Deployment

For production:
- Frontend: Deploy to Vercel, Netlify, or similar
- Backend: Deploy to Railway, Render, or similar
- Database: Keep SQLite for simplicity, or migrate to PostgreSQL

## Founder review (2026-10-09)

**Still relevant.** All 7 listed endpoints exist in `app/api/main.py`; the API now has about 25 more (members, authors, synopsis, admin, suggest). 15 of 16 project-structure paths exist; the file used to be `ARCHITECTURE.md` (fixed above). Missing from the tree: `app/cli/`, `app/importers/`, `app/schemas/`, `app/services/`, `Dockerfile`, `docker-compose.yml`.

**Data Flow and Key Decisions: kept.** One API between the UI and the database keeps coupling low and matches PRD §7.0 (one contract, one client). Weak point for scale: `app/api/main.py` holds every route in one module, which lowers cohesion; splitting it into FastAPI routers per area is the first step when it grows.

**Planned alterations**

- **Simple REST API:** stays REST. Goals: better API security, flexibility, and tooling such as Swagger docs for the API rules. Swagger is already served by FastAPI at `/docs`. See `docs/plans/backlog.md` R4.
- **CORS:** make sure create, update and delete cannot damage the database. See backlog R5.

**Deployment (point of contention).** SQLite stays for simplicity; PostgreSQL makes more sense once statistics, RAG and MCP integration arrive. Vercel for testing and the demo showcase with full features (less weight on statistics). The goal is a website of its own. See backlog R6.
