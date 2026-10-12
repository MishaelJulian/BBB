"""Attendance and the guest-to-member suggestion.

Rule (founder, 2026-10-12): a guest (or BYOB person) who has been at three meetups in a row, ending at the meetup just saved, is offered to the
presenter, who decides. "Been at" = a meetup_attendance row with status attended or presenter, whether or not they brought a book.
"""
import uuid

from sqlalchemy import Integer, func, select
from sqlalchemy.orm import Session

from app.database.models import Meetup, MeetupAttendance, Member

STREAK = 3  # ponytail: one number, change it here


def assign_member_code(session: Session, member: Member, meetup_number: int) -> str:
    """Give a member their permanent id the first time they are recorded at a meetup: MMM-NN. Keeps an existing code."""
    if member.member_code:
        return member.member_code
    prefix = f"{meetup_number:03d}-"
    last = session.scalar(select(func.max(func.cast(func.substr(Member.member_code, 5), Integer))).where(Member.member_code.like(prefix + "%"))) or 0
    member.member_code = f"{prefix}{last + 1:02d}"   # max + 1, not a count: a removed code leaves a gap and a count would collide
    session.flush()
    return member.member_code


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
    for m in session.scalars(select(Member).where(Member.id.in_(new), Member.member_code.is_(None)).order_by(Member.display_name)):
        assign_member_code(session, m, meetup_number)
    return len(new)


def promotion_candidates(session: Session, latest: int | None = None, streak: int = STREAK) -> list[dict]:
    latest = latest if latest is not None else session.scalar(select(Meetup.meetup_number).order_by(Meetup.meetup_number.desc()).limit(1))
    if latest is None:
        return []
    rows = session.execute(
        select(Member.id, Member.display_name, Meetup.meetup_number)
        .join(MeetupAttendance, MeetupAttendance.member_id == Member.id)
        .join(Meetup, Meetup.id == MeetupAttendance.meetup_id)
        .where(Member.status.in_(("guest", "byob")), MeetupAttendance.status.in_(("attended", "presenter")), Meetup.meetup_number <= latest)
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
            out.append({"member_id": mid, "display_name": name, "member_code": session.get(Member, mid).member_code, "consecutive_meetups": run, "latest_meetup": latest})
    return sorted(out, key=lambda r: r["display_name"])


def make_member(session: Session, member_id: str) -> Member:
    """The presenter's confirmation. Only this changes a guest into a member."""
    m = session.get(Member, member_id)
    if m is None:
        raise LookupError("member not found")
    m.status = "member"
    session.flush()
    return m
