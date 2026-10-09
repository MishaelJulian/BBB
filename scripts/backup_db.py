"""Back up the SQLite databases safely while the app runs (decision D33).

Uses SQLite's online backup API, so the copy is consistent even with WAL writes in flight.
Each copy is integrity-checked; copies older than --keep-days are removed.

    python scripts/backup_db.py --dest ~/bbb_backups book_club_archivist.db auth.db
    python scripts/backup_db.py --check   # self-test on a temporary database

Restore: stop the app, copy the chosen backup over the live file, delete any
leftover -wal and -shm files next to it, start the app.
"""

import argparse
import sqlite3
import sys
import tempfile
import time
from pathlib import Path


def backup(src: Path, dest_dir: Path) -> Path:
    dest_dir.mkdir(parents=True, exist_ok=True)
    out = dest_dir / f"{src.stem}_{time.strftime('%Y%m%d_%H%M%S')}.db"
    s = sqlite3.connect(f"file:{src}?mode=ro", uri=True)
    d = sqlite3.connect(out)
    try:
        s.backup(d)
        result = d.execute("PRAGMA integrity_check").fetchone()[0]
    finally:
        s.close()
        d.close()
    if result != "ok":
        out.unlink()
        raise RuntimeError(f"integrity check failed for backup of {src}: {result}")
    return out


def prune(dest_dir: Path, stem: str, keep_days: int) -> int:
    cutoff = time.time() - keep_days * 86400
    old = [p for p in dest_dir.glob(f"{stem}_*.db") if p.stat().st_mtime < cutoff]
    for p in old:
        p.unlink()
    return len(old)


def self_check() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        src = tmp / "live.db"
        c = sqlite3.connect(src)
        c.execute("PRAGMA journal_mode=WAL")
        c.execute("create table t (x)")
        c.executemany("insert into t values (?)", [(i,) for i in range(100)])
        c.commit()  # rows sit in the WAL file; the backup must still see them
        out = backup(src, tmp / "bk")
        c.close()
        b = sqlite3.connect(out)
        assert b.execute("select count(*) from t").fetchone()[0] == 100
        b.close()
    print("self-check ok")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("databases", nargs="*", type=Path)
    ap.add_argument("--dest", type=Path, default=Path.home() / "bbb_backups")
    ap.add_argument("--keep-days", type=int, default=30)
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()
    if args.check:
        self_check()
        return 0
    for db in args.databases:
        if not db.exists():
            print(f"skip {db}: not found", file=sys.stderr)
            continue
        out = backup(db, args.dest)
        removed = prune(args.dest, db.stem, args.keep_days)
        print(f"{db} -> {out} ({out.stat().st_size:,} bytes, integrity ok, {removed} old removed)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
