"""Attendance and the guest-to-member suggestion.

Rule (founder, 2026-10-12): a guest who has been at three meetups in a row, ending at the meetup just saved, is offered to the
presenter, who decides. "Been at" = a meetup_attendance row with status attended or presenter, whether or not they brought a book.
"""
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.models import Meetup, MeetupAttendance, Member

STREAK = 3  # ponytail: one number, change it here


def record_attendance(session: Session, meetup_number: int, member_ids: list[str], source: str = "form") -> int:
    """Mark these members as attended. Safe to repeat. Returns how many rows were new."""
    meetup = session.scalar(select(Meetup).where(Meetup.meetup_number == meetup_number))
    if meetup is None:
        raise LookupError(f"meetup {meetup_number} does not exist")
    have = set(session.scalars(select(MeetupAttendance.member_id).where(MeetupAttendance.meetup_id == meetup.id)))
    known = set(session.scalars(select(Member.id).where(Member.id.in_(member_ids))))
    missing = set(member_ids) - known
    if missing:
        raise LookupError(f"unknown member ids: {sorted(missing)}")
    new = [m for m in dict.fromkeys(member_ids) if m not in have]
    for m in new:
        session.add(MeetupAttendance(id=str(uuid.uuid4()), meetup_id=meetup.id, member_id=m, status="attended", source=source))
    session.flush()
    return len(new)


def promotion_candidates(session: Session, latest: int | None = None, streak: int = STREAK) -> list[dict]:
    latest = latest if latest is not None else session.scalar(select(Meetup.meetup_number).order_by(Meetup.meetup_number.desc()).limit(1))
    if latest is None:
        return []
    rows = session.execute(
        select(Member.id, Member.display_name, Meetup.meetup_number)
        .join(MeetupAttendance, MeetupAttendance.member_id == Member.id)
        .join(Meetup, Meetup.id == MeetupAttendance.meetup_id)
        .where(Member.status == "guest", MeetupAttendance.status.in_(("attended", "presenter")), Meetup.meetup_number <= latest)
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


def make_member(session: Session, member_id: str) -> Member:
    """The presenter's confirmation. Only this changes a guest into a member."""
    m = session.get(Member, member_id)
    if m is None:
        raise LookupError("member not found")
    m.status = "member"
    session.flush()
    return m
