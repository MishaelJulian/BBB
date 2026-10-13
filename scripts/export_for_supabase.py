#!/usr/bin/env python3
"""Export the committed SQLite archive as CSVs plus a load.sql for the Supabase Postgres project.

  python3 scripts/export_for_supabase.py --check            # offline: counts, orphans, formats. Writes nothing.
  python3 scripts/export_for_supabase.py --out DIR          # writes DIR/*.csv and DIR/load.sql (owner-only permissions)
  psql "$LOAD_DATABASE_URL" -v ON_ERROR_STOP=1 -1 -f DIR/load.sql   # one transaction; refuses non-empty tables

The source is read through sqlite3's backup API (a plain cp misses the WAL). No credentials are used or printed here.
NUL bytes (an "ff" ligature the PDF extraction lost: A\0air = Affair) cannot live in Postgres text; the export writes --nul-as (default ff) instead.
By default removed_members_archive is skipped: personal data with no public purpose. Pass --include-removed to load it.
"""
import argparse, csv, os, re, sqlite3, sys, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SKIP = {"removed_members_archive"}
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
DATETIME = re.compile(r"^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d+)?([+-]\d{2}(:?\d{2})?|Z)?$")


def snapshot(src: Path) -> sqlite3.Connection:
    tmp = Path(tempfile.mkdtemp()) / "copy.db"
    s = sqlite3.connect(f"file:{src}?mode=ro", uri=True)
    d = sqlite3.connect(tmp)
    s.backup(d)
    s.close()
    return d


def columns(db, t):
    return [(r[1], (r[2] or "").upper()) for r in db.execute(f'pragma table_info("{t}")')]


def fks(db, t):
    groups = {}
    for _id, _seq, parent, frm, to, *_ in db.execute(f'pragma foreign_key_list("{t}")'):
        groups.setdefault(_id, (parent, [], []))
        groups[_id][1].append(frm)
        groups[_id][2].append(to)
    return list(groups.values())


def load_order(db, names):
    """Parents before children (Kahn). A cycle would be reported, not guessed."""
    deps = {t: {p for p, _, _ in fks(db, t) if p in names and p != t} for t in names}
    order = []
    while deps:
        ready = sorted(t for t, d in deps.items() if not d)
        if not ready:
            sys.exit(f"foreign-key cycle among: {sorted(deps)}")
        for t in ready:
            order.append(t)
            del deps[t]
        for d in deps.values():
            d.difference_update(ready)
    return order


def check(db, names, repaired):
    problems = 0
    for t in names:
        cols = columns(db, t)
        for p, frm, to in fks(db, t):
            cond = " and ".join(f'p."{b}" = c."{a}"' for a, b in zip(frm, to))
            notnull = " and ".join(f'c."{a}" is not null' for a in frm)
            n = db.execute(f'select count(*) from "{t}" c where {notnull} and not exists (select 1 from "{p}" p where {cond})').fetchone()[0]
            if n:
                problems += n
                print(f"  ORPHANS: {t}.{','.join(frm)} -> {p}: {n} rows point at a missing parent")
        for name, typ in cols:
            m = re.match(r"VARCHAR\((\d+)\)", typ)
            for (v,) in db.execute(f'select "{name}" from "{t}" where "{name}" is not null'):
                bad = None
                if isinstance(v, str) and "\x00" in v:
                    repaired[(t, name)] = repaired.get((t, name), 0) + 1
                    continue
                if m and isinstance(v, str) and len(v) > int(m.group(1)):
                    bad = f"longer than {m.group(1)}"
                elif typ == "DATE" and not (isinstance(v, str) and DATE.match(v)):
                    bad = f"not a date: {v!r}"
                elif typ.startswith("DATETIME") and not (isinstance(v, str) and DATETIME.match(v)):
                    bad = f"not a timestamp: {v!r}"
                if bad:
                    problems += 1
                    print(f"  BAD VALUE: {t}.{name}: {bad}")
                    break
    return problems


def csv_value(v, typ, nul_as):
    if v is None:
        return r"\N"
    if typ == "BOOLEAN":
        return "t" if v else "f"
    return v.replace("\x00", nul_as) if isinstance(v, str) else v


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--sqlite", default=str(ROOT / "book_club_archivist.db"))
    ap.add_argument("--out")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--include-removed", action="store_true")
    ap.add_argument("--nul-as", default="ff", help="text written in place of NUL bytes (default: ff)")
    a = ap.parse_args()
    if not a.check and not a.out:
        ap.error("give --check or --out DIR")

    db = snapshot(Path(a.sqlite))
    skip = set() if a.include_removed else SKIP
    every = [r[0] for r in db.execute("select name from sqlite_master where type='table' and name not like 'sqlite_%' and name not like 'alembic%'")]
    counts = {t: db.execute(f'select count(*) from "{t}"').fetchone()[0] for t in every}
    names = [t for t in every if counts[t] and t not in skip]
    order = load_order(db, set(names))
    print(f"source: {a.sqlite} (snapshot)")
    for t in order:
        print(f"  {t}: {counts[t]}")
    print(f"skipped: {sorted(t for t in every if counts[t] and t in skip)}; empty: {sum(1 for t in every if not counts[t])} tables")
    repaired = {}
    problems = check(db, names, repaired)
    for (t, c), n in sorted(repaired.items()):
        print(f"  repair: {t}.{c}: {n} rows have NUL bytes -> written with {a.nul_as!r}")
    print("check:", "OK, no problems" if not problems else f"{problems} problem(s) above")
    if a.check or problems:
        sys.exit(1 if problems else 0)

    out = Path(a.out)
    os.umask(0o077)
    out.mkdir(parents=True, exist_ok=True)
    sql = ["\\set ON_ERROR_STOP on", "set time zone 'UTC';"]
    for t in order:
        sql.append(f"do $$ begin if exists (select 1 from public.\"{t}\") then raise exception '{t} is not empty'; end if; end $$;")
    for t in order:
        cols = columns(db, t)
        path = out / f"{t}.csv"
        with open(path, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            for row in db.execute(f'select {",".join(chr(34) + c + chr(34) for c, _ in cols)} from "{t}"'):
                w.writerow([csv_value(v, typ, a.nul_as) for v, (_, typ) in zip(row, cols)])
        collist = ",".join(f'"{c}"' for c, _ in cols)
        sql.append(f"\\copy \"{t}\" ({collist}) from '{path}' with (format csv, null '\\N', encoding 'UTF8')")
    (out / "load.sql").write_text("\n".join(sql) + "\n", encoding="utf-8")
    print(f"\nwrote {len(order)} CSVs and {out / 'load.sql'}")
    print(f"next: psql \"$LOAD_DATABASE_URL\" -v ON_ERROR_STOP=1 -1 -f {out / 'load.sql'}")
    print(f"then delete the export (it holds member data): rm -r {out}")


if __name__ == "__main__":
    main()
