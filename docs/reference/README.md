# Reference material (not live code)

Recovered from the `bbb-library/` scaffold (commit `a7d3c52`) when it was removed on 2026-10-07.

- `migrations/aa4ad2c46b33_initial_canonical_schema.py`: full 24-table Alembic migration for the canonical schema. The live `alembic/versions/` migration is empty (the app uses `Base.metadata.create_all`). Starting point for the planned SQLite → PostgreSQL move; needs relinking before use, do not copy into `alembic/versions/` as-is (it would create a second root revision).
- `snapshots/2026-07-22-run1/`: output of an earlier `app/reports/generator.py` run. Differs from the later root outputs (63 vs 52 meetups, 217 staged duplicates vs 0, 1 recommendation / 9 current reads vs 0, meetup #30 vs #65). Kept as audit evidence for the data-loss investigation.
