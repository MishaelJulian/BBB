"""Identifier trust order, read from identifier_schemes.authority_rank (data, not code).

Change it with set_authority_order(); no migration or deploy is needed."""

from sqlalchemy import text
from sqlalchemy.orm import Session


def best_identifier(session: Session, level: str, ids: dict[str, str]) -> tuple[str, str] | None:
    """The (scheme, value) from ids whose scheme ranks highest at this level, or None."""
    ranked = session.execute(
        text("SELECT scheme FROM identifier_schemes WHERE level = :l ORDER BY authority_rank"), {"l": level}
    ).scalars()
    for scheme in ranked:
        if scheme in ids:
            return scheme, ids[scheme]
    return None


def set_authority_order(session: Session, level: str, ordered: list[str]) -> None:
    """Make `ordered` the trust order for this level (first wins). Schemes not listed keep their relative
    order after the listed ones. The unique (level, rank) constraint forbids a direct swap, so ranks go
    through negative placeholders inside one transaction."""
    rows = session.execute(
        text("SELECT scheme FROM identifier_schemes WHERE level = :l ORDER BY authority_rank"), {"l": level}
    ).scalars().all()
    unknown = [s for s in ordered if s not in rows]
    if unknown:
        raise ValueError(f"unknown {level}-level schemes: {unknown}")
    final = ordered + [s for s in rows if s not in ordered]
    for i, s in enumerate(final, start=1):
        session.execute(text("UPDATE identifier_schemes SET authority_rank = :r WHERE scheme = :s"), {"r": -i, "s": s})
    for i, s in enumerate(final, start=1):
        session.execute(text("UPDATE identifier_schemes SET authority_rank = :r WHERE scheme = :s"), {"r": i, "s": s})
    session.commit()
