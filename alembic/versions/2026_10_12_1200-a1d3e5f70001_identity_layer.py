"""Identity layer: editions, identifier schemes, work and edition identifiers (additive)

Revision ID: a1d3e5f70001
Revises: 4b4cb3603d42
Create Date: 2026-10-12

Additive only: new tables and views, no change to any existing table, column or row
(discussions.edition_id comes in the next phase, together with the model change: expand, then switch). The live database must be stamped
at the baseline first (`alembic stamp 4b4cb3603d42`, after a backup; Q9). Rollback: downgrade drops the
new tables and views.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "a1d3e5f70001"
down_revision: Union[str, None] = "4b4cb3603d42"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Default trust order (data, not code; change it with UPDATE, no migration needed).
# standard first, then open data, then commercial services. Confirm with the founders.
SCHEMES = [
    # scheme,               level,     kind,         rank
    ("isbn13",              "edition", "standard",   1),
    ("openlibrary_edition", "edition", "open",       2),
    ("goodreads_book",      "edition", "commercial", 3),
    ("asin",                "edition", "commercial", 4),
    ("manual",              "edition", "manual",     99),
    ("wikidata",            "work",    "open",       1),
    ("openlibrary_work",    "work",    "open",       2),
    ("goodreads_work",      "work",    "commercial", 3),
]


def upgrade() -> None:
    schemes = op.create_table(
        "identifier_schemes",
        sa.Column("scheme", sa.String(32), primary_key=True),
        sa.Column("level", sa.String(8), nullable=False),
        sa.Column("kind", sa.String(16), nullable=False),
        sa.Column("authority_rank", sa.Integer, nullable=False),
        sa.CheckConstraint("level IN ('work', 'edition')", name="ck_scheme_level"),
        sa.CheckConstraint("kind IN ('standard', 'open', 'commercial', 'manual')", name="ck_scheme_kind"),
        sa.UniqueConstraint("scheme", "level", name="uq_scheme_level"),
        sa.UniqueConstraint("level", "authority_rank", name="uq_scheme_rank_per_level"),
    )
    op.bulk_insert(schemes, [dict(scheme=s, level=l, kind=k, authority_rank=r) for s, l, k, r in SCHEMES])

    op.create_table(
        "editions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("work_id", sa.String(36), sa.ForeignKey("canonical_books.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("publisher_id", sa.String(36), sa.ForeignKey("publishers.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("publication_year", sa.Integer, nullable=True),
        sa.Column("identity_basis", sa.String(32), sa.ForeignKey("identifier_schemes.scheme", name="fk_edition_basis"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("publication_year IS NULL OR publication_year BETWEEN 1000 AND 2100", name="ck_edition_year"),
        sa.CheckConstraint(
            "identity_basis <> 'manual' OR (publisher_id IS NOT NULL AND publication_year IS NOT NULL)",
            name="ck_edition_manual_needs_publisher_and_year",
        ),
    )
    op.create_index("ix_editions_work_id", "editions", ["work_id"])
    op.create_index(
        "uq_editions_manual", "editions", ["work_id", "publisher_id", "publication_year"],
        unique=True, sqlite_where=sa.text("identity_basis = 'manual'"),
    )

    for table, parent, col, level, extra in (
        ("work_identifiers", "canonical_books", "work_id", "work", []),
        ("edition_identifiers", "editions", "edition_id", "edition", [
            sa.CheckConstraint("scheme <> 'isbn13' OR (length(value) = 13 AND value NOT GLOB '*[^0-9]*')", name="ck_isbn13_digits"),
        ]),
    ):
        op.create_table(
            table,
            sa.Column("scheme", sa.String(32), primary_key=True),
            sa.Column("value", sa.String(64), primary_key=True),
            sa.Column("level", sa.String(8), nullable=False, server_default=level),
            sa.Column(col, sa.String(36), sa.ForeignKey(f"{parent}.id", ondelete="CASCADE"), nullable=False),
            sa.ForeignKeyConstraint(["scheme", "level"], ["identifier_schemes.scheme", "identifier_schemes.level"]),
            sa.CheckConstraint(f"level = '{level}'", name=f"ck_{table[:-1]}_level"),
            *extra,
        )
        op.create_index(f"ix_{table}_{col}", table, [col])

    # Worklists, not enforcement: rules that span tables cannot be a CHECK in SQLite.
    op.execute(
        """CREATE VIEW v_works_without_identity AS
           SELECT cb.id AS work_id, cb.title FROM canonical_books cb
           WHERE NOT EXISTS (SELECT 1 FROM work_identifiers w WHERE w.work_id = cb.id)
             AND NOT EXISTS (SELECT 1 FROM editions e WHERE e.work_id = cb.id)"""
    )
    op.execute(
        """CREATE VIEW v_editions_missing_basis_identifier AS
           SELECT e.id AS edition_id, e.work_id, e.identity_basis FROM editions e
           WHERE e.identity_basis <> 'manual'
             AND NOT EXISTS (SELECT 1 FROM edition_identifiers i
                             WHERE i.edition_id = e.id AND i.scheme = e.identity_basis)"""
    )


def downgrade() -> None:
    op.execute("DROP VIEW IF EXISTS v_editions_missing_basis_identifier")
    op.execute("DROP VIEW IF EXISTS v_works_without_identity")
    op.drop_table("edition_identifiers")
    op.drop_table("work_identifiers")
    op.drop_table("editions")
    op.drop_table("identifier_schemes")
