# Archive Audit — Sprint 1.6

**Generated**: 2026-07-22 (checkpoint writer)
**Source**: Filesystem scan + ingestion_report.md + archive_statistics.json + archive_manifest.json + BBB Meetup-9.txt

## Executive Summary

| Metric | Claimed | Verified | Delta |
|--------|---------|----------|-------|
| Total meetups imported | 44 | 44 | 0 |
| Total books imported | 3,398 | 3,398 (unverified) | — |
| Source files processed | 31 (1 TXT + 30 PDF) | 25 (1 TXT + 24 PDF) | **-6 PDFs not in ingestion report** |
| PDFs in directory | 31 | 31 | — |
| PDFs missing from ingestion report | — | 6 | **CRITICAL** |
| Meetups with source files but not imported | — | at least 8 | **CRITICAL** |
| Possible duplicates | 0 | 0 (unverified) | **SUSPICIOUS** |
| Venues captured | 4 | 3 confirmed + 1 missing | **Koramangala Art Studio missing** |

---

## 1. Source Files — Complete Inventory

### TXT Files (1)

| # | Filename | Meetups Contained | Status |
|---|----------|-------------------|--------|
| 1 | BBB Meetup-9.txt | #4, #5, #8, #9, #11–#24, #26, #31, #34, #37, #40, #45–#54, #65 | ✅ Imported (32 per report; manual count: 35 sections) |

### PDF Files (31)

| # | Filename | Expected Meetup | In Ingestion Report? | In Database? | Status |
|---|----------|-----------------|---------------------|-------------|--------|
| 1 | BBB Books Discussed - Jul 2023.pdf | ~#55 | ❌ NO | ❌ NO | **SKIPPED** |
| 2 | BBB Books Discussed - Aug 2023.pdf | ~#56 | ❌ NO | ❌ NO | **SKIPPED** |
| 3 | BBB Meetup - October 2023 (Books Discussed).pdf | ~#58 | ✅ YES | ❌ NO | **PARSED BUT NOT IMPORTED** |
| 4 | BYOB +BBB - Nov 2023 (25th Nov Meet) - Copy.pdf | ~#59 | ✅ YES | ❌ NO | **PARSED BUT NOT IMPORTED** |
| 5 | 30_12_2023 15_33.pdf | ~#60 | ✅ YES | ❌ NO | **PARSED BUT NOT IMPORTED** |
| 6 | 70 - BBB Meetup 70 - Mar 2024.pdf | #70 | ✅ YES | ✅ YES (41 books) | ✅ OK |
| 7 | 71 - BBB Meetup 71 - Apr 2024.pdf | #71 | ✅ YES | ✅ YES (51 books) | ✅ OK |
| 8 | 72 - BBB Meetup 72 - May 2024.pdf | #72 | ✅ YES | ✅ YES (61 books) | ✅ OK |
| 9 | 73 - BBB Meetup 73 - Jun 2024.pdf | #73 | ✅ YES | ✅ YES (47 books) | ✅ OK |
| 10 | 74 - BBB Meetup 74 - July 2024.pdf | #74 | ✅ YES | ✅ YES (49 books) | ✅ OK |
| 11 | 75 - BBB 75 - AUG 2024.pdf | #75 | ✅ YES | ✅ YES (48 books) | ✅ OK |
| 12 | 76 - BBB Meetup 76 - SEP 24.pdf | #76 | ✅ YES | ❌ NO | **PARSED BUT NOT IMPORTED** |
| 13 | 80 - BBB Meetup - Jan 2025.pdf | #80 | ✅ YES | ❌ NO | **PARSED BUT NOT IMPORTED** |
| 14 | 82 - BBB Meetup - Mar 2025.pdf | #82 | ✅ YES | ❌ NO | **PARSED BUT NOT IMPORTED** |
| 15 | 83 - BBB Meetup - Apr 2025.pdf | #83 | ✅ YES | ❌ NO | **PARSED BUT NOT IMPORTED** |
| 16 | 84 - BBB Meetup - May 2025.pdf | #84 | ✅ YES | ❌ NO | **PARSED BUT NOT IMPORTED** |
| 17 | BBB 85 - Books Discussed.pdf | #85 | ✅ YES | ✅ YES (56 books) | ✅ OK |
| 18 | 86 - BBB Meetup - Books Discussed - July 2025.pdf | #86 | ✅ YES | ❌ NO | **PARSED BUT NOT IMPORTED** |
| 19 | Books Discussed — BBB JULY 2025.pdf | ~#87? | ❌ NO | ❌ NO | **SKIPPED** (em-dash in filename) |
| 20 | BBB AUG 2025 - BOOKS DISCUSSED.pdf | ~#88 | ❌ NO | ❌ NO | **SKIPPED** |
| 21 | BBB SEPT 2025 - BOOKS DISCUSSED.pdf | ~#89 | ❌ NO | ❌ NO | **SKIPPED** |
| 22 | BBB OCT 2025 - BOOKS DISCUSSED (1).pdf | ~#90 | ❌ NO | ❌ NO | **SKIPPED** |
| 23 | BBB NOV 2025 - BOOKS DISCUSSED LIST.pdf | ~#91 | ❌ NO | ❌ NO | **SKIPPED** |
| 24 | BBB DEC 2025 - BOOKS DISCUSSED LIST.pdf | ~#92 | ❌ NO | ❌ NO | **SKIPPED** |
| 25 | BBB JAN 2026 - BOOKS DISCUSSED LIST.pdf | ~#93? | ❌ NO | ❌ NO | **SKIPPED** (may overlap with BBB #93 Feb) |
| 26 | BBB #93 Feb 2026, Books Discussed.pdf | #93 | ✅ YES | ✅ YES (62 books) | ✅ OK |
| 27 | BBB #94 Mar 2026, Books Discussed (1).pdf | #94 | ✅ YES | ✅ YES (46 books) | ✅ OK |
| 28 | BBB #95 April 2026, Books Discussed.pdf | #95 | ✅ YES | ✅ YES (36 books) | ✅ OK |
| 29 | BBB #96 May 2026, Books Discussed.pdf | #96 | ✅ YES | ✅ YES (4 books) | ⚠️ LOW BOOK COUNT |
| 30 | BBB 97, June 2026, Books Discussed.pdf | #97 | ✅ YES | ❌ NO | **PARSED BUT NOT IMPORTED** |
| 31 | BBB 98, July 2026 - List of Books.pdf | #98 | ✅ YES | ❌ NO | **PARSED BUT NOT IMPORTED** |

### Summary

| Category | Count |
|----------|-------|
| PDFs successfully imported | 13 |
| PDFs parsed but not imported | 10 |
| PDFs skipped entirely (not in ingestion report) | 8 |
| **Total PDFs** | **31** |

---

## 2. Per-Meetup Audit (Database Records)

### From TXT (BBB Meetup-9.txt)

| Meetup | Source | Books | Status |
|--------|--------|------:|--------|
| #4 | TXT | 16 | ✅ |
| #5 | TXT | 47 | ✅ |
| #8 | TXT | 60 | ✅ |
| #9 | TXT | 7 | ✅ |
| #11 | TXT | 15 | ✅ |
| #12 | TXT | 70 | ✅ |
| #13 | TXT | 84 | ✅ |
| #14 | TXT | 84 | ✅ |
| #15 | TXT | 30 | ✅ |
| #16 | TXT | 90 | ✅ |
| #17 | TXT | 56 | ✅ |
| #18 | TXT | 31 | ✅ |
| #19 | TXT | 41 | ✅ |
| #20 | TXT | 80 | ✅ |
| #21 | TXT | 69 | ✅ |
| #22 | TXT | 49 | ✅ |
| #23 | TXT | 71 | ✅ |
| #24 | TXT | 114 | ✅ |
| #26 | TXT | 63 | ✅ |
| #31 | TXT | 29 | ✅ |
| #34 | TXT | 31 | ✅ |
| #37 | TXT | 38 | ✅ |
| #40 | TXT | 54 | ✅ |
| #45 | TXT | 68 | ✅ |
| #46 | TXT | 47 | ✅ |
| #47 | TXT | 68 | ✅ |
| #48 | TXT | 85 | ✅ |
| #49 | TXT | 73 | ✅ |
| #50 | TXT | 44 | ✅ |
| #52 | TXT | 82 | ✅ |
| #54 | TXT | 70 | ✅ |
| #65 | TXT | 50 | ✅ |
| **Total** | **32 meetups** | **1,798 books** | |

### From PDFs

| Meetup | Source File | Books | Status |
|--------|------------|------:|--------|
| #70 | 70 - BBB Meetup 70 - Mar 2024.pdf | 41 | ✅ |
| #71 | 71 - BBB Meetup 71 - Apr 2024.pdf | 51 | ✅ |
| #72 | 72 - BBB Meetup 72 - May 2024.pdf | 61 | ✅ |
| #73 | 73 - BBB Meetup 73 - Jun 2024.pdf | 47 | ✅ |
| #74 | 74 - BBB Meetup 74 - July 2024.pdf | 49 | ✅ |
| #75 | 75 - BBB 75 - AUG 2024.pdf | 48 | ✅ |
| #85 | BBB 85 - Books Discussed.pdf | 56 | ✅ |
| #93 | BBB #93 Feb 2026, Books Discussed.pdf | 62 | ✅ |
| #94 | BBB #94 Mar 2026, Books Discussed (1).pdf | 46 | ✅ |
| #95 | BBB #95 April 2026, Books Discussed.pdf | 36 | ✅ |
| #96 | BBB #96 May 2026, Books Discussed.pdf | 4 | ⚠️ |
| **Total** | **11 meetups** | **541 books** | |

### Grand Total

| Source | Meetups | Books |
|--------|--------:|------:|
| TXT | 32 | 1,798 |
| PDFs | 11 | 541* |
| **Total** | **43** | **2,339** |

*Note: archive_statistics.json reports 3,398 total books. The delta (1,059) may come from books_per_meetup summing to 2,339 vs the claimed 3,398. This needs database verification.*

---

## 3. Missing Meetups — Full Gap Analysis

### Meetups with source files in repo but NOT imported

| Meetup | Source File Exists? | In Ingestion Report? | Why Not Imported? |
|--------|--------------------|---------------------|-------------------|
| #55 | BBB Books Discussed - Jul 2023.pdf | ❌ | File not recognized by parser |
| #56 | BBB Books Discussed - Aug 2023.pdf | ❌ | File not recognized by parser |
| #58 | BBB Meetup - October 2023 (Books Discussed).pdf | ✅ | Parsed but import failed/skipped |
| #59 | BYOB +BBB - Nov 2023 (25th Nov Meet) - Copy.pdf | ✅ | Parsed but import failed/skipped |
| #60 | 30_12_2023 15_33.pdf | ✅ | Parsed but import failed/skipped |
| #76 | 76 - BBB Meetup 76 - SEP 24.pdf | ✅ | Parsed but import failed/skipped |
| #80 | 80 - BBB Meetup - Jan 2025.pdf | ✅ | Parsed but import failed/skipped |
| #82 | 82 - BBB Meetup - Mar 2025.pdf | ✅ | Parsed but import failed/skipped |
| #83 | 83 - BBB Meetup - Apr 2025.pdf | ✅ | Parsed but import failed/skipped |
| #84 | 84 - BBB Meetup - May 2025.pdf | ✅ | Parsed but import failed/skipped |
| #86 | 86 - BBB Meetup - Books Discussed - July 2025.pdf | ✅ | Parsed but import failed/skipped |
| #87 | Books Discussed — BBB JULY 2025.pdf | ❌ | File not recognized (em-dash encoding?) |
| #88 | BBB AUG 2025 - BOOKS DISCUSSED.pdf | ❌ | File not recognized by parser |
| #89 | BBB SEPT 2025 - BOOKS DISCUSSED.pdf | ❌ | File not recognized by parser |
| #90 | BBB OCT 2025 - BOOKS DISCUSSED (1).pdf | ❌ | File not recognized by parser |
| #91 | BBB NOV 2025 - BOOKS DISCUSSED LIST.pdf | ❌ | File not recognized by parser |
| #92 | BBB DEC 2025 - BOOKS DISCUSSED LIST.pdf | ❌ | File not recognized by parser |
| #97 | BBB 97, June 2026, Books Discussed.pdf | ✅ | Parsed but import failed/skipped |
| #98 | BBB 98, July 2026 - List of Books.pdf | ✅ | Parsed but import failed/skipped |

**Total: 19 meetups with source files not imported**

### Meetups with NO source file in repo (genuinely missing)

These are meetups that have no corresponding file in the directory:

#1–#3, #6–#7, #10, #25, #27–#30, #32–#33, #35–#36, #38–#39, #41–#44, #51, #53, #55–#64 (partially — see above), #66–#69, #77–#79, #81, #87–#92 (partially — see above)

---

## 4. Data Quality Issues

### 4.1 Corrupted Book Titles
The most_discussed_books list contains parsing artifacts:
- "Books" (10 discussions) — likely a header, not a real book
- "Books discussed" (9 discussions) — same
- ") Deepak V" (4 discussions) — truncated author name
- "Other related Mentions" (4 discussions) — section header

### 4.2 Missing Year in Statistics
books_per_year jumps from 2024 (297) to 2026 (148). **2025 is completely absent** despite having PDFs for meetups #80–#92 (Jan 2025 – Dec 2025).

### 4.3 Venue Gap
Database shows 4 venues: Atta Galatta (19), Bookworm (20), Online (4) = 43 meetups.
But 44 meetups are claimed. One meetup has no venue attribution.
Also: Meetup #25 explicitly mentions "A Beautiful Art Studio in Koramangala" but "Koramangala Art Studio" is not in the venue list.

### 4.4 Meetup #96 Anomaly
Only 4 books recorded for meetup #96 (BBB #96 May 2026). Every other meetup has 15–114 books. This suggests incomplete parsing.

### 4.5 Duplicate Review Queue
0 possible duplicates from 3,398 books is statistically implausible. The TXT file itself contains repeated titles across meetups (e.g., "Ghachar Ghochar" appears in at least 8 meetups, "Sapiens" in at least 6).

---

## 5. Recommendations

1. **Re-parse the 8 skipped PDFs** (Jul 2023, Aug 2023, JULY 2025, AUG–DEC 2025, JAN 2026) — these were never ingested
2. **Investigate the 10 parsed-but-not-imported PDFs** (#58, #59, #60, #76, #80, #82–#84, #86, #97, #98) — parser ran but import step failed
3. **Fix venue attribution** — add Koramangala Art Studio, ensure all meetups have a venue
4. **Run fuzzy deduplication** — 0 duplicates is impossible with this much repeated content
5. **Fix corrupted book titles** — strip headers ("Books", "Books discussed") from book records
6. **Re-parse meetup #96** — 4 books is clearly incomplete
7. **Add 2025 to books_per_year** — data exists but wasn't aggregated
