"""Load the series table and move series mentions onto it (founder, 2026-10-13: "not scattered or corrupted").

    python scripts/load_series.py DB               # dry run: applies inside a transaction, prints the plan, rolls back
    python scripts/load_series.py DB --commit      # after review: stops the docker backend, backs up, writes, checks, starts it again

Standard procedure for correlated data, in this order inside ONE transaction:
  1 create the series rows (unique normalised title, author)                       3 link the volume books (series_id + position)
  2 move each series mention: the discussion keeps its meetup and reader, and      4 delete a converted book row only when nothing else points at it
    points at the series instead of a book row (one UPDATE, so the one-target       5 verify: integrity, foreign keys, one target per mention, no orphan
    trigger never sees a half state); an identical mention that already exists        series, every mention accounted for, counts before = after minus merges
    is merged, never doubled
Everything not listed in the curated plan below is left exactly as it is.
"""
from __future__ import annotations

import argparse
import os
import sqlite3
import sys
import uuid
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.parsers.resolve import norm_series, norm_title  # noqa: E402

# canonical title -> (author, the book rows that are really mentions of the whole series, (title, position) of volumes already in the archive)
PLAN = {
    "Millennium": ("Stieg Larsson", ["The Millenium Trilogy", "The Millennium Trilogy", "The Millenium Series"], []),
    "Mistborn": ("Brandon Sanderson", ["Mistborn series", "The Mistborn Trilogy"], [("The Hero of Ages", 3)]),
    "The Broken Earth": ("N.K. Jemisin", ["The Broken Earth Series", "The Broken Earth Trilogy"], []),
    "The Kingkiller Chronicle": ("Patrick Rothfuss", ["The Kingkiller Chronicle Series", "The Kingkiller Chronicles"], []),
    "The First Law": ("Joe Abercrombie", ["The First Law Trilogy"], [("The Blade Itself", 1), ("Before They Are Hanged", 2), ("Last Argument of Kings", 3)]),
    "Percy Jackson and the Olympians": ("Rick Riordan", ["Percy Jackson & the Olympians (Series)", "Percy Jackson (Series)"], []),
    "Harry Potter": ("J.K. Rowling", ["Harry Potter Series Box Set"], []),
    "The Sprawl": ("William Gibson", ["Sprawl Series Complete 4 Books Collection Set by William Gibson", "The Complete Sprawl Trilogy: Neuromancer, Count Zero, Mona Lisa Overdrive"], []),
    "The Wheel of Time": ("Robert Jordan", ["The Wheel of Time Series"], []),
    "Malazan Book of the Fallen": ("Steven Erikson", ["Malazan Book of the Fallen series"],
                                   [("Toll the Hounds (Malazan Book of the Fallen Series #8) by Steven Erikson", 8)]),
    "The Hidden Hindu": ("Akshat Gupta", ["The Hidden Hindu series"], [("The Hidden Hindu", 1), ("The Hidden Hindu 2", 2), ("The Hidden Hindu 3", 3)]),
    "Heartstopper": ("Alice Oseman", ["The Heartstopper series"],
                     [("Heartstopper: Volume 1", 1), ("Heartstopper: Volume 2", 2), ("Heartstopper: Volume 3", 3), ("Heartstopper: Volume 4", 4)]),
    "St Clare's": ("Enid Blyton", ["St Clare’s Series"],
                   [("The Twins at St Clare's", 1), ("The O'Sullivan Twins", 2), ("Summer Term at St Clare's", 3),
                    ("Second Form at St Clare's", 4), ("Claudine at St Clare's", 5), ("Fifth Formers of St Clare's", 6)]),
    "Gormenghast": ("Mervyn Peake", ["The Gormenghast Trilogy"], [("Titus Groan", 1), ("Gormenghast", 2), ("Titus Alone", 3)]),
    # one row each, no volumes in the archive
    "The Chronicles of Narnia": ("C.S. Lewis", ["Chronicles of Narnia"], []),
    "The Clifton Chronicles": ("Jeffrey Archer", ["Clifton Chronicles"], []),
    "His Dark Materials": ("Philip Pullman", ["Dark Materials Trilogy"], []),
    "Discworld": ("Terry Pratchett", ["Discworld Series"], []),
    "Divergent": ("Veronica Roth", ["Divergent Series Complete Box Set"], []),
    "Dragonlance Chronicles": ("Margaret Weis", ["Dragonlance Chronicles"], []),
    "The Famous Five": ("Enid Blyton", ["Famous Five series"], []),
    "The Harappa Trilogy": ("Vineet Bajpai", ["Harappa Series"], []),
    "The Ibis Trilogy": ("Amitav Ghosh", ["Ibis Trilogy Amitav Ghosh Collection 3 Books Bundle"], []),
    "Inspector Rebus": ("Ian Rankin", ["Inspector Rebus series"], []),
    "Lightbringer": ("Brent Weeks", ["Lightbringer Series Brent Weeks Collection Bundle"], []),
    "Nero Wolfe": ("Rex Stout", ["Nero Wolfe series"], []),
    "The Red Riding Quartet": ("David Peace", ["Red Riding Trilogy"], []),
    "Robot": ("Isaac Asimov", ["Robot Series"], []),
    "The Shiva Trilogy": ("Amish", ["Shiva Trilogy"], []),
    "The Southern Reach": ("Jeff VanderMeer", ["Southern Reach trilogy"], []),
    "The Alcatraz Series": ("Brandon Sanderson", ["The Alcatraz series"], []),
    "The Bill Hodges Trilogy": ("Stephen King", ["The Bill Hodges Trilogy"], []),
    "The Belgariad": ("David Eddings", ["The Belgariad Series"], []),
    "Jason Bourne": ("Robert Ludlum", ["The Bourne Series"], []),
    "The Expanse": ("James S.A. Corey", ["The Expanse Series"], []),
    "The Powder Mage Trilogy": ("Brian McClellan", ["The Powder Mage Trilogy: Promise of Blood, The Crimson Campaign, The Autumn Republic"], []),
    "The Quantum Thief": ("Hannu Rajaniemi", ["The Quantum Thief Trilogy"], []),
    "The Stainless Steel Rat": ("Harry Harrison", ["The Rat Series"], []),
    "Sandman Slim": ("Richard Kadrey", ["The Sandman Slim Series Books 1-4: A Hilarious and Gritty Urban Fantasy Set in Los Angeles"], []),
    "The Taj Trilogy": ("Manreet Sodhi Someshwar", ["The Taj Trilogy"], []),
    "Wayward Pines": ("Blake Crouch", ["The Wayward Pines Trilogy"], []),
    "Throne of Glass": ("Sarah J. Maas", ["Throne of Glass Series"], []),
    "Thursday Next": ("Jasper Fforde", ["Thursday Next Series"], []),
    "Binti": ("Nnedi Okorafor", ["Binti : The Complete Trilogy"], []),
    "A Good Girl's Guide to Murder": ("Holly Jackson", ["A Good Girl’s Guide to Murder Series"], []),
    "A Song of Ice and Fire": ("George R.R. Martin", ["A Song of Ice and Fire series: 5-Book Boxed Set"], []),
    "A Series of Unfortunate Events": ("Lemony Snicket", ["A Series of Unfortunate Events"], []),
    "The Crystal Trilogy": ("Max Harms", ["The Crystal Trilogy"], []),
}
# Junk rows (glued words, a URL, a stray bullet): each has no mention of its own, because the real mention already sits on another row.
# title -> the real book its import row is relinked to (None = unlinked; the import row keeps the raw text). Founder approved each, 2026-10-13.
JUNK = {
    "DaevabadTrilogy": None,
    "TheFirstLawTrilogy JoeAbercrombie": None,
    "TheOne,seriesonNetflix": "The One",
    "motorcycle-maintenance": "Zen and the art of Motorcycle Maintenance",
    "o Malazan Book of the Fallen series": None,
    "Long way to a small angry planet _ Way farers trilogy": "The Long Way to a Small, Angry Planet",
    "https://en.wikipedia.org/wiki/The_Bridge_(2011_TV_series) ∙ Men are": "The Bridge",
}
# Left alone on purpose (single books or collections): Burma Chronicles, The Fry Chronicles, The Ivory Throne, Pigeons, The Travelling Cat Chronicles,
# The Complete Maus / Robot / Feluda / Fairy Tales / Works of Doyle / Collection (Mountains of Madness), H.P Lovecraft Omnibus, Marcel Proust (Volumes 1 to 7),
# Books by Robert Caro, Rick Riordan Series Sampler. Left for the founder (unclear): Culture Series (author Nancy Reagin), Giga: The Complete Series,
# Sin City series, Shameless (series), Rita Ferreira Series, Jane Austen Mystery Series, TV channel: Epic.


def one(c, sql, a=()):
    r = c.execute(sql, a).fetchone()
    return r[0] if r else None


def refs_to_books(c):
    return [(t, fk[3]) for (t,) in c.execute("select name from sqlite_master where type='table'").fetchall()
            for fk in c.execute(f"pragma foreign_key_list({t})").fetchall() if fk[2] == "canonical_books"]


def author_id(c, name):
    r = one(c, "select id from authors where lower(full_name) = ?", (name.lower(),))
    if r:
        return r
    for i, fn in c.execute("select id, full_name from authors"):
        if norm_title(fn) == norm_title(name):
            return i
    i = str(uuid.uuid4())
    c.execute("insert into authors(id, full_name, normalized_name, created_at, updated_at) values (?,?,?,datetime('now'),datetime('now'))", (i, name, name.lower()))
    return i


def apply(c):
    """Runs the plan inside the caller's transaction. Returns (log lines, problems)."""
    log, problems = [], []
    before = {"books": one(c, "select count(*) from canonical_books"), "mentions": one(c, "select count(*) from discussions")}
    refs = refs_to_books(c)
    moved = merged = deleted = linked = 0
    for title, (author, rows, volumes) in PLAN.items():
        norm = norm_series(title)
        sid = one(c, "select id from series where normalized_title = ?", (norm,))
        if sid is None:
            sid = str(uuid.uuid4())
            c.execute("insert into series(id, title, normalized_title, author_id, created_at, updated_at) values (?,?,?,?,datetime('now'),datetime('now'))",
                      (sid, title, norm, author_id(c, author)))
        for rt in rows:
            found = c.execute("select id from canonical_books where title = ?", (rt,)).fetchall()
            if len(found) != 1:
                problems.append(f"{title}: book row {rt!r} found {len(found)} times, skipped")
                continue
            bid = found[0][0]
            for d in c.execute("select id, meetup_id, member_id from discussions where canonical_book_id = ?", (bid,)).fetchall():
                twin = one(c, "select id from discussions where series_id = ? and meetup_id = ? and member_id is ?", (sid, d[1], d[2]))
                if twin:                                           # an identical mention exists: merge, never double
                    c.execute("delete from book_mentions where discussion_id = ?", (d[0],))
                    c.execute("delete from discussions where id = ?", (d[0],))
                    merged += 1
                else:
                    c.execute("update discussions set canonical_book_id = NULL, series_id = ? where id = ?", (sid, d[0]))
                    moved += 1
            c.execute("update imported_books set canonical_book_id = NULL where canonical_book_id = ?", (bid,))
            blockers = [(t, col) for t, col in refs if t not in ("discussions", "imported_books", "canonical_books")
                        and one(c, f"select count(*) from {t} where {col} = ?", (bid,))]
            if one(c, "select count(*) from discussions where canonical_book_id = ?", (bid,)) or blockers:
                problems.append(f"{title}: book row {rt!r} still referenced ({blockers}), kept")
                continue
            aid = one(c, "select author_id from canonical_books where id = ?", (bid,))
            c.execute("delete from canonical_books where id = ?", (bid,))
            deleted += 1
            if aid and not one(c, "select count(*) from canonical_books where author_id = ?", (aid,)) and not one(c, "select count(*) from series where author_id = ?", (aid,)):
                c.execute("delete from authors where id = ?", (aid,))
        for vt, pos in volumes:
            found = [r[0] for r in c.execute("select id from canonical_books where title = ?", (vt,)).fetchall()]
            if len(found) != 1:
                problems.append(f"{title}: volume {vt!r} found {len(found)} times, not linked")
                continue
            cur = c.execute("select series_id from canonical_books where id = ?", (found[0],)).fetchone()
            if cur[0] not in (None, sid):
                problems.append(f"{title}: volume {vt!r} already belongs to another series, not linked")
                continue
            c.execute("update canonical_books set series_id = ?, series_position = ? where id = ?", (sid, float(pos), found[0]))
            linked += 1
    for jt, target in JUNK.items():
        for (bid,) in c.execute("select id from canonical_books where title = ?", (jt,)).fetchall():
            others = [(t, col) for t, col in refs if t not in ("canonical_books", "imported_books") and one(c, f"select count(*) from {t} where {col} = ?", (bid,))]
            if others:
                problems.append(f"junk row {jt!r} is still referenced ({others}), kept")
                continue
            tid = None
            if target:
                ids = [r[0] for r in c.execute("select id from canonical_books where title = ?", (target,)).fetchall()]
                if len(ids) != 1:
                    problems.append(f"junk row {jt!r}: relink target {target!r} found {len(ids)} times, kept")
                    continue
                tid = ids[0]
            c.execute("update imported_books set canonical_book_id = ? where canonical_book_id = ?", (tid, bid))
            aid = one(c, "select author_id from canonical_books where id = ?", (bid,))
            c.execute("delete from canonical_books where id = ?", (bid,))
            deleted += 1
            if aid and not one(c, "select count(*) from canonical_books where author_id = ?", (aid,)) and not one(c, "select count(*) from series where author_id = ?", (aid,)):
                c.execute("delete from authors where id = ?", (aid,))
    after = {"books": one(c, "select count(*) from canonical_books"), "mentions": one(c, "select count(*) from discussions")}
    log.append(f"series now: {one(c, 'select count(*) from series')} | mentions moved onto series: {moved} | identical mentions merged: {merged} | volumes linked: {linked} | book rows deleted: {deleted}")
    log.append(f"books {before['books']} -> {after['books']} | mentions {before['mentions']} -> {after['mentions']} (the drop equals the merged mentions)")
    problems += verify(c, before, after, merged)
    return log, problems


def verify(c, before, after, merged):
    bad = []
    if one(c, "pragma integrity_check") != "ok":
        bad.append("integrity_check failed")
    if c.execute("pragma foreign_key_check").fetchall():
        bad.append("foreign_key_check found violations")
    if after["mentions"] != before["mentions"] - merged:
        bad.append("mention count changed by more than the merged duplicates")
    if one(c, "select count(*) from discussions where (canonical_book_id is null) = (series_id is null)"):
        bad.append("a mention does not point at exactly one of a book or a series")
    if one(c, "select count(*) from series s where not exists (select 1 from discussions d where d.series_id = s.id) and not exists (select 1 from canonical_books b where b.series_id = s.id)"):
        bad.append("a series has no mention and no book (orphan)")
    if one(c, "select count(*) from series where normalized_title is null"):
        bad.append("a series lacks its normalized title")
    return [f"VERIFY FAILED: {b}" for b in bad]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("db")
    ap.add_argument("--commit", action="store_true")
    a = ap.parse_args()
    c = sqlite3.connect(a.db, isolation_level=None)
    c.execute("pragma foreign_keys = on")
    c.execute("begin")
    log, problems = apply(c)
    for line in log:
        print(" ", line)
    for p in problems:
        print("  !", p)
    hard = [p for p in problems if p.startswith("VERIFY FAILED")]
    c.execute("rollback")
    if not a.commit or hard:
        print("NOT COMMITTED: verification failed" if hard else "ROLLED BACK (dry run)")
        return 1 if hard else 0
    from _backend import backend_stopped
    with backend_stopped(a.db):
        bk = os.path.expanduser(f"~/bbb_backups/book_club_archivist_{datetime.now():%Y%m%d_%H%M%S}.db")
        os.makedirs(os.path.dirname(bk), exist_ok=True)
        s, d = sqlite3.connect(a.db), sqlite3.connect(bk)
        s.backup(d); s.close(); d.close()
        print("backup:", bk)
        c.execute("begin")
        log, problems = apply(c)
        if [p for p in problems if p.startswith("VERIFY FAILED")]:
            c.execute("rollback")
            print("NOT COMMITTED: verification failed", problems)
            return 1
        c.execute("commit")
        c.close()
        print("COMMITTED")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
