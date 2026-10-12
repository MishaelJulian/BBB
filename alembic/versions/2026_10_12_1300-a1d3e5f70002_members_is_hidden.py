"""members.is_hidden: the column existed only through request-time DDL; give it a migration

Revision ID: a1d3e5f70002
Revises: a1d3e5f70001
Create Date: 2026-10-12

Idempotent: the live database already has the column, a database built from the baseline does not.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "a1d3e5f70002"
down_revision: Union[str, None] = "a1d3e5f70001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    cols = {c["name"] for c in sa.inspect(op.get_bind()).get_columns("members")}
    if "is_hidden" not in cols:
        op.add_column("members", sa.Column("is_hidden", sa.Boolean(), nullable=False, server_default=sa.text("0")))


def downgrade() -> None:
    op.drop_column("members", "is_hidden")  # SQLite >= 3.35
