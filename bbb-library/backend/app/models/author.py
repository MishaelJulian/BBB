from typing import List, Optional
from sqlalchemy import String, Text, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.base import UUIDMixin, TimestampMixin


class Author(Base, UUIDMixin, TimestampMixin):
    """Author Entity.
    
    Represents creators/writers of books discussed at BBB.
    """

    __tablename__ = "authors"

    full_name: Mapped[str] = mapped_column(
        String(256),
        nullable=False,
        index=True,
        doc="Author full display name (e.g. Virginia Woolf)",
    )
    normalized_name: Mapped[str] = mapped_column(
        String(256),
        nullable=False,
        unique=True,
        index=True,
        doc="Normalized lowercase alphanumeric string for entity resolution",
    )
    country: Mapped[Optional[str]] = mapped_column(
        String(128),
        nullable=True,
        doc="Country of origin",
    )
    description: Mapped[Optional[Text]] = mapped_column(
        Text,
        nullable=True,
        doc="Biographical summary or notes",
    )

    # Relationships
    canonical_books: Mapped[List["CanonicalBook"]] = relationship(
        "CanonicalBook", back_populates="author"
    )
