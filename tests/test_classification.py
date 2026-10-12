"""Migration a1d3e5f70003 on a copy of the committed database: categories, tangent flag, one-target mentions."""
import os, shutil, sqlite3, subprocess, sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent


def run(db, *args):
    env = dict(os.environ, DATABASE_URL=f"sqlite:///{db}")
    r = subprocess.run([sys.executable, "-m", "alembic", *args], cwd=ROOT, env=env, capture_output=True, text=True)
    assert r.returncode == 0, r.stderr[-800:]


@pytest.fixture
def db(tmp_path):
    p = tmp_path / "copy.db"
    src = sqlite3.connect(f"file:{ROOT / 'book_club_archivist.db'}?mode=ro", uri=True)
    dst = sqlite3.connect(p); src.backup(dst); src.close(); dst.close()
    run(p, "downgrade", "a1d3e5f70002"); run(p, "upgrade", "head")   # prove the migration from the previous revision
    return p


@pytest.mark.parametrize("fk", ["ON", "OFF"])
def test_rules_hold_with_foreign_keys_on_and_off(db, fk):
    c = sqlite3.connect(db); c.execute(f"PRAGMA foreign_keys={fk}")
    assert c.execute("select count(*) from media_categories").fetchone()[0] == 13        # 10 approved + 3 legacy kept until the app switches
    assert c.execute("select count(*) from canonical_books where media_type='video'").fetchone()[0] == 0   # 0004 put the two renamed rows back
    assert c.execute("select sum(is_tangent) from discussions").fetchone()[0] == c.execute("select count(*) from discussions where media_type='tangent'").fetchone()[0] > 0
    now = "datetime('now')"
    ins = f"insert into canonical_books(id,title,normalized_title,language,media_type,created_at,updated_at) values(?,?,?,'en',?,{now},{now})"
    c.execute(ins, ("t-poem", "A poem", "a poem", "poem"))
    for legacy in ("youtube", "show", "tangent"):            # what the running admin screens still write
        c.execute(ins, (f"t-{legacy}", legacy, legacy, legacy))
    with pytest.raises(sqlite3.DatabaseError, match="unknown media category"):
        c.execute(ins, ("t-bad", "Bad", "bad", "bogus"))
    meetup = c.execute("select id from meetups limit 1").fetchone()[0]
    c.execute(f"insert into series(id,title,created_at,updated_at) values('s1','Red Rising Saga',{now},{now})")
    d = "insert into discussions(id,meetup_id,canonical_book_id,series_id,confidence_score,created_at,updated_at) values(?,?,?,?,1.0,datetime('now'),datetime('now'))"
    c.execute(d, ("m-series", meetup, None, "s1"))            # a series mention
    c.execute(d, ("m-book", meetup, "t-poem", None))          # a book mention
    for args in (("m-both", meetup, "t-poem", "s1"), ("m-none", meetup, None, None)):
        with pytest.raises(sqlite3.DatabaseError, match="exactly one"):
            c.execute(d, args)
    with pytest.raises(sqlite3.DatabaseError, match="exactly one"):
        c.execute("update discussions set series_id='s1' where id='m-book'")


def test_orm_reads_and_writes_the_new_fields(db):
    """The models match the migrated database: tangent flag, series mention, media categories."""
    from sqlalchemy import create_engine, event
    from sqlalchemy.exc import DatabaseError
    from sqlalchemy.orm import Session
    from app.database.models import CanonicalBook, Discussion, MediaCategory, Meetup, Series

    eng = create_engine(f"sqlite:///{db}")
    with Session(eng) as s:
        assert s.query(MediaCategory).count() == 13
        assert s.query(Discussion).filter(Discussion.is_tangent.is_(True)).count() == 77
        meetup = s.query(Meetup).first()
        series = Series(title="Red Rising Saga"); s.add(series); s.flush()
        s.add(Discussion(meetup_id=meetup.id, series_id=series.id)); s.flush()          # a series mention
        s.add(Discussion(meetup_id=meetup.id, canonical_book_id=s.query(CanonicalBook).first().id, is_tangent=True)); s.flush()
        s.add(Discussion(meetup_id=meetup.id)); 
        with pytest.raises(DatabaseError, match="exactly one"):
            s.flush()                                                                    # neither target: refused


def test_attendance_drives_the_three_in_a_row_suggestion(db, monkeypatch):
    """Guests who only came (no book) count; a gap, two in a row, or a full member do not; the presenter's click makes a member."""
    from fastapi import HTTPException
    from sqlalchemy import create_engine, text
    from sqlalchemy.orm import Session, sessionmaker
    from app.api import main
    from app.services.membership import promotion_candidates

    eng = create_engine(f"sqlite:///{db}")
    monkeypatch.setattr(main, "SessionLocal", sessionmaker(bind=eng))
    with eng.begin() as c:
        pairs = c.execute(text("select count(*) from (select 1 from discussions where member_id is not null group by meetup_id, member_id)")).scalar()
        assert pairs > 300 and c.execute(text("select count(*) from meetup_attendance where source='backfill'")).scalar() == pairs   # history rebuilt from discussions
        for pid, status in (("g3", "guest"), ("g2", "guest"), ("gap", "guest"), ("m3", "member")):
            c.execute(text("insert into members(id,display_name,normalized_name,status,created_at,updated_at) values(:i,:i,:i,:s,datetime('now'),datetime('now'))"), {"i": pid, "s": status})
        with pytest.raises(Exception, match="guest or member"):
            c.execute(text("update members set status='bogus' where id='g3'"))
    for n, who in ((96, ["gap"]), (97, ["g3", "m3"]), (98, ["g3", "g2", "gap", "m3"])):
        main.save_meetup_attendance(n, main.AttendanceRequest(member_ids=who))
    out = main.save_meetup_attendance(99, main.AttendanceRequest(member_ids=["g3", "g2", "gap", "m3", "g3"]))   # repeat id is harmless
    assert out["recorded"] == 4 and [r["member_id"] for r in out["suggestions"]] == ["g3"]
    assert main.save_meetup_attendance(99, main.AttendanceRequest(member_ids=["g3"]))["recorded"] == 0       # saving twice adds nothing
    assert [r["member_id"] for r in main.get_promotion_suggestions()["suggestions"]] == ["g3"]
    with pytest.raises(HTTPException) as e:
        main.save_meetup_attendance(99, main.AttendanceRequest(member_ids=["nobody"]))
    assert e.value.status_code == 404
    assert main.confirm_member("g3")["status"] == "member"
    assert main.get_promotion_suggestions()["suggestions"] == []
