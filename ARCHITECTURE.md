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
└── ARCHITECTURE.md          # This file
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
