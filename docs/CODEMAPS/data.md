<!-- Generated: 2026-10-09 | Commit: 9ee6c4d | Files scanned: 27 tables -->

# Data Codemap

**Last Updated:** 2026-10-09

## Database

**File:** `book_club_archivist.db` (SQLite, read-only mode: `file:book_club_archivist.db?mode=ro`)

**Total rows:** 13,920 across 27 tables (15 empty).

**Alembic state:** Empty (database never stamped by Alembic; one baseline migration exists but was never run).

## Table Inventory

### Core Domain Tables (Populated)

| Table | Rows | Key Columns | Primary Key | Notes |
|---|---:|---|---|---|
| `canonical_books` | 2,783 | title, isbn13, goodreads_id, author_id, cover_url, description, rating | UUID (id) | Books discussed at club; 2,133 of 2,783 have at least one discussion |
| `discussions` | 2,686 | canonical_book_id, member_id, meetup_id, rating, sentiment, media_type | UUID (id) | One row per book-at-meeting (even same book at 2 meetings = 2 rows) |
| `imported_books` | 3,637 | raw_title, raw_author, canonical_book_id, source_id | UUID (id) | Books as parsed from archives before canonical resolution; 369 unlinked (no canonical_book_id) |
| `authors` | 2,199 | full_name, normalized_name | UUID (id) | Book authors; 1:N to canonical_books |
| `members` | 174 | display_name, normalized_name, bio | UUID (id) | Club members; linked via discussions and recommendations |
| `meetups` | 53 | meetup_number (unique 1-99), date, venue_id, photo_url, pdf_url | UUID (id) | 53 of 99 held meetings recorded; venue always populated |
| `venues` | 4 | name (unique), city, address, is_online | UUID (id) | Physical or online meeting locations (100% completeness) |
| `sources` | 1,829 | file_path, source_type (TXT_ARCHIVE, PDF_DOCUMENT), raw_text | UUID (id) | Provenance: exact source file, line numbers, extraction confidence; 1,799 of 1,829 have whole raw text (98.4%) |
| `resources` | 542 | url, title, resource_type (URL), meetup_id | UUID (id) | External links (Goodreads, Notion, etc.) per meetup |
| `aliases` | 1 | entity_type, entity_id, alias_name | UUID (id) | Alternate names for entities (unused; 1 row exists) |

### Reference Tables (Populated)

| Table | Rows | Primary Key | Purpose |
|---|---:|---|---|
| `import_jobs` | 1 | UUID (id) | Batch import tracking (one pipeline run logged) |
| `import_logs` | 11 | UUID (id) | Log messages from that one pipeline run |

### Schema Tables (Empty - By Design)

| Table | Rows | Purpose | Notes |
|---|---:|---|---|
| `publishers` | 0 | Book publishers | Not populated; canonical_books.publisher_id nullable |
| `series` | 0 | Book series | Not populated; canonical_books.series_id nullable |
| `genres` | 0 | Genre tags | Not populated; no join table defined |
| `tags` | 0 | General tags | Not populated; no join table defined |
| `possible_duplicates` | 0 | Merge candidates | Dedup pipeline skipped; review step never runs |
| `book_mentions` | 0 | Casual mentions during discussions | Not populated; design for future |
| `book_relations` | 0 | Sequel/prequel/recommended-together | Not populated; no data entry |
| `discussion_participants` | 0 | Multi-member panels | Not populated; only single member per discussion used |
| `current_reads` | 0 | Active reading status | Not populated; design for future |
| `recommendations` | 0 | Book suggestions from members | Not populated; no data entry yet |
| `quotes` | 0 | Notable quotes | Not populated; design for future |
| `attachments` | 0 | File uploads per entity | Not populated; design abandoned |
| `validation_errors` | 0 | Pipeline errors | Not populated; pipeline has no error collection |
| `books` | 0 | Legacy table (?) | Not populated; likely from old schema |
| `alembic_version` | 0 | Alembic migration stamp | Never populated (database not stamped) |

## Relationships

### Book → Author

- `canonical_books.author_id` FK → `authors.id` (optional)
- 2,783 canonical books; 2,199 authors
- Many books per author; some books have no author

### Book → Publisher

- `canonical_books.publisher_id` FK → `publishers.id` (optional)
- 0 publishers populated
- Schema ready but not in use

### Book → Series

- `canonical_books.series_id` FK → `series.id` (optional)
- 0 series populated
- Schema ready but not in use

### Discussion → Book + Member + Meetup

- `discussions.canonical_book_id` FK → `canonical_books.id` (optional)
- `discussions.member_id` FK → `members.id` (optional)
- `discussions.meetup_id` FK → `meetups.id` (required)
- 2,686 discussions total; all have meetup_id; 369 have no book_id (general discussions)

### Meetup → Venue + Source

- `meetups.venue_id` FK → `venues.id` (optional)
- `meetups.source_id` FK → `sources.id` (optional)
- All 53 meetups have venue_id; venue always populated
- 53 meetups; 4 venues (so many-to-one)

### ImportedBook → Source + CanonicalBook

- `imported_books.source_id` FK → `sources.id` (required)
- `imported_books.canonical_book_id` FK → `canonical_books.id` (optional)
- 3,637 imported books linked to 1,829 sources
- 369 imported books unlinked to canonical (89.9% link rate)

### Source → Meetup + ImportedBook + Discussion

- `sources.meetup_id` (integer, nullable)
- One-to-many to imported_books and discussions
- 1,829 sources; provenance for the archive

## Indexes

Measured via SQLite metadata (`sqlite_master`):

- `canonical_books`: normalized_title, author_id, isbn13, goodreads_id (4 indexed columns)
- `imported_books`: raw_title, raw_author, canonical_book_id, source_id (4 indexed columns)
- `discussions`: canonical_book_id, member_id, meetup_id, source_id (4 indexed columns)
- `meetups`: meetup_number, date, venue_id, source_id (4 indexed columns)
- `members`: display_name, normalized_name (2 indexed columns)
- `authors`: full_name, normalized_name (2 indexed columns)
- `sources`: file_path, meetup_number, source_type (3 indexed columns, plus composite ix_sources_file_meetup)
- Composite index: `ix_aliases_type_name` (entity_type, alias_name)
- Composite index: `ix_canonical_books_norm_author` (normalized_title, author_id)

## Data Quality

| Metric | Value | Source |
|---|---|---|
| Meetups recorded / held | 53 / 99 = 53.5 % | Live count |
| Imported books linked / total | 3,268 / 3,637 = 89.9 % | Live count |
| Sources with whole raw text | 1,799 / 1,829 = 98.4 % | Live count (30 truncated) |
| Duplicate canonical title groups | 16 groups (32 books) | report_insights.md §10.3 |
| Merges reviewed / made | 0 / 218 | report_insights.md §10.3 (July snapshot) |
| Books discussed at least once | 2,133 / 2,783 = 76.6 % | Calculated from discussions count |

## Known Issues (from report_insights.md §4)

- 16 duplicate title groups (same normalized title, different books)
- 369 imported books unlinked to canonical (no match found or review skipped)
- 30 sources have truncated raw text (text cut mid-record)
- 11 PDFs unplaced (cannot find matching meetup)
- No person has reviewed any automatic merge

## ORM Base Classes

All 27 tables extend from:

- `Base` (SQLAlchemy declarative base)
- `UUIDMixin` (id: String(36) UUID, primary key)
- `TimestampMixin` (created_at, updated_at: DateTime, UTC)

## Related Areas

- See `architecture.md` for system diagram
- See `backend.md` for how tables are queried and mutated
- See `dependencies.md` for SQLAlchemy version and connection string
- Full schema at `app/database/models.py` (629 lines)
