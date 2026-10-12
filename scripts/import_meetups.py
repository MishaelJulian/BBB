"""Import meetups from their source files: parse, compare with the database, show the diff, and only then write.

    python scripts/import_meetups.py DB 86,88,91            # dry run: applies inside a transaction, prints the report, rolls back
    python scripts/import_meetups.py DB all --commit        # after review: backs up the DB to ~/bbb_backups/, then commits
    python scripts/import_meetups.py DB 91 --allow-guest "ANURA .M=Anura M"   # a heading that names nobody may become a guest

Stages (docs: the approved plan): 1 register  2 extract  3 layout  4 structure  5 relation checks  6 staging diff  7 settle.
Unresolved headings, unknown layouts and files that need OCR are reported, never guessed.
"""
from __future__ import annotations

import argparse
import glob
import os
import sqlite3
import sys
from collections import Counter
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.parsers.changeset import invariants, learn_evidence, load_world, reconcile  # noqa: E402
from app.parsers.meetup_parser import extract_lines, meetup_number_for, parse_file  # noqa: E402
from app.parsers.resolve import BookMatcher, MemberResolver  # noqa: E402
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _backend import backend_stopped  # noqa: E402


def _moves(a):
    if a.allow_moves:
        return True
    from app.parsers.changeset import n3
    return {(int(x.split(":", 1)[0]), n3(x.split(":", 1)[1])) for x in a.allow_move}


def _run(a, parsed, wanted, allow, print_report):
    c = sqlite3.connect(a.db, isolation_level=None)
    c.row_factory = sqlite3.Row
    c.execute("pragma foreign_keys = on")
    c.execute("begin")
    members, books, aliases = load_world(c)
    evidence = learn_evidence(c, [(ps, n) for ps, n, _, _ in parsed])
    matcher = BookMatcher(books)
    scoped = {}
    for x in a.heading_alias:
        left, name = x.split("=", 1)
        mn, heading = left.split(":", 1)
        scoped.setdefault(int(mn), {})[heading.strip()] = name.strip()
    report = []
    for ps, n, how, p in parsed:
        if wanted is not None and n not in wanted:
            continue
        resolver = MemberResolver(load_world(c)[0], evidence, {**aliases, **scoped.get(n, {})})
        ops = reconcile(c, ps, n, resolver, matcher, source_name=os.path.basename(p)[:-4] + ".pdf", allow_guest=allow, allow_moves=_moves(a), allow_creators=set(a.creator))
        report.append((n, os.path.basename(p), ps.layout, len(ps.items), Counter(o.kind for o in ops), ps.warnings, how, ops))
    bad = invariants(c)
    if print_report:
        for n, name, layout, items, k, warns, how, ops in sorted(report, key=lambda r: r[0]):
            summary = ", ".join(f"{kk} {vv}" for kk, vv in sorted(k.items())) or "nothing to change"
            print(f"#{n:<3} {name[:46]:46} layout {layout:14} items {items:3} | {summary}   [number by {how}]")
            if not a.quiet:
                for o in ops:
                    print(f"      {o.kind:15} {str(o.heading or '-')[:20]:20} {o.title[:50]:50} {o.detail[:80]}")
                for w in warns[:6]:
                    print(f"      warning: {w[:110]}")
        print("\ninvariants:", "all green" if not bad else bad)
    return c, bad


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("db")
    ap.add_argument("meetups", help="comma separated meetup numbers, or 'all'")
    ap.add_argument("--sources", default=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "sources"))
    ap.add_argument("--ext", default="pdf", choices=["pdf", "txt"])
    ap.add_argument("--commit", action="store_true")
    ap.add_argument("--allow-guest", action="append", default=[], metavar="HEADING=Name")
    ap.add_argument("--quiet", action="store_true", help="counts only")
    ap.add_argument("--allow-moves", action="store_true", help="re-credit EVERY held mention from one reader to another (held by default)")
    ap.add_argument("--allow-move", action="append", default=[], metavar="MEETUP:TITLE", help="re-credit one held mention, e.g. 76:Gormenghast (title may be a prefix)")
    ap.add_argument("--heading-alias", action="append", default=[], metavar="MEETUP:HEADING=Name", help="for one meetup only, read a printed heading as this member (e.g. 65:Amit=Amit Charles)")
    ap.add_argument("--creator", action="append", default=[], metavar="NAME", help="a line that is only a person's name becomes a 'creator' row")
    a = ap.parse_args()

    probe = sqlite3.connect(a.db)
    by_month = {(int(str(d)[:4]), int(str(d)[5:7])): n for n, d in probe.execute("select meetup_number, date from meetups where date is not null")}
    probe.close()
    parsed, skipped = [], []
    for p in sorted(glob.glob(os.path.join(a.sources, f"*.{a.ext}"))):
        if os.path.basename(p).startswith(("BBB Meetup-9", "meetup_numbers")):
            continue
        lines, _ = extract_lines(p)
        n, how = meetup_number_for(p, lines, by_month)
        if n is None:
            skipped.append((os.path.basename(p), how))
            continue
        parsed.append((parse_file(p), n, how, p))
    wanted = None if a.meetups == "all" else {int(x) for x in a.meetups.split(",")}
    allow = dict(x.split("=", 1) for x in a.allow_guest)

    c, bad = _run(a, parsed, wanted, allow, print_report=True)
    for name, why in skipped:
        print(f"SKIPPED {name}: {why}")
    c.execute("rollback")                                           # the staging pass never persists
    if not a.commit:
        print("ROLLED BACK (dry run)")
        return 0
    if bad:
        print("NOT COMMITTED: invariants failed")
        return 1
    with backend_stopped(a.db):                                       # the docker backend must not write the same file meanwhile
        bk = os.path.expanduser(f"~/bbb_backups/book_club_archivist_{datetime.now():%Y%m%d_%H%M%S}.db")
        os.makedirs(os.path.dirname(bk), exist_ok=True)
        src, dst = sqlite3.connect(a.db), sqlite3.connect(bk)
        src.backup(dst); src.close(); dst.close()
        print("backup:", bk)
        c, bad = _run(a, parsed, wanted, allow, print_report=False)  # same pass again, this time kept
        if bad:
            c.execute("rollback")
            print("NOT COMMITTED: invariants failed", bad)
            return 1
        c.execute("commit")
        c.close()
        print("COMMITTED")
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
