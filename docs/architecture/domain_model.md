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

Below are the domain entities. The implemented set is 24 tables in `app/database/models.py` (corrected 2026-10-09; an earlier version said 21 entities in `bbb-library/backend/app/models/`, a path that does not exist). Column-level detail: `DatabaseSchema.md`.

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
- **Purpose**: Candidate matching queue holding fuzzy match results for human review. Similarity is `difflib.SequenceMatcher` ratio, in two bands decided 2026-10-09 (Q6): 0.90 and above is "likely", 0.75 to 0.90 is "possible"; nothing merges automatically. The code today uses one 0.75 threshold and the comparison never runs (finding RC1, `docs/health/error_handling.md`), so the table has 0 rows.
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

## 4. Future Extensibility

- **Vector Search / AI Librarian**: Add a `vector_embedding` column (`Vector(1536)` via `pgvector`) to `CanonicalBook` and `Discussion` without modifying foreign key schemas.
- **3D Closet Assets**: Add `model_3d_url`, `spine_color`, and `texture_atlas_coords` to `CanonicalBook` to power the React Three Fiber virtual bookshelf canvas.

> **Note (2026-10-08):** Three.js / React Three Fiber here is a plan from an earlier sprint. The live closet uses CSS 3D. WebGL is a future option for the closet only, after the admission rule in `docs/BBB_PRD_TRD.md` §7.1 (see §18.1).

---

## 5. Additions decided 2026-10-09

Decisions and sources: `imperative_decisions.md` §6.

### Attendance and the member lifecycle (D9, D10)

- **`MeetupAttendance`** (planned): one row per person per meetup, with `status` (registered, attended, presenter) and `source` (presenter form, Google Forms). A Google Forms registration arrives as `registered`; the presenter ticks who actually came.
- **Attendee to member:** a `Member` row exists for everyone recorded; `members.status` is `attendee` or `member`. The rule for a member is: attended at least twice **and** part of the WhatsApp group. The app computes the first half and suggests the promotion; the presenter confirms the second half. Nothing flips automatically.
- **New attendee / rejoiner:** derived counts over `MeetupAttendance` (first attendance; second attendance after a gap), shown on the presenter's meetup summary.

### Inflows into the layers (D4)

```text
Presenter form (meetups from #100) ──┐
Old PDFs and OCR backfill ───────────┼──► Layer 2 (staging + review queue) ──► Layer 3 (canonical)
LLM or enrichment suggestions ───────┘                                         │
                                                                               └──► meetup PDF generated from the form
```

Every inflow enters Layer 2 first; only a reviewed or rule-confirmed record reaches Layer 3. An LLM or OCR result is never written to Layer 3 directly.

### Identity rules (Q7, Q10)

- A book is a work (FRBR, `flow_comparison.md` §6.2): the same title by a different author is a separate book by default. The review queue may merge two records with a founder's approval.
- The 27 title and 106 author duplicate groups go through the review queue, approved one by one; old name forms are kept as `Alias` rows (authority-file rule, `flow_comparison.md` §6.2 item 5).

### Accounts (D5, D8)

- A person's login lives in a separate database file, `auth.db`. The archive keeps only `members.auth_user_id` (planned, nullable). The archive's names and notes are public by intent; email addresses and passkeys are not.

### OAIS mapping

Raw import = Submission package (SIP), canonical record = Archival package (AIP), API response = Dissemination package (DIP). Details: `flow_comparison.md` §6.2 item 10.
