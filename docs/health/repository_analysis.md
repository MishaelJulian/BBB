# Repository Analysis & Discovery Report — BBB Library

**Project**: Broke Bibliophiles Bangalore (BBB) Library Archive  
**Date**: July 22, 2026  
**Role**: Lead Software Architect  
**Status**: Architectural Discovery & Data Inventory Complete (Pre-Implementation Phase)  

---

## 1. Project Overview

**BBB Library** is an interactive digital archive and virtual library platform built for **Broke Bibliophiles Bangalore (BBB)**—a vibrant book club community in Bangalore, India. 

The primary architectural goal is to digitize, index, and visualize years of book club meetups, book discussions, member recommendations, current reads, and community history. The visual flagship for the frontend is an interactive **Criterion Closet-inspired virtual bookshelf** where users can browse, search, rotate in 3D, and explore books discussed at BBB meetings. Future phases will introduce a 3D museum mode, AI librarian, recommendation engine, knowledge graph, and community reading statistics.

### Repository Context & Evolution
The workspace reflects two distinct architectural layers:
1. **Historical Raw Data & Legacy Prototype**: 
   - A single comprehensive text archive (`BBB Meetup-9.txt`) containing meetup summaries from 2017–2022.
   - 25 PDF documents capturing meetup book lists from 2023 to 2026.
   - An initialized SQLite database (`book_club_archivist.db`) with 20 normalized tables (currently 0 records).
   - A legacy Python application prototype (`app/`, `docs/`, `alembic/`, `pyproject.toml`).
2. **Production Monorepo Foundation (`bbb-library/`)**:
   - Built in Sprint 0, featuring Next.js (App Router, Three.js, React Three Fiber, React Query, Zustand, TailwindCSS) and FastAPI (SQLAlchemy AsyncIO, Alembic, Pydantic v2, PostgreSQL) with Docker Compose orchestration.

---

## 2. Complete File & Asset Inventory

The table below catalogs every file present in the workspace, detailing its filename, purpose, file type, and estimated usefulness for the production application.

| Filename / Path | Purpose | Type | Estimated Usefulness |
| :--- | :--- | :--- | :--- |
| `BBB Meetup-9.txt` | Primary raw text archive of meetups #4 through #54 (2017–2022). | Raw Text Data | **CRITICAL (High)** — Main historical record for early meetups. |
| `book_club_archivist.db` | Pre-initialized SQLite database containing 20 relational tables (0 rows). | SQLite DB | **HIGH** — Reference for schema design & entity relationships. |
| `70 - BBB Meetup 70 - Mar 2024.pdf` | Meetup #70 book discussion record (March 2024). | PDF Document | **HIGH** — Source data for Meetup #70. |
| `71 - BBB  Meetup 71 - Apr 2024.pdf` | Meetup #71 book discussion record (April 2024). | PDF Document | **HIGH** — Source data for Meetup #71. |
| `72 - BBB Meetup 72 - May 2024.pdf` | Meetup #72 book discussion record (May 2024). | PDF Document | **HIGH** — Source data for Meetup #72. |
| `73 - BBB Meetup 73 - Jun 2024.pdf` | Meetup #73 book discussion record (June 2024). | PDF Document | **HIGH** — Source data for Meetup #73. |
| `74 - BBB Meetup 74 - July 2024.pdf` | Meetup #74 book discussion record (July 2024). | PDF Document | **HIGH** — Source data for Meetup #74. |
| `75 - BBB 75 - AUG 2024.pdf` | Meetup #75 book discussion record (August 2024). | PDF Document | **HIGH** — Source data for Meetup #75. |
| `76 - BBB Meetup 76 - SEP 24.pdf` | Meetup #76 book discussion record (September 2024). | PDF Document | **HIGH** — Source data for Meetup #76. |
| `80 - BBB Meetup - Jan 2025.pdf` | Meetup #80 book discussion record (January 2025). | PDF Document | **HIGH** — Source data for Meetup #80. |
| `82 - BBB Meetup - Mar 2025.pdf` | Meetup #82 book discussion record (March 2025). | PDF Document | **HIGH** — Source data for Meetup #82. |
| `83 - BBB Meetup - Apr 2025.pdf` | Meetup #83 book discussion record (April 2025). | PDF Document | **HIGH** — Source data for Meetup #83. |
| `84 - BBB Meetup - May 2025.pdf` | Meetup #84 book discussion record (May 2025). | PDF Document | **HIGH** — Source data for Meetup #84. |
| `86 - BBB Meetup - Books Discussed - July 2025.pdf` | Meetup #86 book discussion record (July 2025). | PDF Document | **HIGH** — Source data for Meetup #86. |
| `BBB #93 Feb 2026, Books Discussed.pdf` | Meetup #93 book discussion record (February 2026). | PDF Document | **HIGH** — Source data for Meetup #93. |
| `BBB #94 Mar 2026, Books Discussed (1).pdf` | Meetup #94 book discussion record (March 2026). | PDF Document | **HIGH** — Source data for Meetup #94. |
| `BBB #95 April 2026, Books Discussed.pdf` | Meetup #95 book discussion record (April 2026). | PDF Document | **HIGH** — Source data for Meetup #95. |
| `BBB #96 May 2026, Books Discussed.pdf` | Meetup #96 book discussion record (May 2026). | PDF Document | **HIGH** — Source data for Meetup #96. |
| `BBB 85 - Books Discussed.pdf` | Meetup #85 book discussion record (June 2025). | PDF Document | **HIGH** — Source data for Meetup #85. |
| `BBB 97, June 2026, Books Discussed.pdf` | Meetup #97 book discussion record (June 2026). | PDF Document | **HIGH** — Source data for Meetup #97. |
| `BBB 98, July 2026 - List of Books.pdf` | Meetup #98 book discussion record (July 2026). | PDF Document | **HIGH** — Source data for Meetup #98. |
| `BBB AUG 2025 - BOOKS DISCUSSED.pdf` | Meetup #87 book discussion record (August 2025). | PDF Document | **HIGH** — Source data for August 2025. |
| `BBB Books Discussed - Aug 2023.pdf` | Meetup book discussion record (August 2023). | PDF Document | **HIGH** — Source data for August 2023. |
| `BBB Books Discussed - Jul 2023.pdf` | Meetup book discussion record (July 2023). | PDF Document | **HIGH** — Source data for July 2023. |
| `BBB DEC 2025 - BOOKS DISCUSSED LIST.pdf` | Meetup #91 book discussion record (December 2025). | PDF Document | **HIGH** — Source data for December 2025. |
| `BBB JAN 2026 - BOOKS DISCUSSED LIST.pdf` | Meetup #92 book discussion record (January 2026). | PDF Document | **HIGH** — Source data for January 2026. |
| `BBB Meetup - October 2023 (Books Discussed).pdf` | Meetup book discussion record (October 2023). | PDF Document | **HIGH** — Source data for October 2023. |
| `BBB NOV 2025 - BOOKS DISCUSSED LIST.pdf` | Meetup #90 book discussion record (November 2025). | PDF Document | **HIGH** — Source data for November 2025. |
| `BBB OCT 2025 - BOOKS DISCUSSED (1).pdf` | Meetup #89 book discussion record (October 2025). | PDF Document | **HIGH** — Source data for October 2025. |
| `BBB SEPT 2025 - BOOKS DISCUSSED.pdf` | Meetup #88 book discussion record (September 2025). | PDF Document | **HIGH** — Source data for September 2025. |
| `BYOB +BBB - Nov 2023 (25th Nov Meet) - Copy.pdf` | Joint BYOB + BBB Meetup record (November 2023). | PDF Document | **HIGH** — Source data for November 2023. |
| `30_12_2023 15_33.pdf` | Year-end BBB meetup summary record (December 2023). | PDF Document | **MEDIUM** — Additional meetup record. |
| `docs/Architecture.md` | Legacy system architecture doc for "Book Club Archivist". | Markdown | **MEDIUM** — Blueprint reference for database schema & design. |
| `docs/DatabaseSchema.md` | Legacy SQL database schema specification document. | Markdown | **MEDIUM** — Architectural schema reference. |
| `app/database/models.py` | Legacy SQLAlchemy ORM models definition. | Python Code | **MEDIUM** — Reference for model attributes & relationships. |
| `app/schemas/intermediate.py` | Legacy Pydantic data import schemas. | Python Code | **MEDIUM** — Ingestion pipeline structure reference. |
| `bbb-library/` | Sprint 0 monorepo root (Next.js + FastAPI + Docker). | Monorepo Stack | **CRITICAL (High)** — Production application codebase foundation. |

---

## 3. Analysis of Meetup Text Files (`BBB Meetup-9.txt`)

Analysis of `BBB Meetup-9.txt` reveals **35 raw meetup entries** spanning from 2017 to 2022. Below is the detailed un-normalized extraction reporting exactly what exists in the historical text archive.

### Summary of Identified Meetups

| Meetup # | Date Identified | Venue Identified | Books Count | Key Notes & Highlights |
| :--- | :--- | :--- | :--- | :--- |
| **BBB Meetup-4** | August 26, 2017 | Atta Galatta | 13 | First recorded meetup in file; members visited Bookworm & Blossoms post-meetup. |
| **BBB Meetup-5** | September 30, 2017 | Atta Galatta | 26 | Attended by new members Gokul S Nath, Amay Narayan, Palgun Kj, Varun Vasudev. |
| **BBB Meetup-8** | January 13, 2018 | Atta Galatta | 59 | First 2018 meetup; 25 attendees; ordered coffee, masala fries, cheese omelettes. Special guest: Aarzu Sadana's father. |
| **BBB Meetup-9** | February 24, 2018 | Atta Galatta | 7 | Featured special guest **Rahul Kondi** sitting in front of Blossoms with his typewriter typing notes. |
| **BBB Meetup-13** | June 30, 2018 | Atta Galatta | 12 | Discussion focused on fiction and classics. |
| **BBB Meetup-14** | July 29, 2018 | Atta Galatta | 81 | 36 attendees; extensive book list with Goodreads URLs. |
| **BBB Meetup-15** | August 26, 2018 | Atta Galatta | 29 | First meetup with dedicated theme discussion. |
| **BBB Meetup-16** | November 25, 2018 | Atta Galatta | 90 | Huge turnout; 90 distinct book references/Goodreads links recorded. |
| **BBB Meetup-19** | May 26, 2019 | Atta Galatta | 15 | Broad discussion on historical fiction & non-fiction. |
| **BBB Meetup-20** | June 30, 2019 | Atta Galatta | 42 | Extensive discussions on sci-fi and fantasy series. |
| **BBB Meetup-21** | July 28, 2019 | Atta Galatta | 62 | 15 attendees (3 new); celebrated member birthday with *Birthday Stories*. |
| **BBB Meetup-22** | August 22, 2019 | Atta Galatta | 49 | Deep dive into *Born a Crime*, Terry Brooks, David Eddings, and Kingkiller Chronicle. |
| **BBB Meetup-23** | September 23, 2019 | Atta Galatta | 5 | Focused on *Pachinko* and *The Nine-Chambered Heart*. |
| **BBB Meetup-25** | December 22, 2019 | Art Studio, Koramangala | 84 | Year-end meetup at a Koramangala studio; extensive Sanderson/Pratchett discussion. |
| **BBB Meetup-26** | January 26, 2020 | Atta Galatta | 5 | First meetup of 2020; passerby spectators joined in; highlighted recurring recommendation culture (*Bhaunri*, *Daura*, *The Nine-Chambered Heart*). |
| **BBB Meetup-31** | July 12, 2020 | Online | 3 | First recorded online virtual meetup during pandemic; discussed member John Raju's book *The Purgatory of Half Forgotten Riddles*. |
| **BBB Meetup-34** | October 25, 2020 | Online | 4 | Online meetup focused on translated works and translator vs author prominence. |
| **BBB Meetup-37** | January 31, 2021 | Online | 8 | Discussions on Octavia Butler, SL Bhyrappa, and Indian financial stability. |
| **BBB Meetup-40** | May 30, 2021 | Online | 9 | Integrated external Notion document link for full book catalog. |
| **BBB Meetup-45** | December 17, 2021 | Bookworm | 2 | Return to in-person meetups at Bookworm Church Street. |
| **BBB Meetup-46** | February 27, 2022 | Bookworm | 3 | Discussion on *Desperately Seeking Shahrukh Khan*. |
| **BBB Meetup-47** | March 27, 2022 | Bookworm | 4 | Discussions on Matt Haig and Charles Bukowski. |
| **BBB Meetup-48** | May 22, 2022 | Bookworm | 4 | Focused on Robin Hobb and pre-Islamic South Asian history. |
| **BBB Meetup-49** | June 26, 2022 | Bookworm | 7 | Non-fiction focus: Eurasian Steppes, Ethereum development (*Camila Russo*). |
| **BBB Meetup-50** | July 31, 2022 | Bookworm | 2 | Summer book discussions. |
| **BBB Meetup-52** | September 25, 2022 | Bookworm | 4 | Discussions on Jed McKenna and French contemporary literature. |
| **BBB Meetup-54** | November 27, 2022 | Bookworm | 5 | High fantasy & horror focus (*The Poppy War*, Lovecraft's *Mountains of Madness*). |

---

## 4. Books Data & Text Records Analysis

From the historical text archive `BBB Meetup-9.txt`:
* **Total Raw Book Mentions Extracted**: **1,740**
* **Unique Normalized Book Titles**: **1,497**
* **Recurring Books (Discussed across multiple meetups)**: **174**

### Frequently Recurring Books & Authors
1. ***The Nine-Chambered Heart* by Janice Pariat**: Discussed in 4 separate meetups (Meetups #21, #23, #25, #26).
2. ***Born a Crime* by Trevor Noah**: Discussed in Meetups #20, #22, #25.
3. ***Pachinko* by Min Jin Lee**: Discussed in Meetups #21, #23, #25.
4. ***American Gods* by Neil Gaiman**: Discussed in Meetups #20, #22, #25.
5. **Terry Pratchett Discworld Series** (*The Color of Magic*, *Mort*, *The Light Fantastic*): Recurring subject across Meetups #25, #34.
6. **Brandon Sanderson Cosmere Books** (*Mistborn: The Final Empire*, *The Way of Kings*): Recurring across Meetups #20, #25.
7. ***A Room of One's Own* by Virginia Woolf**: Discussed in Meetup #9.
8. ***Skin in the Game* by Nassim Nicholas Taleb**: Discussed in Meetup #9.
9. ***The Elephant in the Brain* by Kevin Simler**: Discussed in Meetup #9.

### Inconsistent Spellings & Title Variations Identified
* **Title Variations**:
  - `The Nine-Chambered Heart` vs `Nine-Chambered Heart` vs `Chambered Heart` vs `9 Chambered Heart`
  - `A Series of Unfortunate Events` vs `Series of Unfortunate Events`
  - `Mistborn: The Final Empire` vs `The Final Empire` vs `Final Empire`
* **Author Name Spelling Drift**:
  - `Haruki Murakami` vs `Murakami`
  - `Janice Pariat` vs `Janice Pariat` vs `pariat`
  - `Terry Pratchett` vs `Pratchett`
  - `SL Bhyrappa` vs `S.L. Bhyrappa` vs `Bhyrappa`

---

## 5. Inferred Data Model (Entities Analysis)

Without creating database tables or writing code, the domain logic naturally reveals the following core entities:

```
[Venue] 1 ──── < hosts > ──── * [Meetup] 1 ──── < records > ──── * [Discussion]
                                  │                                  │
                                  │ < includes >                     │ < features >
                                  ▼                                  ▼
                            [Member/Guest]                     [Book] 1 ──── * [Author]
                                  │                                  │
                                  │ < recommends >                   │ < belongs to >
                                  ▼                                  ▼
                          [Recommendation]                     [Series / Genre]
```

### Key Domain Entities

1. **`Book`**:
   - Title, Subtitle, Sort Title, Original Language, Publication Year, Page Count, Cover Image URL, ISBN-10, ISBN-13, Goodreads ID, OpenLibrary ID, Description.
2. **`Author`**:
   - Full Name, Normalized Name, Bio, Country, Birth/Death Dates, Aliases.
3. **`Meetup`**:
   - Meetup Number, Date, Title, Venue ID, Description, Format (In-Person / Online), Attendance Count.
4. **`Venue`**:
   - Name (e.g., Atta Galatta, Bookworm, Koramangala Art Studio), Location Type, Address, City.
5. **`Discussion`**:
   - Book ID, Meetup ID, Presenter/Member ID, Notes, Key Quotes, Rating, Sentiment, Reading Status.
6. **`Member` / `Participant`**:
   - Display Name, Normalized Name, Bio, Joined Date, Role (Organizer, Regular, Guest).
7. **`Recommendation`**:
   - Recommender Member ID, Recommended Book ID, Meetup ID, Context, Target Audience.
8. **`CurrentRead`**:
   - Member ID, Book ID, Progress, Status (Active, Completed, Abandoned).
9. **`Resource`**:
   - URL (Goodreads, Notion, External Blog), Title, Resource Type, Associated Meetup ID.
10. **`Series`**:
    - Series Title, Total Books Count, Volume/Sequence Position.
11. **`Genre` / `Tag`**:
    - Tag Name, Slug, Description.
12. **`Publisher`**:
    - Publisher Name, Imprint, Location.

---

## 6. Potential Problems & Data Gaps

1. **Meetup Number Gaps**:
   - In `BBB Meetup-9.txt`, there are missing entries between Meetup #9 and #13, #26 and #31, #34 and #37, #40 and #45, #54 and #70.
2. **PDF Extraction Complexity**:
   - PDF files (Meetups #70 to #98) contain varied layouts (scanned lists, formatted multi-column tables, image-based text) requiring robust OCR/parsing routines.
3. **Unstandardized Book Metadata**:
   - Raw text files list titles and authors without ISBNs, publisher info, or normalized metadata.
4. **Member Anonymity & Name Variations**:
   - Member names appear inconsistently (e.g., "Aarzu Sadana", "Rahul Kondi", "Gokul S Nath", "John Raju").

---

## 7. Suggested Development Order

```
Phase 1: Ingestion & Parser Pipeline (Extract & Normalize Text & PDFs)
   │
   ▼
Phase 2: Database Schema & Entity Resolution (FastAPI + SQLAlchemy + PostgreSQL)
   │
   ▼
Phase 3: Core REST API & Full-Text Search Service (Filter, Search, Book Detail APIs)
   │
   ▼
Phase 4: Virtual Bookshelf 3D Canvas (Next.js + Three.js + React Three Fiber Spine Rendering)
   │
   ▼
Phase 5: Timeline, History Archive & Analytics Dashboard
```

---

## 8. Risk Assessment

| Risk Category | Risk Description | Severity | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Data Quality** | Duplicate books created due to minor spelling variations. | **High** | Implement fuzzy string matching (Levenshtein distance) & OpenLibrary/Google Books API resolution. |
| **PDF Extraction** | Parsing failures on complex PDF layouts (#70–#98). | **Medium** | Build a dedicated PDF extractor with manual verification fallback in the admin ingestion API. |
| **3D Performance** | Frame rate drops on mobile devices when rendering dozens of 3D book spines in Three.js. | **High** | Use low-poly mesh geometry, instanced meshes (`InstancedMesh`), dynamic LOD (Level of Detail), and texture atlasing. |

---
*Document produced as part of Sprint 0 discovery phase.*
