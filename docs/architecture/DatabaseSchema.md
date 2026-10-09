# Book Club Archivist: Database Schema

> **Owner of:** the physical schema. **Generated** on 2026-10-09 from `app/database/models.py` (24 tables) with row counts from a read-only query of `book_club_archivist.db`. Do not hand-edit the table sections: regenerate them (script in "How to regenerate" below). Concepts and layers: `domain_model.md`. Entity rules: `imperative_decisions.md` §2. Migration plan: `docs/health/structures_analysis.md` (MG findings).

The previous hand-written version described a `books` table that holds no data and has no model; it is in git history.

## Summary

- **Engine:** SQLite in WAL mode through SQLAlchemy 2. Primary keys are UUID strings (`VARCHAR(36)`); every table has `created_at` and `updated_at` except `import_logs` and `validation_errors`.
- **Migrations:** Alembic is configured; the baseline revision `4b4cb3603d42` is empty and `alembic_version` holds no row. The schema comes from `Base.metadata.create_all`. Decided 2026-10-09 (Q9): fill and stamp the baseline after a backup and a drift check, then drop the two legacy tables in a separate migration.

| Status | Tables |
|---|---|
| **Live** (rows today) | `aliases` (1), `authors` (2,199), `canonical_books` (2,783), `discussions` (2,686), `import_jobs` (1), `import_logs` (11), `imported_books` (3,637), `meetups` (53), `members` (174), `resources` (542), `sources` (1,829), `venues` (4) |
| **Dormant** (0 rows, kept on purpose) | `book_mentions`, `book_relations`, `current_reads`, `discussion_participants`, `genres`, `possible_duplicates` (empty because fuzzy detection never runs, RC1), `publishers`, `quotes`, `recommendations`, `series`, `tags`, `validation_errors` |
| **Legacy** (in the database, no model, 0 rows) | `books`, `attachments`: to be dropped (Q9) |

## Planned changes (decided 2026-10-09, not yet migrated)

| Change | Why | Decision |
|---|---|---|
| New `meetup_attendance` (`meetup_id`, `member_id`, `status`: registered / attended / presenter, `source`: form / gforms, timestamps); unique on (`meetup_id`, `member_id`) | Attendance and Google Forms registrations in one table | D9 |
| `members.status` (attendee / member) | Member promotion after the presenter confirms | D10 |
| `members.auth_user_id` (nullable) | Links an archive member to a login in `auth.db` | D5 |
| New `audit_log` (`seq`, `at`, `actor`, `action`, `table`, `row_id`, `before`, `after`, `prev_hash`, `hash`) | Hash-chained audit trail of every admin and presenter write | D30 |
| New `idempotency_keys` (`key`, `actor`, `response`, `created_at`) | A presenter retry on weak signal never saves twice | D17 |
| Separate database file `auth.db` (Better Auth tables) | Personal data kept out of the public archive database | D5, D8 |
| Drop `books`, `attachments` | Legacy, empty, no model | Q9 |

Each change is its own migration, tested on a copy first, with a backup before it touches the live file (PRD §5.2).

## How to regenerate

Run from the repository root. It imports the models and opens the database read-only, then prints the "Tables" section below:

```python
import sqlite3, sys
sys.path.insert(0, ".")
from app.database.base import Base
import app.database.models  # noqa: F401  (registers the tables)

c = sqlite3.connect("file:book_club_archivist.db?mode=ro", uri=True)
rows = {t: c.execute(f'select count(*) from "{t}"').fetchone()[0]
        for (t,) in c.execute("select name from sqlite_master where type='table'")}
for t in sorted(Base.metadata.tables.values(), key=lambda x: x.name):
    print(f"### `{t.name}` ({rows.get(t.name, 'missing')} rows)\n")
    print("| Column | Type | Null | Key / index |\n|---|---|---|---|")
    for col in t.columns:
        keys = (["PK"] if col.primary_key else []) + [f"FK → `{fk.target_fullname}`" for fk in col.foreign_keys]
        keys += (["unique"] if col.unique else []) + (["index"] if col.index else [])
        print(f"| `{col.name}` | {col.type} | {'yes' if col.nullable else 'no'} | {', '.join(keys)} |")
    print()
```

## Tables

### `aliases` (1 rows)

| Column | Type | Null | Key / index |
|---|---|---|---|
| `entity_type` | VARCHAR(64) | no | index |
| `entity_id` | VARCHAR(36) | no | index |
| `alias_name` | VARCHAR(256) | no | index |
| `id` | VARCHAR(36) | no | PK, index |
| `created_at` | DATETIME | no |  |
| `updated_at` | DATETIME | no |  |

### `authors` (2199 rows)

| Column | Type | Null | Key / index |
|---|---|---|---|
| `full_name` | VARCHAR(256) | no | index |
| `normalized_name` | VARCHAR(256) | no | unique, index |
| `country` | VARCHAR(128) | yes |  |
| `description` | TEXT | yes |  |
| `id` | VARCHAR(36) | no | PK, index |
| `created_at` | DATETIME | no |  |
| `updated_at` | DATETIME | no |  |

### `book_mentions` (0 rows)

| Column | Type | Null | Key / index |
|---|---|---|---|
| `discussion_id` | VARCHAR(36) | no | FK → `discussions.id`, index |
| `canonical_book_id` | VARCHAR(36) | no | FK → `canonical_books.id`, index |
| `context_snippet` | TEXT | yes |  |
| `id` | VARCHAR(36) | no | PK, index |
| `created_at` | DATETIME | no |  |
| `updated_at` | DATETIME | no |  |

### `book_relations` (0 rows)

| Column | Type | Null | Key / index |
|---|---|---|---|
| `source_book_id` | VARCHAR(36) | no | FK → `canonical_books.id`, index |
| `target_book_id` | VARCHAR(36) | no | FK → `canonical_books.id`, index |
| `relation_type` | VARCHAR(64) | no |  |
| `id` | VARCHAR(36) | no | PK, index |
| `created_at` | DATETIME | no |  |
| `updated_at` | DATETIME | no |  |

### `canonical_books` (2783 rows)

| Column | Type | Null | Key / index |
|---|---|---|---|
| `title` | VARCHAR(512) | no | index |
| `normalized_title` | VARCHAR(512) | no | index |
| `subtitle` | VARCHAR(512) | yes |  |
| `sort_title` | VARCHAR(512) | yes |  |
| `author_id` | VARCHAR(36) | yes | FK → `authors.id`, index |
| `publisher_id` | VARCHAR(36) | yes | FK → `publishers.id` |
| `series_id` | VARCHAR(36) | yes | FK → `series.id` |
| `isbn10` | VARCHAR(10) | yes | index |
| `isbn13` | VARCHAR(13) | yes | index |
| `asin` | VARCHAR(20) | yes |  |
| `language` | VARCHAR(16) | no |  |
| `publication_year` | INTEGER | yes |  |
| `page_count` | INTEGER | yes |  |
| `cover_url` | VARCHAR(1024) | yes |  |
| `thumbnail_url` | VARCHAR(1024) | yes |  |
| `description` | TEXT | yes |  |
| `goodreads_id` | VARCHAR(64) | yes | index |
| `openlibrary_id` | VARCHAR(64) | yes |  |
| `google_books_id` | VARCHAR(64) | yes |  |
| `rating` | FLOAT | yes |  |
| `media_type` | VARCHAR(32) | no |  |
| `external_url` | VARCHAR(1024) | yes |  |
| `id` | VARCHAR(36) | no | PK, index |
| `created_at` | DATETIME | no |  |
| `updated_at` | DATETIME | no |  |

### `current_reads` (0 rows)

| Column | Type | Null | Key / index |
|---|---|---|---|
| `meetup_id` | VARCHAR(36) | no | FK → `meetups.id`, index |
| `canonical_book_id` | VARCHAR(36) | no | FK → `canonical_books.id`, index |
| `member_id` | VARCHAR(36) | yes | FK → `members.id`, index |
| `status` | VARCHAR(32) | no |  |
| `id` | VARCHAR(36) | no | PK, index |
| `created_at` | DATETIME | no |  |
| `updated_at` | DATETIME | no |  |

### `discussion_participants` (0 rows)

| Column | Type | Null | Key / index |
|---|---|---|---|
| `discussion_id` | VARCHAR(36) | no | FK → `discussions.id`, index |
| `member_id` | VARCHAR(36) | no | FK → `members.id`, index |
| `role` | VARCHAR(64) | yes |  |
| `id` | VARCHAR(36) | no | PK, index |
| `created_at` | DATETIME | no |  |
| `updated_at` | DATETIME | no |  |

### `discussions` (2686 rows)

| Column | Type | Null | Key / index |
|---|---|---|---|
| `meetup_id` | VARCHAR(36) | no | FK → `meetups.id`, index |
| `canonical_book_id` | VARCHAR(36) | yes | FK → `canonical_books.id`, index |
| `member_id` | VARCHAR(36) | yes | FK → `members.id`, index |
| `topic` | VARCHAR(256) | yes |  |
| `notes` | TEXT | yes |  |
| `rating` | FLOAT | yes |  |
| `sentiment` | VARCHAR(64) | yes |  |
| `confidence_score` | FLOAT | no |  |
| `media_type` | VARCHAR(32) | no |  |
| `external_url` | VARCHAR(1024) | yes |  |
| `source_id` | VARCHAR(36) | yes | FK → `sources.id`, index |
| `id` | VARCHAR(36) | no | PK, index |
| `created_at` | DATETIME | no |  |
| `updated_at` | DATETIME | no |  |

### `genres` (0 rows)

| Column | Type | Null | Key / index |
|---|---|---|---|
| `name` | VARCHAR(128) | no | unique, index |
| `slug` | VARCHAR(128) | no | unique |
| `id` | VARCHAR(36) | no | PK, index |
| `created_at` | DATETIME | no |  |
| `updated_at` | DATETIME | no |  |

### `import_jobs` (1 rows)

| Column | Type | Null | Key / index |
|---|---|---|---|
| `source_type` | VARCHAR(64) | no |  |
| `status` | VARCHAR(32) | no | index |
| `total_items` | INTEGER | no |  |
| `processed_items` | INTEGER | no |  |
| `error_count` | INTEGER | no |  |
| `started_at` | VARCHAR(64) | yes |  |
| `completed_at` | VARCHAR(64) | yes |  |
| `id` | VARCHAR(36) | no | PK, index |
| `created_at` | DATETIME | no |  |
| `updated_at` | DATETIME | no |  |

### `import_logs` (11 rows)

| Column | Type | Null | Key / index |
|---|---|---|---|
| `job_id` | VARCHAR(36) | yes | FK → `import_jobs.id`, index |
| `log_level` | VARCHAR(16) | no |  |
| `message` | TEXT | no |  |
| `timestamp` | VARCHAR(64) | no |  |
| `details` | TEXT | yes |  |
| `id` | VARCHAR(36) | no | PK, index |

### `imported_books` (3637 rows)

| Column | Type | Null | Key / index |
|---|---|---|---|
| `raw_title` | VARCHAR(512) | no | index |
| `raw_author` | VARCHAR(256) | yes | index |
| `normalized_title` | VARCHAR(512) | no | index |
| `source_id` | VARCHAR(36) | no | FK → `sources.id`, index |
| `canonical_book_id` | VARCHAR(36) | yes | FK → `canonical_books.id`, index |
| `id` | VARCHAR(36) | no | PK, index |
| `created_at` | DATETIME | no |  |
| `updated_at` | DATETIME | no |  |

### `meetups` (53 rows)

| Column | Type | Null | Key / index |
|---|---|---|---|
| `meetup_number` | INTEGER | no | unique, index |
| `date` | DATE | yes | index |
| `title` | VARCHAR(256) | yes |  |
| `venue_id` | VARCHAR(36) | yes | FK → `venues.id`, index |
| `format` | VARCHAR(32) | no |  |
| `attendance_count` | INTEGER | yes |  |
| `description` | TEXT | yes |  |
| `source_id` | VARCHAR(36) | yes | FK → `sources.id`, index |
| `photo_url` | VARCHAR(512) | yes |  |
| `pdf_url` | VARCHAR(512) | yes |  |
| `id` | VARCHAR(36) | no | PK, index |
| `created_at` | DATETIME | no |  |
| `updated_at` | DATETIME | no |  |

### `members` (174 rows)

| Column | Type | Null | Key / index |
|---|---|---|---|
| `display_name` | VARCHAR(256) | no | index |
| `normalized_name` | VARCHAR(256) | no | unique, index |
| `bio` | TEXT | yes |  |
| `id` | VARCHAR(36) | no | PK, index |
| `created_at` | DATETIME | no |  |
| `updated_at` | DATETIME | no |  |

### `possible_duplicates` (0 rows)

| Column | Type | Null | Key / index |
|---|---|---|---|
| `imported_book_id` | VARCHAR(36) | no | FK → `imported_books.id`, index |
| `candidate_canonical_id` | VARCHAR(36) | no | FK → `canonical_books.id`, index |
| `match_confidence` | FLOAT | no |  |
| `status` | VARCHAR(32) | no | index |
| `id` | VARCHAR(36) | no | PK, index |
| `created_at` | DATETIME | no |  |
| `updated_at` | DATETIME | no |  |

### `publishers` (0 rows)

| Column | Type | Null | Key / index |
|---|---|---|---|
| `name` | VARCHAR(256) | no | unique, index |
| `location` | VARCHAR(256) | yes |  |
| `id` | VARCHAR(36) | no | PK, index |
| `created_at` | DATETIME | no |  |
| `updated_at` | DATETIME | no |  |

### `quotes` (0 rows)

| Column | Type | Null | Key / index |
|---|---|---|---|
| `discussion_id` | VARCHAR(36) | yes | FK → `discussions.id`, index |
| `canonical_book_id` | VARCHAR(36) | yes | FK → `canonical_books.id`, index |
| `member_id` | VARCHAR(36) | yes | FK → `members.id` |
| `quote_text` | TEXT | no |  |
| `page_number` | INTEGER | yes |  |
| `id` | VARCHAR(36) | no | PK, index |
| `created_at` | DATETIME | no |  |
| `updated_at` | DATETIME | no |  |

### `recommendations` (0 rows)

| Column | Type | Null | Key / index |
|---|---|---|---|
| `meetup_id` | VARCHAR(36) | no | FK → `meetups.id`, index |
| `canonical_book_id` | VARCHAR(36) | no | FK → `canonical_books.id`, index |
| `recommender_id` | VARCHAR(36) | yes | FK → `members.id`, index |
| `context` | TEXT | yes |  |
| `id` | VARCHAR(36) | no | PK, index |
| `created_at` | DATETIME | no |  |
| `updated_at` | DATETIME | no |  |

### `resources` (542 rows)

| Column | Type | Null | Key / index |
|---|---|---|---|
| `meetup_id` | VARCHAR(36) | no | FK → `meetups.id`, index |
| `url` | VARCHAR(2048) | no |  |
| `title` | VARCHAR(256) | yes |  |
| `resource_type` | VARCHAR(64) | no |  |
| `id` | VARCHAR(36) | no | PK, index |
| `created_at` | DATETIME | no |  |
| `updated_at` | DATETIME | no |  |

### `series` (0 rows)

| Column | Type | Null | Key / index |
|---|---|---|---|
| `title` | VARCHAR(256) | no | unique, index |
| `description` | TEXT | yes |  |
| `id` | VARCHAR(36) | no | PK, index |
| `created_at` | DATETIME | no |  |
| `updated_at` | DATETIME | no |  |

### `sources` (1829 rows)

| Column | Type | Null | Key / index |
|---|---|---|---|
| `file_path` | VARCHAR(1024) | no | index |
| `source_type` | VARCHAR(64) | no | index |
| `meetup_number` | INTEGER | yes | index |
| `pdf_page` | INTEGER | yes |  |
| `paragraph_index` | INTEGER | yes |  |
| `start_line` | INTEGER | yes |  |
| `end_line` | INTEGER | yes |  |
| `extraction_confidence` | FLOAT | no |  |
| `raw_text` | TEXT | no |  |
| `importer_name` | VARCHAR(128) | no |  |
| `id` | VARCHAR(36) | no | PK, index |
| `created_at` | DATETIME | no |  |
| `updated_at` | DATETIME | no |  |

### `tags` (0 rows)

| Column | Type | Null | Key / index |
|---|---|---|---|
| `name` | VARCHAR(128) | no | unique, index |
| `id` | VARCHAR(36) | no | PK, index |
| `created_at` | DATETIME | no |  |
| `updated_at` | DATETIME | no |  |

### `validation_errors` (0 rows)

| Column | Type | Null | Key / index |
|---|---|---|---|
| `job_id` | VARCHAR(36) | yes | FK → `import_jobs.id`, index |
| `record_type` | VARCHAR(64) | no |  |
| `record_id` | VARCHAR(36) | yes |  |
| `field_name` | VARCHAR(128) | yes |  |
| `error_message` | TEXT | no |  |
| `severity` | VARCHAR(16) | no |  |
| `id` | VARCHAR(36) | no | PK, index |

### `venues` (4 rows)

| Column | Type | Null | Key / index |
|---|---|---|---|
| `name` | VARCHAR(256) | no | unique, index |
| `city` | VARCHAR(128) | no | index |
| `address` | VARCHAR(512) | yes |  |
| `is_online` | BOOLEAN | no | index |
| `id` | VARCHAR(36) | no | PK, index |
| `created_at` | DATETIME | no |  |
| `updated_at` | DATETIME | no |  |

