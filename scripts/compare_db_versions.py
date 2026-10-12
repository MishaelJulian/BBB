"""Compare two copies of the archive database, read-only. Nothing is written to either file.

    python scripts/compare_db_versions.py OLD.db NEW.db

Reports: row counts, rows added/removed/changed per table, integrity and foreign-key health, and how
attribution moved (which member discussed which book at which meetup).
"""

import sqlite3
import sys
from collections import Counter


def ro(path: str) -> sqlite3.Connection:
    c = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    c.row_factory = sqlite3.Row
    return c


def tables(c):
    return [r[0] for r in c.execute("select name from sqlite_master where type='table' and name not like 'sqlite_%' order by name")]


def rows_by_id(c, t):
    cols = [r[1] for r in c.execute(f"pragma table_info('{t}')")]
    if "id" not in cols:
        return None, cols
    return {r["id"]: dict(r) for r in c.execute(f"select * from {t}")}, cols


def health(c, label):
    fk = Counter(f"{r[0]} -> {r[2]}" for r in c.execute("pragma foreign_key_check"))
    print(f"  [{label}] integrity_check={c.execute('pragma integrity_check').fetchone()[0]}  "
          f"foreign_key_violations={sum(fk.values())} {dict(fk) if fk else ''}")


def main(old_path, new_path):
    o, n = ro(old_path), ro(new_path)
    print(f"OLD {old_path}\nNEW {new_path}\n")
    print("Health")
    health(o, "old"); health(n, "new")

    print("\nTables (rows old -> new | added / removed / changed ignoring timestamps)")
    for t in sorted(set(tables(o)) | set(tables(n))):
        if t not in tables(o):
            print(f"  {t:28} NEW TABLE ({n.execute(f'select count(*) from {t}').fetchone()[0]} rows)"); continue
        if t not in tables(n):
            print(f"  {t:28} DROPPED TABLE"); continue
        ro_, _ = rows_by_id(o, t); rn_, _ = rows_by_id(n, t)
        co, cn = o.execute(f"select count(*) from {t}").fetchone()[0], n.execute(f"select count(*) from {t}").fetchone()[0]
        if ro_ is None or rn_ is None:
            print(f"  {t:28} {co:>6} -> {cn:<6} (no id column; counts only)"); continue
        added, removed = set(rn_) - set(ro_), set(ro_) - set(rn_)
        skip = {"created_at", "updated_at"}
        changed = sum(1 for i in set(ro_) & set(rn_)
                      if {k: v for k, v in ro_[i].items() if k not in skip} != {k: v for k, v in rn_[i].items() if k not in skip})
        print(f"  {t:28} {co:>6} -> {cn:<6} +{len(added)} / -{len(removed)} / ~{changed}")

    print("\nAttribution (discussions: who discussed which book at which meetup)")
    do, _ = rows_by_id(o, "discussions"); dn, _ = rows_by_id(n, "discussions")
    both = set(do) & set(dn)
    print(f"  kept {len(both)}, added {len(set(dn)-set(do))}, removed {len(set(do)-set(dn))}")
    for col in ("member_id", "canonical_book_id", "meetup_id"):
        moved = [i for i in both if do[i][col] != dn[i][col]]
        lost = [i for i in moved if do[i][col] is not None and dn[i][col] is None]
        gained = [i for i in moved if do[i][col] is None and dn[i][col] is not None]
        print(f"  {col:18} changed on {len(moved)} kept rows (cleared={len(lost)}, newly set={len(gained)})")
    print(f"  discussions with no member: {sum(1 for d in do.values() if d['member_id'] is None)} -> "
          f"{sum(1 for d in dn.values() if d['member_id'] is None)}")

    mo, _ = rows_by_id(o, "members"); mn, _ = rows_by_id(n, "members")
    gone = set(mo) - set(mn)
    held = Counter(d["member_id"] for d in do.values() if d["member_id"] in gone)
    print(f"\nMembers: {len(mo)} -> {len(mn)}; removed {len(gone)}; those removed members held {sum(held.values())} discussions in OLD")
    still = sum(1 for i, d in dn.items() if i in do and do[i]["member_id"] in gone)
    print(f"  of those discussions: still present in NEW = {still}; now with a member = "
          f"{sum(1 for i, d in dn.items() if i in do and do[i]['member_id'] in gone and d['member_id'] is not None)}")

    bo, _ = rows_by_id(o, "canonical_books"); bn, _ = rows_by_id(n, "canonical_books")
    gone_b = set(bo) - set(bn)
    redirected = Counter()
    for i in both:
        if do[i]["canonical_book_id"] in gone_b:
            tgt = dn[i]["canonical_book_id"]
            redirected["points to an existing book" if tgt in bn else ("cleared" if tgt is None else "DANGLING")] += 1
    print(f"\nBooks: {len(bo)} -> {len(bn)}; removed {len(gone_b)}; discussions that used removed books: {dict(redirected)}")

    def dup(c, sql):
        return c.execute(sql).fetchone()[0]
    dsql = "select count(*) from (select 1 from discussions group by meetup_id, canonical_book_id, coalesce(member_id,'') having count(*)>1)"
    bsql = "select count(*) from (select 1 from canonical_books group by normalized_title, coalesce(author_id,'') having count(*)>1)"
    print(f"\nDuplicates: identical (meetup,book,member) mention rows {dup(o, dsql)} -> {dup(n, dsql)}; "
          f"same title+author book groups {dup(o, bsql)} -> {dup(n, bsql)}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
