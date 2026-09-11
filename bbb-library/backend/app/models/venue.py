from typing import List, Optional
from sqlalchemy import String, Boolean, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.base import UUIDMixin, TimestampMixin


class Venue(Base, UUIDMixin, TimestampMixin):
    """Venue Entity.
    
    Represents physical locations (e.g. Atta Galatta, Bookworm Church Street, 
    Koramangala Art Studio) or virtual spaces (e.g. Zoom / Google Meet).
    """

    __tablename__ = "venues"

    name: Mapped[str] = mapped_column(
        String(256),
        nullable=False,
        unique=True,
        index=True,
        doc="Primary venue name (e.g. Atta Galatta)",
    )
    city: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
        default="Bengaluru",
        index=True,
        doc="City where venue is located",
    )
    address: Mapped[Optional[str]] = mapped_column(
        String(512),
        nullable=True,
        doc="Street address or area details",
    )
    is_online: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        index=True,
        doc="Flag indicating whether venue is a virtual online platform",
    )

    # Relationships
    meetups: Mapped[List["Meetup"]] = relationship("Meetup", back_populates="venue")
