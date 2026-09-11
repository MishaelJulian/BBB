from typing import List
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.base import UUIDMixin, TimestampMixin


class Genre(Base, UUIDMixin, TimestampMixin):
    """Genre Taxonomy Entity."""

    __tablename__ = "genres"

    name: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
        unique=True,
        index=True,
    )
    slug: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
        unique=True,
        index=True,
    )


class Tag(Base, UUIDMixin, TimestampMixin):
    """Freeform Tag Entity."""

    __tablename__ = "tags"

    name: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
        unique=True,
        index=True,
    )
