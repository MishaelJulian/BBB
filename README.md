# BBB — Broke Bibliophiles of Bangalore Digital Archive & Virtual Library

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python)](https://python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=flat-square&logo=sqlite)](https://sqlite.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v3-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)

An end-to-end archival intelligence platform and interactive 3D virtual library room preserving nearly a decade of literary discussions, meetup records, member recommendations, and canonical book metadata from Bangalore's largest independent reading community.

---

## 🏛️ System Architecture

```
┌────────────────────────────────────────────────────────┐
│             Next.js 15 App Router (Frontend)           │
│   Virtual Library Room • 3D Shelves • Criterion Tray   │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP / JSON API
                            ▼
┌────────────────────────────────────────────────────────┐
│             FastAPI Backend & Query Engine             │
│    Search • Entity Resolution • Dynamic Filtering      │
└───────────────────────────┬────────────────────────────┘
                            │ SQLAlchemy ORM
                            ▼
┌────────────────────────────────────────────────────────┐
│          Canonical SQLite Archive Database             │
│  99+ Meetups • 1,000+ Books • Authors • Recommendations│
└───────────────────────────▲────────────────────────────┘
                            │
┌───────────────────────────┴────────────────────────────┐
│      Document Intelligence & Ingestion Pipeline        │
│   PDF / OCR Scanners • Heuristic Parsers • Validator   │
└────────────────────────────────────────────────────────┘
```

---

## ✨ Key Features

### 1. 📚 3D Virtual Library Room & Criterion Closet
- **Spatial Shelf Exploration:** Interactive 3D bookshelves rendered with physical spine dimensions, dynamic shadows, and atmospheric ambient lighting.
- **Criterion-Style Closet Tray:** Persistent collector's tray allowing readers to pull books from shelves, preview back covers, and curate personal reading journeys.
- **Alphabetical & Genre Navigation:** Rapid letter-indexed indexing and taxonomy filtering.
- **Omni-Search Command Palette (`Cmd+K` / `Ctrl+K`):** Instant fuzzy search across titles, authors, discussion transcripts, and meetup numbers.

### 2. 🔍 Document Parsing & Archival Ingestion Pipeline
- **Multi-Format Extraction:** Custom parsers extracting unstructured meetup minutes from PDFs, scanned documents, and plain-text archives spanning 2016–2026.
- **Entity Resolution & Deduplication:** Normalization algorithms resolving inconsistent book editions, author transliterations, and duplicate recommendation records.
- **Audit Reports:** Automated generation of integrity matrices, anomaly diffs, and validation manifests.

### 3. ⚡ High-Throughput REST API
- Sub-10ms query execution across aggregated reading statistics, author timelines, and contextual meetup discussions.
- Clean separation of concerns with strongly typed Pydantic v2 schemas and SQLAlchemy 2.0 ORM mappings.

---

## 🛠️ Tech Stack

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Lucide React
- **Backend:** Python 3.11+, FastAPI, SQLAlchemy, Alembic, Uvicorn, Pydantic
- **Data & Processing:** SQLite, PyPDF, pdfplumber, BeautifulSoup4
- **Testing:** Pytest, React Testing Library

---

## 🚀 Quickstart

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm

### 1. Clone Repository
```bash
git clone https://github.com/MishaelJulian/BBB.git
cd BBB
```

### 2. Backend Setup (FastAPI)
```bash
# Install Python dependencies
pip install -r requirements-api.txt

# Start the API server on port 8000
uvicorn app.api.main:app --reload --port 8000
```
API Documentation will be live at `http://localhost:8000/docs`.

### 3. Frontend Setup (Next.js)
```bash
cd frontend

# Install Node dependencies
npm install

# Start development server on port 3000
npm run dev
```
Open `http://localhost:3000` in your browser to experience the Virtual Library.

---

## 📊 Core API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/stats` | Archive-wide metadata and discussion metrics |
| `GET` | `/books` | Paginated book catalog with author & genre filters |
| `GET` | `/books/{id}` | Detailed book record with associated meetup logs |
| `GET` | `/meetups` | Chronological archive of all 99+ meetups |
| `GET` | `/meetups/{id}` | Single meetup record with full book discussion list |
| `GET` | `/search?q={query}` | Global full-text search across books and meetups |
| `GET` | `/health` | System and database health status |

---

## 📄 License & Attribution
Designed and built for the **Broke Bibliophiles of Bangalore (BBB)** archival initiative.
