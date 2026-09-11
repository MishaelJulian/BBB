# BBB Library — Frontend Architecture

**Sprint 2.0 — Architecture Only**
**Version**: 1.0.0
**Date**: 2026-07-22

---

## Vision

This is not a dashboard.
This is not an admin panel.
This is not a CRUD application.

**It should feel like walking into a beautiful independent bookstore or museum.**

The BBB Library is a living archive of conversations, books, and readers. It honors the literary tradition of the Broke Bibliophiles of Bangalore — a community that has gathered since 2017 to discuss books, share recommendations, and build a collective reading history.

---

## Design Philosophy

### Museum Aesthetic

The design draws from:
- **Criterion Closet** — clean, typographic, product-focused
- **Apple Books** — elegant whitespace, content-first
- **Kinokuniya** — warm, inviting, book-centric
- **Minimal museum exhibitions** — restrained, focused, allowing content to breathe

### Core Principles

1. **Typography is the hero.** Every visual decision serves the text.
2. **Whitespace is sacred.** Content needs room to breathe.
3. **Warmth without decoration.** Elegant, not sterile. Inviting, not busy.
4. **The book is the artifact.** Every interaction honors the physical book.
5. **Progressive enhancement.** Start with text, layer in richness.

---

## Color Palette

### Primary Colors

```
--ink:        #1A1A1A    (primary text, headings)
--paper:      #FAF8F5    (background, warm off-white)
--accent:     #8B4513    (saddle brown — book spines, links)
--muted:      #6B6B6B    (secondary text, captions)
--rule:       #E5E0DB    (borders, dividers)
--highlight:  #F5E6D3    (hover states, subtle emphasis)
```

### Semantic Colors

```
--success:    #2D5A3D    (book available, confirmed)
--warning:    #8B6914    (pending, needs attention)
--error:      #8B2500    (errors, missing data)
--info:       #4A6B8A    (informational, links)
```

### Palette Rationale

- **--ink**: Not pure black. Slightly warm, like aged paper ink.
- **--paper**: Not pure white. Warm off-white, like quality book paper.
- **--accent**: Saddle brown. The color of leather bindings, wooden shelves, warm libraries.
- **--muted**: Warm gray. For secondary information that doesn't compete.
- **--rule**: Very subtle. Separation without visual noise.
- **--highlight**: Warm cream. For hover states and subtle emphasis.

---

## Typography Scale

### Font Stacks

```
display:   'Georgia', 'Times New Roman', 'Palatino Linotype', serif
body:      'Avenir Next', 'Segoe UI', 'Helvetica Neue', system-ui, sans-serif
mono:      'SF Mono', 'Cascadia Code', 'Consolas', monospace
```

### Type Scale

| Role | Size | Weight | Line Height | Tracking | Usage |
|------|------|--------|-------------|----------|-------|
| hero | 4rem | 700 | 1.1 | -0.02em | Homepage headline |
| h1 | 2.5rem | 700 | 1.2 | -0.01em | Page titles |
| h2 | 1.75rem | 600 | 1.3 | 0 | Section headers |
| h3 | 1.25rem | 600 | 1.4 | 0 | Subsection headers |
| h4 | 1rem | 600 | 1.5 | 0.01em | Card titles, labels |
| body | 1rem | 400 | 1.6 | 0 | Body text |
| small | 0.875rem | 400 | 1.5 | 0.01em | Captions, metadata |
| tiny | 0.75rem | 500 | 1.4 | 0.02em | Labels, tags |

### Typography Rules

- **Display and h1**: Always serif. Always tight tracking. Always sentence case.
- **Body**: Always sans-serif. Always regular weight. Always generous line height.
- **Never**: All-caps headings (except tiny labels). Never decorative fonts. Never script fonts.

---

## Spacing System

### Base Unit: 4px

All spacing derives from a 4px base unit.

```
--space-1:   0.25rem   (4px)
--space-2:   0.5rem    (8px)
--space-3:   0.75rem   (12px)
--space-4:   1rem      (16px)
--space-5:   1.25rem   (20px)
--space-6:   1.5rem    (24px)
--space-8:   2rem      (32px)
--space-10:  2.5rem    (40px)
--space-12:  3rem      (48px)
--space-16:  4rem      (64px)
--space-20:  5rem      (80px)
--space-24:  6rem      (96px)
```

### Spacing Rules

- **Section spacing**: space-16 (64px) between major sections
- **Component spacing**: space-8 (32px) between components
- **Internal padding**: space-6 (24px) for cards, space-4 (16px) for buttons
- **Inline spacing**: space-2 (8px) between related items
- **Tight spacing**: space-1 (4px) for closely related items

---

## Layout System

### Grid

```
Max width:    1280px
Columns:      12
Gutter:       24px (space-6)
Margin:       Auto (centered)
Breakpoints:
  mobile:     0-639px      (4 columns)
  tablet:     640-1023px   (8 columns)
  desktop:    1024px+      (12 columns)
```

### Page Layout

```
┌─────────────────────────────────────────────────┐
│ Navigation (sticky, 64px height)                │
├─────────────────────────────────────────────────┤
│                                                 │
│ Content Area (max-width: 1280px, centered)      │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ Hero / Page Header                         │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ Main Content                                │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
├─────────────────────────────────────────────────┤
│ Footer (border-top, muted)                      │
└─────────────────────────────────────────────────┘
```

---

## Routing Structure

```
/                           → Homepage
/library                    → Book catalog (grid/list)
/books/[id]                 → Book detail page
/meetups                    → Meetup timeline
/meetups/[id]               → Meetup detail page
/timeline                   → Visual timeline
/collections                → Curated collections
/collections/[slug]         → Collection detail
/about                      → About the archive
```

---

## Folder Structure

```
bbb-library/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Homepage
│   │   ├── library/
│   │   │   └── page.tsx        # Book catalog
│   │   ├── books/
│   │   │   └── [id]/
│   │   │       └── page.tsx    # Book detail
│   │   ├── meetups/
│   │   │   ├── page.tsx        # Meetup list
│   │   │   └── [id]/
│   │   │       └── page.tsx    # Meetup detail
│   │   ├── timeline/
│   │   │   └── page.tsx        # Visual timeline
│   │   ├── collections/
│   │   │   ├── page.tsx        # Collections index
│   │   │   └── [slug]/
│   │   │       └── page.tsx    # Collection detail
│   │   └── about/
│   │       └── page.tsx        # About page
│   │
│   ├── components/
│   │   ├── ui/                 # Base UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   └── ...
│   │   │
│   │   ├── layout/             # Layout components
│   │   │   ├── Navigation.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── PageHeader.tsx
│   │   │   └── Container.tsx
│   │   │
│   │   ├── book/               # Book-specific components
│   │   │   ├── BookCard.tsx
│   │   │   ├── BookGrid.tsx
│   │   │   ├── BookSpine.tsx
│   │   │   ├── BookDetail.tsx
│   │   │   └── BookCover.tsx
│   │   │
│   │   ├── meetup/             # Meetup-specific components
│   │   │   ├── MeetupCard.tsx
│   │   │   ├── MeetupTimeline.tsx
│   │   │   └── MeetupDetail.tsx
│   │   │
│   │   ├── collection/         # Collection components
│   │   │   ├── CollectionCard.tsx
│   │   │   └── CollectionGrid.tsx
│   │   │
│   │   ├── search/             # Search components
│   │   │   ├── SearchBar.tsx
│   │   │   ├── FilterPanel.tsx
│   │   │   └── CommandPalette.tsx
│   │   │
│   │   └── shared/             # Shared components
│   │       ├── StatCard.tsx
│   │       ├── ResourceList.tsx
│   │       ├── DiscussionTimeline.tsx
│   │       └── Navigation.tsx
│   │
│   ├── lib/                    # Utilities
│   │   ├── utils.ts
│   │   ├── constants.ts
│   │   └── cn.ts
│   │
│   ├── hooks/                  # Custom React hooks
│   │   ├── useSearch.ts
│   │   ├── useBooks.ts
│   │   └── useMeetups.ts
│   │
│   ├── types/                  # TypeScript types
│   │   ├── book.ts
│   │   ├── meetup.ts
│   │   ├── author.ts
│   │   └── collection.ts
│   │
│   └── data/                   # Static data (from backend)
│       ├── archive_manifest.json
│       ├── archive_statistics.json
│       └── timeline.json
│
├── public/
│   ├── fonts/                  # Self-hosted fonts (if needed)
│   └── images/
│       └── og-default.png
│
├── tailwind.config.ts
├── next.config.ts
├── tsconfig.json
└── package.json
```

---

## Component Hierarchy

### Homepage

```
Page
├── Navigation
├── Hero
│   ├── Headline (serif, large)
│   ├── Subheadline
│   └── Stats Row
│       ├── StatCard (Since 2017)
│       ├── StatCard (52 Meetups)
│       ├── StatCard (2,747 Books)
│       └── StatCard (144 Members)
├── FeaturedBooks
│   └── BookGrid
│       └── BookCard (×6)
├── LatestMeetups
│   └── MeetupTimeline
│       └── MeetupCard (×3)
├── CollectionsPreview
│   └── CollectionGrid
│       └── CollectionCard (×4)
└── Footer
```

### Library Page

```
Page
├── Navigation
├── PageHeader
│   ├── Title ("Library")
│   └── Subtitle ("2,747 canonical books")
├── SearchBar
├── FilterPanel
├── ViewToggle (Grid/List)
├── BookGrid or BookList
│   └── BookCard (paginated)
├── Pagination
└── Footer
```

### Book Detail Page

```
Page
├── Navigation
├── BookHero
│   ├── BookCover (large)
│   ├── BookInfo
│   │   ├── Title (serif, large)
│   │   ├── Author
│   │   ├── Publication metadata
│   │   └── Synopsis placeholder
│   └── BookActions
│       └── ResourceList (Goodreads, etc.)
├── BBBHistory
│   ├── SectionTitle ("BBB History")
│   ├── DiscussionTimeline
│   │   └── TimelineItem (×N)
│   └── RelatedMeetups
│       └── MeetupCard (×N)
├── MembersWhoRead
│   └── MemberList
│       └── MemberChip (×N)
├── Recommendations
│   └── BookGrid
│       └── BookCard (×N)
└── Footer
```

### Meetup Detail Page

```
Page
├── Navigation
├── MeetupHero
│   ├── MeetupNumber (#97)
│   ├── Date (28 June 2026)
│   ├── Venue (The Bookworm)
│   └── AttendeeCount
├── BooksDiscussed
│   ├── SectionTitle ("Books Discussed")
│   └── BookGrid
│       └── BookCard (×N)
├── GeneralDiscussion
│   ├── SectionTitle ("General Discussion")
│   └── BookGrid
│       └── BookCard (×N)
├── Resources
│   └── ResourceList
└── Footer
```

---

## State Management

### Approach: Server Components + URL State

Next.js 15 App Router with React Server Components. Minimize client-side state.

```
Server Components (default)
├── Data fetching in components
├── Static data from JSON files
└── No client state needed

Client Components (explicit)
├── SearchBar (input state)
├── FilterPanel (selection state)
├── ViewToggle (grid/list preference)
├── CommandPalette (open/close, search)
└── Modal (open/close)
```

### URL as State

- Search queries: `?q=pratchett`
- Filters: `?genre=fiction&year=2024`
- View mode: `?view=grid` or `?view=list`
- Pagination: `?page=2`

### Local Storage

- View mode preference
- Recently viewed books (last 10)

---

## API Integration Plan

### Phase 1: Static Data (Sprint 2.0-2.2)

Use JSON files from the backend directly:

```typescript
// src/data/archive_manifest.json
// src/data/archive_statistics.json
// src/data/timeline.json
```

### Phase 2: API Routes (Sprint 2.3)

Create Next.js API routes that serve the same data:

```
/api/books              → GET /api/books?search=&genre=&page=
/api/books/[id]         → GET /api/books/:id
/api/meetups            → GET /api/meetups?year=&venue=
/api/meetups/[id]       → GET /api/meetups/:id
/api/authors            → GET /api/authors?search=
/api/collections        → GET /api/collections
/api/search             → GET /api/search?q=&type=
```

### Phase 3: Database Connection (Future)

Connect API routes directly to SQLite database for dynamic queries.

---

## Responsive Strategy

### Breakpoints

```
Mobile:   0-639px     (4 columns, stacked layout)
Tablet:   640-1023px  (8 columns, 2-column layouts)
Desktop:  1024px+     (12 columns, full layout)
```

### Mobile-First Approach

1. Design for mobile first
2. Enhance for tablet
3. Polish for desktop

### Key Responsive Patterns

- **Navigation**: Hamburger on mobile, horizontal on desktop
- **Book Grid**: 2 columns → 3 columns → 4 columns
- **Book Detail**: Stacked → side-by-side
- **Meetup Timeline**: Single column → timeline with branches

---

## Design Token System

### CSS Variables (Tailwind Config)

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1A1A1A',
        paper: '#FAF8F5',
        accent: '#8B4513',
        muted: '#6B6B6B',
        rule: '#E5E0DB',
        highlight: '#F5E6D3',
      },
      fontFamily: {
        display: ['Georgia', 'Times New Roman', 'Palatino Linotype', 'serif'],
        body: ['Avenir Next', 'Segoe UI', 'Helvetica Neue', 'system-ui', 'sans-serif'],
        mono: ['SF Mono', 'Cascadia Code', 'Consolas', 'monospace'],
      },
      fontSize: {
        'hero': ['4rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'h1': ['2.5rem', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '700' }],
        'h2': ['1.75rem', { lineHeight: '1.3', fontWeight: '600' }],
        'h3': ['1.25rem', { lineHeight: '1.4', fontWeight: '600' }],
        'h4': ['1rem', { lineHeight: '1.5', letterSpacing: '0.01em', fontWeight: '600' }],
        'body': ['1rem', { lineHeight: '1.6' }],
        'small': ['0.875rem', { lineHeight: '1.5', letterSpacing: '0.01em' }],
        'tiny': ['0.75rem', { lineHeight: '1.4', letterSpacing: '0.02em', fontWeight: '500' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      maxWidth: {
        'library': '1280px',
      },
    },
  },
  plugins: [],
}
export default config
```

---

## Animation Strategy

### Principles

1. **Purposeful motion.** Every animation serves a function.
2. **Subtle and swift.** 150-300ms duration. Ease-in-out.
3. **Respect preferences.** Always check `prefers-reduced-motion`.
4. **One signature moment.** Homepage hero entrance. Everything else is quiet.

### Approved Animations

- **Page transitions**: Fade in content (200ms)
- **Hover states**: Subtle scale (1.02) or color shift
- **Scroll reveals**: Content fades up as it enters viewport
- **Command palette**: Slide down from top (200ms)
- **Book hover**: Subtle shadow lift (200ms)

### Forbidden Animations

- No parallax scrolling
- No 3D transforms
- No book spinning/flipping
- No particle effects
- No continuous animations

---

## Accessibility

### Requirements

- All interactive elements keyboard accessible
- Focus visible states on all focusable elements
- Color contrast ≥ 4.5:1 for body text
- Color contrast ≥ 3:1 for large text
- Alt text on all images
- Semantic HTML throughout
- Skip navigation link
- Reduced motion support

### ARIA Patterns

- Navigation: `role="navigation"` with `aria-label`
- Search: `role="search"` with `aria-label`
- Book grid: `role="list"` with `role="listitem"`
- Modals: `role="dialog"` with `aria-modal="true"`

---

## Performance Budget

### Targets

- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1
- **First Input Delay**: < 100ms

### Optimization Strategies

- Static generation for book pages
- Image optimization with Next.js Image
- Font subsetting (if using web fonts)
- Code splitting by route
- Prefetching on hover

---

## File Naming Conventions

```
Components:     PascalCase.tsx (BookCard.tsx)
Hooks:          camelCase.ts (useSearch.ts)
Types:          PascalCase.ts (Book.ts)
Utilities:      camelCase.ts (utils.ts)
Constants:      UPPER_SNAKE_CASE.ts (MAX_BOOKS_PER_PAGE.ts)
Pages:          page.tsx (Next.js convention)
```

---

## Next Steps

### Sprint 2.1: Layout & Design System
- Set up Next.js project
- Configure Tailwind with design tokens
- Build base UI components (Button, Input, Modal)
- Build layout components (Navigation, Footer, Container)
- Establish typography and color in code

### Sprint 2.2: Core Pages
- Homepage with hero and stats
- Library page with grid/list views
- Book detail page structure
- Meetup detail page structure

### Sprint 2.3: Data Integration
- Connect to backend JSON files
- Implement search and filtering
- Add pagination
- Build API routes

### Sprint 2.4: Criterion Bookshelf
- Interactive bookshelf visualization
- Book spine rendering
- Shelf organization

### Sprint 2.5: Animations & Polish
- Page transitions
- Scroll reveals
- Hover effects
- Performance optimization

---

## Appendix: Data Schema

### Book

```typescript
interface Book {
  id: string
  title: string
  normalized_title: string
  author?: {
    id: string
    name: string
  }
  discussion_count: number
  meetups: MeetupReference[]
  members: MemberReference[]
  resources: Resource[]
  created_at: string
}
```

### Meetup

```typescript
interface Meetup {
  id: string
  meetup_number: number
  date: string
  venue?: {
    id: string
    name: string
  }
  format: 'IN_PERSON' | 'ONLINE'
  books_discussed: BookReference[]
  discussion_mentions: BookReference[]
  members: MemberReference[]
  resources: Resource[]
}
```

### Collection

```typescript
interface Collection {
  slug: string
  title: string
  description: string
  books: BookReference[]
  created_at: string
}
```

---

*This architecture document is the source of truth for BBB Library frontend development.*
*All implementation decisions should trace back to this document.*
