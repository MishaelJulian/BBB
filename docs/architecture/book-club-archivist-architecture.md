# Book Club Archivist - System Architecture

## Overview
**Book Club Archivist** is an enterprise-grade digital archival data pipeline system designed to collect, process, deduplicate, enrich, validate, and preserve years of scattered book club history from heterogeneous sources into one canonical database.

## System Architecture Pipeline

```
Heterogeneous Sources (HTML, Substack, PDF, Markdown, DOCX, CSV, Excel, Images/OCR)
                              │
                              ▼
                        ┌──────────┐
                        │ Importers│ (Raw Extraction to Intermediate Schema)
                        └────┬─────┘
                             │
                             ▼
                        ┌──────────┐
                        │Extractor │ (Structural & Semantic Parsing)
                        └────┬─────┘
                             │
                             ▼
                        ┌──────────┐
                        │Normalizer│ (Unicode, Whitespace, Dates, Names)
                        └────┬─────┘
                             │
                             ▼
                     ┌───────────────┐
                     │ Deduplicator  │ (Fuzzy Match, Levenshtein, ISBN Lookup)
                     └───────┬───────┘
                             │
                             ▼
                        ┌──────────┐
                        │ Enricher │ (OpenLibrary, Google Books Metadata)
                        └────┬─────┘
                             │
                             ▼
                        ┌──────────┐
                        │ Validator│ (Schema Integrity & Orphan Detection)
                        └────┬─────┘
                             │
                             ▼
                        ┌──────────┐
                        │ Storage  │ (PostgreSQL / SQLite via SQLAlchemy 2.0)
                        └────┬─────┘
                             │
                             ▼
                        ┌──────────┐
                        │ Exporters│ (JSON, CSV, SQL DB snapshot, FastAPI)
                        └──────────┘
```

## Key Architectural Principles

1. **Strict Provenance**: Every extracted record, field, and quote maintains a direct link (`source_id`) back to its original source URL, paragraph, page, line range, or raw file path.
2. **Modular Ingestion Engine**: Importers implement a standardized `BaseImporter` interface returning normalized `IntermediateRecord` models.
3. **Dual Database Engine**: Fully supports zero-config SQLite for local processing and robust PostgreSQL for production environments via SQLAlchemy 2.0 ORM.
4. **Resilient Operation**: Logging and validation layers track import jobs without crashing pipeline processing.
