"""Keep the three media values the running app still writes: youtube, show, tangent

Revision ID: a1d3e5f70004
Revises: a1d3e5f70003
Create Date: 2026-10-12

Migration 0003 made media_type a checked list and renamed 'youtube' to 'video'. The admin screens and the add/search endpoints
still write 'youtube', 'show' and 'tangent' (app/api/main.py, admin/page.tsx), so the rule would have rejected those saves.
Expand-then-switch: the old values stay valid, and the two rows renamed by 0003 go back, until the app is switched to the new categories.
"""
from typing import Sequence, Union

from alembic import op

revision: str = "a1d3e5f70004"
down_revision: Union[str, None] = "a1d3e5f70003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

LEGACY = [("youtube", "YouTube (legacy, use Video)", 101), ("show", "Show (legacy, use TV / web series)", 102),
          ("tangent", "Tangent (legacy; now a flag on the mention)", 103)]


def upgrade() -> None:
    for code, label, order in LEGACY:
        op.execute(f"INSERT OR IGNORE INTO media_categories(code,label,sort_order) VALUES ('{code}','{label}',{order})")
    op.execute("UPDATE canonical_books SET media_type='youtube' WHERE media_type='video'")
    op.execute("UPDATE discussions SET media_type='youtube' WHERE media_type='video'")


def downgrade() -> None:
    op.execute("UPDATE canonical_books SET media_type='video' WHERE media_type='youtube'")
    op.execute("UPDATE discussions SET media_type='video' WHERE media_type='youtube'")
    op.execute("DELETE FROM media_categories WHERE code IN ('youtube','show','tangent')")
