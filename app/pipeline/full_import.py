import json
import re
from collections import defaultdict
from datetime import datetime
from difflib import SequenceMatcher
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.database.models import (
    Source,
    Author,
    Venue,
    Member,
    CanonicalBook,
    ImportedBook,
    PossibleDuplicate,
    Meetup,
    Discussion,
    Resource,
    ImportJob,
    ImportLog,
)
from app.parsers.txt_parser import TxtMeetupParser
from app.parsers.pdf_parser import PdfMeetupParser
from app.parsers.scanner import ArchiveScanner
from app.parsers.utils import (
    normalize_title,
    normalize_author,
    normalize_name_for_dedup,
    parse_meetup_date,
    compute_sort_title,
)
from app.schemas.intermediate import IntermediateRecord


class PipelineStats:
    """Track pipeline execution statistics."""

    def __init__(self):
        self.sources_created = 0
        self.imported_books_created = 0
        self.canonical_books_created = 0
        self.duplicates_detected = 0
        self.meetups_created = 0
        self.discussions_created = 0
        self.members_created = 0
        self.venues_created = 0
        self.authors_created = 0
        self.resources_created = 0
        self.warnings = []
        self.errors = []


class FullArchivePipeline:
    """Orchestrate the complete archive ingestion pipeline."""

    def __init__(self, data_dir: Path, session: Session):
        self.data_dir = data_dir
        self.session = session
        self.stats = PipelineStats()
        self._venue_cache: Dict[str, Venue] = {}
        self._author_cache: Dict[str, Author] = {}
        self._member_cache: Dict[str, Member] = {}
        self._canonical_cache: Dict[Tuple[str, str], CanonicalBook] = {}

    def run(self) -> PipelineStats:
        """Execute the full pipeline."""
        start_time = datetime.now()

        # Create import job
        job = ImportJob(
            source_type="FULL_ARCHIVE",
            status="RUNNING",
            started_at=start_time.isoformat(),
        )
        self.session.add(job)
        self.session.flush()

        try:
            # Phase 1: Parse all sources
            self._log(job, "INFO", "Parsing TXT archive...")
            txt_records = TxtMeetupParser().parse(str(self.data_dir / "BBB Meetup-9.txt"))

            self._log(job, "INFO", "Parsing PDF files...")
            pdf_records = []
            scanner = ArchiveScanner()
            files = scanner.scan(self.data_dir)
            for pdf_path in files["pdf_files"]:
                try:
                    parser = PdfMeetupParser()
                    pdf_records.extend(parser.parse(str(pdf_path)))
                except Exception as e:
                    self.stats.warnings.append(f"Failed to parse {pdf_path.name}: {e}")
                    self._log(job, "WARNING", f"Failed to parse {pdf_path.name}: {e}")

            all_records = txt_records + pdf_records
            self._log(job, "INFO", f"Total records parsed: {len(all_records)}")

            # Phase 2: Pre-seed venues
            self._seed_venues()

            # Phase 3: Create sources and meetup records
            self._log(job, "INFO", "Creating sources and meetups...")
            self._create_sources_and_meetups(all_records)

            # Phase 4: Create authors, members, and imported books
            self._log(job, "INFO", "Creating authors, members, and imported books...")
            self._create_authors_members_books(all_records)

            # Phase 5: Resolve canonical books
            self._log(job, "INFO", "Resolving canonical books...")
            self._resolve_canonical_books()

            # Phase 6: Detect duplicates (BEFORE linking)
            self._log(job, "INFO", "Detecting duplicates...")
            self._detect_duplicates()

            # Phase 7: Link imported books to canonical
            self._log(job, "INFO", "Linking imported to canonical...")
            self._link_imported_to_canonical()

            # Phase 8: Merge canonical book duplicates
            self._log(job, "INFO", "Merging canonical duplicates...")
            self._merge_canonical_duplicates()

            # Phase 9: Create discussions and resources
            self._log(job, "INFO", "Creating discussions and resources...")
            self._create_discussions_and_resources(all_records)

            # Complete job
            end_time = datetime.now()
            job.status = "COMPLETED"
            job.completed_at = end_time.isoformat()
            job.total_items = len(all_records)
            job.processed_items = self.stats.imported_books_created
            job.error_count = len(self.stats.errors)

            self.session.commit()

            elapsed = (end_time - start_time).total_seconds()
            self._log(job, "INFO", f"Pipeline completed in {elapsed:.1f}s")

        except Exception as e:
            job.status = "FAILED"
            self.session.rollback()
            raise

        return self.stats

    def _log(self, job: ImportJob, level: str, message: str):
        """Add a log entry."""
        log = ImportLog(
            job_id=job.id,
            log_level=level,
            message=message,
            timestamp=datetime.now().isoformat(),
        )
        self.session.add(log)

    def _seed_venues(self):
        """Pre-seed known venues."""
        venues = [
            ("Atta Galatta", "Bengaluru", False),
            ("Bookworm", "Bengaluru", False),
            ("Online", "Bengaluru", True),
            ("Art Studio, Koramangala", "Bengaluru", False),
        ]
        for name, city, is_online in venues:
            existing = self.session.query(Venue).filter_by(name=name).first()
            if not existing:
                venue = Venue(name=name, city=city, is_online=is_online)
                self.session.add(venue)
                self._venue_cache[name.lower()] = venue
                self.stats.venues_created += 1
            else:
                self._venue_cache[name.lower()] = existing

        self.session.flush()

    def _find_or_create_venue(self, name: str) -> Optional[Venue]:
        """Find or create a venue by name."""
        if not name or name == "Unknown":
            return None
        key = name.lower()
        if key in self._venue_cache:
            return self._venue_cache[key]
        venue = self.session.query(Venue).filter(Venue.name.ilike(f"%{name}%")).first()
        if venue:
            self._venue_cache[key] = venue
            return venue
        venue = Venue(name=name, city="Bengaluru", is_online=(name == "Online"))
        self.session.add(venue)
        self._venue_cache[key] = venue
        self.stats.venues_created += 1
        return venue

    def _find_or_create_author(self, full_name: str) -> Optional[Author]:
        """Find or create an author by name."""
        if not full_name:
            return None
        norm = normalize_name_for_dedup(full_name)
        if norm in self._author_cache:
            return self._author_cache[norm]
        author = self.session.query(Author).filter_by(normalized_name=norm).first()
        if author:
            self._author_cache[norm] = author
            return author
        author = Author(full_name=full_name.strip(), normalized_name=norm)
        self.session.add(author)
        self._author_cache[norm] = author
        self.stats.authors_created += 1
        return author

    def _find_or_create_member(self, display_name: str) -> Optional[Member]:
        """Find or create a member by name."""
        if not display_name:
            return None
        norm = normalize_name_for_dedup(display_name)
        if norm in self._member_cache:
            return self._member_cache[norm]
        member = self.session.query(Member).filter_by(normalized_name=norm).first()
        if member:
            self._member_cache[norm] = member
            return member
        member = Member(display_name=display_name.strip(), normalized_name=norm)
        self.session.add(member)
        self._member_cache[norm] = member
        self.stats.members_created += 1
        return member

    def _create_sources_and_meetups(self, records: List[IntermediateRecord]):
        """Create Source and Meetup records from parsed data."""
        meetup_records = {}  # meetup_number -> (Source, Meetup)

        for rec in records:
            if rec.meetup and rec.book is None and rec.member is None:
                # This is a meetup-level record
                num = rec.meetup.meetup_number
                if num and num not in meetup_records:
                    # Create source
                    source = Source(
                        file_path=rec.source.file_path,
                        source_type=rec.source.source_type,
                        meetup_number=num,
                        pdf_page=rec.source.pdf_page,
                        start_line=rec.source.start_line,
                        end_line=rec.source.end_line,
                        extraction_confidence=rec.source.extraction_confidence,
                        raw_text=rec.source.raw_text[:2000],
                        importer_name=rec.source.importer_name,
                    )
                    self.session.add(source)
                    self.stats.sources_created += 1

                    # Create meetup
                    parsed_date = parse_meetup_date(rec.meetup.date) if rec.meetup.date else None
                    venue = self._find_or_create_venue(rec.meetup.location) if rec.meetup.location else None
                    fmt = rec.meetup.format if rec.meetup.format else "IN_PERSON"

                    meetup = Meetup(
                        meetup_number=num,
                        date=parsed_date,
                        title=rec.meetup.title,
                        venue_id=venue.id if venue else None,
                        format=fmt,
                        description=rec.meetup.description[:1000] if rec.meetup.description else None,
                        source_id=source.id,
                    )
                    self.session.add(meetup)
                    self.stats.meetups_created += 1
                    meetup_records[num] = (source, meetup)

        self.session.flush()

    def _create_authors_members_books(self, records: List[IntermediateRecord]):
        """Create Author, Member, and ImportedBook records."""
        for rec in records:
            # Create author
            if rec.author and rec.author.full_name:
                self._find_or_create_author(rec.author.full_name)

            # Create member
            if rec.member and rec.member.display_name:
                self._find_or_create_member(rec.member.display_name)

            # Create imported book
            if rec.book and rec.book.title:
                norm_title = normalize_title(rec.book.title)
                # Skip very short or noise titles
                if len(norm_title) < 2:
                    continue

                source = self.session.query(Source).filter_by(
                    file_path=rec.source.file_path,
                    start_line=rec.source.start_line,
                ).first()

                if not source:
                    # Create a minimal source for this book
                    source = Source(
                        file_path=rec.source.file_path,
                        source_type=rec.source.source_type,
                        meetup_number=rec.source.meetup_number,
                        extraction_confidence=rec.source.extraction_confidence,
                        raw_text=rec.source.raw_text[:500],
                        importer_name=rec.source.importer_name,
                    )
                    self.session.add(source)
                    self.session.flush()
                    self.stats.sources_created += 1

                # Resolve author
                author = None
                if rec.book.author_name:
                    author = self._find_or_create_author(rec.book.author_name)

                imported = ImportedBook(
                    raw_title=rec.book.title.strip(),
                    raw_author=rec.book.author_name.strip() if rec.book.author_name else None,
                    normalized_title=norm_title,
                    source_id=source.id,
                )
                self.session.add(imported)
                self.stats.imported_books_created += 1

        self.session.flush()

    # Noise patterns to filter out during canonical book creation
    NOISE_PATTERNS = re.compile(
        r"^(?:books?\s*(?:discussed|mentioned|read)?|"
        r"other\s+related\s+mentions?|"
        r"general\s+mentions?|"
        r"new\s+entrants?|"
        r"aaanyway.*|"
        r":d|\.\.\.|---|"
        r"\)$|"
        r"^[a-z]{1,2}$)",
        re.IGNORECASE,
    )

    def _is_noise_title(self, normalized_title: str, raw_title: str) -> bool:
        """Check if a title is noise (headers, formatting artifacts, etc.)."""
        # Too short
        if len(normalized_title) < 3:
            return True
        # Matches noise patterns
        if self.NOISE_PATTERNS.match(normalized_title):
            return True
        # Raw title is too short
        if len(raw_title.strip()) < 3:
            return True
        return False

    def _resolve_canonical_books(self):
        """Group imported books by (normalized_title, normalized_author) and create canonical books."""
        imported_books = self.session.query(ImportedBook).all()

        # Group by (normalized_title, normalized_author_name)
        groups = defaultdict(list)
        skipped_noise = 0
        for ib in imported_books:
            # Skip noise titles
            if self._is_noise_title(ib.normalized_title, ib.raw_title):
                skipped_noise += 1
                continue
            norm_author = normalize_name_for_dedup(ib.raw_author) if ib.raw_author else ""
            key = (ib.normalized_title, norm_author)
            groups[key].append(ib)

        if skipped_noise > 0:
            self.stats.warnings.append(f"Skipped {skipped_noise} noise entries during canonical resolution")

        for (norm_title, norm_author), ib_group in groups.items():
            # Pick best title variant (longest)
            best_ib = max(ib_group, key=lambda ib: len(ib.raw_title))

            # Find or create author
            author = None
            if best_ib.raw_author:
                author = self._find_or_create_author(best_ib.raw_author)

            # Create canonical book
            canonical = CanonicalBook(
                title=best_ib.raw_title,
                normalized_title=norm_title,
                author_id=author.id if author else None,
                sort_title=compute_sort_title(best_ib.raw_title),
                language="en",
            )
            self.session.add(canonical)
            self._canonical_cache[(norm_title, norm_author)] = canonical
            self.stats.canonical_books_created += 1

        self.session.flush()

    def _link_imported_to_canonical(self):
        """Link each imported book to its canonical book."""
        imported_books = self.session.query(ImportedBook).all()

        for ib in imported_books:
            norm_author = normalize_name_for_dedup(ib.raw_author) if ib.raw_author else ""
            key = (ib.normalized_title, norm_author)
            canonical = self._canonical_cache.get(key)
            if canonical:
                ib.canonical_book_id = canonical.id

        self.session.flush()

    def _detect_duplicates(self):
        """Find possible duplicates using fuzzy matching.

        This runs BEFORE linking, so all imported books are unlinked.
        Uses a two-phase approach:
        1. Exact match via dict lookup (fast)
        2. Fuzzy match only for non-exact matches (slower but limited)
        """
        unlinked = self.session.query(ImportedBook).filter_by(canonical_book_id=None).all()
        canonical_list = self.session.query(CanonicalBook).all()

        if not canonical_list:
            return

        # Phase 1: Build lookup dict for exact matches
        canonical_by_title = {}
        for canonical in canonical_list:
            norm = canonical.normalized_title
            if norm not in canonical_by_title:
                canonical_by_title[norm] = canonical

        # Phase 2: Check each imported book
        comparisons = 0
        exact_matches = 0
        fuzzy_matches = 0

        for ib in unlinked:
            # Skip noise titles
            if self._is_noise_title(ib.normalized_title, ib.raw_title):
                continue

            norm_title = ib.normalized_title

            # Quick exact match check
            if norm_title in canonical_by_title:
                exact_matches += 1
                continue  # Will be linked in _link_imported_to_canonical

            # Fuzzy match - only compare against titles that are similar length
            best_match = None
            best_score = 0.0
            title_len = len(norm_title)

            for canonical in canonical_list:
                # Skip if length difference is too large (>50%)
                canon_len = len(canonical.normalized_title)
                if abs(title_len - canon_len) > max(title_len, canon_len) * 0.5:
                    continue

                comparisons += 1
                score = SequenceMatcher(None, norm_title, canonical.normalized_title).ratio()
                if score > best_score and score >= 0.75:
                    best_score = score
                    best_match = canonical

            if best_match:
                fuzzy_matches += 1
                dup = PossibleDuplicate(
                    imported_book_id=ib.id,
                    candidate_canonical_id=best_match.id,
                    match_confidence=best_score,
                    status="PENDING_REVIEW",
                )
                self.session.add(dup)
                self.stats.duplicates_detected += 1

        self.stats.warnings.append(
            f"Duplicate detection: {exact_matches} exact matches, "
            f"{fuzzy_matches} fuzzy candidates from {comparisons} comparisons"
        )
        self.session.flush()

    def _merge_canonical_duplicates(self):
        """Merge canonical books with identical normalized titles.

        After initial creation, some canonical books may have the same normalized title
        but different raw titles (due to casing, punctuation, etc.). This merges them.
        """
        # Find canonical books with duplicate normalized titles
        from sqlalchemy import func

        dup_groups = (
            self.session.query(CanonicalBook.normalized_title, func.count(CanonicalBook.id))
            .group_by(CanonicalBook.normalized_title)
            .having(func.count(CanonicalBook.id) > 1)
            .all()
        )

        merged_count = 0
        for norm_title, count in dup_groups:
            # Get all canonical books with this normalized title
            canonicals = (
                self.session.query(CanonicalBook)
                .filter_by(normalized_title=norm_title)
                .order_by(CanonicalBook.title.desc())  # longest title first
                .all()
            )

            if len(canonicals) < 2:
                continue

            # Keep the first (longest title), merge rest into it
            keep = canonicals[0]
            for merge_into in canonicals[1:]:
                # Move all imported books to the kept canonical
                for ib in merge_into.imported_books:
                    ib.canonical_book_id = keep.id
                # Move discussions
                for disc in merge_into.discussions:
                    disc.canonical_book_id = keep.id
                # Move recommendations
                for rec in merge_into.recommendations:
                    rec.canonical_book_id = keep.id
                # Delete the duplicate canonical
                self.session.delete(merge_into)
                merged_count += 1

        if merged_count > 0:
            self.stats.warnings.append(f"Merged {merged_count} duplicate canonical books")
            # Rebuild canonical cache after merging
            self._canonical_cache.clear()
            for canonical in self.session.query(CanonicalBook).all():
                norm_author = ""
                if canonical.author_id:
                    author = self.session.query(Author).get(canonical.author_id)
                    if author:
                        norm_author = normalize_name_for_dedup(author.full_name)
                self._canonical_cache[(canonical.normalized_title, norm_author)] = canonical
        self.session.flush()

    def _create_discussions_and_resources(self, records: List[IntermediateRecord]):
        """Create Discussion and Resource records from book records."""
        # Group book records by meetup number
        meetup_books = defaultdict(list)
        for rec in records:
            if rec.book and rec.meetup and rec.meetup.meetup_number:
                meetup_books[rec.meetup.meetup_number].append(rec)

        # Get all meetups
        meetups = {m.meetup_number: m for m in self.session.query(Meetup).all()}

        # Get all valid canonical book IDs
        valid_canonical_ids = {cb.id for cb in self.session.query(CanonicalBook.id).all()}

        for meetup_num, book_recs in meetup_books.items():
            meetup = meetups.get(meetup_num)
            if not meetup:
                continue

            for rec in book_recs:
                # Find canonical book
                norm_title = normalize_title(rec.book.title)
                norm_author = normalize_name_for_dedup(rec.book.author_name) if rec.book.author_name else ""
                canonical = self._canonical_cache.get((norm_title, norm_author))

                # Verify canonical book exists (cache might be stale after merging)
                if canonical and canonical.id in valid_canonical_ids:
                    discussion = Discussion(
                        meetup_id=meetup.id,
                        canonical_book_id=canonical.id,
                        confidence_score=rec.source.extraction_confidence,
                        source_id=meetup.source_id,
                    )
                    self.session.add(discussion)
                    self.stats.discussions_created += 1

                # Create resource if Goodreads URL exists
                if rec.book.goodreads_url:
                    resource = Resource(
                        meetup_id=meetup.id,
                        url=rec.book.goodreads_url,
                        title=rec.book.title,
                        resource_type="GOODREADS",
                    )
                    self.session.add(resource)
                    self.stats.resources_created += 1

        self.session.flush()
