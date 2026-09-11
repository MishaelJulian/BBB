from datetime import date
from typing import List, Optional
from sqlalchemy import (
    String,
    Text,
    Integer,
    Float,
    Boolean,
    DateTime,
    Date,
    ForeignKey,
    Index,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, UUIDMixin, TimestampMixin, current_utc_time


# ---------------------------------------------------------------------------
# Layer 1: Source Provenance
# ---------------------------------------------------------------------------

class Source(Base, UUIDMixin, TimestampMixin):
    """Layer 1: Immutable raw source provenance record.

    Preserves exact original text location, file path, line numbers, PDF page,
    and raw text snippet for every extracted fact in the archive.
    """

    __tablename__ = "sources"

    file_path: Mapped[str] = mapped_column(
        String(1024), nullable=False, index=True,
        doc="Relative file path to source document",
    )
    source_type: Mapped[str] = mapped_column(
        String(64), nullable=False, default="TXT_ARCHIVE", index=True,
        doc="Document type: TXT_ARCHIVE, PDF_DOCUMENT",
    )
    meetup_number: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True, index=True,
        doc="Extracted meetup number associated with source snippet",
    )
    pdf_page: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    paragraph_index: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    start_line: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    end_line: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    extraction_confidence: Mapped[float] = mapped_column(
        Float, nullable=False, default=1.0,
        doc="Confidence score (0.0-1.0) for extracted text block",
    )
    raw_text: Mapped[str] = mapped_column(
        Text, nullable=False,
        doc="Exact unedited original substring from source document",
    )
    importer_name: Mapped[str] = mapped_column(
        String(128), nullable=False, default="legacy_import_v1",
    )

    # Relationships
    meetups: Mapped[List["Meetup"]] = relationship(
        "Meetup", back_populates="source", cascade="all, delete-orphan"
    )
    imported_books: Mapped[List["ImportedBook"]] = relationship(
        "ImportedBook", back_populates="source", cascade="all, delete-orphan"
    )
    discussions: Mapped[List["Discussion"]] = relationship(
        "Discussion", back_populates="source"
    )

    __table_args__ = (
        Index("ix_sources_file_meetup", "file_path", "meetup_number"),
    )


# ---------------------------------------------------------------------------
# Domain Entities
# ---------------------------------------------------------------------------

class Author(Base, UUIDMixin, TimestampMixin):
    """Author entity."""

    __tablename__ = "authors"

    full_name: Mapped[str] = mapped_column(String(256), nullable=False, index=True)
    normalized_name: Mapped[str] = mapped_column(
        String(256), nullable=False, unique=True, index=True,
    )
    country: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    canonical_books: Mapped[List["CanonicalBook"]] = relationship(
        "CanonicalBook", back_populates="author"
    )


class Publisher(Base, UUIDMixin, TimestampMixin):
    """Book Publisher entity."""

    __tablename__ = "publishers"

    name: Mapped[str] = mapped_column(String(256), nullable=False, unique=True, index=True)
    location: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)

    # Relationships
    canonical_books: Mapped[List["CanonicalBook"]] = relationship(
        "CanonicalBook", back_populates="publisher"
    )


class Series(Base, UUIDMixin, TimestampMixin):
    """Book Series entity."""

    __tablename__ = "series"

    title: Mapped[str] = mapped_column(String(256), nullable=False, unique=True, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    canonical_books: Mapped[List["CanonicalBook"]] = relationship(
        "CanonicalBook", back_populates="series"
    )


class Genre(Base, UUIDMixin, TimestampMixin):
    """Genre tag entity."""

    __tablename__ = "genres"

    name: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)


class Venue(Base, UUIDMixin, TimestampMixin):
    """Venue entity — physical or virtual meetup location."""

    __tablename__ = "venues"

    name: Mapped[str] = mapped_column(
        String(256), nullable=False, unique=True, index=True,
    )
    city: Mapped[str] = mapped_column(
        String(128), nullable=False, default="Bengaluru", index=True,
    )
    address: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    is_online: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, index=True,
    )

    # Relationships
    meetups: Mapped[List["Meetup"]] = relationship("Meetup", back_populates="venue")


class Member(Base, UUIDMixin, TimestampMixin):
    """Book club member entity."""

    __tablename__ = "members"

    display_name: Mapped[str] = mapped_column(String(256), nullable=False, index=True)
    normalized_name: Mapped[str] = mapped_column(
        String(256), nullable=False, unique=True, index=True,
    )
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    discussions: Mapped[List["Discussion"]] = relationship(
        "Discussion", back_populates="member"
    )
    recommendations: Mapped[List["Recommendation"]] = relationship(
        "Recommendation", back_populates="recommender"
    )
    current_reads: Mapped[List["CurrentRead"]] = relationship(
        "CurrentRead", back_populates="member"
    )


class Alias(Base, UUIDMixin, TimestampMixin):
    """Entity alternate names / alias lookup table."""

    __tablename__ = "aliases"

    entity_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    entity_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    alias_name: Mapped[str] = mapped_column(String(256), nullable=False, index=True)

    __table_args__ = (
        Index("ix_aliases_type_name", "entity_type", "alias_name"),
    )


# ---------------------------------------------------------------------------
# Layer 3: Canonical Books
# ---------------------------------------------------------------------------

class CanonicalBook(Base, UUIDMixin, TimestampMixin):
    """Layer 3: Canonical Archive Book Entity.

    Verified single source of truth for a literary work discussed at BBB.
    """

    __tablename__ = "canonical_books"

    title: Mapped[str] = mapped_column(String(512), nullable=False, index=True)
    normalized_title: Mapped[str] = mapped_column(String(512), nullable=False, index=True)
    subtitle: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    sort_title: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)

    author_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("authors.id"), nullable=True, index=True,
    )
    publisher_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("publishers.id"), nullable=True,
    )
    series_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("series.id"), nullable=True,
    )

    isbn10: Mapped[Optional[str]] = mapped_column(String(10), nullable=True, index=True)
    isbn13: Mapped[Optional[str]] = mapped_column(String(13), nullable=True, index=True)
    asin: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    language: Mapped[str] = mapped_column(String(16), nullable=False, default="en")
    publication_year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    page_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    cover_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    thumbnail_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    goodreads_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    openlibrary_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    google_books_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    rating: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Relationships
    author: Mapped[Optional[Author]] = relationship("Author", back_populates="canonical_books")
    publisher: Mapped[Optional[Publisher]] = relationship("Publisher", back_populates="canonical_books")
    series: Mapped[Optional[Series]] = relationship("Series", back_populates="canonical_books")
    imported_books: Mapped[List["ImportedBook"]] = relationship(
        "ImportedBook", back_populates="canonical_book"
    )
    discussions: Mapped[List["Discussion"]] = relationship(
        "Discussion", back_populates="canonical_book"
    )
    recommendations: Mapped[List["Recommendation"]] = relationship(
        "Recommendation", back_populates="canonical_book"
    )
    current_reads: Mapped[List["CurrentRead"]] = relationship(
        "CurrentRead", back_populates="canonical_book"
    )

    __table_args__ = (
        Index("ix_canonical_books_norm_author", "normalized_title", "author_id"),
    )


# ---------------------------------------------------------------------------
# Layer 2: Imported Books + Deduplication
# ---------------------------------------------------------------------------

class ImportedBook(Base, UUIDMixin, TimestampMixin):
    """Layer 2: Raw / Staged Imported Book Entity.

    Stores parsed book title and author string exactly as extracted from
    a raw source before canonical resolution.
    """

    __tablename__ = "imported_books"

    raw_title: Mapped[str] = mapped_column(String(512), nullable=False, index=True)
    raw_author: Mapped[Optional[str]] = mapped_column(String(256), nullable=True, index=True)
    normalized_title: Mapped[str] = mapped_column(String(512), nullable=False, index=True)
    source_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("sources.id"), nullable=False, index=True,
    )
    canonical_book_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("canonical_books.id"), nullable=True, index=True,
    )

    # Relationships
    source: Mapped["Source"] = relationship("Source", back_populates="imported_books")
    canonical_book: Mapped[Optional["CanonicalBook"]] = relationship(
        "CanonicalBook", back_populates="imported_books"
    )
    duplicates: Mapped[List["PossibleDuplicate"]] = relationship(
        "PossibleDuplicate", back_populates="imported_book", cascade="all, delete-orphan"
    )


class PossibleDuplicate(Base, UUIDMixin, TimestampMixin):
    """Archive Review Layer: Candidate Duplicate Flagging."""

    __tablename__ = "possible_duplicates"

    imported_book_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("imported_books.id"), nullable=False, index=True,
    )
    candidate_canonical_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("canonical_books.id"), nullable=False, index=True,
    )
    match_confidence: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="PENDING_REVIEW", index=True,
    )

    # Relationships
    imported_book: Mapped["ImportedBook"] = relationship(
        "ImportedBook", back_populates="duplicates"
    )
    candidate_canonical: Mapped["CanonicalBook"] = relationship("CanonicalBook")


# ---------------------------------------------------------------------------
# Meetups & Events
# ---------------------------------------------------------------------------

class Meetup(Base, UUIDMixin, TimestampMixin):
    """Book club meeting event entity."""

    __tablename__ = "meetups"

    meetup_number: Mapped[int] = mapped_column(
        Integer, nullable=False, unique=True, index=True,
    )
    date: Mapped[Optional[date]] = mapped_column(Date, nullable=True, index=True)
    title: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    venue_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("venues.id"), nullable=True, index=True,
    )
    format: Mapped[str] = mapped_column(
        String(32), nullable=False, default="IN_PERSON",
    )
    attendance_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("sources.id"), nullable=True, index=True,
    )

    # Relationships
    venue: Mapped[Optional[Venue]] = relationship("Venue", back_populates="meetups")
    source: Mapped[Optional[Source]] = relationship("Source", back_populates="meetups")
    discussions: Mapped[List["Discussion"]] = relationship(
        "Discussion", back_populates="meetup", cascade="all, delete-orphan"
    )
    recommendations: Mapped[List["Recommendation"]] = relationship(
        "Recommendation", back_populates="meetup", cascade="all, delete-orphan"
    )
    current_reads: Mapped[List["CurrentRead"]] = relationship(
        "CurrentRead", back_populates="meetup", cascade="all, delete-orphan"
    )
    resources: Mapped[List["Resource"]] = relationship(
        "Resource", back_populates="meetup", cascade="all, delete-orphan"
    )


# ---------------------------------------------------------------------------
# Discussions
# ---------------------------------------------------------------------------

class Discussion(Base, UUIDMixin, TimestampMixin):
    """Discussion event linking a canonical book, member, and meetup."""

    __tablename__ = "discussions"

    meetup_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("meetups.id"), nullable=False, index=True,
    )
    canonical_book_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("canonical_books.id"), nullable=True, index=True,
    )
    member_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("members.id"), nullable=True, index=True,
    )
    topic: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    rating: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sentiment: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    confidence_score: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    source_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("sources.id"), nullable=True, index=True,
    )

    # Relationships
    meetup: Mapped["Meetup"] = relationship("Meetup", back_populates="discussions")
    canonical_book: Mapped[Optional["CanonicalBook"]] = relationship(
        "CanonicalBook", back_populates="discussions"
    )
    member: Mapped[Optional[Member]] = relationship("Member", back_populates="discussions")
    source: Mapped[Optional[Source]] = relationship("Source", back_populates="discussions")
    quotes: Mapped[List["Quote"]] = relationship(
        "Quote", back_populates="discussion", cascade="all, delete-orphan"
    )
    participants: Mapped[List["DiscussionParticipant"]] = relationship(
        "DiscussionParticipant", back_populates="discussion", cascade="all, delete-orphan"
    )
    mentions: Mapped[List["BookMention"]] = relationship(
        "BookMention", back_populates="discussion", cascade="all, delete-orphan"
    )


class DiscussionParticipant(Base, UUIDMixin, TimestampMixin):
    """Junction table for multi-member panel discussions."""

    __tablename__ = "discussion_participants"

    discussion_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("discussions.id"), nullable=False, index=True,
    )
    member_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("members.id"), nullable=False, index=True,
    )
    role: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, default="PANELIST")

    # Relationships
    discussion: Mapped["Discussion"] = relationship("Discussion", back_populates="participants")
    member: Mapped["Member"] = relationship("Member")


class BookMention(Base, UUIDMixin, TimestampMixin):
    """Casual book mention during a discussion."""

    __tablename__ = "book_mentions"

    discussion_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("discussions.id"), nullable=False, index=True,
    )
    canonical_book_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("canonical_books.id"), nullable=False, index=True,
    )
    context_snippet: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    discussion: Mapped["Discussion"] = relationship("Discussion", back_populates="mentions")
    canonical_book: Mapped["CanonicalBook"] = relationship("CanonicalBook")


class Quote(Base, UUIDMixin, TimestampMixin):
    """Notable quote extracted from source notes."""

    __tablename__ = "quotes"

    discussion_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("discussions.id"), nullable=True, index=True,
    )
    canonical_book_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("canonical_books.id"), nullable=True, index=True,
    )
    member_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("members.id"), nullable=True,
    )
    quote_text: Mapped[str] = mapped_column(Text, nullable=False)
    page_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Relationships
    discussion: Mapped[Optional[Discussion]] = relationship("Discussion", back_populates="quotes")
    canonical_book: Mapped[Optional["CanonicalBook"]] = relationship("CanonicalBook")
    member: Mapped[Optional[Member]] = relationship("Member")


# ---------------------------------------------------------------------------
# Recommendations & Current Reads
# ---------------------------------------------------------------------------

class Recommendation(Base, UUIDMixin, TimestampMixin):
    """Explicit suggestion to read a book."""

    __tablename__ = "recommendations"

    meetup_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("meetups.id"), nullable=False, index=True,
    )
    canonical_book_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("canonical_books.id"), nullable=False, index=True,
    )
    recommender_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("members.id"), nullable=True, index=True,
    )
    context: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    meetup: Mapped["Meetup"] = relationship("Meetup", back_populates="recommendations")
    canonical_book: Mapped["CanonicalBook"] = relationship(
        "CanonicalBook", back_populates="recommendations"
    )
    recommender: Mapped[Optional[Member]] = relationship(
        "Member", back_populates="recommendations"
    )


class CurrentRead(Base, UUIDMixin, TimestampMixin):
    """Active reading status declared by a member."""

    __tablename__ = "current_reads"

    meetup_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("meetups.id"), nullable=False, index=True,
    )
    canonical_book_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("canonical_books.id"), nullable=False, index=True,
    )
    member_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("members.id"), nullable=True, index=True,
    )
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="IN_PROGRESS")

    # Relationships
    meetup: Mapped["Meetup"] = relationship("Meetup", back_populates="current_reads")
    canonical_book: Mapped["CanonicalBook"] = relationship(
        "CanonicalBook", back_populates="current_reads"
    )
    member: Mapped[Optional[Member]] = relationship("Member", back_populates="current_reads")


class Resource(Base, UUIDMixin, TimestampMixin):
    """External resource / link (Goodreads, Notion, etc.)."""

    __tablename__ = "resources"

    meetup_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("meetups.id"), nullable=False, index=True,
    )
    url: Mapped[str] = mapped_column(String(2048), nullable=False)
    title: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    resource_type: Mapped[str] = mapped_column(String(64), nullable=False, default="URL")

    # Relationships
    meetup: Mapped["Meetup"] = relationship("Meetup", back_populates="resources")


# ---------------------------------------------------------------------------
# Book Relations
# ---------------------------------------------------------------------------

class BookRelation(Base, UUIDMixin, TimestampMixin):
    """Inter-book relationship (sequel, prequel, recommended-together)."""

    __tablename__ = "book_relations"

    source_book_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("canonical_books.id"), nullable=False, index=True,
    )
    target_book_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("canonical_books.id"), nullable=False, index=True,
    )
    relation_type: Mapped[str] = mapped_column(String(64), nullable=False)

    # Relationships
    source_book: Mapped["CanonicalBook"] = relationship(
        "CanonicalBook", foreign_keys=[source_book_id]
    )
    target_book: Mapped["CanonicalBook"] = relationship(
        "CanonicalBook", foreign_keys=[target_book_id]
    )


# ---------------------------------------------------------------------------
# Import Audit
# ---------------------------------------------------------------------------

class ImportJob(Base, UUIDMixin, TimestampMixin):
    """Track batch data import pipelines."""

    __tablename__ = "import_jobs"

    source_type: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="STARTED", index=True)
    total_items: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    processed_items: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    error_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    started_at: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    completed_at: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    # Relationships
    logs: Mapped[List["ImportLog"]] = relationship("ImportLog", back_populates="job")
    validation_errors: Mapped[List["ValidationError"]] = relationship(
        "ValidationError", back_populates="job"
    )


class ImportLog(Base, UUIDMixin):
    """Individual log messages associated with an import job."""

    __tablename__ = "import_logs"

    job_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("import_jobs.id"), nullable=True, index=True,
    )
    log_level: Mapped[str] = mapped_column(String(16), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    timestamp: Mapped[str] = mapped_column(
        String(64), nullable=False,
        default=lambda: current_utc_time().isoformat(),
    )
    details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    job: Mapped[Optional[ImportJob]] = relationship("ImportJob", back_populates="logs")


class ValidationError(Base, UUIDMixin):
    """Validation errors encountered during pipeline execution."""

    __tablename__ = "validation_errors"

    job_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("import_jobs.id"), nullable=True, index=True,
    )
    record_type: Mapped[str] = mapped_column(String(64), nullable=False)
    record_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    field_name: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    error_message: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String(16), nullable=False, default="WARNING")

    # Relationships
    job: Mapped[Optional[ImportJob]] = relationship("ImportJob", back_populates="validation_errors")


class Tag(Base, UUIDMixin, TimestampMixin):
    """General tag classification."""

    __tablename__ = "tags"

    name: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)
