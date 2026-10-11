"""Identity layer (additive): editions and external identifiers, in third normal form.

  canonical_books (the work)  1 --- N  editions             work_id NOT NULL, ON DELETE RESTRICT
  canonical_books             1 --- N  work_identifiers     keyed by (scheme, value)
  editions                    1 --- N  edition_identifiers  keyed by (scheme, value)
  identifier_schemes          1 --- N  both identifier tables via (scheme, level)

Rules enforced by the database, not by application code:
  * an edition cannot exist without its work, and a work that has editions cannot be deleted;
  * one identifier value belongs to exactly one work or edition (no second record for the same ISBN);
  * a work-level scheme cannot be stored against an edition and the reverse (composite foreign key);
  * an edition identified only by hand (identity_basis 'manual') must carry publisher and year.
"""

from typing import Optional

from sqlalchemy import (
    CheckConstraint, ForeignKey, ForeignKeyConstraint, Index, Integer, String, UniqueConstraint, text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin, UUIDMixin


class IdentifierScheme(Base):
    """Reference table: which identifier systems exist, at which level, and how much each is trusted."""

    __tablename__ = "identifier_schemes"

    scheme: Mapped[str] = mapped_column(String(32), primary_key=True)
    level: Mapped[str] = mapped_column(String(8), nullable=False)
    kind: Mapped[str] = mapped_column(String(16), nullable=False)
    authority_rank: Mapped[int] = mapped_column(Integer, nullable=False, doc="1 wins when two schemes disagree")

    __table_args__ = (
        CheckConstraint("level IN ('work', 'edition')", name="ck_scheme_level"),
        CheckConstraint("kind IN ('standard', 'open', 'commercial', 'manual')", name="ck_scheme_kind"),
        UniqueConstraint("scheme", "level", name="uq_scheme_level"),
        UniqueConstraint("level", "authority_rank", name="uq_scheme_rank_per_level"),
    )


class Edition(Base, UUIDMixin, TimestampMixin):
    """One published edition (format, translation or print run) of a work."""

    __tablename__ = "editions"

    work_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("canonical_books.id", ondelete="RESTRICT"), nullable=False, index=True,
    )
    publisher_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("publishers.id", ondelete="RESTRICT"), nullable=True,
    )
    publication_year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    identity_basis: Mapped[str] = mapped_column(
        String(32), nullable=False, doc="Scheme that identified this edition, or 'manual'",
    )

    __table_args__ = (
        ForeignKeyConstraint(
            ["identity_basis"], ["identifier_schemes.scheme"], name="fk_edition_basis",
        ),
        CheckConstraint(
            "publication_year IS NULL OR publication_year BETWEEN 1000 AND 2100", name="ck_edition_year",
        ),
        CheckConstraint(
            "identity_basis <> 'manual' OR (publisher_id IS NOT NULL AND publication_year IS NOT NULL)",
            name="ck_edition_manual_needs_publisher_and_year",
        ),
        Index(
            "uq_editions_manual", "work_id", "publisher_id", "publication_year",
            unique=True, sqlite_where=text("identity_basis = 'manual'"),
        ),
    )


class WorkIdentifier(Base):
    """An external identifier of a work (Wikidata Q-id, Open Library work key)."""

    __tablename__ = "work_identifiers"

    scheme: Mapped[str] = mapped_column(String(32), primary_key=True)
    value: Mapped[str] = mapped_column(String(64), primary_key=True)
    level: Mapped[str] = mapped_column(String(8), nullable=False, default="work", server_default="work")
    work_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("canonical_books.id", ondelete="CASCADE"), nullable=False, index=True,
    )

    __table_args__ = (
        ForeignKeyConstraint(["scheme", "level"], ["identifier_schemes.scheme", "identifier_schemes.level"]),
        CheckConstraint("level = 'work'", name="ck_work_identifier_level"),
    )


class EditionIdentifier(Base):
    """An external identifier of an edition (ISBN-13, Goodreads book id, ASIN, Open Library edition key)."""

    __tablename__ = "edition_identifiers"

    scheme: Mapped[str] = mapped_column(String(32), primary_key=True)
    value: Mapped[str] = mapped_column(String(64), primary_key=True)
    level: Mapped[str] = mapped_column(String(8), nullable=False, default="edition", server_default="edition")
    edition_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("editions.id", ondelete="CASCADE"), nullable=False, index=True,
    )

    __table_args__ = (
        ForeignKeyConstraint(["scheme", "level"], ["identifier_schemes.scheme", "identifier_schemes.level"]),
        CheckConstraint("level = 'edition'", name="ck_edition_identifier_level"),
        CheckConstraint(
            "scheme <> 'isbn13' OR (length(value) = 13 AND value NOT GLOB '*[^0-9]*')",
            name="ck_isbn13_digits",
        ),
    )
