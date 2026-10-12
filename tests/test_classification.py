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
    assert c.execute("select count(*) from media_categories").fetchone()[0] == 10
    assert c.execute("select count(*) from canonical_books where media_type='youtube'").fetchone()[0] == 0
    assert c.execute("select sum(is_tangent) from discussions").fetchone()[0] == c.execute("select count(*) from discussions where media_type='tangent'").fetchone()[0] > 0
    now = "datetime('now')"
    ins = f"insert into canonical_books(id,title,normalized_title,language,media_type,created_at,updated_at) values(?,?,?,'en',?,{now},{now})"
    c.execute(ins, ("t-poem", "A poem", "a poem", "poem"))
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
