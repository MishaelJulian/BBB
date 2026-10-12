"""Switch phase for media categories: the app now writes only the approved codes and the tangent flag

Revision ID: a1d3e5f70010
Revises: a1d3e5f70009
Create Date: 2026-10-12

- youtube -> video and show -> tv_series on books and discussions; their legacy category rows go.
- A discussion typed 'tangent' already carries is_tangent = 1 (migration 0003); its own media_type now follows its book.
- The 'tangent' category row stays until the two books still typed 'tangent' (Alfred Hitchcock's Frenzy, Paul Thomas Anderson) are retyped by the founder.
Rollback: downgrade restores the legacy rows and spellings.
"""
from typing import Sequence, Union

from alembic import op

revision: str = "a1d3e5f70010"
down_revision: Union[str, None] = "a1d3e5f70009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    for old, new in (("youtube", "video"), ("show", "tv_series")):
        op.execute(f"UPDATE canonical_books SET media_type='{new}' WHERE media_type='{old}'")
        op.execute(f"UPDATE discussions SET media_type='{new}' WHERE media_type='{old}'")
    op.execute("""UPDATE discussions SET media_type = (SELECT b.media_type FROM canonical_books b WHERE b.id = discussions.canonical_book_id)
                  WHERE media_type = 'tangent' AND canonical_book_id IS NOT NULL
                    AND (SELECT b.media_type FROM canonical_books b WHERE b.id = discussions.canonical_book_id) <> 'tangent'""")
    op.execute("DELETE FROM media_categories WHERE code IN ('youtube', 'show')")


def downgrade() -> None:
    op.execute("INSERT OR IGNORE INTO media_categories(code,label,sort_order) VALUES ('youtube','YouTube (legacy, use Video)',101),('show','Show (legacy, use TV / web series)',102)")
    op.execute("UPDATE canonical_books SET media_type='youtube' WHERE media_type='video'")
    op.execute("UPDATE discussions SET media_type='youtube' WHERE media_type='video'")
    op.execute("UPDATE discussions SET media_type='tangent' WHERE is_tangent=1")
