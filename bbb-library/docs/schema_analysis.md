# Reverse-Engineering & Architecture Report — `book_club_archivist.db`

**Project**: BBB Library Archive  
**Date**: July 22, 2026  
**Role**: Lead Software Architect  
**Subject**: Schema Analysis & Evaluation of Existing SQLite Architecture (`book_club_archivist.db`)  

---

## 1. Executive Summary

The pre-existing `book_club_archivist.db` (and associated models in `app/database/models.py`) represents a **very thoughtful, high-quality relational architecture** for a book club archive. 

Rather than a simple flat table of books, the author designed a normalized domain graph built around **provenance tracking (`sources`)**, **discussion instances (`discussions`)**, **entity metadata (`authors`, `series`, `publishers`, `genres`)**, and **import audit logs (`import_jobs`, `validation_errors`)**.

**Key Recommendation**: We should **REUSE & ENHANCE** this schema rather than scrapping it. We will translate this design into PostgreSQL (SQLAlchemy 2.0 AsyncIO in `bbb-library/backend/`) while adding explicit tables for **Deduplication (`canonical_books`, `possible_duplicates`)**, **Venues**, and **Granular Recommendations/Current Reads**.

---

## 2. Inventory of the 20 Relational Tables

Below is the complete breakdown of all 20 tables discovered in `book_club_archivist.db`:

| # | Table Name | Purpose | Design Assessment | Recommendation |
|---|---|---|---|---|
| 1 | `sources` | Fine-grained provenance tracking (file path, PDF page, line numbers, CSS selector, extraction timestamp, importer name). | **Excellent**. Preserves exact original text location for auditability. | **KEEP** (Migrate to PG) |
| 2 | `books` | Primary book entity (title, subtitle, sort title, ISBN-10/13, ASIN, page count, cover URL, ratings, Goodreads ID). | **Solid**. Well-structured fields. | **KEEP & EXTEND** |
| 3 | `authors` | Author entity (full name, normalized name, birth/death dates, country, bio, aliases). | **Very Good**. Includes normalized name field. | **KEEP** (Migrate to PG) |
| 4 | `meetups` | Meetup session entity (meetup number, date, title, location string, source ID). | **Good**, but location is currently a plain text string. | **REFACTOR** (Add `venue_id` FK) |
| 5 | `discussions` | Core junction table connecting `book_id`, `member_id`, `meetup_id`, and `source_id`. Stores notes, quotes, ratings. | **Crucial Architecture Node**. Enables recurring books across multiple meetups. | **KEEP & EXTEND** |
| 6 | `members` | BBB club member/attendee entity (display name, normalized name, aliases, joined date, bio). | **Good**. Supports tracking who presented or recommended a book. | **KEEP** (Migrate to PG) |
| 7 | `aliases` | Flexible alias mapping for entity resolution (`entity_type`, `entity_id`, `alias_name`). | **Very Good** for handling spelling drift across meetups. | **KEEP** (Migrate to PG) |
| 8 | `publishers` | Publisher metadata (name, location). | **Standard**. Clean normalization. | **KEEP** (Migrate to PG) |
| 9 | `series` | Book series metadata (title, description). | **Standard**. Necessary for sci-fi/fantasy series. | **KEEP** (Migrate to PG) |
| 10 | `genres` | Genre categories (name, slug). | **Standard**. Clean taxonomy base. | **KEEP** (Migrate to PG) |
| 11 | `tags` | Freeform tagging (tag name). | **Standard**. Useful for themes. | **KEEP** (Migrate to PG) |
| 12 | `quotes` | Favorite quotes extracted from discussions (`discussion_id`, `book_id`, `member_id`, `quote_text`). | **Great Feature Node**. Preserves memorable discussion quotes. | **KEEP** (Migrate to PG) |
| 13 | `discussion_participants` | Junction table for multiple members participating in a single discussion. | **Good**. Handles group book reviews. | **KEEP** (Migrate to PG) |
| 14 | `book_mentions` | Informal book mentions during meetups (not full discussions). | **Good**. Distinguishes casual mentions from core discussions. | **KEEP** (Migrate to PG) |
| 15 | `book_relations` | Inter-book links (sequels, prequels, spin-offs, recommended-together). | **Very Good** for future recommendation engine / knowledge graph. | **KEEP** (Migrate to PG) |
| 16 | `attachments` | File attachments linked to sources (mime type, size, path). | **Good**. Handles uploaded PDF/image assets. | **KEEP** (Migrate to PG) |
| 17 | `import_jobs` | Ingestion pipeline job tracking (status, total items, error counts, timestamps). | **Production Ready**. Critical for data ingestion visibility. | **KEEP** (Migrate to PG) |
| 18 | `import_logs` | Structured log entries per import job. | **Production Ready**. Helps debug failed parses. | **KEEP** (Migrate to PG) |
| 19 | `validation_errors` | Granular field-level ingestion error records. | **Production Ready**. Enables data cleaning workflows. | **KEEP** (Migrate to PG) |
| 20 | `alembic_version` | Migration state marker. | **System Table**. Automatically managed by Alembic. | **MANAGED** |

---

## 3. Evaluation of Architectural Questions

### A. Does the schema support recurring books, discussions, and provenance?
* **YES, ABSOLUTELY.** 
* Because `discussions` is a separate junction entity between `Book` and `Meetup`, a single `Book` record can be linked to 5 different `Meetup` records through 5 distinct `Discussion` rows.
* Every `Discussion`, `Meetup`, `Quote`, and `Book` row can link directly to a `Source` row (`source_id`), retaining full provenance (file path, line numbers, confidence score, raw text).

### B. What are the limitations or missing elements?

1. **No Explicit Deduplication / Canonical Book Entity**:
   - The current schema assumes each book title maps to one `Book` row. In reality, raw meetups contain typos ("*Nine-Chambered Heart*", "*Chambered Heart*").
   - **Solution**: Introduce `canonical_books`, `possible_duplicates`, and `merge_confidence` tables so duplicate raw imports are preserved without dirtying canonical search.

2. **Unstructured Venues**:
   - `meetups.location` is a raw string (e.g., "Atta Galatta", "Bookworm", "Online").
   - **Solution**: Create an explicit `venues` table (`id`, `name`, `city`, `is_online`, `address`) and reference `meetups.venue_id`.

3. **Conflated Recommendations & Current Reads**:
   - Currently, `reading_status` and `recommended` are simple column flags inside `discussions`.
   - **Solution**: Promote `recommendations` and `current_reads` to first-class entities linking `Member`, `Book`, `Meetup`, and `Recommender`.

### C. Can it scale to PostgreSQL & Future Features?
* **YES.** The schema uses String UUID keys (`VARCHAR(36)`), explicit foreign keys, and isolated domain tables. 
* Migrating this design to PostgreSQL with SQLAlchemy 2.0 AsyncIO in `bbb-library/backend/` will support full-text search, vector embeddings (for AI Librarian), and graph traversal (for Knowledge Graph).

---

## 4. Enhanced Canonical Database Architecture (Target Schema for Sprint 1)

```
                              ┌────────────────┐
                              │    sources     │ (Provenance Tracking)
                              └───────┬────────┘
                                      │
            ┌─────────────────────────┼─────────────────────────┐
            ▼                         ▼                         ▼
    ┌───────────────┐         ┌───────────────┐         ┌───────────────┐
    │    venues     │         │    meetups    │         │    authors    │
    └───────┬───────┘         └───────┬───────┘         └───────┬───────┘
            │                         │                         │
            └───────────┬─────────────┘                         │
                        ▼                                       │
              ┌──────────────────┐                              │
              │   discussions    │                              │
              └─────────┬────────┘                              │
                        │                                       │
                        ▼                                       ▼
              ┌──────────────────┐                    ┌──────────────────┐
              │  canonical_books │ ◄─── (Merged) ──── │      books       │
              └─────────┬────────┘                    └──────────────────┘
                        │
                        ▼
              ┌──────────────────┐
              │possible_duplicate│ (Deduplication Workflow)
              └──────────────────┘
```

---

## 5. Next Steps for Sprint 1 Execution

1. **Formulate Canonical Schema Migration**: Translate the evaluated 20-table schema + deduplication extensions into SQLAlchemy 2.0 AsyncIO models in `bbb-library/backend/app/models/`.
2. **Execute Full Historical Ingestion Pipeline**: Ingest `BBB Meetup-9.txt` and all 25 PDF meetup records into PostgreSQL.
3. **Generate Canonical Archive & Summary**: Produce `archive_summary.md` detailing recovered meetups, missing meetups, unique books, authors, venues, and deduplication statistics.
