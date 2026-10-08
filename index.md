# Index

Where everything in this repository lives. Any person or AI model can start here.

**Upkeep:** adding, moving, renaming or archiving a doc or a top-level folder updates this file in the same commit.

## Start here

| File | What it is |
|---|---|
| [`README.md`](README.md) | Front page: what BBB Library is, how to run it, examples, API reference |
| [`docs/BBB_PRD_TRD.md`](docs/BBB_PRD_TRD.md) | Main document: product and technical requirements, goals, constraints, change policy. First in authority after the founders |
| [`docs/AGENT_RULES.md`](docs/AGENT_RULES.md) | How AI agents work here: hard rules, session start, database safety, API contract, dependencies, reports |
| [`docs/BBB_UI.md`](docs/BBB_UI.md) | UI and visual rules |

## Current state

| File | What it is |
|---|---|
| [`docs/health/CURRENT_STATE.md`](docs/health/CURRENT_STATE.md) | Measured state of the archive, app and checks |
| [`docs/health/SESSION_LOG.md`](docs/health/SESSION_LOG.md) | What each work session did |
| [`docs/book_count&details_issues.md`](docs/book_count&details_issues.md) | Known data problems and the repair order |
| [`docs/meetup_index.md`](docs/meetup_index.md) | Meetup list with venues and book counts |

## Plans and research

| File | What it is |
|---|---|
| [`docs/plans/backlog.md`](docs/plans/backlog.md) | Optional closet features carried over from the earlier room |
| [`docs/plans/sprint_1c_implementation.md`](docs/plans/sprint_1c_implementation.md) | Plan for the original full-archive import (historical; its "reset the database" step no longer applies) |
| [`docs/references.md`](docs/references.md) | Prior work and research sources |

## Architecture notes

Older design write-ups; the PRD is the current source.

| File | What it is |
|---|---|
| [`docs/architecture/bbb-library-architecture.md`](docs/architecture/bbb-library-architecture.md) | The app as first built |
| [`docs/architecture/universal_app_flow.md`](docs/architecture/universal_app_flow.md) | Roadmap: logical flow of the full archive pipeline (future features, not current code) |
| [`docs/architecture/canonical_archive_specification.md`](docs/architecture/canonical_archive_specification.md) | Archive specification |
| [`docs/architecture/domain_model.md`](docs/architecture/domain_model.md) | Domain model |
| [`docs/architecture/DatabaseSchema.md`](docs/architecture/DatabaseSchema.md) | Database schema notes |
| [`docs/architecture/standalone_documents.md`](docs/architecture/standalone_documents.md) | The standalone archive documents |
| [`frontend/ARCHITECTURE.md`](frontend/ARCHITECTURE.md) | Frontend architecture |

## Audit snapshots

One-off reports from earlier sprints, kept as history in [`docs/health/`](docs/health/): `archive_audit.md`, `archive_audit_report.md`, `archive_integrity_report.md`, `audit_diff.md`, `duplicate_detection_report.md`, `meetup96_investigation.md`, `meetup_import_status.md`, `repository_analysis.md`, `schema_analysis.md`, `validation_summary.md`.

## Reference material

| Path | What it is |
|---|---|
| [`docs/reference/migrations/`](docs/reference/migrations/) | Full 24-table Alembic migration from the removed scaffold. Reference only: copying it into `alembic/versions/` would create a second root revision |
| [`docs/reference/snapshots/`](docs/reference/snapshots/) | Emptied report snapshot folder; contents recoverable from git history |
| [`docs/media/`](docs/media/) | Demo video and the README images (`readme/`) |
| [`reports/`](reports/) | Generated archive reports, one folder per date |

## Code and data folders

| Folder | What it holds |
|---|---|
| [`app/`](app/) | Backend: API (`api/`), data model (`database/`), import pipeline (`pipeline/`, `parsers/`, `importers/`), CLI (`cli/`), reports, services |
| [`frontend/`](frontend/) | Next.js frontend; the closet is in `src/components/library/` |
| [`sources/`](sources/) | Original meetup PDFs and the master text archive |
| [`assets/`](assets/) | Templates, fonts, cached covers, uploads, generated PDFs |
| [`scripts/`](scripts/) | One-off data scripts, `install_tools.sh`, `readme_images.py`, `scratch/` |
| [`tests/`](tests/) | Test suite; `verify/` holds end-to-end checks against a live API |
| `book_club_archivist.db` | The SQLite archive |

## Archive

Retired material, kept for history in [`archive/`](archive/): the original foundation prompt, build guide, agent playbook and rules (`docs-v1/`), the master prompt, the reference README, the first scaffold (`bbb-library/`), the v1.0 release notes, the static CSV export, the Criterion reference recording, and unused files from earlier rooms.
