from typing import List, Optional
from sqlalchemy import String, Integer, Float, Text, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.base import UUIDMixin, TimestampMixin


class Source(Base, UUIDMixin, TimestampMixin):
    """Layer 1: Immutable Raw Source Provenance Record.
    
    Preserves exact original text location, file path, line numbers, PDF page, 
    and raw text snippet for every extracted fact in the archive.
    """

    __tablename__ = "sources"

    file_path: Mapped[str] = mapped_column(
        String(1024),
        nullable=False,
        index=True,
        doc="Relative file path to source document (e.g. BBB Meetup-9.txt)",
    )
    source_type: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        default="TXT_ARCHIVE",
        index=True,
        doc="Document type: TXT_ARCHIVE, PDF_DOCUMENT, NOTION_EXPORT",
    )
    meetup_number: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        index=True,
        doc="Extracted meetup number associated with source snippet",
    )
    pdf_page: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        doc="1-indexed PDF page number if source is PDF",
    )
    paragraph_index: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        doc="Paragraph index in raw document",
    )
    start_line: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        doc="Starting line number in source text file",
    )
    end_line: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        doc="Ending line number in source text file",
    )
    extraction_confidence: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=1.0,
        doc="Algorithm confidence score (0.0 to 1.0) for extracted text block",
    )
    raw_text: Mapped[Text] = mapped_column(
        Text,
        nullable=False,
        doc="Exact unedited original substring from source document",
    )
    importer_name: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
        default="legacy_txt_parser_v1",
        doc="Name and version of importer pipeline script",
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
