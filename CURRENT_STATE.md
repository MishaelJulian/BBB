# CURRENT_STATE.md — BBB Digital Library State Machine

**Project:** Broke Bibliophiles Bangalore (BBB) Digital Library  
**Date:** 2026-08-23  
**Status:** Active Continuation  
**Primary Agent:** Antigravity CLI  

---

## 1. Project Identity & Canon
BBB Digital Library is an archival reading room experience for the Broke Bibliophiles of Bangalore book club. The physical-looking 3D Library Room is the primary interface (P0) for exploring the living history of BBB's discussions, members, meetups, and books.

---

## 2. Verified Database Statistics
Database: `book_club_archivist.db` (SQLite)

| Entity | Verified Count |
|---|---:|
| Canonical Books | 2,747 |
| Imported Book Records | 3,554 |
| Recovered Meetups | 52 |
| Discussions | 2,538 |
| Members | 146 |
| Authors | 1,333 |
| Venues | 4 |
| Resources | 542 |

---

## 3. Architecture & Data Flow
```text
SQLite (book_club_archivist.db)
   ↓
SQLAlchemy Models (app.database.models)
   ↓
FastAPI REST API (app.api.main:app, port 8000)
   ↓
Next.js 15 App Router Frontend (frontend/, port 3000)
   ├── /library-room (P0 3D Spatial Browsing Room)
   ├── /library (Grid & Filter Archive View)
   ├── /books/[id] (Full Canonical Archival Record)
   ├── /meetups (Meetup Archive & Details)
   ├── /timeline (Chronological History)
   └── /collections (Curated Book Lists)
```

---

## 4. Current Working Features
- [x] Authoritative SQLite archive with all canonical relationships.
- [x] FastAPI REST API endpoints (`/stats`, `/books`, `/books/{id}`, `/meetups`, `/meetups/{id}`, `/search`, `/health`).
- [x] Museum-quality visual design system (warm paper, dark ink, walnut wood grain, brass fixtures).
- [x] 3D CSS Hardcover Book volume rendering (`Book3D.tsx`).
- [x] 3D Walnut Shelf with horizontal scrolling, depth, and ambient lighting (`Shelf3D.tsx`).
- [x] Reading Table component (`ReadingTable.tsx`).
- [x] Book Detail page at `/books/[id]` with discussion timeline and readers.
- [x] Build error fixed (`LightingMode` export).

---

## 5. P0 Priority Status: IMPLEMENTED & VERIFIED
**The Signature Physical Pull-Out & In-Room Archival Inspection Experience:**
```text
3D SHELF
   ↓
Hover book (subtle lift & highlight + tooltip)
   ↓
Click / select book
   ↓
Hardcover physically pulls out of the shelf (y = -32px, rotateY = -18deg, scale = 1.06)
   ↓
Shelf compresses & neighboring books part slightly (+/- 5px displacement)
   ↓
Book transitions to active inspection volume on Reading Table
   ↓
Reading Table reveals live archive data (BBB readers, meetups, dates, discussion count)
   ↓
[Return to Shelf] OR [Examine Full Archive Record (/books/[id])]
```

---

## 6. P1 Priority Status: IMPLEMENTED & VERIFIED
**Library Room Explorability & 2,747-Book Viewport-Aware Performance:**
- [x] **Spatial Alphabet Navigation:** Refined index markers (A–Z, #) with literary serif typography, warm amber focus, and active section scroll-spy tracking.
- [x] **Scroll Focus Alignment:** Added `scroll-mt-36` to ensure jumping to any alphabetical section aligns seamlessly below the sticky catalog bar.
- [x] **Editorial Shelf Ranges:** Dynamically computes and displays the alphabetical span (e.g. `From "Machiavelli" to "Murdoch" · 184 volumes`) with restrained museum brass styling.
- [x] **Viewport-Aware Performance:** Implemented `IntersectionObserver` with generous root margin (`600px 0px`) inside `Shelf3D.tsx`. Off-screen shelves render lightweight physical placeholders; interactive `Book3D` instances are mounted on demand. Reduces active Framer Motion spring listeners by ~90% while preserving the complete 2,747-volume physical room.

---

## 7. P2 Priority Status: IMPLEMENTED & VERIFIED
**Deep Archival Cross-Linking & Living Relational Exploration:**
- [x] **Backend Archival Endpoints:**
  - `GET /members` (Member directory with aggregated discussion/meetup metrics)
  - `GET /members/{member_id}` (Comprehensive archival dossier with books brought and meetups attended)
  - `GET /authors/{author_id}` (Author archive record with all canonical volumes in the BBB collection)
- [x] **Frontend Archival Experiences:**
  - `/members` (Archival Readers Directory with search and sorting)
  - `/members/[id]` (Reader Dossier with chronological book discussion timeline and meetup history)
  - `/authors/[id]` (Author Archive Record showcasing all BBB volumes and discussion frequency)
- [x] **Cross-Linking Navigation Web:**
  - `ReadingTable.tsx` → Clickable Author (`/authors/[id]`) and Readers (`/members/[id]`), plus Meetups (`/meetups/[number]`).
  - `/books/[id]` → Clickable Author (`/authors/[id]`) and Readers (`/members/[id]`).
  - `/meetups/[id]` → Clickable Attendees (`/members/[id]`) and Books (`/books/[id]`).
  - `/members/[id]` → Clickable Books (`/books/[id]`), Authors (`/authors/[id]`), and Meetups (`/meetups/[number]`).

---

## 8. P3 Priority Status: IMPLEMENTED & VERIFIED
**Spatial Bidirectionality & Reverse Archival Deep-Linking:**
- [x] **Universal Spatial Deep-Linking (`/library-room?select=<id>`):**
  - Robust query parameter parser wrapped in `React.Suspense`.
  - Automatic alphabetical section resolution (`section = title[0]`).
  - Smooth vertical room focus (`scrollIntoView` to target section with `scroll-mt-36` alignment).
- [x] **Lazy Mounting Bypass for Target Shelves:**
  - `Shelf3D` forces `isInViewport = true` when containing `selectedBookId`, ensuring the target shelf mounts full interactive `Book3D` instances even when arriving from external pages far off-screen.
- [x] **Horizontal Auto-Scroll in `Shelf3D`:**
  - When `selectedBookId` is resolved, `Shelf3D` scrolls horizontally (`scrollLeft = selectedIndex * 40 - 100`) to place the extracted hardcover directly in view.
- [x] **Bidirectional Spatial Entrypoints:**
  - `/books/[id]` → Prominent *"View on 3D Shelf →"* action button.
  - `/members/[id]` → *"Locate in Library →"* action on every book in the reader's journey.
  - `/authors/[id]` → *"Locate in Library →"* action on every canonical bibliography entry.
  - `/meetups/[id]` → *"Locate in Library →"* action on every discussed volume.
  - `/library` → *"3D Shelf →"* action on all list and grid catalog cards.

---

## 9. Performance & Verification Metrics
- **Build Status:** `npm run build` exits code `0` (all 10 static & dynamic routes compiled).
- **Relational Integrity:** 100% verified real database records across all 2,747 books, 146 members, 52 meetups, and 1,333 authors.
- **P0 Physical Room Continuity:** Physical pull-out, shelf compression, and Reading Table return actions completely preserved.

---

## 10. Active Route Directory
- `○ /` (Home)
- `○ /_not-found` (404)
- `○ /library-room` (P0 3D Spatial Browsing Room & Deep-Link Destination)
- `○ /library` (Grid & Filter Archive with 3D Shelf Links)
- `ƒ /books/[id]` (Canonical Book Archival Record with 3D Shelf Action)
- `○ /meetups` (Meetup Archive Timeline)
- `ƒ /meetups/[id]` (Meetup Event Detail with Spatial Links)
- `○ /members` (Readers Directory)
- `ƒ /members/[id]` (Archival Reader Dossier with Spatial Links)
- `ƒ /authors/[id]` (Author Archive Record with Spatial Links)

---

## 11. Strict Non-Negotiables & Rules
- **DO NOT TOUCH / RECREATE:** Database schema, canonical archive data, FastAPI contract.
- **DO NOT INVENT:** Any reader names, meetup dates, or book discussion relationships.
- **DO NOT REPLACE:** Existing CSS 3D + Framer Motion architecture with Three.js/WebGL.
- **CONTINUE, EXTEND, DO NOT RESTART.**
