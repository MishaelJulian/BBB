# Archive Audit Report

**Generated**: 2026-07-22
**Auditor**: MiMoCode
**Scope**: Full verification of BBB archive ingestion completeness

---

## Executive Summary

The archive contains **44 meetups** with **3,398 imported books** and **2,909 canonical books**. However, several critical issues were identified:

1. **8 meetups have books imported but no meetup record** (#76, #80, #82, #83, #84, #86, #97, #98)
2. **Filename parsing failures** for non-standard naming patterns
3. **0 possible duplicates** flagged despite 3,398 imports (suspicious)
4. **Meetup #96 has only 4 books** (suspiciously low)

---

## 1. Source File Inventory

### TXT Source
| File | Records | Status |
|------|---------|--------|
| BBB Meetup-9.txt | 1,766 books | ✅ Parsed |

### PDF Sources (30 files)
| File | Meetup # | Books | Status |
|------|----------|-------|--------|
| 30_12_2023 15_33.pdf | Unknown | 44 | ⚠️ No meetup # extracted |
| 70 - BBB Meetup 70 - Mar 2024.pdf | #70 | 41 | ✅ |
| 71 - BBB Meetup 71 - Apr 2024.pdf | #71 | 51 | ✅ |
| 72 - BBB Meetup 72 - May 2024.pdf | #72 | 61 | ✅ |
| 73 - BBB Meetup 73 - Jun 2024.pdf | #73 | 47 | ✅ |
| 74 - BBB Meetup 74 - July 2024.pdf | #74 | 49 | ✅ |
| 75 - BBB 75 - AUG 2024.pdf | #75 | 48 | ✅ |
| 76 - BBB Meetup 76 - SEP 24.pdf | #76 | 43 | ❌ **Meetup not created** |
| 80 - BBB Meetup - Jan 2025.pdf | #80 | 85 | ❌ **Meetup not created** |
| 82 - BBB Meetup - Mar 2025.pdf | #82 | 53 | ❌ **Meetup not created** |
| 83 - BBB Meetup - Apr 2025.pdf | #83 | 72 | ❌ **Meetup not created** |
| 84 - BBB Meetup - May 2025.pdf | #84 | 52 | ❌ **Meetup not created** |
| 85 - BBB 85 - Books Discussed.pdf | #85 | 56 | ✅ |
| 86 - BBB Meetup - Books Discussed - July 2025.pdf | #86 | 74 | ❌ **Meetup not created** |
| BBB #93 Feb 2026, Books Discussed.pdf | #93 | 62 | ✅ |
| BBB #94 Mar 2026, Books Discussed (1).pdf | #94 | 46 | ✅ |
| BBB #95 April 2026, Books Discussed.pdf | #95 | 36 | ✅ |
| BBB #96 May 2026, Books Discussed.pdf | #96 | 4 | ⚠️ **Suspiciously low** |
| BBB 97, June 2026, Books Discussed.pdf | #97 | 5 | ❌ **Meetup not created** |
| BBB 98, July 2026 - List of Books.pdf | #98 | 61 | ❌ **Meetup not created** |
| BBB AUG 2025 - BOOKS DISCUSSED.pdf | Unknown | 38 | ⚠️ No meetup # extracted |
| BBB Books Discussed - Aug 2023.pdf | Unknown | 56 | ⚠️ No meetup # extracted |
| BBB Books Discussed - Jul 2023.pdf | Unknown | 66 | ⚠️ No meetup # extracted |
| BBB DEC 2025 - BOOKS DISCUSSED LIST.pdf | Unknown | 66 | ⚠️ No meetup # extracted |
| BBB JAN 2026 - BOOKS DISCUSSED LIST.pdf | Unknown | 62 | ⚠️ No meetup # extracted |
| BBB Meetup - October 2023 (Books Discussed).pdf | Unknown | 50 | ⚠️ No meetup # extracted |
| BBB NOV 2025 - BOOKS DISCUSSED LIST.pdf | Unknown | 44 | ⚠️ No meetup # extracted |
| BBB OCT 2025 - BOOKS DISCUSSED (1).pdf | Unknown | 62 | ⚠️ No meetup # extracted |
| BBB SEPT 2025 - BOOKS DISCUSSED.pdf | Unknown | 78 | ⚠️ No meetup # extracted |
| BYOB +BBB - Nov 2023 (25th Nov Meet) - Copy.pdf | Unknown | 46 | ⚠️ No meetup # extracted |
| Books Discussed — BBB JULY 2025.pdf | Unknown | 74 | ⚠️ No meetup # extracted |

---

## 2. Meetup Records in Database

**Total meetups**: 44

| Meetup # | Date | Venue | Books |
|----------|------|-------|-------|
| #4 | 2017-08-26 | Atta Galatta | 16 |
| #5 | 2017-09-30 | Atta Galatta | 47 |
| #8 | 2018-01-13 | Atta Galatta | 60 |
| #9 | 2018-02-24 | Atta Galatta | 7 |
| #11 | 2018-04-22 | Atta Galatta | 15 |
| #12 | 2018-05-27 | Atta Galatta | 70 |
| #13 | 2018-06-30 | Atta Galatta | 84 |
| #14 | 2018-07-29 | Atta Galatta | 84 |
| #15 | 2018-08-26 | Atta Galatta | 30 |
| #16 | 2018-11-25 | Atta Galatta | 90 |
| #17 | 2019-01-27 | Atta Galatta | 56 |
| #18 | 2019-03-31 | Atta Galatta | 31 |
| #19 | 2019-05-26 | Atta Galatta | 41 |
| #20 | 2019-06-23 | Atta Galatta | 80 |
| #21 | 2019-07-28 | Atta Galatta | 69 |
| #22 | 2019-08-22 | Atta Galatta | 49 |
| #23 | 2019-09-23 | Atta Galatta | 71 |
| #24 | 2019-11-24 | Atta Galatta | 114 |
| #25 | 2019-12-22 | None | - |
| #26 | 2020-01-26 | Atta Galatta | 63 |
| #31 | 2020-07-12 | Online | 29 |
| #34 | 2020-10-25 | Online | 31 |
| #37 | 2021-01-31 | Online | 38 |
| #40 | 2021-05-30 | Online | 54 |
| #45 | 2021-12-17 | Bookworm | 68 |
| #46 | 2022-02-27 | Bookworm | 47 |
| #47 | 2022-03-27 | Bookworm | 68 |
| #48 | 2022-05-22 | Bookworm | 85 |
| #49 | 2022-06-26 | Bookworm | 73 |
| #50 | 2022-07-31 | Bookworm | 44 |
| #52 | 2022-09-25 | Bookworm | 82 |
| #54 | 2022-11-27 | Bookworm | 70 |
| #65 | 2023-10-01 | Bookworm | 50 |
| #70 | 2024-03-01 | Bookworm | 41 |
| #71 | 2024-04-01 | Bookworm | 51 |
| #72 | 2024-05-01 | Bookworm | 61 |
| #73 | 2024-06-01 | Bookworm | 47 |
| #74 | 2024-07-01 | Bookworm | 49 |
| #75 | 2024-08-01 | Bookworm | 48 |
| #85 | None | Bookworm | 56 |
| #93 | 2026-02-01 | Bookworm | 62 |
| #94 | 2026-03-01 | Bookworm | 46 |
| #95 | 2026-04-01 | Bookworm | 36 |
| #96 | 2026-05-01 | Bookworm | 4 |

---

## 3. Critical Issues

### Issue 1: Meetups Without Records

These PDFs were parsed and books were imported, but **no meetup record was created**:

| Meetup # | PDF File | Books Imported | Source Record | Meetup Record | Reason |
|----------|----------|----------------|---------------|---------------|--------|
| #76 | 76 - BBB Meetup 76 - SEP 24.pdf | 43 | ✅ (meetup=None) | ❌ | Filename parsing failed |
| #80 | 80 - BBB Meetup - Jan 2025.pdf | 85 | ✅ (meetup=None) | ❌ | Filename parsing failed |
| #82 | 82 - BBB Meetup - Mar 2025.pdf | 53 | ✅ (meetup=None) | ❌ | Filename parsing failed |
| #83 | 83 - BBB Meetup - Apr 2025.pdf | 72 | ✅ (meetup=None) | ❌ | Filename parsing failed |
| #84 | 84 - BBB Meetup - May 2025.pdf | 52 | ✅ (meetup=None) | ❌ | Filename parsing failed |
| #86 | 86 - BBB Meetup - Books Discussed - July 2025.pdf | 74 | ✅ (meetup=None) | ❌ | Filename parsing failed |
| #97 | BBB 97, June 2026, Books Discussed.pdf | 5 | ✅ (meetup=None) | ❌ | Filename parsing failed |
| #98 | BBB 98, July 2026 - List of Books.pdf | 61 | ✅ (meetup=None) | ❌ | Filename parsing failed |

**Impact**: 8 meetups with **450 books** imported but no meetup record.

### Issue 2: Filename Parsing Failures

The `scanner.py` patterns fail for these filename formats:

| Filename | Expected Pattern | Actual Issue |
|----------|------------------|--------------|
| `76 - BBB Meetup 76 - SEP 24.pdf` | `\d{4}` at end | 2-digit year "24" |
| `BBB 97, June 2026, Books Discussed.pdf` | `\s+(\w+)\s+(\d{4})` | Comma after number |
| `BBB 98, July 2026 - List of Books.pdf` | `\s+(\w+)\s+(\d{4})` | Comma after number |
| `80 - BBB Meetup - Jan 2025.pdf` | Missing meetup number in pattern | Different format |

### Issue 3: Root Cause Analysis

The PDF parser (`pdf_parser.py`) creates source records with `meetup_number=None` when filename parsing fails. The pipeline (`full_import.py`) then:
1. Creates the source record (with `meetup_number=None`)
2. Creates imported books linked to that source
3. **But does NOT create a Meetup record** because `rec.meetup.meetup_number` is None

This is why books exist in the database but no meetup record was created.

### Issue 4: Zero Possible Duplicates

With **3,398 imported books** resolving to **2,909 canonical books**, there should be **489 potential duplicates** (3,398 - 2,909 = 489). However, the system reports **0 possible duplicates**.

**Possible causes**:
1. Deduplication threshold too strict (0.75)
2. Normalization merging everything automatically
3. Deduplication not actually run

### Issue 5: Suspicious Low Book Count

Meetup #96 has only **4 books** imported, while neighboring meetups have 36-62 books. This suggests:
- PDF parsing failed to extract most books
- PDF format was different and not handled
- Extraction was incomplete

---

## 4. Venue Analysis

**Database venues**: 4
- Atta Galatta (19 meetups)
- Bookworm (20 meetups)
- Online (4 meetups)
- Art Studio, Koramangala (0 meetups - seeded but unused)

**Note**: The `archive_statistics.json` only shows 3 venues (missing Art Studio, Koramangala).

---

## 5. Missing Meetup Numbers

The archive is missing meetup records for these numbers:

**From TXT archive gaps**: #1-#3, #6-#7, #10, #27-#30, #32-#33, #35-#36, #38-#39, #41-#44, #51, #53, #55-#64, #66-#69

**From PDF parsing failures**: #76-#84 (partial), #86, #97-#98

**Not in source files**: #77-#79, #87-#92

---

## 6. Recommendations

### Immediate Fixes Required

1. **Fix filename parsing** in `scanner.py`:
   - Handle 2-digit years (e.g., "SEP 24" → "Sep 2024")
   - Handle comma separators (e.g., "BBB 97, June 2026")
   - Add patterns for "80 - BBB Meetup - Jan 2025.pdf" format

2. **Re-run import** for failed PDFs after fixing parser

3. **Investigate duplicate detection**:
   - Check why 0 duplicates flagged
   - Verify fuzzy matching is working
   - Consider lowering threshold to 0.65

4. **Investigate Meetup #96**:
   - Check PDF content
   - Verify extraction completed
   - May need manual review

### Data Quality Issues

5. **Normalize book titles**:
   - "Books" and "Books discussed" appear as top "books" (noise)
   - ") Deepak V" appears as a book title (extraction error)
   - "Other related Mentions" appears as a book (noise)

6. **Fix year gaps**:
   - 2023 shows only 50 books (seems low)
   - 2025 is missing entirely from `books_per_year`

---

## 7. Audit Methodology

This audit was performed by:
1. Querying the SQLite database directly
2. Comparing database records against source files
3. Testing filename parsing patterns
4. Analyzing ingestion reports and statistics

**Files examined**:
- `book_club_archivist.db` (database)
- `ingestion_report.md`
- `archive_statistics.json`
- `archive_manifest.json`
- `missing_meetups.md`
- `duplicate_review_queue.md`
- `app/parsers/scanner.py`
- `app/parsers/pdf_parser.py`
- `app/pipeline/full_import.py`

---

## 8. Conclusion

The archive is **incomplete and has data quality issues**. Before proceeding to Sprint 2 (frontend), the following must be addressed:

1. Fix filename parsing to capture all meetups
2. Re-run import to create missing meetup records
3. Investigate and fix duplicate detection
4. Review Meetup #96 book extraction
5. Clean up noise in book titles

**Estimated effort**: 2-4 hours for parser fixes and re-import, plus review time.
