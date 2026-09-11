from datetime import date
from typing import List, Optional
from sqlalchemy import String, Integer, Date, Text, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.base import UUIDMixin, TimestampMixin


class Meetup(Base, UUIDMixin, TimestampMixin):
    """Meetup Session Entity.
    
    Represents a specific historical meetup gathering of Broke Bibliophiles Bangalore.
    """

    __tablename__ = "meetups"

    meetup_number: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        unique=True,
        index=True,
        doc="BBB Meetup sequence number (e.g. 20)",
    )
    date: Mapped[Optional[date]] = mapped_column(
        Date,
        nullable=True,
        index=True,
        doc="ISO 8601 meetup date (YYYY-MM-DD)",
    )
    title: Mapped[Optional[str]] = mapped_column(
        String(256),
        nullable=True,
        doc="Meetup descriptive title",
    )
    venue_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("venues.id"), nullable=True, index=True
    )
    format: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="IN_PERSON",
        doc="Event format: IN_PERSON, ONLINE, HYBRID",
    )
    attendance_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    description: Mapped[Optional[Text]] = mapped_column(Text, nullable=True)
    source_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("sources.id"), nullable=True, index=True
    )

    # Relationships
    venue: Mapped[Optional["Venue"]] = relationship("Venue", back_populates="meetups")
    source: Mapped[Optional["Source"]] = relationship("Source", back_populates="meetups")

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
