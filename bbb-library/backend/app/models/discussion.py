from typing import List, Optional
from sqlalchemy import String, Float, Text, ForeignKey, Index, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.base import UUIDMixin, TimestampMixin


class Discussion(Base, UUIDMixin, TimestampMixin):
    """Discussion Event Entity.
    
    Core junction node capturing a book review, presentation, or thematic discussion
    held during a specific BBB meetup.
    """

    __tablename__ = "discussions"

    meetup_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("meetups.id"), nullable=False, index=True
    )
    canonical_book_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("canonical_books.id"), nullable=True, index=True
    )
    member_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("members.id"), nullable=True, index=True
    )
    topic: Mapped[Optional[str]] = mapped_column(
        String(256),
        nullable=True,
        doc="Thematic topic if discussion is non-book-specific",
    )
    notes: Mapped[Optional[Text]] = mapped_column(Text, nullable=True)
    rating: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sentiment: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    confidence_score: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    source_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("sources.id"), nullable=True, index=True
    )

    # Relationships
    meetup: Mapped["Meetup"] = relationship("Meetup", back_populates="discussions")
    canonical_book: Mapped[Optional["CanonicalBook"]] = relationship(
        "CanonicalBook", back_populates="discussions"
    )
    member: Mapped[Optional["Member"]] = relationship("Member", back_populates="discussions")
    source: Mapped[Optional["Source"]] = relationship("Source", back_populates="discussions")

    quotes: Mapped[List["Quote"]] = relationship(
        "Quote", back_populates="discussion", cascade="all, delete-orphan"
    )
    mentions: Mapped[List["BookMention"]] = relationship(
        "BookMention", back_populates="discussion", cascade="all, delete-orphan"
    )
    participants: Mapped[List["DiscussionParticipant"]] = relationship(
        "DiscussionParticipant", back_populates="discussion", cascade="all, delete-orphan"
    )


class DiscussionParticipant(Base, UUIDMixin, TimestampMixin):
    """Junction table for multi-member panel discussions."""

    __tablename__ = "discussion_participants"

    discussion_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("discussions.id"), nullable=False, index=True
    )
    member_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("members.id"), nullable=False, index=True
    )
    role: Mapped[Optional[str]] = mapped_column(
        String(64), nullable=True, default="PANELIST"
    )

    # Relationships
    discussion: Mapped["Discussion"] = relationship("Discussion", back_populates="participants")
    member: Mapped["Member"] = relationship("Member")


class BookMention(Base, UUIDMixin, TimestampMixin):
    """Casual or contextual book mention during a discussion."""

    __tablename__ = "book_mentions"

    discussion_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("discussions.id"), nullable=False, index=True
    )
    canonical_book_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("canonical_books.id"), nullable=False, index=True
    )
    context_snippet: Mapped[Optional[Text]] = mapped_column(Text, nullable=True)

    # Relationships
    discussion: Mapped["Discussion"] = relationship("Discussion", back_populates="mentions")
    canonical_book: Mapped["CanonicalBook"] = relationship("CanonicalBook")


class Quote(Base, UUIDMixin, TimestampMixin):
    """Notable discussion or book quote extracted from source notes."""

    __tablename__ = "quotes"

    discussion_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("discussions.id"), nullable=True, index=True
    )
    canonical_book_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("canonical_books.id"), nullable=True, index=True
    )
    member_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("members.id"), nullable=True
    )
    quote_text: Mapped[Text] = mapped_column(Text, nullable=False)
    page_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Relationships
    discussion: Mapped[Optional["Discussion"]] = relationship("Discussion", back_populates="quotes")
    canonical_book: Mapped[Optional["CanonicalBook"]] = relationship("CanonicalBook")
    member: Mapped[Optional["Member"]] = relationship("Member")
