# PDF port progress (branch `pdf`)
All steps done and committed; see docs/ux/pdf-notes.md for the report.

## Restart the local stack
- Postgres: `pg_ctl -D /tmp/slicec/pgdata -o "-p 55432 -k /tmp/slicec -c listen_addresses=127.0.0.1" -l /tmp/slicec/pg.log start`; databases `pdf_dev` (from bbb_m) and `pdf_base`.
- Scratch tools in /tmp/pdfwork: `py_gen.py` (Python baseline), `run.sh "99 71"` (pdfkit output via src/lib/pdf/gen.test.ts), `cmp_geom.py`, `roundtrip.py`, `pngcmp.py`, `stub-pdf.mjs` (auth + storage stub on :58731), `dev.sh`, `build.sh`, `start.sh`.
- Tests: `DATABASE_URL=postgresql://postgres@127.0.0.1:55432/pdf_dev npx vitest run src/lib/pdf`.
