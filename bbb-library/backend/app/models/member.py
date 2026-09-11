from typing import List, Optional
from sqlalchemy import String, Text, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.base import UUIDMixin, TimestampMixin


class Member(Base, UUIDMixin, TimestampMixin):
    """Member Entity.
    
    Represents BBB club members, presenters, attendees, or organizers.
    """

    __tablename__ = "members"

    display_name: Mapped[str] = mapped_column(
        String(256),
        nullable=False,
        index=True,
        doc="Member display name (e.g. Rahul Kondi, Gokul S Nath)",
    )
    normalized_name: Mapped[str] = mapped_column(
        String(256),
        nullable=False,
        unique=True,
        index=True,
        doc="Normalized lowercase name for deduplication",
    )
    bio: Mapped[Optional[Text]] = mapped_column(Text, nullable=True)

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
    """Alias Entity.
    
    Maps alternate spellings or aliases for members, authors, or books.
    """

    __tablename__ = "aliases"

    entity_type: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        index=True,
        doc="Type of entity (MEMBER, AUTHOR, BOOK)",
    )
    entity_id: Mapped[str] = mapped_column(
        String(36),
        nullable=False,
        index=True,
        doc="UUID of the parent entity",
    )
    alias_name: Mapped[str] = mapped_column(
        String(256),
        nullable=False,
        index=True,
        doc="Alternate spelling or name string",
    )

    __table_args__ = (
        Index("ix_aliases_type_name", "entity_type", "alias_name"),
    )
