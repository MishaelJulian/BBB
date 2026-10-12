"""Series structure: a normalised title, an author, a book's place in its series, and the rules that keep them consistent

Revision ID: a1d3e5f70012
Revises: a1d3e5f70011
Create Date: 2026-10-13

Expand step only (schema, no data; the series table is empty today).
- series.normalized_title: unique, required (case, punctuation, a leading 'The' and the words series / trilogy / saga do not make a second series).
- series.author_id: optional pointer to authors.
- canonical_books.series_position: optional, only with a series_id, greater than 0 (REAL so 0.5 novellas fit), unique within a series.
- A series cannot be deleted while a book or a mention still points at it (foreign keys are per connection; the trigger holds regardless).
Rollback: drops the triggers and indexes and empties the two new columns (SQLite cannot drop a column that carries a foreign key; they stay, nullable and unused).
"""
from typing import Sequence, Union

from alembic import op

revision: str = "a1d3e5f70012"
down_revision: Union[str, None] = "a1d3e5f70011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_column(table: str, column: str) -> bool:
    return any(r[1] == column for r in op.get_bind().exec_driver_sql(f"PRAGMA table_info({table})").fetchall())


def upgrade() -> None:
    if not _has_column("series", "normalized_title"):
        op.execute("ALTER TABLE series ADD COLUMN normalized_title VARCHAR(256)")
    if not _has_column("series", "author_id"):
        op.execute("ALTER TABLE series ADD COLUMN author_id VARCHAR(36) REFERENCES authors(id)")
    if not _has_column("canonical_books", "series_position"):
        op.execute("ALTER TABLE canonical_books ADD COLUMN series_position REAL")
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS uq_series_normalized_title ON series(normalized_title) WHERE normalized_title IS NOT NULL")
    op.execute("CREATE INDEX IF NOT EXISTS ix_series_author_id ON series(author_id)")
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS uq_book_series_position ON canonical_books(series_id, series_position) "
               "WHERE series_id IS NOT NULL AND series_position IS NOT NULL")
    op.execute("CREATE INDEX IF NOT EXISTS ix_canonical_books_series_id ON canonical_books(series_id)")
    for when, cols in (("INSERT", ""), ("UPDATE", " OF normalized_title, title")):
        op.execute(f"""CREATE TRIGGER IF NOT EXISTS trg_series_needs_name_{when.lower()} BEFORE {when}{cols} ON series
            WHEN NEW.normalized_title IS NULL OR trim(NEW.normalized_title) = '' OR trim(NEW.title) = ''
            BEGIN SELECT RAISE(ABORT, 'a series needs a title and a normalized_title'); END""")
    for when, cols in (("INSERT", ""), ("UPDATE", " OF series_id, series_position")):
        op.execute(f"""CREATE TRIGGER IF NOT EXISTS trg_book_position_{when.lower()} BEFORE {when}{cols} ON canonical_books
            WHEN NEW.series_position IS NOT NULL AND (NEW.series_id IS NULL OR NEW.series_position <= 0)
            BEGIN SELECT RAISE(ABORT, 'a series position needs a series and must be greater than 0'); END""")
    op.execute("""CREATE TRIGGER IF NOT EXISTS trg_series_delete_guard BEFORE DELETE ON series
        WHEN EXISTS (SELECT 1 FROM canonical_books WHERE series_id = OLD.id) OR EXISTS (SELECT 1 FROM discussions WHERE series_id = OLD.id)
        BEGIN SELECT RAISE(ABORT, 'series still has books or mentions; move them first'); END""")


def downgrade() -> None:
    for t in ("trg_series_needs_name_insert", "trg_series_needs_name_update", "trg_book_position_insert", "trg_book_position_update", "trg_series_delete_guard"):
        op.execute(f"DROP TRIGGER IF EXISTS {t}")
    for i in ("uq_series_normalized_title", "ix_series_author_id", "uq_book_series_position", "ix_canonical_books_series_id"):
        op.execute(f"DROP INDEX IF EXISTS {i}")
    op.execute("UPDATE canonical_books SET series_position = NULL")
    op.execute("UPDATE series SET author_id = NULL, normalized_title = NULL")
