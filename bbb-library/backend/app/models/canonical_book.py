from typing import List, Optional
from sqlalchemy import String, Integer, Float, Text, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.base import UUIDMixin, TimestampMixin


class CanonicalBook(Base, UUIDMixin, TimestampMixin):
    """Layer 3: Canonical Archive Book Entity.
    
    Verified single source of truth for a literary work discussed at BBB.
    Consumed by public APIs, search indexes, and the 3D virtual closet.
    """

    __tablename__ = "canonical_books"

    title: Mapped[str] = mapped_column(
        String(512),
        nullable=False,
        index=True,
        doc="Canonical display title (e.g. The Nine-Chambered Heart)",
    )
    normalized_title: Mapped[str] = mapped_column(
        String(512),
        nullable=False,
        index=True,
        doc="Lowercase alphanumeric normalized title string",
    )
    subtitle: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    sort_title: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    
    author_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("authors.id"), nullable=True, index=True
    )
    publisher_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("publishers.id"), nullable=True
    )
    series_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("series.id"), nullable=True
    )

    isbn10: Mapped[Optional[str]] = mapped_column(String(10), nullable=True, index=True)
    isbn13: Mapped[Optional[str]] = mapped_column(String(13), nullable=True, index=True)
    asin: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    language: Mapped[str] = mapped_column(String(16), nullable=False, default="en")
    publication_year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    page_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    cover_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    thumbnail_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    description: Mapped[Optional[Text]] = mapped_column(Text, nullable=True)
    
    goodreads_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    openlibrary_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    google_books_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    rating: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Relationships
    author: Mapped[Optional["Author"]] = relationship("Author", back_populates="canonical_books")
    publisher: Mapped[Optional["Publisher"]] = relationship("Publisher", back_populates="canonical_books")
    series: Mapped[Optional["Series"]] = relationship("Series", back_populates="canonical_books")

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


class ImportedBook(Base, UUIDMixin, TimestampMixin):
    """Layer 2: Raw / Staged Imported Book Entity.
    
    Stores parsed book title and author string exactly as extracted from 
    a raw source before canonical resolution.
    """

    __tablename__ = "imported_books"

    raw_title: Mapped[str] = mapped_column(
        String(512),
        nullable=False,
        index=True,
        doc="Unedited title string from source document",
    )
    raw_author: Mapped[Optional[str]] = mapped_column(
        String(256),
        nullable=True,
        index=True,
        doc="Unedited author string from source document",
    )
    normalized_title: Mapped[str] = mapped_column(
        String(512),
        nullable=False,
        index=True,
        doc="Cleaned lowercase alphanumeric title string",
    )
    source_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("sources.id"), nullable=False, index=True
    )
    canonical_book_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("canonical_books.id"), nullable=True, index=True
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
    """Archive Review Layer: Candidate Duplicate Flagging.
    
    Holds candidate matches requiring review before canonical merging.
    """

    __tablename__ = "possible_duplicates"

    imported_book_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("imported_books.id"), nullable=False, index=True
    )
    candidate_canonical_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("canonical_books.id"), nullable=False, index=True
    )
    match_confidence: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        doc="Levenshtein / Fuzzy matching similarity score (0.0 to 1.0)",
    )
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="PENDING_REVIEW",
        index=True,
        doc="Review status: PENDING_REVIEW, APPROVED, REJECTED, AUTO_MERGED",
    )

    # Relationships
    imported_book: Mapped["ImportedBook"] = relationship(
        "ImportedBook", back_populates="duplicates"
    )
    candidate_canonical: Mapped["CanonicalBook"] = relationship("CanonicalBook")
