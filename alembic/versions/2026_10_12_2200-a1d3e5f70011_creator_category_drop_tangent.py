"""Eleventh media category 'creator' (a person: director, author, artist) and the legacy 'tangent' category goes

Revision ID: a1d3e5f70011
Revises: a1d3e5f70010
Create Date: 2026-10-12

- Founder, 2026-10-12: "Add an eleventh category, creator". Paul Thomas Anderson (a director's name) is retyped to it.
- Alfred Hitchcock's Frenzy was retyped to 'movie' by hand the same day.
- The 'tangent' row is removed only when nothing still uses it; tangent itself is the flag discussions.is_tangent.
Rollback: downgrade restores the 'tangent' row and Paul Thomas Anderson's old type; other creator items stay creator.
"""
from typing import Sequence, Union

from alembic import op

revision: str = "a1d3e5f70011"
down_revision: Union[str, None] = "a1d3e5f70010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

PTA = "dc1a473d-9df4-443d-80da-9c83a3e1388b"  # Paul Thomas Anderson


def upgrade() -> None:
    op.execute("INSERT OR IGNORE INTO media_categories(code,label,sort_order) VALUES ('creator','Creator',11)")
    op.execute(f"UPDATE canonical_books SET media_type='creator' WHERE id='{PTA}' AND media_type='tangent'")
    op.execute("""UPDATE discussions SET media_type = (SELECT b.media_type FROM canonical_books b WHERE b.id = discussions.canonical_book_id)
                  WHERE media_type = 'tangent' AND canonical_book_id IS NOT NULL
                    AND (SELECT b.media_type FROM canonical_books b WHERE b.id = discussions.canonical_book_id) <> 'tangent'""")
    op.execute("""DELETE FROM media_categories WHERE code='tangent'
                  AND NOT EXISTS (SELECT 1 FROM canonical_books WHERE media_type='tangent')
                  AND NOT EXISTS (SELECT 1 FROM discussions WHERE media_type='tangent')""")


def downgrade() -> None:
    # Only the item this migration retyped goes back; other 'creator' items keep their type, so the category stays while any is in use.
    op.execute("INSERT OR IGNORE INTO media_categories(code,label,sort_order) VALUES ('tangent','Tangent (legacy; now a flag on the mention)',103)")
    op.execute(f"UPDATE canonical_books SET media_type='tangent' WHERE id='{PTA}' AND media_type='creator'")
    op.execute(f"UPDATE discussions SET media_type='tangent' WHERE canonical_book_id='{PTA}' AND media_type='creator'")
    op.execute("""DELETE FROM media_categories WHERE code='creator'
                  AND NOT EXISTS (SELECT 1 FROM canonical_books WHERE media_type='creator')
                  AND NOT EXISTS (SELECT 1 FROM discussions WHERE media_type='creator')""")
