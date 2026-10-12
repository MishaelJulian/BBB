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
    assert c.execute("select count(*) from media_categories").fetchone()[0] == 11        # 10 approved + 'creator' (0011); the legacy 'tangent' row is gone
    assert c.execute("select count(*) from media_categories where code in ('tangent','creator')").fetchone()[0] == 1
    assert c.execute("select count(*) from canonical_books where media_type='youtube'").fetchone()[0] == 0   # 0010 switched the app to the new codes
    assert c.execute("select sum(is_tangent) from discussions").fetchone()[0] == 77                      # the flag kept every tangent mention
    assert c.execute("select count(*) from discussions where media_type='tangent'").fetchone()[0] == 0     # 0011 retyped the last two; tangent lives only in the flag
    now = "datetime('now')"
    ins = f"insert into canonical_books(id,title,normalized_title,language,media_type,created_at,updated_at) values(?,?,?,'en',?,{now},{now})"
    c.execute(ins, ("t-poem", "A poem", "a poem", "poem"))
    c.execute(ins, ("t-creator", "A creator", "a creator", "creator"))   # the eleventh category (0011)
    for gone in ("youtube", "show", "tangent"):
        with pytest.raises(sqlite3.DatabaseError, match="unknown media category"):
            c.execute(ins, (f"t-{gone}", gone, gone, gone))
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
        assert s.query(MediaCategory).count() == 11
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
        for pid, status in (("g3", "guest"), ("g2", "guest"), ("gap", "guest"), ("m3", "member"), ("b3", "byob")):
            c.execute(text("insert into members(id,display_name,normalized_name,status,created_at,updated_at) values(:i,:i,:i,:s,datetime('now'),datetime('now'))"), {"i": pid, "s": status})
        with pytest.raises(Exception, match="guest, byob or member"):
            c.execute(text("update members set status='bogus' where id='g3'"))
    for n, who in ((96, ["gap"]), (97, ["g3", "m3", "b3"]), (98, ["g3", "g2", "gap", "m3", "b3"])):
        main.save_meetup_attendance(n, main.AttendanceRequest(member_ids=who))
    out = main.save_meetup_attendance(99, main.AttendanceRequest(member_ids=["g3", "g2", "gap", "m3", "b3", "g3"]))   # repeat id is harmless
    assert out["recorded"] == 5 and [r["member_id"] for r in out["suggestions"]] == ["b3", "g3"]
    assert main.save_meetup_attendance(99, main.AttendanceRequest(member_ids=["g3"]))["recorded"] == 0       # saving twice adds nothing
    assert [r["member_id"] for r in main.get_promotion_suggestions()["suggestions"]] == ["b3", "g3"]
    with pytest.raises(HTTPException) as e:
        main.save_meetup_attendance(99, main.AttendanceRequest(member_ids=["nobody"]))
    assert e.value.status_code == 404
    assert main.confirm_member("g3")["status"] == "member"
    assert main.confirm_member("b3")["status"] == "member"     # the quick change from BYOB to BBB member
    assert main.get_promotion_suggestions()["suggestions"] == []


def test_committed_database_has_no_dangling_references():
    """Ratchet: the committed database must pass SQLite's own foreign-key check."""
    c = sqlite3.connect(f"file:{ROOT / 'book_club_archivist.db'}?mode=ro", uri=True)
    assert c.execute("pragma foreign_key_check").fetchall() == []


@pytest.mark.parametrize("fk", ["ON", "OFF"])
def test_deleting_a_book_clears_its_import_links(db, fk):
    c = sqlite3.connect(db); c.execute(f"PRAGMA foreign_keys={fk}")
    bid = c.execute("select canonical_book_id from imported_books where canonical_book_id is not null and canonical_book_id not in (select canonical_book_id from discussions where canonical_book_id is not null) limit 1").fetchone()[0]
    assert c.execute("select count(*) from imported_books where canonical_book_id=?", (bid,)).fetchone()[0] >= 1
    c.execute("delete from canonical_books where id=?", (bid,))
    assert c.execute("select count(*) from imported_books where canonical_book_id=?", (bid,)).fetchone()[0] == 0
    assert c.execute("pragma foreign_key_check").fetchall() == []


def test_member_codes_backfilled_unique_and_assigned_to_newcomers(db, monkeypatch):
    """Existing members get MMM-NN from their first meetup; a newcomer recorded at a meetup gets the next number there."""
    import re
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy.exc import IntegrityError
    from sqlalchemy import text
    from app.api import main

    eng = create_engine(f"sqlite:///{db}")
    monkeypatch.setattr(main, "SessionLocal", sessionmaker(bind=eng))
    with eng.begin() as c:
        codes = [r[0] for r in c.execute(text("select member_code from members where member_code is not null")).all()]
        assert len(codes) > 100 and len(codes) == len(set(codes)) and all(re.fullmatch(r"\d{3}-\d{2}", x) for x in codes)
        # the fixture rebuilds attendance from discussions (migration 0006), so only people with a book at #66 are there
        assert c.execute(text("select count(*) from members where member_code like '066-%'")).scalar() >= 5
        for pid in ("n1", "n2"):
            c.execute(text("insert into members(id,display_name,normalized_name,status,created_at,updated_at) values(:i,:i,:i,'guest',datetime('now'),datetime('now'))"), {"i": pid})
        with pytest.raises(IntegrityError):
            c.execute(text("update members set member_code=(select member_code from members where member_code is not null limit 1) where id='n1'"))
    first = main.save_meetup_attendance(99, main.AttendanceRequest(member_ids=["n2", "n1"]))
    with eng.begin() as c:
        got = dict(c.execute(text("select id, member_code from members where id in ('n1','n2')")).all())
        taken = c.execute(text("select count(*) from members where member_code like '099-%'")).scalar()
    assert got["n1"].startswith("099-") and got["n2"].startswith("099-") and got["n1"] != got["n2"] and taken >= 2
    again = dict(main.save_meetup_attendance(98, main.AttendanceRequest(member_ids=["n1"])) or {})
    with eng.begin() as c:
        assert c.execute(text("select member_code from members where id='n1'")).scalar() == got["n1"]      # a code never changes


def test_tangent_is_a_flag_in_the_api(db, monkeypatch):
    """Old media spellings are mapped, 'tangent' becomes the flag, unknown types are refused, listing and toggle use the flag."""
    from fastapi import HTTPException
    from sqlalchemy import create_engine, text
    from sqlalchemy.orm import sessionmaker
    from app.api import main

    eng = create_engine(f"sqlite:///{db}")
    monkeypatch.setattr(main, "SessionLocal", sessionmaker(bind=eng))
    def add(title, **kw):
        return main.add_book_to_meetup(99, main.AddBookToMeetupRequest(title=title, **kw))
    add("Mindy shorts", media_type="youtube", url="https://youtube.com/@mindy")
    add("Test Learning Site", media_type="tangent")
    add("Plain book tangent", is_tangent=True)
    add("A film", media_type="movie", is_general_discussion=True)
    add("Plain book")
    with pytest.raises(HTTPException) as e:
        add("Nonsense", media_type="bogus")
    assert e.value.status_code == 400 and "Allowed" in e.value.detail
    with eng.connect() as c:
        row = lambda t: c.execute(text("select b.media_type, d.is_tangent from canonical_books b join discussions d on d.canonical_book_id=b.id where b.title=:t"), {"t": t}).one()
        assert tuple(row("Mindy shorts")) == ("video", 0)
        assert tuple(row("Test Learning Site")) == ("website_app", 1)                  # old 'tangent' type: a website, mentioned as a tangent
        assert tuple(row("Plain book tangent")) == ("book", 1)
        assert tuple(row("Plain book")) == ("book", 0)
        assert tuple(row("A film")) == ("movie", 0)                           # general-discussion grouping does not set the flag
        disc_id = c.execute(text("select d.id from discussions d join canonical_books b on b.id=d.canonical_book_id where b.title='Plain book'")).scalar()
    main.toggle_admin_discussion_general(disc_id, main.ToggleGeneralDiscussionRequest(is_general_discussion=True))
    with eng.connect() as c:
        assert c.execute(text("select is_tangent from discussions where id=:i"), {"i": disc_id}).scalar() == 0   # grouping is not the flag
    with eng.connect() as c:
        book_id = c.execute(text("select canonical_book_id from discussions where id=:i"), {"i": disc_id}).scalar()
    main.update_admin_book(book_id, main.BookUpdateRequest(title="Plain book", discussion_id=disc_id, is_tangent=True))
    with eng.connect() as c:
        assert c.execute(text("select is_tangent from discussions where id=:i"), {"i": disc_id}).scalar() == 1   # the explicit flag
    main.update_admin_book(book_id, main.BookUpdateRequest(title="Plain book", discussion_id=disc_id, is_tangent=False))
    with eng.connect() as c:
        assert c.execute(text("select is_tangent from discussions where id=:i"), {"i": disc_id}).scalar() == 0


def test_member_code_allocation_survives_a_gap(db, monkeypatch):
    """A removed code leaves a gap; the next code is max + 1, never a count that lands on an existing code."""
    from sqlalchemy import create_engine, text
    from sqlalchemy.orm import sessionmaker
    from app.api import main

    eng = create_engine(f"sqlite:///{db}")
    monkeypatch.setattr(main, "SessionLocal", sessionmaker(bind=eng))
    with eng.begin() as c:
        top = c.execute(text("select max(cast(substr(member_code,5) as integer)) from members where member_code like '099-%'")).scalar()
        c.execute(text("update members set member_code=NULL where member_code='099-01'"))      # the gap: count + 1 would now equal an existing code
        c.execute(text("insert into members(id,display_name,normalized_name,status,created_at,updated_at) values('g1','g1','g1','guest',datetime('now'),datetime('now'))"))
    main.save_meetup_attendance(99, main.AttendanceRequest(member_ids=["g1"]))
    with eng.begin() as c:
        assert c.execute(text("select member_code from members where id='g1'")).scalar() == f"099-{top + 1:02d}"
