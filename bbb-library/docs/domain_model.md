# Domain Model Specification — BBB Library

**Project**: Broke Bibliophiles Bangalore (BBB) Archive  
**Version**: 1.0  
**Status**: Formal Domain Model Specification  

---

## 1. Overview & Architecture

The **BBB Library Domain Architecture** implements a **three-layer archival model** designed for long-term historical preservation, rigorous provenance tracking, and auditability.

```text
[ Layer 1: Source (Immutable Provenance) ]
                  │
                  ▼
[ Layer 2: ImportedBook & PossibleDuplicate (Staging & Review Queue) ]
                  │
                  ▼
[ Layer 3: Canonical Archive Models (CanonicalBook, Author, Meetup, Discussion) ]
```

---

## 2. Entity Specifications

Below is the complete inventory of all **21 domain entities** implemented in `bbb-library/backend/app/models/`.

### Layer 1 — Provenance Model
#### `Source`
- **Purpose**: Stores exact unedited text snippets, file paths, PDF pages, line ranges, and extraction confidence.
- **Attributes**: `id` (UUID string), `file_path` (String), `source_type` (Enum), `meetup_number` (Int, Nullable), `pdf_page` (Int, Nullable), `paragraph_index` (Int, Nullable), `start_line` (Int, Nullable), `end_line` (Int, Nullable), `extraction_confidence` (Float), `raw_text` (Text), `importer_name` (String), `created_at`, `updated_at`.
- **Relationships**:
  - `meetups` (1:N with `Meetup`, cascade delete)
  - `imported_books` (1:N with `ImportedBook`, cascade delete)
  - `discussions` (1:N with `Discussion`)

---

### Layer 2 — Staging & Review Queue Models
#### `ImportedBook`
- **Purpose**: Represents un-normalized raw book title/author strings extracted directly from sources before canonical resolution.
- **Attributes**: `id`, `raw_title`, `raw_author`, `normalized_title`, `source_id` (FK to `Source`), `canonical_book_id` (FK to `CanonicalBook`, Nullable).
- **Relationships**:
  - `source` (Many-to-1 with `Source`)
  - `canonical_book` (Many-to-1 with `CanonicalBook`)
  - `duplicates` (1:N with `PossibleDuplicate`, cascade delete)

#### `PossibleDuplicate`
- **Purpose**: Candidate matching queue holding fuzzy match results ($\ge 85\%$ Levenshtein similarity) for human or rule-based review.
- **Attributes**: `id`, `imported_book_id` (FK to `ImportedBook`), `candidate_canonical_id` (FK to `CanonicalBook`), `match_confidence` (Float), `status` (`PENDING_REVIEW`, `APPROVED`, `REJECTED`, `AUTO_MERGED`).
- **Relationships**:
  - `imported_book` (Many-to-1 with `ImportedBook`)
  - `candidate_canonical` (Many-to-1 with `CanonicalBook`)

---

### Layer 3 — Canonical Domain Models
#### `CanonicalBook`
- **Purpose**: Single verified source of truth for a literary work.
- **Attributes**: `id`, `title`, `normalized_title`, `subtitle`, `sort_title`, `author_id` (FK), `publisher_id` (FK), `series_id` (FK), `isbn10`, `isbn13`, `asin`, `language`, `publication_year`, `page_count`, `cover_url`, `thumbnail_url`, `description`, `goodreads_id`, `openlibrary_id`, `google_books_id`, `rating`.
- **Relationships**:
  - `author` (Many-to-1 with `Author`)
  - `publisher` (Many-to-1 with `Publisher`)
  - `series` (Many-to-1 with `Series`)
  - `discussions` (1:N with `Discussion`)
  - `recommendations` (1:N with `Recommendation`)
  - `current_reads` (1:N with `CurrentRead`)

#### `Author`
- **Purpose**: Literary creator entity.
- **Attributes**: `id`, `full_name`, `normalized_name` (Unique), `country`, `description`.
- **Relationships**: `canonical_books` (1:N with `CanonicalBook`).

#### `Venue`
- **Purpose**: Location where meetups were held (in-person or online).
- **Attributes**: `id`, `name` (Unique), `city`, `address`, `is_online` (Boolean).
- **Relationships**: `meetups` (1:N with `Meetup`).

#### `Meetup`
- **Purpose**: Historical meetup event.
- **Attributes**: `id`, `meetup_number` (Unique Int), `date` (Date), `title`, `venue_id` (FK), `format`, `attendance_count`, `description`, `source_id` (FK).
- **Relationships**:
  - `venue` (Many-to-1 with `Venue`)
  - `source` (Many-to-1 with `Source`)
  - `discussions` (1:N with `Discussion`)
  - `recommendations` (1:N with `Recommendation`)
  - `current_reads` (1:N with `CurrentRead`)
  - `resources` (1:N with `Resource`)

#### `Discussion`
- **Purpose**: Central event junction capturing a book review or thematic presentation during a meetup.
- **Attributes**: `id`, `meetup_id` (FK), `canonical_book_id` (FK, Nullable), `member_id` (FK, Nullable), `topic`, `notes`, `rating`, `sentiment`, `confidence_score`, `source_id` (FK).
- **Relationships**:
  - `meetup` (Many-to-1 with `Meetup`)
  - `canonical_book` (Many-to-1 with `CanonicalBook`)
  - `member` (Many-to-1 with `Member`)
  - `source` (Many-to-1 with `Source`)
  - `quotes` (1:N with `Quote`)
  - `mentions` (1:N with `BookMention`)
  - `participants` (1:N with `DiscussionParticipant`)

#### `Member`
- **Purpose**: BBB member, presenter, or organizer.
- **Attributes**: `id`, `display_name`, `normalized_name` (Unique), `bio`.
- **Relationships**: `discussions`, `recommendations`, `current_reads` (1:N).

#### `Alias`
- **Purpose**: Universal alias mapping for name/title variations.
- **Attributes**: `id`, `entity_type` (`MEMBER`, `AUTHOR`, `BOOK`), `entity_id`, `alias_name`.

#### `Recommendation`
- **Purpose**: Explicit book recommendation made during a meetup.
- **Attributes**: `id`, `meetup_id` (FK), `canonical_book_id` (FK), `recommender_id` (FK), `context`.

#### `CurrentRead`
- **Purpose**: Active reading status declared during meetup introductions.
- **Attributes**: `id`, `meetup_id` (FK), `canonical_book_id` (FK), `member_id` (FK), `status`.

#### `Resource`
- **Purpose**: External URLs (Goodreads, Notion, blogs) associated with a meetup.
- **Attributes**: `id`, `meetup_id` (FK), `url`, `title`, `resource_type`.

#### `Publisher`, `Series`, `Genre`, `Tag`, `BookRelation`, `DiscussionParticipant`, `BookMention`, `Quote`
- Cleanly normalized supporting entities.

#### `ImportJob`, `ImportLog`, `ValidationError`
- Enterprise-grade ingestion job tracking and audit log models.

---

## 3. Relationship Explanations

1. **`CanonicalBook` $\leftrightarrow$ `Discussion` (1:N)**:
   - *Why*: One book can be discussed at multiple meetups over several years. We avoid flattening discussion notes into the book entity.
2. **`Meetup` $\leftrightarrow$ `Discussion` (1:N)**:
   - *Why*: A single meetup contains 5 to 50 distinct book discussions.
3. **`Source` $\leftrightarrow$ `ImportedBook` & `Meetup` (1:N)**:
   - *Why*: Every extracted fact traces back to its exact source file and line boundary.
4. **`CanonicalBook` $\leftrightarrow$ `PossibleDuplicate` $\leftrightarrow$ `ImportedBook` (Review Queue Junction)**:
   - *Why*: Allows candidate duplicate titles to be held for review without corrupting the canonical index or discarding raw inputs.

---

## 5. Future Extensibility

- **Vector Search / AI Librarian**: Add a `vector_embedding` column (`Vector(1536)` via `pgvector`) to `CanonicalBook` and `Discussion` without modifying foreign key schemas.
- **3D Closet Assets**: Add `model_3d_url`, `spine_color`, and `texture_atlas_coords` to `CanonicalBook` to power the React Three Fiber virtual bookshelf canvas.
