import json
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path
from typing import Optional

from sqlalchemy import func
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
    Recommendation,
    CurrentRead,
)


class ReportGenerator:
    """Generate all archive reports and JSON exports."""

    def generate_all(self, session: Session, output_dir: Path):
        """Generate all 7 output files."""
        output_dir.mkdir(parents=True, exist_ok=True)
        self._archive_summary(session, output_dir / "archive_summary.md")
        self._ingestion_report(session, output_dir / "ingestion_report.md")
        self._missing_meetups(session, output_dir / "missing_meetups.md")
        self._duplicate_review_queue(session, output_dir / "duplicate_review_queue.md")
        self._archive_manifest(session, output_dir / "archive_manifest.json")
        self._archive_statistics(session, output_dir / "archive_statistics.json")
        self._timeline(session, output_dir / "timeline.json")

    def _archive_summary(self, session: Session, path: Path):
        """Generate archive_summary.md."""
        meetup_count = session.query(func.count(Meetup.id)).scalar() or 0
        canonical_count = session.query(func.count(CanonicalBook.id)).scalar() or 0
        imported_count = session.query(func.count(ImportedBook.id)).scalar() or 0
        author_count = session.query(func.count(Author.id)).scalar() or 0
        venue_count = session.query(func.count(Venue.id)).scalar() or 0
        discussion_count = session.query(func.count(Discussion.id)).scalar() or 0
        resource_count = session.query(func.count(Resource.id)).scalar() or 0
        dup_count = session.query(func.count(PossibleDuplicate.id)).scalar() or 0
        source_count = session.query(func.count(Source.id)).scalar() or 0
        member_count = session.query(func.count(Member.id)).scalar() or 0

        # Date range
        meetups = session.query(Meetup).order_by(Meetup.date).all()
        dates = [m.date for m in meetups if m.date]
        earliest = min(dates) if dates else None
        latest = max(dates) if dates else None

        # Venue breakdown
        venue_stats = (
            session.query(Venue.name, func.count(Meetup.id))
            .join(Meetup, Venue.id == Meetup.venue_id)
            .group_by(Venue.name)
            .all()
        )

        lines = [
            "# BBB Archive Summary",
            "",
            f"**Generated**: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
            "",
            "## Overview",
            "",
            f"| Metric | Count |",
            f"|--------|-------|",
            f"| Meetups | {meetup_count} |",
            f"| Canonical Books | {canonical_count} |",
            f"| Imported Books | {imported_count} |",
            f"| Authors | {author_count} |",
            f"| Members | {member_count} |",
            f"| Venues | {venue_count} |",
            f"| Discussions | {discussion_count} |",
            f"| Resources | {resource_count} |",
            f"| Source Records | {source_count} |",
            f"| Possible Duplicates | {dup_count} |",
            "",
        ]

        if earliest and latest:
            lines.extend([
                "## Date Range",
                "",
                f"- **Earliest**: {earliest}",
                f"- **Latest**: {latest}",
                "",
            ])

        if venue_stats:
            lines.extend([
                "## Venue Breakdown",
                "",
                "| Venue | Meetups |",
                "|-------|---------|",
            ])
            for name, count in venue_stats:
                lines.append(f"| {name} | {count} |")
            lines.append("")

        lines.extend([
            "## Three-Layer Architecture",
            "",
            f"- **Layer 1 (Sources)**: {source_count} provenance records",
            f"- **Layer 2 (Imported Books)**: {imported_count} raw imported records",
            f"- **Layer 3 (Canonical Books)**: {canonical_count} resolved unique books",
            f"- **Review Queue**: {dup_count} possible duplicates pending review",
            "",
        ])

        path.write_text("\n".join(lines), encoding="utf-8")

    def _ingestion_report(self, session: Session, path: Path):
        """Generate ingestion_report.md."""
        sources = session.query(Source).all()
        source_files = Counter(s.file_path for s in sources)

        lines = [
            "# Ingestion Report",
            "",
            f"**Generated**: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
            "",
            "## Source Files Processed",
            "",
            "| File | Records |",
            "|------|---------|",
        ]
        for file_path, count in source_files.most_common():
            lines.append(f"| {file_path} | {count} |")

        lines.extend([
            "",
            "## Extraction Confidence",
            "",
        ])

        # Confidence distribution
        confidences = [s.extraction_confidence for s in sources]
        if confidences:
            avg_conf = sum(confidences) / len(confidences)
            lines.append(f"- **Average confidence**: {avg_conf:.2f}")
            lines.append(f"- **Total source records**: {len(sources)}")
            lines.append("")

        path.write_text("\n".join(lines), encoding="utf-8")

    def _missing_meetups(self, session: Session, path: Path):
        """Generate missing_meetups.md."""
        meetups = session.query(Meetup.meetup_number).order_by(Meetup.meetup_number).all()
        existing = set(m[0] for m in meetups if m[0])

        # Expected range: 1-98 (with known gaps)
        all_expected = set(range(1, 99))
        missing = sorted(all_expected - existing)

        lines = [
            "# Missing Meetups",
            "",
            f"**Generated**: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
            "",
            f"**Total meetups in archive**: {len(existing)}",
            f"**Missing meetups**: {len(missing)}",
            "",
            "## Missing Meetup Numbers",
            "",
        ]

        if missing:
            # Group into ranges
            ranges = []
            start = missing[0]
            end = start
            for m in missing[1:]:
                if m == end + 1:
                    end = m
                else:
                    ranges.append((start, end))
                    start = m
                    end = m
            ranges.append((start, end))

            for s, e in ranges:
                if s == e:
                    lines.append(f"- #{s}")
                else:
                    lines.append(f"- #{s}-#{e}")
        else:
            lines.append("No missing meetups found.")

        lines.extend([
            "",
            "## Note",
            "",
            "BBB has approximately 98 meetups as of July 2026. "
            "Meetups #55-#69 and #77-#79 are not represented in the source files.",
            "",
        ])

        path.write_text("\n".join(lines), encoding="utf-8")

    def _duplicate_review_queue(self, session: Session, path: Path):
        """Generate duplicate_review_queue.md."""
        duplicates = session.query(PossibleDuplicate).all()

        lines = [
            "# Duplicate Review Queue",
            "",
            f"**Generated**: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
            f"**Total flagged**: {len(duplicates)}",
            "",
        ]

        if duplicates:
            lines.extend([
                "| Imported Book | Candidate Canonical | Confidence | Status |",
                "|---------------|---------------------|------------|--------|",
            ])
            for dup in duplicates:
                ib = session.query(ImportedBook).get(dup.imported_book_id)
                cb = session.query(CanonicalBook).get(dup.candidate_canonical_id)
                ib_title = ib.raw_title[:50] if ib else "N/A"
                cb_title = cb.title[:50] if cb else "N/A"
                lines.append(
                    f"| {ib_title} | {cb_title} | {dup.match_confidence:.2f} | {dup.status} |"
                )
        else:
            lines.append("No duplicates flagged for review.")

        path.write_text("\n".join(lines), encoding="utf-8")

    def _archive_manifest(self, session: Session, path: Path):
        """Generate archive_manifest.json."""
        meetups = session.query(Meetup).order_by(Meetup.meetup_number).all()
        sources = session.query(Source).all()
        source_files = sorted(set(s.file_path for s in sources))

        manifest = {
            "archive_version": "1.0.0",
            "generated_at": datetime.now().isoformat(),
            "total_meetups": session.query(func.count(Meetup.id)).scalar() or 0,
            "canonical_books": session.query(func.count(CanonicalBook.id)).scalar() or 0,
            "imported_books": session.query(func.count(ImportedBook.id)).scalar() or 0,
            "authors": session.query(func.count(Author.id)).scalar() or 0,
            "venues": session.query(func.count(Venue.id)).scalar() or 0,
            "discussions": session.query(func.count(Discussion.id)).scalar() or 0,
            "recommendations": session.query(func.count(Recommendation.id)).scalar() or 0,
            "current_reads": session.query(func.count(CurrentRead.id)).scalar() or 0,
            "resources": session.query(func.count(Resource.id)).scalar() or 0,
            "possible_duplicates": session.query(func.count(PossibleDuplicate.id)).scalar() or 0,
            "source_files": source_files,
        }

        path.write_text(json.dumps(manifest, indent=2, default=str), encoding="utf-8")

    def _archive_statistics(self, session: Session, path: Path):
        """Generate archive_statistics.json."""
        # Books per meetup
        books_per_meetup = (
            session.query(Meetup.meetup_number, func.count(Discussion.id))
            .join(Discussion, Meetup.id == Discussion.meetup_id)
            .group_by(Meetup.meetup_number)
            .all()
        )

        # Most discussed books
        most_discussed = (
            session.query(CanonicalBook.title, func.count(Discussion.id))
            .join(Discussion, CanonicalBook.id == Discussion.canonical_book_id)
            .group_by(CanonicalBook.title)
            .order_by(func.count(Discussion.id).desc())
            .limit(20)
            .all()
        )

        # Most discussed authors
        most_discussed_authors = (
            session.query(Author.full_name, func.count(Discussion.id))
            .join(CanonicalBook, Author.id == CanonicalBook.author_id)
            .join(Discussion, CanonicalBook.id == Discussion.canonical_book_id)
            .group_by(Author.full_name)
            .order_by(func.count(Discussion.id).desc())
            .limit(20)
            .all()
        )

        # Venue usage
        venue_usage = (
            session.query(Venue.name, func.count(Meetup.id))
            .join(Meetup, Venue.id == Meetup.venue_id)
            .group_by(Venue.name)
            .all()
        )

        # Books per year
        books_per_year = (
            session.query(
                func.strftime("%Y", Meetup.date),
                func.count(Discussion.id),
            )
            .join(Discussion, Meetup.id == Discussion.meetup_id)
            .filter(Meetup.date.isnot(None))
            .group_by(func.strftime("%Y", Meetup.date))
            .all()
        )

        stats = {
            "books_per_meetup": [
                {"meetup": num, "count": count}
                for num, count in books_per_meetup
            ],
            "books_per_year": [
                {"year": year, "count": count}
                for year, count in books_per_year
            ],
            "most_discussed_books": [
                {"title": title, "discussion_count": count}
                for title, count in most_discussed
            ],
            "most_discussed_authors": [
                {"author": name, "discussion_count": count}
                for name, count in most_discussed_authors
            ],
            "venue_usage": {name: count for name, count in venue_usage},
            "total_imported_records": session.query(func.count(ImportedBook.id)).scalar() or 0,
            "possible_duplicates_staged": session.query(func.count(PossibleDuplicate.id)).scalar() or 0,
        }

        path.write_text(json.dumps(stats, indent=2, default=str), encoding="utf-8")

    def _timeline(self, session: Session, path: Path):
        """Generate timeline.json."""
        meetups = session.query(Meetup).order_by(Meetup.meetup_number).all()

        # Get books per meetup
        discussion_counts = dict(
            session.query(Meetup.meetup_number, func.count(Discussion.id))
            .join(Discussion, Meetup.id == Discussion.meetup_id)
            .group_by(Meetup.meetup_number)
            .all()
        )

        # Get venue names
        venue_map = {v.id: v.name for v in session.query(Venue).all()}

        # Track new vs returning books
        seen_books = set()
        timeline = []

        for meetup in meetups:
            total_books = discussion_counts.get(meetup.meetup_number, 0)

            # Get canonical book IDs for this meetup
            book_ids = [
                d.canonical_book_id
                for d in session.query(Discussion.canonical_book_id)
                .filter(Discussion.meetup_id == meetup.id)
                .all()
                if d.canonical_book_id
            ]

            new_books = sum(1 for bid in book_ids if bid not in seen_books)
            returning_books = total_books - new_books
            seen_books.update(book_ids)

            timeline.append({
                "meetup": meetup.meetup_number,
                "date": str(meetup.date) if meetup.date else None,
                "venue": venue_map.get(meetup.venue_id, "Unknown"),
                "new_books": new_books,
                "returning_books": returning_books,
            })

        path.write_text(json.dumps(timeline, indent=2), encoding="utf-8")
