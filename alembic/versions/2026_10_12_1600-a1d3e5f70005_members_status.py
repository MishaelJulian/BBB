"""members.status: guest or member (the presenter promotes a guest after their third meetup in a row)

Revision ID: a1d3e5f70005
Revises: a1d3e5f70004
Create Date: 2026-10-12

Every existing row becomes 'member' (they are the club's members today). Triggers, not a CHECK: SQLite cannot add one by ALTER.
"""
from typing import Sequence, Union

from alembic import op

revision: str = "a1d3e5f70005"
down_revision: Union[str, None] = "a1d3e5f70004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE members ADD COLUMN status VARCHAR(16) NOT NULL DEFAULT 'member'")
    for name, event in (("trg_member_status_insert", "INSERT"), ("trg_member_status_update", "UPDATE OF status")):
        op.execute(f"""CREATE TRIGGER {name} BEFORE {event} ON members
            WHEN NEW.status NOT IN ('guest', 'member')
            BEGIN SELECT RAISE(ABORT, 'member status must be guest or member'); END""")


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_member_status_insert")
    op.execute("DROP TRIGGER IF EXISTS trg_member_status_update")
    op.drop_column("members", "status")
