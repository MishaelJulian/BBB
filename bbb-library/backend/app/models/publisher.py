from typing import List, Optional
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.base import UUIDMixin, TimestampMixin


class Publisher(Base, UUIDMixin, TimestampMixin):
    """Publisher Entity."""

    __tablename__ = "publishers"

    name: Mapped[str] = mapped_column(
        String(256),
        nullable=False,
        unique=True,
        index=True,
    )
    location: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)

    # Relationships
    canonical_books: Mapped[List["CanonicalBook"]] = relationship(
        "CanonicalBook", back_populates="publisher"
    )
