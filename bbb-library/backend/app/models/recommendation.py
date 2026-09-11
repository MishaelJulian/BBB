from typing import Optional
from sqlalchemy import String, Text, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.base import UUIDMixin, TimestampMixin


class Recommendation(Base, UUIDMixin, TimestampMixin):
    """Recommendation Entity.
    
    Explicit suggestion made by a member (or general community) to read a book.
    """

    __tablename__ = "recommendations"

    meetup_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("meetups.id"), nullable=False, index=True
    )
    canonical_book_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("canonical_books.id"), nullable=False, index=True
    )
    recommender_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("members.id"), nullable=True, index=True
    )
    context: Mapped[Optional[Text]] = mapped_column(
        Text,
        nullable=True,
        doc="Context or reason for recommendation",
    )

    # Relationships
    meetup: Mapped["Meetup"] = relationship("Meetup", back_populates="recommendations")
    canonical_book: Mapped["CanonicalBook"] = relationship("CanonicalBook", back_populates="recommendations")
    recommender: Mapped[Optional["Member"]] = relationship("Member", back_populates="recommendations")


class CurrentRead(Base, UUIDMixin, TimestampMixin):
    """Current Read Entity.
    
    Active reading status declared by a member during meetup introductions.
    """

    __tablename__ = "current_reads"

    meetup_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("meetups.id"), nullable=False, index=True
    )
    canonical_book_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("canonical_books.id"), nullable=False, index=True
    )
    member_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("members.id"), nullable=True, index=True
    )
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="IN_PROGRESS"
    )

    # Relationships
    meetup: Mapped["Meetup"] = relationship("Meetup", back_populates="current_reads")
    canonical_book: Mapped["CanonicalBook"] = relationship("CanonicalBook", back_populates="current_reads")
    member: Mapped[Optional["Member"]] = relationship("Member", back_populates="current_reads")


class Resource(Base, UUIDMixin, TimestampMixin):
    """External Resource / Link Entity (Goodreads, Notion, External Blog)."""

    __tablename__ = "resources"

    meetup_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("meetups.id"), nullable=False, index=True
    )
    url: Mapped[str] = mapped_column(String(2048), nullable=False)
    title: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    resource_type: Mapped[str] = mapped_column(String(64), nullable=False, default="URL")

    # Relationships
    meetup: Mapped["Meetup"] = relationship("Meetup", back_populates="resources")
