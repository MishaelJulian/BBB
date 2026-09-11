# Duplicate Detection Investigation Report

**Date**: 2026-07-22
**Investigator**: MiMoCode

---

## Root Cause

The duplicate detection returns **0 candidates** because of a logic error in the pipeline:

### The Bug

In `full_import.py`, the `_detect_duplicates()` method only checks **unlinked** imported books:

```python
unlinked = self.session.query(ImportedBook).filter_by(canonical_book_id=None).all()
```

But `_link_imported_to_canonical()` links **ALL** imported books to canonical books before deduplication runs:

```python
# Step 5: Link imported to canonical (links everything)
self._link_imported_to_canonical()

# Step 6: Detect duplicates (only checks unlinked - nothing left!)
self._detect_duplicates()
```

Result: `unlinked` is always empty, so no duplicates are ever found.

---

## Secondary Issues

### 1. Noise in Canonical Books

The following noise entries exist as canonical books:

| Title | Normalized | Count |
|-------|------------|-------|
| Books | books | 11 |
| Books discussed | books discussed | 1 |
| Other related Mentions | other related mentions | 1 |

These are headers/formatting artifacts, not real books.

### 2. Duplicate Canonical Books

Books with identical normalized titles exist as separate canonical entries:

| Book 1 | Book 2 | Issue |
|--------|--------|-------|
| Skin in the game | Skin in the Game | Casing difference |
| Looking Away | looking away | Casing difference |
| Sapiens | Sapiens | Exact duplicate |
| Steve Jobs | Steve Jobs | Exact duplicate |
| Ghachar Ghochar | Ghachar Ghochar | Exact duplicate |
| The vegetarian | The Vegetarian ( | Trailing parenthesis |

---

## Fix Strategy

### Phase 1: Filter noise during canonical book creation

Add validation in `_resolve_canonical_books()` to skip:
- Normalized titles < 3 characters
- Titles matching known noise patterns ("books", "books discussed", etc.)
- Titles that are clearly not book titles

### Phase 2: Fix deduplication order

Change the pipeline order to:
1. Resolve canonical books (exact matches only)
2. **Detect duplicates** (fuzzy matching on unlinked books)
3. Link remaining imported books to canonical

### Phase 3: Add cross-canonical deduplication

After initial deduplication, also check for:
- Canonical books with identical normalized titles
- Canonical books with very similar titles (fuzzy match)

---

## Implementation

The fix will be applied to `full_import.py` in the following methods:
- `_resolve_canonical_books()` - add noise filtering
- `_detect_duplicates()` - run BEFORE linking
- New method: `_merge_canonical_duplicates()` - merge exact duplicate canonicals
