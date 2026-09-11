from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.base import UUIDMixin, TimestampMixin


class BookRelation(Base, UUIDMixin, TimestampMixin):
    """Inter-Book Relationship Entity (Sequels, Spin-offs, Recommended-Together)."""

    __tablename__ = "book_relations"

    source_book_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("canonical_books.id"), nullable=False, index=True
    )
    target_book_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("canonical_books.id"), nullable=False, index=True
    )
    relation_type: Mapped[str] = mapped_column(
        String(64), nullable=False, doc="Relation type: SEQUEL, PREQUEL, RECOMMENDED_WITH"
    )

    # Relationships
    source_book: Mapped["CanonicalBook"] = relationship("CanonicalBook", foreign_keys=[source_book_id])
    target_book: Mapped["CanonicalBook"] = relationship("CanonicalBook", foreign_keys=[target_book_id])
