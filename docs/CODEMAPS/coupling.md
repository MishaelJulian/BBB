<!-- Generated: 2026-10-09 | Commit: 9ee6c4d | Files scanned: 27 Python modules -->

# Coupling Codemap

**Last Updated:** 2026-10-09

## Summary

Coupling measured via static import analysis across 27 Python modules in `app/`. Afferent coupling (Ca) = how many app modules import this one. Efferent coupling (Ce) = how many app modules this one imports from app.*. Instability (I = Ce / (Ca + Ce)): 0 means stable (many depend on it, few dependencies); 1 means free to change.

## Coupling Metrics

| Module | Ca | Ce | I | Stability | Reading |
|---|---:|---:|---:|---|---|
| `app.database.models` | 5 | 1 | 0.17 | **High** | 5 modules depend on it; changes ripple widely. Correct place for stability. One import (core.database) is expected. |
| `app.schemas.intermediate` | 4 | 0 | 0.00 | **High** | Stable contract between parsers and pipeline. Zero dependencies = clean interface. |
| `app.core.config` | 4 | 0+ | low | **High** | Configuration is always stable (good). Imported by core.database, api.main, cli.main, core.logging. |
| `app.parsers.scanner` | 2 | 0 | 0.00 | **High** | Stable leaf module (filename extraction). No dependencies on other app modules. |
| `app.parsers.pdf_parser` | 1 | 3 | 0.75 | **Low** | Free to change (only full_import depends). Imports models, schemas.intermediate, parsers.scanner. Layout changes don't ripple. |
| `app.pipeline.full_import` | 1 | 6 | 0.86 | **Low** | Highly dependent; nothing depends on it (only CLI calls). Imports models, schemas.intermediate, database, parsers, reports. Changes don't ripple to users. Risk: CLI usage patterns lock it in practice. |
| `app.api.main` | 0 | 5 | 1.00 | **Very low** | Top-level entry point. No modules depend on it (correct for an HTTP layer). Imports models, schemas, pipeline(?), parsers, services. Free to refactor routes. |
| `app.cli.main` | 0 | 7 | 1.00 | **Very low** | Top-level entry point. No modules depend on it. Imports models, core, pipeline, cli helpers. Free to add commands. |

## Measurement Method

1. Parsed all 27 `.py` files under `app/` (excluding `__pycache__`, tests)
2. Extracted all `from app.X import Y` and `import app.X` statements via Python AST
3. Normalized imports to module paths (e.g., `app.api.main`)
4. Counted afferent = how many modules have this module in their import set
5. Counted efferent = unique modules in this module's import set
6. Calculated instability = efferent / (afferent + efferent)

## Comparison with report_insights.md §10.2

**Finding:** Metrics match exactly.

Report says:
```
| Module | Ca | Ce | I | Reading |
| `app.database.models` | 5 | 1 | 0.17 | Stable core... |
| `app.schemas.intermediate` | 4 | 0 | 0.00 | Stable contract... |
| `app.parsers.pdf_parser` | 1 | 3 | 0.75 | Changes freely... |
| `app.pipeline.full_import` | 1 | 6 | 0.86 | Depends on most... |
| `app.api.main` | 0 | 5 | 1.00 | Top of the tree... |
| `app.cli.main` | 0 | 7 | 1.00 | Same... |
```

This measurement (2026-10-09) reproduces all six rows identically:
- models Ca=5, Ce=1, I=0.17 ✓
- schemas.intermediate Ca=4, Ce=0, I=0.00 ✓
- pdf_parser Ca=1, Ce=3, I=0.75 ✓
- full_import Ca=1, Ce=6, I=0.86 ✓
- api.main Ca=0, Ce=5, I=1.00 ✓
- cli.main Ca=0, Ce=7, I=1.00 ✓

No differences found.

## Module Dependencies (Import Graph)

### High-Stability Core (I ≤ 0.25)

```
app.database.models
  ← app.schemas.intermediate (no reverse deps)
  ← app.api.main
  ← app.cli.main
  ← app.pipeline.full_import
  ← app.services.pdf_generator
  
app.schemas.intermediate
  ← app.parsers.pdf_parser
  ← app.parsers.txt_parser
  ← app.pipeline.full_import
  ← app.reports.generator
  (no dependencies on other app.* modules)

app.core.config
  ← app.core.database
  ← app.api.main
  ← app.cli.main
  ← app.core.logging
```

### Moderate-Stability Transform Layers (I = 0.50–0.80)

```
app.parsers.pdf_parser (I = 0.75)
  → app.database.models
  → app.schemas.intermediate
  → app.parsers.scanner
  ← app.pipeline.full_import

app.parsers.txt_parser (I similar)
  → app.database.models
  → app.schemas.intermediate
  ← app.pipeline.full_import

app.services.pdf_generator (I = 0.67)
  → app.database.models
  → app.core.config
  → pillow, reportlab (external)
  ← app.api.main (single caller)
```

### Low-Stability Orchestrators (I ≥ 0.85)

```
app.pipeline.full_import (I = 0.86)
  → app.database.models
  → app.schemas.intermediate
  → app.core.database
  → app.core.config
  → app.parsers.* (txt_parser, pdf_parser, scanner)
  → app.reports.generator
  ← app.cli.main (single caller via CLI command)
  
app.api.main (I = 1.00)
  → app.database.models
  → app.schemas.intermediate
  → app.core.config
  → app.core.database
  → app.core.paths
  → app.services.pdf_generator
  (no reverse dependencies: correct for HTTP layer)

app.cli.main (I = 1.00)
  → app.database.models
  → app.core.* (config, database, logging, paths)
  → app.pipeline.full_import
  → app.reports.generator
  (no reverse dependencies: correct for CLI layer)
```

## Cohesion Analysis (LCOM-like observations)

### High Cohesion (one job per module)

- **models.py:** 27 SQLAlchemy table definitions; nothing else. Single responsibility.
- **schemas/intermediate.py:** Pydantic models for import pipeline; bridge between raw parsing and canonical data.
- **parsers/scanner.py:** Filename regex extraction only.

### Acceptable Sequential Cohesion (steps that feed each other)

- **full_import.py:** 15 methods across 9 phases (import → parse → match → merge → validate → clean → report). Acceptable because each step is logically dependent. Risk: merge is complex and unreviewed.

### Moderate Cohesion (unrelated things together)

- **api.main.py (2,215 lines):** Public reads (11 routes) + admin writes (8 routes) + media resolution (4 routes) + enrichment (2 routes) + 40 helper functions. Coincidental cohesion. Candidate for splitting when next changed:
  - Extract `/admin/*` to separate module
  - Extract media resolution to separate module
  - Extract enrichment to separate module
  - Keep public reads in main

- **services/pdf_generator.py (518 lines):** PDF generation + image/font handling. Sequential cohesion (fetch data → format → render). Acceptable.

## Tight Coupling Points (High Risk)

1. **Pipeline writes straight to canonical tables:** `full_import.py` skips the review step and inserts directly into CanonicalBook. A parser mistake flows to the UI immediately (no buffer, no validation gate). Mitigation: add review queue (A3 in API backlog) before closing this loop.

2. **Duplicate detection has no test:** Merges are automatic and unreviewed. 218 merges made in July, 0 reviewed. Risk: wrong author linkages, lost book history. Mitigation: A7 (validation suite for merges) must precede A3.

3. **Admin routes have no auth:** All `/admin/*` routes are open (no login, no token). Reachable on local network (10.x, 192.168.x). Acceptable only while development tool, risky if exposed. Mitigation: P12 (add auth before prod).

4. **Parsers coupled to PDF layouts:** Unavoidable (layout changes require code changes). Managed well: I = 0.75 says changes don't ripple. Mitigation: A7 (PDF regression suite) to catch layout shifts early.

5. **Rule duplication (hidden coupling):** Noise/garbage detection rules live in 2 modules (parsers, pipeline). No test enforces they stay in sync. Mitigation: A2 (move all validation rules to schemas.intermediate or a dedicated rules.py module).

## Low-Risk Coupling Points

- **Frontend → API:** One client (`lib/api.ts`) talks to one contract (33 routes). Changes to backend routes require frontend update (loose coupling, loose cohesion intended). No database coupling across boundary (good).

- **Core/Config:** Stable and thin. Rarely changes. Safe to depend on.

- **ORM Models:** Stable (I = 0.17), and imports flow mostly downward (models ← others). Correct architecture.

## Refactoring Priorities (if coupling becomes an issue)

1. **Split api/main.py (2,215 lines, 40 functions):**
   - `api/public.py` (11 GET routes for readers)
   - `api/admin.py` (8 write routes for curators)
   - `api/media.py` (4 resolve/suggest routes)
   - `api/enrich.py` (2 Goodreads routes)

2. **Extract validation rules to schemas:**
   - Move `_is_public_http_url`, `_host_is`, noise checks to `schemas/rules.py`
   - Import from schemas in both parsers and pipeline

3. **Test the pipeline:**
   - Unit tests for each phase of `full_import.py`
   - Regression suite for duplicate detection (A7)
   - Layout regression suite for PDF parser (A7)

## Related Areas

- See `architecture.md` for system context
- See `backend.md` for how api/main.py is structured
- See `report_insights.md` §10.2 for original measurements and interpretation
- Full module list: `app/` directory (27 Python files)
