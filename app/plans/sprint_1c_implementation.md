# Sprint 1C: Full Historical Archive Ingestion — Implementation Plan

## Executive Summary

Ingest the complete BBB archive (1 TXT file with meetups #4-#54, 25+ PDF files with meetups #70-#98) into the `app/` codebase using a 3-layer canonical architecture (Source → ImportedBook → CanonicalBook), with full provenance tracking, deduplication via review queue, and comprehensive report generation.

---

## Part 1: Design Decisions

### Q1: Should we update `app/database/models.py` to include the 3-layer models?
**A: YES — full replacement.** The existing `Book` model is a flat single-entity that doesn't support deduplication or provenance. We replace it with the canonical `CanonicalBook`, `ImportedBook`, `PossibleDuplicate` trio from `bbb-library/backend/app/models/canonical_book.py`, adapted for sync SQLAlchemy and SQLite. We also add `Venue`, update `Meetup` (add `venue_id` FK, change `date` to `Date` type), update `Discussion` (use `canonical_book_id`), and add `Recommendation`, `CurrentRead`, `Resource`.

### Q2: How should the TXT parser work?
**A: Regex-based boundary detection + format-adaptive book extraction.** Meetup boundaries are delimited by `....BBB Meetup-N` patterns. Book entries use 6+ format variants (see Section 3.1). Parser extracts raw text blocks with line numbers for provenance.

### Q3: How should the PDF parser work?
**A: pdfplumber for text extraction + regex parsing.** PDFs have simpler structure (one page per meetup usually). Use pdfplumber to extract text, then apply similar book-extraction regexes. File naming conventions encode meetup numbers and dates.

### Q4: Should the import pipeline be a single script or CLI command?
**A: CLI command (`archive import-full`) that orchestrates everything.** The pipeline: parse TXT → parse PDFs → resolve canonical books → deduplicate → generate reports. All via the existing Typer CLI.

### Q5: How to handle the SQLite database?
**A: Reinit with `drop_all()` + `create_all()`.** The existing DB has 0 records across 20 tables. We're changing the schema significantly (removing `Book`, adding `CanonicalBook`/`ImportedBook`/`PossibleDuplicate`/`Venue`/etc.), so a clean slate is appropriate.

### Q6: What's the right order of implementation?
**A: 8 phases** (see Part 8 below).

---

## Part 2: Schema Migration — `app/database/models.py`

Replace the current 20-model file with the 3-layer canonical architecture. The file grows from ~347 lines to ~650 lines.

### Models to ADD (new)
| Model | Table | Source Reference |
|-------|-------|------------------|
| `CanonicalBook` | `canonical_books` | `bbb-library/.../canonical_book.py:9-78` |
| `ImportedBook` | `imported_books` | `bbb-library/.../canonical_book.py:81-122` |
| `PossibleDuplicate` | `possible_duplicates` | `bbb-library/.../canonical_book.py:125-156` |
| `Venue` | `venues` | `bbb-library/.../venue.py:9-46` |
| `Recommendation` | `recommendations` | `bbb-library/.../recommendation.py:9-35` |
| `CurrentRead` | `current_reads` | `bbb-library/.../recommendation.py:38-62` |
| `Resource` | `resources` | `bbb-library/.../recommendation.py:65-78` |

### Models to REMOVE (replaced)
| Model | Reason |
|-------|--------|
| `Book` | Replaced by `CanonicalBook` + `ImportedBook` |

### Models to MODIFY
| Model | Changes |
|-------|---------|
| `Source` | Remove: `url`, `html_snapshot_path`, `css_selector`, `xpath`, `metadata_json`. Add: `source_type` (str, default="TXT_ARCHIVE"), `raw_text` (Text, required), `extraction_confidence` (Float, default=1.0). Change: `file_path` to non-nullable, `importer_name` to non-nullable. Add relationship: `imported_books` (1:N). Add composite index `ix_sources_file_meetup`. |
| `Author` | Remove: `birth`, `death`, `aliases`. Make `normalized_name` UNIQUE. Add relationship: `canonical_books` (1:N, replaces `books`). |
| `Publisher` | Add relationship: `canonical_books` (1:N, replaces `books`). |
| `Series` | Add relationship: `canonical_books` (1:N, replaces `books`). |
| `Member` | Remove: `aliases`, `joined_date`. Make `normalized_name` UNIQUE. Add relationship: `recommendations`, `current_reads`. |
| `Meetup` | Change `date` from String to `Date` type. Add: `venue_id` (FK to venues), `format` (str, default="IN_PERSON"), `attendance_count` (int). Make `meetup_number` UNIQUE. Remove: `location` (replaced by venue FK). |
| `Discussion` | Remove: `book_id` FK, `review`, `favorite_quote`, `recommended`, `reading_status`, `pages_read`. Add: `topic`, `sentiment`. Change: `book_id` → `canonical_book_id` (FK to canonical_books). |
| `Quote` | Remove: `source_id`. Change: `book_id` → `canonical_book_id`. |
| `BookMention` | Change: `book_id` → `canonical_book_id`. Remove: `context`. Add: `context_snippet`. |
| `ImportJob` | Change: `started_at`, `completed_at` from String to `DateTime(timezone=True)`. |
| `ImportLog` | Change: `timestamp` from String to `DateTime(timezone=True)`. Change: `details` from JSON to Text. Rename `ValidationErrorRecord` → `ValidationError`. |

### Models UNCHANGED
`Alias`, `Tag`, `Genre`, `DiscussionParticipant`, `BookRelation`

### Base classes unchanged
`app/database/base.py` stays as-is: `Base`, `UUIDMixin`, `TimestampMixin`, `generate_uuid()`, `current_utc_time()`.

---

## Part 3: Parser Design

### 3.1 TXT Parser — `app/parsers/txt_parser.py` (NEW FILE)

#### Meetup Boundary Detection

The TXT file uses `....BBB Meetup-N` as meetup separators, but the delimiter can appear in several forms:

```python
# Primary pattern: "BBB Meetup-N" preceded by optional "...." or "..."
BOUNDARY_PATTERN = re.compile(
    r'(?:^|\.{2,4})BBB\s+Meetup-(\d+)\s*$',
    re.MULTILINE
)
# This matches:
#   "BBB Meetup-9"       (start of file, no dots)
#   "....BBB Meetup-8"   (embedded after previous book list)
#   "...BBB Meetup-5"    (3 dots)
#   "....BBB Meetup-4"   (4 dots, end of line)
```

#### Meetup Header Extraction

After boundary detection, extract structured header from the first 3 lines of each section:

```python
# Line 1: Venue name (or sometimes title)
VENUE_PATTERN = re.compile(
    r'^(?:Atta Galatta|Bookworm|Online|Zoom|Other|BYOB|.*Art Cafe.*)$',
    re.IGNORECASE
)

# Line 2: Date line with optional separator
DATE_PATTERN = re.compile(
    r'(\w+ \d{1,2},?\s*\d{4})\s*[·–-]\s*Broke Bibliophiles Bangalore',
    re.IGNORECASE
)
# Matches: "February 24, 2018 · Broke Bibliophiles Bangalore"
#          "March 27, 2022 · Broke Bibliophiles Bangalore"

# Meetup number extracted from boundary match
MEETUP_NUMBER_PATTERN = re.compile(r'Meetup-?(\d+)')
```

#### Book Line Extraction Patterns

The TXT file contains 6+ book entry formats. The parser applies patterns in priority order:

```python
# Format 1: "Title (by Author)" — e.g., "A Room of One's Own (by Virginia Woolf)"
PATTERN_BY_PARENS = re.compile(
    r'^(.+?)\s+\(by\s+(.+?)\)\s*$'
)

# Format 2: "Title – Author" or "Title - Author" — e.g., "The Reading List – Sara Nisha Adams"
PATTERN_DASH_AUTHOR = re.compile(
    r'^(.+?)\s+[–—-]\s+([A-Z][a-z].+?)\s*$'
)

# Format 3: "Title by Author https://..." — e.g., "Eleanor & Park by Rainbow Rowell https://..."
PATTERN_BY_URL = re.compile(
    r'^(.+?)\s+by\s+(.+?)\s+https?://\S+\s*$'
)

# Format 4: "Title by Author (Series #N)" — e.g., "The Final Empire (Mistborn, #1) by Brandon Sanderson"
PATTERN_SERIES = re.compile(
    r'^(.+?)\s+\((.+?)[,#]\s*#?\d+\)\s+by\s+(.+?)\s*$'
)

# Format 5: "Title - Author" with URL — e.g., "3 body Problem - https://..."
PATTERN_TITLE_URL = re.compile(
    r'^(.+?)\s+[–—-]\s+https?://\S+\s*$'
)

# Format 6: Plain title (no author) — e.g., "Ready Player One"
PATTERN_TITLE_ONLY = re.compile(
    r'^([A-Z].+?)\s*$'
)

# Goodreads URL extraction (embedded in some lines)
GOODREADS_URL_PATTERN = re.compile(
    r'https?://(?:www\.)?goodreads\.com/\S+'
)

# Series extraction from parenthetical
SERIES_PATTERN = re.compile(
    r'\((.+?)[,#]\s*#?\d+\)'
)
```

#### Title Normalization

```python
def normalize_title(title: str) -> str:
    """Lowercase, strip accents, remove non-alphanumeric, collapse spaces."""
    import unicodedata
    import re
    # Normalize unicode
    title = unicodedata.normalize('NFKD', title)
    # Remove accents
    title = ''.join(c for c in title if not unicodedata.combining(c))
    # Lowercase
    title = title.lower()
    # Remove non-alphanumeric (keep spaces)
    title = re.sub(r'[^a-z0-9\s]', '', title)
    # Collapse whitespace
    title = re.sub(r'\s+', ' ', title).strip()
    return title
```

#### Author Name Normalization

```python
def normalize_author(name: str) -> str:
    """Normalize author name for deduplication."""
    import re
    name = name.strip()
    # Remove "by " prefix if present
    name = re.sub(r'^by\s+', '', name, flags=re.IGNORECASE)
    # Remove trailing periods, URLs
    name = re.sub(r'https?://\S+$', '', name).strip()
    # Normalize whitespace
    name = re.sub(r'\s+', ' ', name)
    return name

def normalize_name_for_dedup(name: str) -> str:
    """Strict normalization: lowercase, strip non-alphanumeric."""
    import re, unicodedata
    name = unicodedata.normalize('NFKD', name)
    name = ''.join(c for c in name if not unicodedata.combining(c))
    name = name.lower()
    name = re.sub(r'[^a-z0-9]', '', name)
    return name
```

#### Date Parsing

```python
from datetime import date

def parse_meetup_date(date_str: str) -> date | None:
    """Parse date strings like 'February 24, 2018', '27th Mar 2022', 'Sep 2024'."""
    import re
    formats = [
        '%B %d, %Y',       # February 24, 2018
        '%b %d, %Y',       # Feb 24, 2018
        '%d %B %Y',        # 27 March 2022
        '%d %b %Y',        # 27 Mar 2022
        '%d %B, %Y',       # 27 March, 2022
        '%B %Y',           # March 2022
        '%b %Y',           # Mar 2022
    ]
    # Strip ordinal suffixes: "27th" → "27", "2nd" → "2"
    date_str = re.sub(r'(\d+)(?:st|nd|rd|th)', r'\1', date_str.strip())
    for fmt in formats:
        try:
            return datetime.strptime(date_str.strip(), fmt).date()
        except ValueError:
            continue
    return None
```

#### TXT Parser Class Structure

```python
class TxtMeetupParser(BaseImporter):
    """Parser for BBB Meetup-9.txt archive file."""
    
    importer_name = "txt_meetup_parser_v1"
    
    def parse(self, source_input: str, **kwargs) -> List[IntermediateRecord]:
        """Parse the full TXT file into IntermediateRecord list.
        
        Strategy:
        1. Read entire file as text
        2. Split on BBB Meetup-N boundaries
        3. For each meetup section:
           a. Extract meetup_number, venue, date, description
           b. Extract book lines from narrative
           c. Create one IntermediateRecord per book
           d. Create one IntermediateRecord per meetup (books=None)
        """
        ...
```

### 3.2 PDF Parser — `app/parsers/pdf_parser.py` (NEW FILE)

#### PDF File Naming Conventions

```python
# Filename patterns to extract meetup number and date
FILENAME_PATTERNS = [
    # "70 - BBB Meetup 70 - Mar 2024.pdf"
    re.compile(r'^(\d+)\s*-?\s*BBB\s+(?:Meetup\s+)?(\d+)\s*-?\s*(\w+\s+\d{4})'),
    # "BBB Books Discussed - Aug 2023.pdf"
    re.compile(r'^BBB\s+Books?\s+Discussed?\s*-?\s*(\w+\s+\d{4})', re.I),
    # "BBB #93 Feb 2026, Books Discussed.pdf"
    re.compile(r'^BBB\s*#?(\d+)\s+(\w+\s+\d{4})'),
    # "BBB 85 - Books Discussed.pdf"
    re.compile(r'^BBB\s+(\d+)\s*-?\s*Books?\s+Discussed'),
    # "30_12_2023 15_33.pdf" (date-based, no meetup number)
    re.compile(r'^(\d{2})_(\d{2})_(\d{4})'),
    # "BYOB +BBB - Nov 2023 (25th Nov Meet).pdf"
    re.compile(r'BYOB.*?(\w+\s+\d{4})'),
    # "Books Discussed — BBB JULY 2025.pdf"
    re.compile(r'Books?\s+Discussed?\s*[—–-]\s*BBB\s+(\w+\s+\d{4})', re.I),
    # "BBB AUG 2025 - BOOKS DISCUSSED.pdf"
    re.compile(r'^BBB\s+(\w+\s+\d{4})\s*-?\s*BOOKS?\s+DISCUSSED'),
]
```

#### PDF Text Extraction

```python
import pdfplumber

class PdfMeetupParser(BaseImporter):
    """Parser for BBB PDF meetup files."""
    
    importer_name = "pdf_meetup_parser_v1"
    
    def parse(self, source_input: str, **kwargs) -> List[IntermediateRecord]:
        """Parse a single PDF file into IntermediateRecord list.
        
        Strategy:
        1. Extract text from all pages using pdfplumber
        2. Identify meetup number from filename or content
        3. Extract date from filename or first page
        4. Extract book list entries
        5. Create IntermediateRecord per book
        """
        with pdfplumber.open(source_input) as pdf:
            full_text = ""
            for i, page in enumerate(pdf.pages):
                page_text = page.extract_text() or ""
                full_text += f"\n--- PAGE {i+1} ---\n{page_text}"
        
        # Parse using similar regex patterns as TXT parser
        # But adapted for PDF-specific formatting
        ...
```

### 3.3 Directory Scanner — `app/parsers/scanner.py` (NEW FILE)

```python
class ArchiveScanner:
    """Scan the BBB data directory for all source files."""
    
    def scan(self, data_dir: Path) -> dict:
        """Return dict with 'txt_files' and 'pdf_files' lists."""
        return {
            "txt_files": sorted(data_dir.glob("BBB Meetup*.txt")),
            "pdf_files": sorted(data_dir.glob("*.pdf")),
        }
```

---

## Part 4: Import Pipeline Architecture

### 4.1 Pipeline Overview

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌─────────────┐
│  Scan Files  │────▶│  Parse TXT   │────▶│  Parse PDFs  │────▶│  Normalize  │
│  (scanner)   │     │  (txt_parser)│     │  (pdf_parser)│     │  & Dedup    │
└─────────────┘     └──────────────┘     └──────────────┘     └──────┬──────┘
                                                                     │
                                                                     ▼
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌─────────────┐
│  Generate    │◀────│  Write       │◀────│  Resolve     │◀────│  Create     │
│  Reports     │     │  Canonical   │     │  Duplicates  │     │  Sources    │
│  (reports.py)│     │  Books       │     │  (Levenshtein)│     │  (import)   │
└─────────────┘     └──────────────┘     └──────────────┘     └─────────────┘
```

### 4.2 Pipeline Script — `app/pipeline/full_import.py` (NEW FILE)

```python
class FullArchivePipeline:
    """Orchestrate the complete archive ingestion pipeline."""
    
    def __init__(self, data_dir: Path, db_session: Session):
        self.data_dir = data_dir
        self.session = db_session
        self.stats = PipelineStats()
    
    def run(self) -> PipelineStats:
        """Execute the full pipeline."""
        # Phase 1: Parse all sources
        txt_records = TxtMeetupParser().parse(self.data_dir / "BBB Meetup-9.txt")
        pdf_records = []
        for pdf_path in self.data_dir.glob("*.pdf"):
            pdf_records.extend(PdfMeetupParser().parse(str(pdf_path)))
        
        all_records = txt_records + pdf_records
        
        # Phase 2: Create Source records (Layer 1)
        sources = self._create_sources(all_records)
        
        # Phase 3: Create ImportedBook records (Layer 2)
        imported_books = self._create_imported_books(all_records, sources)
        
        # Phase 4: Create CanonicalBook records (Layer 3)
        canonical_books = self._resolve_canonical_books(imported_books)
        
        # Phase 5: Link ImportedBook → CanonicalBook
        self._link_imported_to_canonical(imported_books, canonical_books)
        
        # Phase 6: Detect duplicates
        self._detect_duplicates(imported_books, canonical_books)
        
        # Phase 7: Create Meetup, Discussion, Member records
        self._create_meetups_and_discussions(all_records, sources, canonical_books)
        
        # Phase 8: Generate reports
        self._generate_reports()
        
        return self.stats
```

### 4.3 Canonical Resolution Strategy

```python
def _resolve_canonical_books(self, imported_books: List[ImportedBook]) -> Dict[str, CanonicalBook]:
    """Group imported books by normalized_title + normalized_author → create one CanonicalBook per group."""
    
    # Step 1: Group by (normalized_title, normalized_author_name)
    groups = defaultdict(list)
    for ib in imported_books:
        norm_title = normalize_title(ib.raw_title)
        norm_author = normalize_author(ib.raw_author or "")
        key = (norm_title, norm_author)
        groups[key].append(ib)
    
    # Step 2: For each group, pick best title variant (longest, most complete)
    canonical_map = {}
    for (norm_title, norm_author), ib_group in groups.items():
        best_ib = max(ib_group, key=lambda ib: len(ib.raw_title))
        
        # Find or create author
        author = self._find_or_create_author(norm_author, best_ib.raw_author)
        
        # Create CanonicalBook
        canonical = CanonicalBook(
            title=best_ib.raw_title,
            normalized_title=norm_title,
            author_id=author.id if author else None,
            sort_title=_compute_sort_title(best_ib.raw_title),
            language="en",
        )
        self.session.add(canonical)
        canonical_map[(norm_title, norm_author)] = canonical
    
    self.session.flush()
    return canonical_map
```

### 4.4 Duplicate Detection Strategy

```python
def _detect_duplicates(self, imported_books, canonical_books):
    """Find possible duplicates using normalized title similarity."""
    from difflib import SequenceMatcher
    
    canonical_list = list(canonical_books.values())
    
    for ib in imported_books:
        if ib.canonical_book_id:  # Already linked
            continue
        
        norm_title = normalize_title(ib.raw_title)
        best_match = None
        best_score = 0.0
        
        for canonical in canonical_list:
            score = SequenceMatcher(None, norm_title, canonical.normalized_title).ratio()
            if score > best_score and score >= 0.7:
                best_score = score
                best_match = canonical
        
        if best_match:
            dup = PossibleDuplicate(
                imported_book_id=ib.id,
                candidate_canonical_id=best_match.id,
                match_confidence=best_score,
                status="PENDING_REVIEW",
            )
            self.session.add(dup)
```

### 4.5 Member Extraction

Members are mentioned in the TXT narrative sections (not book lists). The parser extracts names from patterns like:

```python
# "We had 3 new entrants today in Gokul S Nath, Amay Narayan and Palgun Kj"
MEMBER_PATTERN = re.compile(
    r'(?:new\s+(?:entrant|face|member|attendee)s?\s+|(?:also\s+)?(?:joined|present|came)\s+.*?(?:by|include|are)\s+)'
    r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)',
    re.IGNORECASE
)

# "Aarzu Sadana was awesome enough"
MENTION_PATTERN = re.compile(
    r'([A-Z][a-z]+\s+[A-Z][a-z]+)\s+(?:was|is|has|had|brought|presented|spoke|talked)',
)
```

### 4.6 Venue Extraction

Known venues from the TXT file:
- `Atta Galatta` (most common, 2017-2020)
- `Bookworm` (2022-2023, Church Street)
- `Online` (2020-2021, COVID era)

```python
KNOWN_VENUES = {
    "atta galatta": {"name": "Atta Galatta", "city": "Bengaluru", "is_online": False},
    "bookworm": {"name": "Bookworm", "city": "Bengaluru", "is_online": False},
    "online": {"name": "Online", "city": "Bengaluru", "is_online": True},
}
```

---

## Part 5: Report Generation — `app/reports/generator.py` (NEW FILE)

### 5.1 Reports to Generate

#### Markdown Reports (output: `data/reports/`)

| File | Content |
|------|---------|
| `archive_summary.md` | High-level overview: total meetups, books, authors, date range, venue breakdown |
| `ingestion_report.md` | Per-source breakdown: records parsed, created, failed. Timing. Warnings. |
| `missing_meetups.md` | Identified gaps in meetup numbering (e.g., #55-#69) |
| `duplicate_review_queue.md` | Table of all `PossibleDuplicate` entries with confidence scores |

#### JSON Outputs (output: `data/exports/`)

| File | Content |
|------|---------|
| `archive_manifest.json` | Complete inventory: every meetup, every book, every author with IDs |
| `archive_statistics.json` | Numerical stats: counts, distributions, coverage metrics |
| `timeline.json` | Chronological list of meetups with dates, venues, book counts |

### 5.2 Report Generation Logic

```python
class ReportGenerator:
    def generate_all(self, session: Session, output_dir: Path):
        output_dir.mkdir(parents=True, exist_ok=True)
        self._archive_summary(session, output_dir / "archive_summary.md")
        self._ingestion_report(session, output_dir / "ingestion_report.md")
        self._missing_meetups(session, output_dir / "missing_meetups.md")
        self._duplicate_review_queue(session, output_dir / "duplicate_review_queue.md")
        self._archive_manifest(session, output_dir / "archive_manifest.json")
        self._archive_statistics(session, output_dir / "archive_statistics.json")
        self._timeline(session, output_dir / "timeline.json")
```

---

## Part 6: CLI Updates — `app/cli/main.py`

### Commands to Update

| Command | Change |
|---------|--------|
| `init-db` | No change needed (uses `init_db()` which reads current models) |
| `stats` | Update model list: replace `Book` with `CanonicalBook`, `ImportedBook`, `PossibleDuplicate`. Add `Venue`, `Recommendation`, `CurrentRead`, `Resource`. |
| `import` | Replace placeholder with real implementation: `archive import-full` |

### New CLI Command

```python
@app.command("import-full")
def cmd_import_full(
    data_dir: str = typer.Option(".", help="Directory containing archive files"),
    reset: bool = typer.Option(False, "--reset", help="Drop and recreate all tables before import"),
    dry_run: bool = typer.Option(False, "--dry-run", help="Parse and report without writing to DB"),
):
    """Full archive import: parse all TXT + PDF sources into canonical database."""
    ...
```

---

## Part 7: Intermediate Schema Updates — `app/schemas/intermediate.py`

Add fields to support 3-layer architecture:

```python
class IntermediateSource(BaseModel):
    # Existing fields stay
    # Add:
    source_type: str = "TXT_ARCHIVE"
    raw_text: str = ""
    extraction_confidence: float = 1.0

class IntermediateBook(BaseModel):
    # Existing fields stay
    # Add:
    goodreads_url: Optional[str] = None
    series_name: Optional[str] = None
    series_number: Optional[int] = None
```

---

## Part 8: Implementation Order

### Phase 1: Schema Foundation (estimated: 1-2 hours)
1. **`app/database/models.py`** — Full rewrite with 3-layer models
2. **`app/schemas/intermediate.py`** — Add `source_type`, `raw_text`, `goodreads_url`, series fields
3. **`app/core/database.py`** — Add `reset_db()` function (drop_all + create_all)
4. **Verify**: Run `python -c "from app.database.models import *"` to confirm no import errors

### Phase 2: Utility Functions (estimated: 30 min)
1. **`app/parsers/__init__.py`** — Package init
2. **`app/parsers/utils.py`** — `normalize_title()`, `normalize_author()`, `normalize_name_for_dedup()`, `parse_meetup_date()`, `extract_goodreads_url()`
3. **Verify**: Unit test each utility function

### Phase 3: TXT Parser (estimated: 2-3 hours)
1. **`app/parsers/txt_parser.py`** — Full `TxtMeetupParser(BaseImporter)` class
2. Test against `BBB Meetup-9.txt` — verify extraction of all 51 meetups
3. Verify book line format detection across all variants

### Phase 4: PDF Parser (estimated: 2-3 hours)
1. **`app/parsers/pdf_parser.py`** — Full `PdfMeetupParser(BaseImporter)` class
2. **`app/parsers/scanner.py`** — `ArchiveScanner` for file discovery
3. Test against 3-4 representative PDFs first, then all

### Phase 5: Import Pipeline (estimated: 3-4 hours)
1. **`app/pipeline/__init__.py`** — Package init
2. **`app/pipeline/full_import.py`** — `FullArchivePipeline` class
3. Implement: source creation, imported book creation, canonical resolution, duplicate detection, meetup/discussion creation
4. Test end-to-end with `--dry-run`

### Phase 6: Report Generation (estimated: 1-2 hours)
1. **`app/reports/__init__.py`** — Package init
2. **`app/reports/generator.py`** — `ReportGenerator` class
3. Generate all 7 output files

### Phase 7: CLI Integration (estimated: 30 min)
1. **`app/cli/main.py`** — Implement `import-full` command, update `stats`
2. Test full CLI flow: `python -m app.cli.main init-db && python -m app.cli.main import-full`

### Phase 8: Final Validation (estimated: 1 hour)
1. Run full pipeline on complete archive
2. Verify report contents
3. Verify database integrity (no orphans, FK constraints valid)
4. Create `data/exports/archive_manifest.json` with full inventory

---

## Part 9: File Manifest (all files to create or modify)

### Files to CREATE
| File | Purpose |
|------|---------|
| `app/parsers/__init__.py` | Package init |
| `app/parsers/utils.py` | Normalization and parsing utilities |
| `app/parsers/txt_parser.py` | TXT archive parser |
| `app/parsers/pdf_parser.py` | PDF document parser |
| `app/parsers/scanner.py` | File discovery scanner |
| `app/pipeline/__init__.py` | Package init |
| `app/pipeline/full_import.py` | Full import orchestration pipeline |
| `app/reports/__init__.py` | Package init |
| `app/reports/generator.py` | Report generation (7 output files) |

### Files to MODIFY
| File | Change Summary |
|------|----------------|
| `app/database/models.py` | Full rewrite: 3-layer architecture (27 models, ~650 lines) |
| `app/schemas/intermediate.py` | Add fields for 3-layer support (~20 lines added) |
| `app/cli/main.py` | Implement `import-full`, update `stats` (~100 lines added) |
| `app/core/database.py` | Add `reset_db()` function (~10 lines added) |

### Files UNCHANGED
| File | Reason |
|------|--------|
| `app/database/base.py` | Already has Base, UUIDMixin, TimestampMixin |
| `app/core/config.py` | Already has DATABASE_URL, DATA_DIR |
| `app/core/logging.py` | Already configured |
| `app/importers/base.py` | Already has BaseImporter interface |

---

## Part 10: Testing Strategy

### Unit Tests
- `tests/test_utils.py` — Test all normalization functions, date parsing
- `tests/test_txt_parser.py` — Test boundary detection, book extraction for each format variant
- `tests/test_pdf_parser.py` — Test filename parsing, text extraction

### Integration Tests
- `tests/test_pipeline.py` — Test full pipeline with a subset (2-3 meetups)
- `tests/test_reports.py` — Verify report output format and content

### Validation Queries (manual)
```sql
-- Verify 3-layer architecture
SELECT COUNT(*) FROM sources;
SELECT COUNT(*) FROM imported_books;
SELECT COUNT(*) FROM canonical_books;
SELECT COUNT(*) FROM possible_duplicates WHERE status = 'PENDING_REVIEW';

-- Verify no orphaned records
SELECT COUNT(*) FROM imported_books WHERE source_id NOT IN (SELECT id FROM sources);
SELECT COUNT(*) FROM canonical_books WHERE id NOT IN (SELECT canonical_book_id FROM imported_books WHERE canonical_book_id IS NOT NULL);

-- Verify meetup coverage
SELECT meetup_number FROM meetups ORDER BY meetup_number;
```

---

## Part 11: Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Book line format variants missed | Parser logs unparseable lines; `unparsed_lines.txt` report |
| PDF text extraction garbled | Fall back to filename-only metadata; log warnings |
| Duplicate detection too aggressive | Conservative threshold (0.7); most go to PENDING_REVIEW |
| SQLite schema migration breaks existing data | DB has 0 records; clean reinit is safe |
| Memory usage on 2143-line TXT file | Negligible; file fits in memory easily |
