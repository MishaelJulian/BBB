<!-- Corrected 2026-10-09: component tree (Hero, BookGrid, BookCard are dead code, see docs/health/pattern_review_analysis.md D-items; spines are ClosetSpine, 360 per section) -->
<!-- Generated: 2026-10-09 | Commit: 9ee6c4d | Files scanned: 54 -->

# Frontend Codemap

**Last Updated:** 2026-10-09

## Summary

Next.js 15 + React 19 single-page app. 10 pages under `app/`, 44 components, 10 unreachable library components. All API calls through `lib/api.ts` (single client). Tailwind CSS + Framer Motion. No auth, no state management beyond React hooks. Rewrites `/api/:path*` to backend via `next.config.ts`.

## Route Tree

```
frontend/src/app/
├── layout.tsx              ← Root layout (SiteShell)
├── page.tsx                ← / (home)
├── library/
│   └── page.tsx            ← /library → redirects to /library-room
├── library-room/
│   └── page.tsx            ← /library-room (CriterionBookCloset, main UI)
├── books/
│   └── [id]/page.tsx       ← /books/[id] (detail page)
├── meetups/
│   ├── page.tsx            ← /meetups (list, 53 meetings)
│   └── [id]/page.tsx       ← /meetups/[id] (detail page)
├── members/
│   ├── page.tsx            ← /members (list, 174 members)
│   └── [id]/page.tsx       ← /members/[id] (detail page)
├── authors/
│   └── [id]/page.tsx       ← /authors/[id] (author profile)
└── admin/
    └── page.tsx            ← /admin (admin UI for photo, PDF, book edit)
```

**Redirects:** `/library` → `/library-room` (permanent, via next.config.ts).

## Key Pages & Components

### Home Page (`app/page.tsx`)

- Renders `Hero` component
- Link to `/library-room`

### Library Room (`app/library-room/page.tsx`): Main UI

- Renders `CriterionBookCloset` component
- Loads books: GET `/api/books?limit=3000&only_discussed=true&exclude_general=true` (2,018 books, 2.1 MB)
- Query params: `?select=<book_id>` (opens one book), `?meetup=<number>` (shelves one meetup)
- 18 shelves of 360 books each (3 shelves per page, Prev/Next paging)
- Spines click to open `CriterionDetailModal`
- **Issue:** spines not keyboard-reachable (report_insights.md §10.4)

### Book Detail (`app/books/[id]/page.tsx`)

- Calls GET `/api/books/{id}`, GET `/api/books/{id}/synopsis`
- Shows cover, title, author, synopsis, rating, page count
- Lists all discussions (meetups where discussed)
- Links to author profile

### Meetup Detail (`app/meetups/[id]/page.tsx`)

- Calls GET `/api/meetups/{id}`
- Shows date, venue, attendance, photo
- Lists all books discussed
- Shows resources (links)

### Admin Page (`app/admin/page.tsx`)

- Upload meetup photo (4.5 MB cap)
- Generate/download meetup PDF
- Edit book metadata (title, author, isbn, cover_url)
- Add books to meetup
- Toggle discussion type (book/general)

## Component Hierarchy

```
SiteShell
├── Navigation         ← header + search bar
├── <page content>
│   ├── CriterionBookCloset   ← holds all 2,018 books in state
│   │   ├── ShelfWall (x3 per section)
│   │   │   └── ClosetSpine (up to 120 per shelf, 360 per section)
│   │   └── CriterionDetailModal  ← pulled-book card
│   ├── MeetupCard     ← meetup list item
│   ├── Container      ← max-width wrapper
│   ├── Section        ← styled section
│   ├── PageHeader     ← title + breadcrumbs
│   ├── EmptyState     ← no results
│   ├── ErrorState     ← error message
│   ├── LoadingState   ← spinner
│   ├── PageSkeleton   ← skeleton loading
│   ├── ResourceList   ← external links
│   ├── StatCard       ← metrics
│   ├── CommandPalette ← search modal (Cmd+K)
│   ├── FilterPanel    ← search filters
│   ├── SearchBar      ← search input
│   ├── Button         ← radix-ui styled
│   ├── Input          ← form input
│   ├── Modal          ← radix-ui dialog
│   ├── Card           ← container
│   ├── Badge          ← tag/label
│   ├── Divider        ← hr
│   ├── Skeleton       ← loading placeholder
│   ├── ViewToggle     ← list/grid toggle
│   ├── BookAutocompleteInput ← admin autocomplete
│   └── MemberAutocompleteInput ← admin autocomplete
├── Footer
└── ErrorBoundary
```

## Unreachable Components (kept by founder choice)

Located at `frontend/src/components/library/` but not imported by any route:

1. `AlphabetNav.tsx`: Filter by first letter
2. `AmbientLighting.tsx`: 3D lighting effect
3. `BookCover.tsx`: 3D book cover render
4. `ClosetPicksTray.tsx`: Featured selections tray
5. `HeroBookModal.tsx`: Featured book showcase
6. `ReadingTable.tsx`: Reading progress table
7. `Shelf3D.tsx`: 3D shelf render
8. `Shelf.tsx`: 2D shelf (nothing imports)
9. `Book3D.tsx`: 3D book model (only `Shelf3D` imports)
10. `ShelfBay.tsx`: Shelf section (only `Shelf3D` imports)

All 10 stay until architectural decision on next UI version (Flow D).

## API Calls (via `lib/api.ts`)

| Page/Component | API Call | Params | Lines |
|---|---|---|---|
| library-room | GET `/api/books` | limit=3000, only_discussed=true, exclude_general=true | ~100 |
| books/[id] | GET `/api/books/{id}` |: |: |
| books/[id] | GET `/api/books/{id}/synopsis` |: |: |
| meetups | GET `/api/meetups` | limit=100, sort_by=date |: |
| meetups/[id] | GET `/api/meetups/{id}` |: |: |
| members | GET `/api/members` | limit=200 |: |
| members/[id] | GET `/api/members/{id}` |: |: |
| authors/[id] | GET `/api/authors/{id}` |: |: |
| search (Cmd+K) | GET `/api/search?q=...` | q (min 1 char) |: |
| admin (photo upload) | POST `/api/admin/meetups/{number}/photo` | FormData(file) |: |
| admin (PDF gen) | POST `/api/admin/meetups/{number}/generate-pdf` |: |: |
| admin (PDF download) | GET `/api/admin/meetups/{number}/pdf` |: |: |
| admin (book edit) | PUT `/api/admin/books/{id}` | JSON body |: |
| admin (add book) | POST `/api/admin/meetups/{number}/books` | JSON body |: |
| admin (book suggest) | GET `/api/books/suggest?q=...` | q (min 1 char) |: |
| admin (member suggest) | GET `/api/members/suggest?q=...` | q (min 1 char) |: |
| admin (resolve URL) | GET `/api/media/resolve-url?url=...` | url |: |

## Static Assets

- Fonts: `public/fonts/` (Tailwind default: system stack)
- Images: cover images served from `backend /assets/uploads/`
- Generated PDFs: from `backend /assets/generated_pdfs/`
- No bundled static images in frontend (all fetched from backend)

## Configuration

- `frontend/next.config.ts`: rewrites `/api/*` to backend; redirects `/library` to `/library-room`
- `frontend/tsconfig.json`: strict mode, paths
- `frontend/tailwind.config.ts`: custom colors, spacing
- Environment: `NEXT_PUBLIC_*` variables (frontend only), `BACKEND_INTERNAL_URL` (backend URL, default `localhost:8000`)

## Related Areas

- See `architecture.md` for system diagram and data flow
- See `backend.md` for API routes and handlers
- See `dependencies.md` for Next.js and React versions
- Full frontend at `frontend/src/`
