"""members.member_code: a permanent id of the form MMM-NN (first meetup number, then order within that meetup)

Revision ID: a1d3e5f70009
Revises: a1d3e5f70008
Create Date: 2026-10-12

Founder's rule: names stay free-form (surnames optional, initials when two people would be confused); the id is the stable key.
Backfill: first meetup = the earliest meetup in meetup_attendance; order inside a meetup is alphabetical by display name
(the real order people first came is not recorded for history). Members with no attendance get no code until they are recorded at a meetup.
"""
from typing import Sequence, Union

from alembic import op

revision: str = "a1d3e5f70009"
down_revision: Union[str, None] = "a1d3e5f70008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE members ADD COLUMN member_code VARCHAR(16)")
    op.execute("CREATE UNIQUE INDEX ux_members_member_code ON members (member_code) WHERE member_code IS NOT NULL")
    op.execute("""WITH f AS (
            SELECT m.id AS id, m.display_name AS name, MIN(x.meetup_number) AS first_m
            FROM members m JOIN meetup_attendance a ON a.member_id = m.id JOIN meetups x ON x.id = a.meetup_id GROUP BY m.id),
        r AS (SELECT id, first_m, ROW_NUMBER() OVER (PARTITION BY first_m ORDER BY lower(name), id) AS seq FROM f)
        UPDATE members SET member_code = (SELECT printf('%03d-%02d', first_m, seq) FROM r WHERE r.id = members.id)
        WHERE id IN (SELECT id FROM r)""")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ux_members_member_code")
    op.drop_column("members", "member_code")
