from typing import List, Optional
from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.base import UUIDMixin, TimestampMixin


class Series(Base, UUIDMixin, TimestampMixin):
    """Series Entity (e.g. Discworld, Kingkiller Chronicle, Cosmere)."""

    __tablename__ = "series"

    title: Mapped[str] = mapped_column(
        String(256),
        nullable=False,
        unique=True,
        index=True,
    )
    description: Mapped[Optional[Text]] = mapped_column(Text, nullable=True)

    # Relationships
    canonical_books: Mapped[List["CanonicalBook"]] = relationship(
        "CanonicalBook", back_populates="series"
    )
