"""Deleting a book clears the links from its import rows, on every connection

Revision ID: a1d3e5f70008
Revises: a1d3e5f70007
Create Date: 2026-10-12

17 import rows were left pointing at deleted books by a raw-SQL purge (scripts/merge_duplicates_and_clean.py step 7, 2026-10-10)
because SQLite only enforces foreign keys on connections that turn them on. A trigger holds for every connection, scripts included.
Discussions are not touched: they still block the delete when foreign keys are on, as before.
"""
from typing import Sequence, Union

from alembic import op

revision: str = "a1d3e5f70008"
down_revision: Union[str, None] = "a1d3e5f70007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""CREATE TRIGGER trg_book_delete_unlinks_imports AFTER DELETE ON canonical_books
        BEGIN UPDATE imported_books SET canonical_book_id = NULL WHERE canonical_book_id = OLD.id; END""")


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_book_delete_unlinks_imports")
