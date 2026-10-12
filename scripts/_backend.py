"""Keep host scripts and the docker backend from writing the same SQLite file at once.

The container writes its own -wal file inside /app while a host script writes the one beside the file on disk, so two write-ahead logs can
diverge. `backend_stopped()` stops the compose backend while a script writes the database, folds the host's log into the main file, and
starts the backend again (also when the script fails). With no docker, or no running backend, it does nothing.
"""
import contextlib
import shutil
import sqlite3
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def _compose(*args: str) -> subprocess.CompletedProcess:
    return subprocess.run(["docker", "compose", *args], cwd=ROOT, capture_output=True, text=True)


@contextlib.contextmanager
def backend_stopped(db_path: str | Path, service: str = "backend"):
    running = False
    if shutil.which("docker") and (ROOT / "docker-compose.yml").exists():
        running = bool(_compose("ps", "--status", "running", "-q", service).stdout.strip())
    if running:
        print(f"stopping the docker {service} while the database is written...", flush=True)
        _compose("stop", service)
    try:
        yield running
    finally:
        try:
            c = sqlite3.connect(str(db_path))
            c.execute("pragma wal_checkpoint(TRUNCATE)")      # the container sees only the .db file, so the log must be inside it
            c.close()
        finally:
            if running:
                out = _compose("start", service)
                print(f"docker {service} started again" if out.returncode == 0 else f"COULD NOT START {service}: {out.stderr[:200]}", flush=True)
