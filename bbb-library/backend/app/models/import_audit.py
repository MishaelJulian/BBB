from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.base import UUIDMixin, TimestampMixin


class ImportJob(Base, UUIDMixin, TimestampMixin):
    """Import Job Audit Entity."""

    __tablename__ = "import_jobs"

    source_type: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="STARTED")
    total_items: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    processed_items: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    error_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class ImportLog(Base, UUIDMixin):
    """Import Log Entry Entity."""

    __tablename__ = "import_logs"

    job_id: Mapped[str] = mapped_column(String(36), ForeignKey("import_jobs.id"), nullable=False, index=True)
    log_level: Mapped[str] = mapped_column(String(16), nullable=False, default="INFO")
    message: Mapped[Text] = mapped_column(Text, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    details: Mapped[Optional[Text]] = mapped_column(Text, nullable=True)


class ValidationError(Base, UUIDMixin):
    """Validation Error Entry Entity."""

    __tablename__ = "validation_errors"

    job_id: Mapped[str] = mapped_column(String(36), ForeignKey("import_jobs.id"), nullable=False, index=True)
    record_type: Mapped[str] = mapped_column(String(64), nullable=False)
    record_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    field_name: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    error_message: Mapped[Text] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String(16), nullable=False, default="WARNING")
