"""meetup_attendance: who was at which meetup, whether or not they brought a book

Revision ID: a1d3e5f70006
Revises: a1d3e5f70005
Create Date: 2026-10-12

One table (the architecture consult of 2026-10-09 says not to build separate registration and attendance tables).
Backfill: everyone who has a discussion at a meetup was there; those rows get source 'backfill'.
Rollback: downgrade drops the table (the backfilled rows can be rebuilt from discussions).
"""
from typing import Sequence, Union

from alembic import op

revision: str = "a1d3e5f70006"
down_revision: Union[str, None] = "a1d3e5f70005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""CREATE TABLE meetup_attendance (
        id VARCHAR(36) PRIMARY KEY,
        meetup_id VARCHAR(36) NOT NULL REFERENCES meetups(id) ON DELETE CASCADE,
        member_id VARCHAR(36) NOT NULL REFERENCES members(id) ON DELETE CASCADE,
        status VARCHAR(16) NOT NULL DEFAULT 'attended' CHECK (status IN ('registered', 'attended', 'presenter')),
        source VARCHAR(16) NOT NULL DEFAULT 'form' CHECK (source IN ('form', 'gforms', 'backfill')),
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (meetup_id, member_id))""")
    op.execute("CREATE INDEX ix_meetup_attendance_member ON meetup_attendance (member_id)")
    op.execute("""INSERT INTO meetup_attendance (id, meetup_id, member_id, status, source)
        SELECT lower(hex(randomblob(16))), meetup_id, member_id, 'attended', 'backfill'
        FROM discussions WHERE member_id IS NOT NULL GROUP BY meetup_id, member_id""")


def downgrade() -> None:
    op.execute("DROP TABLE meetup_attendance")
