"""members.status gets a third value, 'byob': a person from the BYOB club who joined a crossover meet

Revision ID: a1d3e5f70007
Revises: a1d3e5f70006
Create Date: 2026-10-12

guest = comes to BBB, not yet confirmed; byob = known only from the BYOB crossover; member = confirmed by the presenter.
Turning a guest or byob person into a member is one update (the make-member endpoint).
"""
from typing import Sequence, Union

from alembic import op

revision: str = "a1d3e5f70007"
down_revision: Union[str, None] = "a1d3e5f70006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _triggers(values: str, msg: str) -> None:
    for name in ("trg_member_status_insert", "trg_member_status_update"):
        op.execute(f"DROP TRIGGER IF EXISTS {name}")
    for name, event in (("trg_member_status_insert", "INSERT"), ("trg_member_status_update", "UPDATE OF status")):
        op.execute(f"""CREATE TRIGGER {name} BEFORE {event} ON members
            WHEN NEW.status NOT IN ({values})
            BEGIN SELECT RAISE(ABORT, '{msg}'); END""")


def upgrade() -> None:
    _triggers("'guest', 'byob', 'member'", "member status must be guest, byob or member")


def downgrade() -> None:
    op.execute("UPDATE members SET status='guest' WHERE status='byob'")
    _triggers("'guest', 'member'", "member status must be guest or member")
