from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class IntermediateSource(BaseModel):
    """Provenance details captured during raw import."""

    file_path: Optional[str] = None
    source_type: str = "TXT_ARCHIVE"
    meetup_number: Optional[int] = None
    pdf_page: Optional[int] = None
    paragraph_index: Optional[int] = None
    start_line: Optional[int] = None
    end_line: Optional[int] = None
    extraction_confidence: float = 1.0
    raw_text: str = ""
    importer_name: str = "legacy_import_v1"


class IntermediateAuthor(BaseModel):
    """Raw author info extracted from source."""

    full_name: str
    country: Optional[str] = None
    description: Optional[str] = None


class IntermediateBook(BaseModel):
    """Raw book info extracted from source."""

    title: str
    subtitle: Optional[str] = None
    author_name: Optional[str] = None
    isbn10: Optional[str] = None
    isbn13: Optional[str] = None
    language: Optional[str] = None
    publication_year: Optional[int] = None
    page_count: Optional[int] = None
    cover_url: Optional[str] = None
    description: Optional[str] = None
    genres: List[str] = Field(default_factory=list)
    series_name: Optional[str] = None
    series_number: Optional[int] = None
    goodreads_url: Optional[str] = None
    goodreads_id: Optional[str] = None


class IntermediateMember(BaseModel):
    """Raw book club member info extracted from source."""

    display_name: str
    bio: Optional[str] = None


class IntermediateMeetup(BaseModel):
    """Raw meetup info extracted from source."""

    meetup_number: Optional[int] = None
    date: Optional[str] = None
    title: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    format: str = "IN_PERSON"
    attendance_count: Optional[int] = None


class IntermediateDiscussion(BaseModel):
    """Raw discussion / review info extracted from source."""

    book_title: Optional[str] = None
    author_name: Optional[str] = None
    member_name: Optional[str] = None
    meetup_number: Optional[int] = None
    confidence_score: float = 1.0


class IntermediateRecord(BaseModel):
    """Standardized record wrapper returned by all importers."""

    source: IntermediateSource
    book: Optional[IntermediateBook] = None
    author: Optional[IntermediateAuthor] = None
    member: Optional[IntermediateMember] = None
    meetup: Optional[IntermediateMeetup] = None
    discussion: Optional[IntermediateDiscussion] = None
    raw_content: Optional[str] = None
