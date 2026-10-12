"""Media categories as data, tangent as a flag, a mention points at one book or one series (additive)

Revision ID: a1d3e5f70003
Revises: a1d3e5f70002
Create Date: 2026-10-12

Expand phase only: nothing is dropped. discussions.media_type stays (redundant with the book's) until the app switches.
Triggers, not constraints, because SQLite cannot add a CHECK or a foreign key rule to an existing table by ALTER.
Existing rows are not re-checked: two books still carry the old value 'tangent' and are listed in docs/review/clarity_needed_books.md.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "a1d3e5f70003"
down_revision: Union[str, None] = "a1d3e5f70002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

CATEGORIES = [
    ("book", "Book", 1), ("article", "Article", 2), ("movie", "Movie", 3), ("tv_series", "TV / web series", 4),
    ("anime", "Anime", 5), ("documentary", "Documentary", 6), ("podcast", "Podcast", 7),
    ("video", "Video / YouTube", 8), ("website_app", "Website / app", 9), ("poem", "Poem", 10),
]
TRIGGERS = ("trg_media_category_insert", "trg_media_category_update", "trg_mention_one_target_insert", "trg_mention_one_target_update")


def upgrade() -> None:
    cats = op.create_table(
        "media_categories",
        sa.Column("code", sa.String(32), primary_key=True),
        sa.Column("label", sa.String(64), nullable=False),
        sa.Column("sort_order", sa.Integer, nullable=False),
    )
    op.bulk_insert(cats, [dict(code=c, label=l, sort_order=s) for c, l, s in CATEGORIES])

    # old spelling -> new code, on both columns that hold it
    op.execute("UPDATE canonical_books SET media_type='video' WHERE media_type='youtube'")
    op.execute("UPDATE discussions SET media_type='video' WHERE media_type='youtube'")

    # tangent: a way a thing was mentioned, not a kind of thing
    op.execute("ALTER TABLE discussions ADD COLUMN is_tangent BOOLEAN NOT NULL DEFAULT 0")
    op.execute("UPDATE discussions SET is_tangent=1 WHERE media_type='tangent'")

    # a mention points at exactly one of: a book, a series
    op.execute("ALTER TABLE discussions ADD COLUMN series_id VARCHAR(36) REFERENCES series(id)")
    op.execute("CREATE INDEX ix_discussions_series_id ON discussions (series_id)")

    for name, event in (("trg_media_category_insert", "INSERT"), ("trg_media_category_update", "UPDATE OF media_type")):
        op.execute(f"""CREATE TRIGGER {name} BEFORE {event} ON canonical_books
            WHEN NEW.media_type IS NOT NULL AND NOT EXISTS (SELECT 1 FROM media_categories WHERE code = NEW.media_type)
            BEGIN SELECT RAISE(ABORT, 'unknown media category; add it to media_categories first'); END""")
    for name, event in (("trg_mention_one_target_insert", "INSERT"), ("trg_mention_one_target_update", "UPDATE OF canonical_book_id, series_id")):
        op.execute(f"""CREATE TRIGGER {name} BEFORE {event} ON discussions
            WHEN (NEW.canonical_book_id IS NULL) = (NEW.series_id IS NULL)
            BEGIN SELECT RAISE(ABORT, 'a mention must point at exactly one of a book or a series'); END""")


def downgrade() -> None:
    for t in TRIGGERS:
        op.execute(f"DROP TRIGGER IF EXISTS {t}")
    op.execute("DROP INDEX IF EXISTS ix_discussions_series_id")
    op.drop_column("discussions", "series_id")
    op.drop_column("discussions", "is_tangent")
    op.execute("UPDATE canonical_books SET media_type='youtube' WHERE media_type='video'")
    op.execute("UPDATE discussions SET media_type='youtube' WHERE media_type='video'")
    op.drop_table("media_categories")
