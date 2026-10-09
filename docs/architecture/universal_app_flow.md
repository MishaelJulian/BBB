# Universal App Flow

> **Status: roadmap.** The logical flow of the full archive pipeline as a future target. It is not an implementation plan and does not describe the code today. Current architecture: `docs/BBB_PRD_TRD.md` §7 and §9.

## Overview
**Book Club Archivist** is a digital archival data pipeline designed to collect, process, deduplicate, enrich, validate, and preserve years of scattered book club history from heterogeneous sources into one canonical database.

## System Architecture Pipeline

```
Heterogeneous Sources (HTML, Substack, PDF, Markdown, DOCX, CSV, Excel, Images/OCR)      Presenter form (from meetup #100)
                              │                                                              │ (already structured:
                              ▼                                                              │  skips Importers, Extractor
                                                                                             │  and text normalising)
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
                     │ Deduplicator  │ (Fuzzy match in two bands, Q6; ISBN never merges two works, FRBR)
                     └───────┬───────┘ ◄────────────────────────────────────────────────────────┘
                             │
                             ▼
                     ┌───────────────┐
                     │ Review queue  │ (Layer 2: a founder approves merges and new records)
                     └───────┬───────┘
                             │
                             ▼
                        ┌──────────┐
                        │ Enricher │ (Goodreads, Apple Books; admin-triggered, never on a public read)
                        └────┬─────┘
                             │
                             ▼
                        ┌──────────┐
                        │ Validator│ (Schema Integrity & Orphan Detection)
                        └────┬─────┘
                             │
                             ▼
                        ┌──────────┐
                        │ Storage  │ (SQLite via SQLAlchemy 2.0; PostgreSQL when RAG/MCP need it)
                        └────┬─────┘
                             │
                             ▼
                        ┌──────────┐
                        │ Exporters│ (FastAPI; precomputed statistics and timeline JSON; meetup PDF from the form; CSV)
                        └──────────┘
```

## Key Architectural Principles

1. **Strict Provenance**: Every extracted record, field, and quote maintains a direct link (`source_id`) back to its original source URL, paragraph, page, line range, or raw file path.
2. **Modular Ingestion Engine**: Importers implement a standardized `BaseImporter` interface returning normalized `IntermediateRecord` models.
3. **One database now**: SQLite through SQLAlchemy 2.0. SQLAlchemy keeps a later move to PostgreSQL to a connection-string change plus a data migration, planned only when RAG or MCP work needs it (decision D11).
4. **Resilient Operation**: Logging and validation layers track import jobs without crashing pipeline processing.
5. **Review before canonical**: every inflow (presenter form, old PDFs, OCR, any LLM suggestion) lands in the Layer 2 review queue first; nothing reaches the canonical archive without review or a confirmed rule.
6. **Disseminate from one store**: public pages, the scorecard and the meetup PDF are all produced from the canonical records, so they never disagree.

> **Updated 2026-10-09** with the founders' decisions (`imperative_decisions.md` §6: D4, D11, Q6).
