# v1.0 — BBB Digital Library

**Release Date**: 2026-07-22
**Status**: Visual Design Locked

---

## What This Is

A living digital archive of the Broke Bibliophiles of Bangalore — a book club that has gathered since 2017 to discuss literature, share recommendations, and build a collective reading history.

This is not a website. It is a digital institution.

---

## What We Built

### Archive Backend (v1.0.0)
- 52 recovered meetup records
- 2,747 canonical books
- 1,333 authors
- 146 members
- 2,538 discussions
- 542 resources
- 31 source files (TXT + PDF)
- Three-layer archival model with full provenance

### Frontend Library
- **Homepage** — Introduction with archive statistics
- **Library** — Grid/list views with search, filters, sorting
- **Library Room** — 3D bookshelf experience with CSS transforms
- **Book Detail** — Full archive record with discussion timeline
- **Meetup Pages** — Chronological record with books and members
- **Command Palette** — Keyboard-accessible search (⌘K)

### Design System
- Museum-quality aesthetic
- Library-inspired color palette
- Hardcover book design with cloth texture
- Walnut wood shelves with brass brackets
- Ambient lighting system (morning/afternoon/evening)

---

## Visual Design: LOCKED

From this point forward, no new visual features.

Every new feature must answer: **Does it make the archive richer?**

Not: Does it make it prettier?

---

## Technical Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Framer Motion
- SQLite (via better-sqlite3)
- CSS 3D Transforms

---

## Repository Structure

```
bbb/
├── frontend/          # Next.js application
│   ├── src/
│   │   ├── app/       # Routes
│   │   ├── components/
│   │   │   ├── ui/    # Base components
│   │   │   ├── layout/
│   │   │   ├── book/
│   │   │   ├── library/  # 3D bookshelf
│   │   │   ├── meetup/
│   │   │   └── search/
│   │   ├── lib/       # Utilities
│   │   ├── types/     # TypeScript types
│   │   └── data/      # Archive adapters
│   └── public/
├── app/               # Backend parsers
├── tests/             # Parser tests
└── book_club_archivist.db  # SQLite archive
```

---

## Known Limitations

1. No author pages yet
2. No book relationship graph
3. No member reading histories
4. Natural language search not implemented
5. No curated digital exhibits
6. No timeline narrative

These are intentionally deferred. They are **content richness** features, not visual features.

---

## What Comes Next

Phase 4: **The Living Archive**

Focus shifts from visual polish to scholarly depth:

1. Author pages with complete BBB history
2. Book relationship graph (based on BBB reading patterns)
3. Member reading journeys
4. Discussion analytics
5. Timeline as narrative story
6. Curated digital exhibits
7. Natural language archive search

---

## How to Run

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

---

## Acknowledgments

Built for the Broke Bibliophiles of Bangalore — a community that has proven that a book club can become a cultural institution.

---

*This release freezes the visual design. All future work expands the archive itself.*
