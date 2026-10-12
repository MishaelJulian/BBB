# Book Club Archivist: Database Schema

> **Owner of:** the physical schema. **Generated** on 2026-10-12 from `app/database/models.py` and `identity_models.py` (31 tables) with row counts from a read-only query of `book_club_archivist.db`. Do not hand-edit the table sections: regenerate them (script in "How to regenerate" below). Concepts and layers: `domain_model.md`. Entity rules: `imperative_decisions.md` §2. Migration plan: `docs/health/structures_analysis.md` (MG findings).

The previous hand-written version described a `books` table that holds no data and has no model; it is in git history.

## Summary

- **Engine:** SQLite in WAL mode through SQLAlchemy 2. Primary keys are UUID strings (`VARCHAR(36)`); every table has `created_at` and `updated_at` except `import_logs` and `validation_errors`.
- **Migrations:** Alembic is **in use** (head `a1d3e5f70011`, stamped on the live database 2026-10-12). Baseline `4b4cb3603d42` is empty; a fresh database gets its tables from `Base.metadata.create_all` and the migrations then add the later rules (triggers and seed rows). Schema and data changes are separate migrations with up and down, rehearsed on a copy, with a backup first.
- **Rules held by the database itself** (SQLite cannot add a CHECK by ALTER, so these are triggers; foreign keys are enforced per connection, so they are not relied on alone):
  - `discussions`: a mention points at exactly one of a book or a series; `media_type` must exist in `media_categories`.
  - `canonical_books`: `media_type` must exist in `media_categories`; deleting a book clears the `imported_books.canonical_book_id` that point at it; an edition blocks deletion of its work.
  - `members.status` must be `guest`, `byob` or `member`; `members.member_code` (`MMM-NN`, first meetup and order) is unique where set.
  - `meetup_attendance`: unique per (meetup, member); status `registered | attended | presenter`; source `form | gforms | backfill`.
- **Media categories are data:** `media_categories` holds the eleven approved codes (book, article, movie, tv_series, anime, documentary, podcast, video, website_app, poem, creator). "Tangent" is not a type: it is the flag `discussions.is_tangent`.
- **Translations:** a translation is its own `canonical_books` row, the translator is in the title string, one edition in the club's data means one row and no link (`docs/architecture/translation_rule.md`). Several authors are one string in `authors.full_name`.
- **Sources:** `sources.meetup_number` is set for every PDF; `sources.importer_name` carries the parser version (`docs/architecture/import_process_flow.md`).

| Status | Tables |
|---|---|
| **Live** (rows today) | `aliases` (2), `authors`, `canonical_books`, `discussions`, `identifier_schemes` (8), `import_jobs`, `import_logs`, `imported_books`, `media_categories` (11), `meetup_attendance`, `meetups` (68), `members`, `removed_members_archive`, `resources`, `sources`, `venues`, `book_relations` (3) |
| **Dormant** (0 rows, kept on purpose) | `book_mentions`, `current_reads`, `discussion_participants`, `edition_identifiers`, `editions`, `genres`, `possible_duplicates`, `publishers`, `quotes`, `recommendations`, `series` (the series table waits for Red Rising, Riftwar, Malazan), `tags`, `validation_errors`, `work_identifiers` |
| **Legacy** (in the database, no model, 0 rows) | `books`, `attachments`: to be dropped (Q9) |

## Still planned (decided 2026-10-09, not yet migrated)

| Change | Why | Decision |
|---|---|---|
| `members.auth_user_id` (nullable) | Links an archive member to a login in `auth.db` | D5 |
| New `audit_log` (`seq`, `at`, `actor`, `action`, `table`, `row_id`, `before`, `after`, `prev_hash`, `hash`) | Hash-chained audit trail of every admin and presenter write | D30 |
| New `idempotency_keys` (`key`, `actor`, `response`, `created_at`) | A presenter retry on weak signal never saves twice | D17 |
| Separate database file `auth.db` (Better Auth tables) | Personal data kept out of the public archive database | D5, D8 |
| Drop `books`, `attachments` | Legacy, empty, no model | Q9 |
| A "human-fixed" flag and parser version on mentions; heading aliases read from `aliases` | A re-import must not overwrite a manual fix | backlog, 2026-10-12 |

Done 2026-10-12 and no longer planned: `meetup_attendance`, `members.status`, `members.member_code`, `members.is_hidden`, media categories as data, `discussions.is_tangent` and `series_id`.

## How to regenerate

Run from the repository root. It imports the models and opens the database read-only, then prints the "Tables" section below:

```python
import sqlite3, sys
sys.path.insert(0, ".")
from app.database.base import Base
import app.database.models  # noqa: F401  (registers the tables)
import app.database.identity_models  # noqa: F401

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

### `aliases` (2 rows)

| Column | Type | Null | Key / index |
|---|---|---|---|
| `entity_type` | VARCHAR(64) | no | index |
| `entity_id` | VARCHAR(36) | no | index |
| `alias_name` | VARCHAR(256) | no | index |
| `id` | VARCHAR(36) | no | PK, index |
| `created_at` | DATETIME | no |  |
| `updated_at` | DATETIME | no |  |

### `authors` (2322 rows)

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

### `book_relations` (3 rows)

| Column | Type | Null | Key / index |
|---|---|---|---|
| `source_book_id` | VARCHAR(36) | no | FK → `canonical_books.id`, index |
| `target_book_id` | VARCHAR(36) | no | FK → `canonical_books.id`, index |
| `relation_type` | VARCHAR(64) | no |  |
| `id` | VARCHAR(36) | no | PK, index |
| `created_at` | DATETIME | no |  |
| `updated_at` | DATETIME | no |  |

### `canonical_books` (2805 rows)

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

### `discussions` (3691 rows)

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
| `is_tangent` | BOOLEAN | no |  |
| `series_id` | VARCHAR(36) | yes | FK → `series.id`, index |
| `source_id` | VARCHAR(36) | yes | FK → `sources.id`, index |
| `id` | VARCHAR(36) | no | PK, index |
| `created_at` | DATETIME | no |  |
| `updated_at` | DATETIME | no |  |

### `edition_identifiers` (0 rows)

| Column | Type | Null | Key / index |
|---|---|---|---|
| `scheme` | VARCHAR(32) | no | PK, FK → `identifier_schemes.scheme` |
| `value` | VARCHAR(64) | no | PK |
| `level` | VARCHAR(8) | no | FK → `identifier_schemes.level` |
| `edition_id` | VARCHAR(36) | no | FK → `editions.id`, index |

### `editions` (0 rows)

| Column | Type | Null | Key / index |
|---|---|---|---|
| `work_id` | VARCHAR(36) | no | FK → `canonical_books.id`, index |
| `publisher_id` | VARCHAR(36) | yes | FK → `publishers.id` |
| `publication_year` | INTEGER | yes |  |
| `identity_basis` | VARCHAR(32) | no | FK → `identifier_schemes.scheme` |
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

### `identifier_schemes` (8 rows)

| Column | Type | Null | Key / index |
|---|---|---|---|
| `scheme` | VARCHAR(32) | no | PK |
| `level` | VARCHAR(8) | no |  |
| `kind` | VARCHAR(16) | no |  |
| `authority_rank` | INTEGER | no |  |

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

### `imported_books` (3839 rows)

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

### `media_categories` (11 rows)

| Column | Type | Null | Key / index |
|---|---|---|---|
| `code` | VARCHAR(32) | no | PK |
| `label` | VARCHAR(64) | no |  |
| `sort_order` | INTEGER | no |  |

### `meetup_attendance` (562 rows)

| Column | Type | Null | Key / index |
|---|---|---|---|
| `meetup_id` | VARCHAR(36) | no | FK → `meetups.id` |
| `member_id` | VARCHAR(36) | no | FK → `members.id`, index |
| `status` | VARCHAR(16) | no |  |
| `source` | VARCHAR(16) | no |  |
| `id` | VARCHAR(36) | no | PK, index |
| `created_at` | DATETIME | no |  |
| `updated_at` | DATETIME | no |  |

### `meetups` (68 rows)

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

### `members` (142 rows)

| Column | Type | Null | Key / index |
|---|---|---|---|
| `display_name` | VARCHAR(256) | no | index |
| `normalized_name` | VARCHAR(256) | no | unique, index |
| `bio` | TEXT | yes |  |
| `is_hidden` | BOOLEAN | no |  |
| `status` | VARCHAR(16) | no |  |
| `member_code` | VARCHAR(16) | yes |  |
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

### `removed_members_archive` (46 rows)

| Column | Type | Null | Key / index |
|---|---|---|---|
| `id` | VARCHAR(36) | no | PK |
| `display_name` | VARCHAR(256) | no |  |
| `normalized_name` | VARCHAR(256) | no |  |
| `bio` | TEXT | yes |  |
| `discussions_snapshot` | TEXT | yes |  |
| `removed_at` | DATETIME | no |  |

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

### `sources` (1835 rows)

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

### `work_identifiers` (0 rows)

| Column | Type | Null | Key / index |
|---|---|---|---|
| `scheme` | VARCHAR(32) | no | PK, FK → `identifier_schemes.scheme` |
| `value` | VARCHAR(64) | no | PK |
| `level` | VARCHAR(8) | no | FK → `identifier_schemes.level` |
| `work_id` | VARCHAR(36) | no | FK → `canonical_books.id`, index |

