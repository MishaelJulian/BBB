"""Who should the presenter be offered to make a member?

Rule (founder, 2026-10-12): a guest who has been at three meetups in a row, ending at the meetup just saved.
"Been at" is counted from discussions (the member brought or discussed something), because no attendance table exists yet.
Anyone who came and brought nothing is invisible here; a real attendance record would replace this one query.
"""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.models import Discussion, Meetup, Member

STREAK = 3  # ponytail: one number, change it here


def promotion_candidates(session: Session, latest: int | None = None, streak: int = STREAK) -> list[dict]:
    latest = latest if latest is not None else session.scalar(select(Meetup.meetup_number).order_by(Meetup.meetup_number.desc()).limit(1))
    if latest is None:
        return []
    rows = session.execute(
        select(Member.id, Member.display_name, Meetup.meetup_number)
        .join(Discussion, Discussion.member_id == Member.id)
        .join(Meetup, Meetup.id == Discussion.meetup_id)
        .where(Member.status == "guest", Meetup.meetup_number <= latest)
    ).all()
    seen: dict[str, tuple[str, set[int]]] = {}
    for mid, name, n in rows:
        seen.setdefault(mid, (name, set()))[1].add(n)
    out = []
    for mid, (name, nums) in seen.items():
        run = 0
        while latest - run in nums:      # meetup numbers, so a missing meetup number breaks the run
            run += 1
        if run >= streak:
            out.append({"member_id": mid, "display_name": name, "consecutive_meetups": run, "latest_meetup": latest})
    return sorted(out, key=lambda r: r["display_name"])
