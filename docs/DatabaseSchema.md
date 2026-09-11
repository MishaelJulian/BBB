# Book Club Archivist - Database Schema Specification

The canonical storage layer uses SQLAlchemy 2.0 ORM with primary key UUIDs for all entities.

## Primary Entities

### 1. `books`
- `id`: UUID (Primary Key)
- `title`: String(512), Indexed
- `subtitle`: String(512)
- `sort_title`: String(512), Indexed
- `author_id`: Foreign Key (`authors.id`)
- `publisher_id`: Foreign Key (`publishers.id`)
- `series_id`: Foreign Key (`series.id`)
- `isbn10`: String(10), Indexed
- `isbn13`: String(13), Indexed
- `asin`: String(20)
- `language`: String(32)
- `translator`: String(256)
- `publisher`: String(256)
- `publication_year`: Integer
- `edition`: String(128)
- `page_count`: Integer
- `cover_url`: String(1024)
- `thumbnail_url`: String(1024)
- `description`: Text
- `genres`: JSON
- `subjects`: JSON
- `series`: String(256)
- `volume`: String(64)
- `goodreads_id`: String(64), Indexed
- `google_books_id`: String(64), Indexed
- `openlibrary_id`: String(64), Indexed
- `rating`: Float
- `created_at`: DateTime (UTC)
- `updated_at`: DateTime (UTC)

### 2. `authors`
- `id`: UUID (Primary Key)
- `full_name`: String(256), Indexed
- `normalized_name`: String(256), Indexed
- `birth`: String(64)
- `death`: String(64)
- `country`: String(128)
- `description`: Text
- `aliases`: JSON
- `created_at`, `updated_at`: DateTime (UTC)

### 3. `members`
- `id`: UUID (Primary Key)
- `display_name`: String(256), Indexed
- `normalized_name`: String(256), Indexed
- `joined_date`: String(64)
- `bio`: Text
- `aliases`: JSON
- `created_at`, `updated_at`: DateTime (UTC)

### 4. `meetups`
- `id`: UUID (Primary Key)
- `meetup_number`: Integer, Indexed
- `date`: String(64), Indexed
- `title`: String(256)
- `location`: String(256)
- `description`: Text
- `source_id`: Foreign Key (`sources.id`)
- `created_at`, `updated_at`: DateTime (UTC)

### 5. `discussions`
- `id`: UUID (Primary Key)
- `book_id`: Foreign Key (`books.id`)
- `member_id`: Foreign Key (`members.id`)
- `meetup_id`: Foreign Key (`meetups.id`)
- `source_id`: Foreign Key (`sources.id`)
- `rating`: Float
- `review`: Text
- `notes`: Text
- `favorite_quote`: Text
- `recommended`: Boolean
- `reading_status`: String(64)
- `pages_read`: Integer
- `confidence_score`: Float (default 1.0)
- `created_at`, `updated_at`: DateTime (UTC)

### 6. `sources`
- `id`: UUID (Primary Key)
- `url`: String(2048)
- `file_path`: String(1024)
- `html_snapshot_path`: String(1024)
- `pdf_page`: Integer
- `paragraph_index`: Integer
- `css_selector`: String(512)
- `xpath`: String(512)
- `start_line`: Integer
- `end_line`: Integer
- `timestamp`: String(128)
- `importer_name`: String(128)
- `metadata_json`: JSON
- `created_at`, `updated_at`: DateTime (UTC)

### Auxiliary & Operational Tables
- `quotes`: Extracted quotes linked to discussions, books, members, and sources.
- `genres`, `publishers`, `series`, `tags`: Taxonomic classifications.
- `attachments`: File attachments with mime-types and provenance links.
- `aliases`: Multi-entity alternate name lookup table.
- `discussion_participants`: Join table for member attendance and roles in discussions.
- `book_mentions`: Books referenced outside main selection.
- `book_relations`: Graph edges between related books.
- `import_jobs`, `import_logs`, `validation_errors`: Auditing, logging, and validation tracking.
