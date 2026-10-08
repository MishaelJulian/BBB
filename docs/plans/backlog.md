# Backlog: optional closet features

Ideas carried over from the earlier Library Room (`archive/docs-v1/VirtualLibraryRoom.tsx` and its components in `frontend/src/components/library/`). The live closet (`CriterionBookCloset`) does not have them yet. All are optional; each one passes the rules in `docs/BBB_PRD_TRD.md` before it is built.

Measured on 2026-10-08 (development mode, median of 3 loads, same data): the live closet showed its first 50 spines in 6.8 s against 7.9 s, used 4,530 page elements against 7,056, and 57.6 MB of memory against 86.0 MB. It stays the base; these ideas are additions to it.

| # | Feature | Where it came from | Notes |
|---|---|---|---|
| 1 | A to Z index: jump straight to a letter | `AlphabetNav.tsx` | Needs a mapping from letter to closet section, since the closet pages 360 books at a time |
| 2 | "Most discussed volumes" shelf as a curated opening | `VirtualLibraryRoom.tsx` (Bay 1) | Uses `discussion_count`, already in the book list |
| 3 | Lighting moods: afternoon, candlelight, morning, midnight | `AmbientLighting.tsx` | The founders have tabled a separate discussion on lighting (PRD §2A); decide together |
| 4 | Mount shelves only when they scroll into view | `ShelfBay.tsx` (`IntersectionObserver`, 800 px margin) | Only useful if the closet moves from paging to scrolling |
| 5 | Hardcover book look: cloth texture, page block, pull-out | `Book3D.tsx` | Reference for the WebGL closet (PRD §18.1) |

When a feature ships, move it out of this table and record it in `docs/health/SESSION_LOG.md`.
