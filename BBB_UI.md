# BBB LIBRARY --- UI & EXPERIENCE CONSTITUTION {#bbb-library--ui--experience-constitution}

**Version:** 1.0\
**Project:** Broke Bibliophiles of Bangalore Library

------------------------------------------------------------------------

## 1. DESIGN INTENT {#1-design-intent}

BBB Library should feel less like a website and more like entering a
carefully kept literary archive.

The interface should communicate:

``` text
books
people
memory
conversation
place
time
```

Technology should support the archive, not compete with it.

The **3D Library Room is the primary visual experience.**

------------------------------------------------------------------------

## 2. CORE EXPERIENCE {#2-core-experience}

The primary journey is:

``` text
Landing
  ↓
Enter the Library
  ↓
3D Library Room
  ↓
Browse real books
  ↓
Take a book from the shelf
  ↓
Discover its history
```

If development time is limited:

``` text
3D Room > Book interaction > Book history > Catalogue > Secondary pages
```

------------------------------------------------------------------------

## 3. THE 3D LIBRARY ROOM {#3-the-3d-library-room}

The room should feel like a real place.

It should contain:

-   shelves;
-   many books;
-   varied book spines;
-   spatial depth;
-   calm lighting;
-   clear navigation;
-   subtle environmental details;
-   a strong sense of collection.

It must not feel like:

-   a generic 3D showroom;
-   an empty game lobby;
-   a decorative hero animation;
-   a room containing only a few oversized books.

**The books are the content.**

------------------------------------------------------------------------

## 4. BOOKS AS OBJECTS {#4-books-as-objects}

Books should visually behave like physical objects.

Use subtle variation in:

-   spine width;
-   height;
-   rotation;
-   placement;
-   grouping.

Readable spine text is valuable where technically practical.

Do not randomize so aggressively that book identity is lost.

Every displayed book remains selectable.

------------------------------------------------------------------------

## 5. REAL BOOK IDENTITY {#5-real-book-identity}

Every rendered book maps to a real canonical record:

``` text
3D_BOOK_INSTANCE
    ↓
bookId
    ↓
API
    ↓
BOOK
    ↓
HISTORY
```

The visual layer and data layer must never become disconnected.

------------------------------------------------------------------------

## 6. TAKING A BOOK {#6-taking-a-book}

Taking a book is a signature interaction.

It should communicate:

``` text
I found something
      ↓
I am taking it from the archive
      ↓
I am discovering its story
```

Preferred sequence:

1.  focus/select book;
2.  subtle highlight;
3.  activate;
4.  book moves out of shelf;
5.  brief physical/camera transition;
6.  book information appears;
7.  archival history becomes the focus.

Animation must be short and purposeful.

Never make the user wait through a long cinematic sequence.

------------------------------------------------------------------------

## 7. BOOK DETAIL {#7-book-detail}

Book detail should feel like an **archival record**, not an ecommerce
product page.

Prioritize:

### Book identity

-   title;
-   author;
-   cover/spine representation.

### BBB history

-   people associated with the book;
-   meetup number;
-   date;
-   discussion/recommendation context;
-   other occurrences.

### Context

If the same book appears at multiple meetups, show that history.

Example:

``` text
THE BOOK

A Visit from the Goon Squad
Jennifer Egan

BBB HISTORY

Meet #95
26 April 2026
Discussed by Bharath

Meet #...
...
```

Do not collapse meaningful occurrences into a generic popularity label.

------------------------------------------------------------------------

## 8. PEOPLE ARE PART OF THE ARCHIVE {#8-people-are-part-of-the-archive}

BBB is not just a collection of books.

It is a collection of people discussing books.

Where data exists, relationships should be discoverable:

``` text
Book
  ↕
Person
  ↕
Meetup
```

The user should be able to understand:

> Who brought this book into the BBB conversation?

------------------------------------------------------------------------

## 9. ARCHIVAL VISUAL LANGUAGE {#9-archival-visual-language}

Useful references include:

-   libraries;
-   printed matter;
-   catalogues;
-   editorial publishing;
-   archival documents;
-   marginalia;
-   paper;
-   shelves;
-   index cards;
-   bookplates.

Use these cues subtly.

Do not turn the entire interface into literal skeuomorphism.

------------------------------------------------------------------------

## 10. TYPOGRAPHY {#10-typography}

Typography is central.

Prefer an editorial hierarchy:

``` text
serif/display
→ titles and major headings

clean readable text
→ navigation, metadata and controls
```

Book titles should have authority.

Avoid a visual language resembling:

-   fintech dashboards;
-   admin panels;
-   generic startup SaaS;
-   AI-product templates.

Do not change the established global font system without human approval.

------------------------------------------------------------------------

## 11. COLOR {#11-color}

The palette should feel like an archive/library.

Prefer:

-   warm paper/off-white surfaces;
-   dark ink;
-   restrained accent color;
-   quiet neutrals.

Avoid:

-   neon;
-   purple/blue AI gradients;
-   glowing effects;
-   excessive saturation.

Do not introduce a new global palette without approval.

------------------------------------------------------------------------

## 12. SPACING {#12-spacing}

Whitespace should create calm.

Avoid:

-   cramped layouts;
-   excessive cards;
-   giant empty marketing sections;
-   decorative blocks without purpose.

------------------------------------------------------------------------

## 13. NAVIGATION {#13-navigation}

Keep primary navigation simple.

Core areas:

``` text
Library
The Room
Meetups
Timeline
Collections
About
```

The 3D Library Room must remain easy to reach.

Do not bury it.

------------------------------------------------------------------------

## 14. SECONDARY PAGES {#14-secondary-pages}

### Library

Structured catalogue for:

-   search;
-   sorting;
-   alphabetical browsing;
-   filters;
-   quick discovery.

It is a secondary interface to the same archive.

### Meetups

Chronological BBB meetup archive.

### Timeline

History of BBB through meetings and books.

### Collections

Curated relationships between books.

### About

Explain BBB and the purpose of the digital archive.

Every secondary page should reinforce the main archive.

------------------------------------------------------------------------

## 15. SEARCH {#15-search}

Search should feel like searching an archive.

Where the API/data model supports it, search by:

-   title;
-   author;
-   person;
-   meetup;
-   relevant metadata.

Do not invent search capabilities without inspecting the existing
backend.

------------------------------------------------------------------------

## 16. LOADING {#16-loading}

For catalogue/API views:

``` text
loading
→ restrained skeleton or text state
```

For the 3D room:

``` text
preparing the library
→ scene loading
→ room available
```

Avoid generic spinners everywhere.

------------------------------------------------------------------------

## 17. ERROR STATES {#17-error-states}

Errors should preserve the sense of place.

Example:

``` text
The archive record could not be opened.

The Library Room is still available.

Try again.
```

Never turn an API failure into a completely blank experience if other
parts can remain usable.

------------------------------------------------------------------------

## 18. MOTION {#18-motion}

Motion should communicate:

-   spatial relationship;
-   selection;
-   discovery;
-   feedback;
-   transitions.

Good:

-   book pulling from shelf;
-   camera transition;
-   subtle focus;
-   panel reveal;
-   room → archive-record transition.

Bad:

-   constant floating;
-   excessive parallax;
-   bouncing controls;
-   spinning decorations;
-   animation on everything.

Respect reduced-motion preferences.

------------------------------------------------------------------------

## 19. 3D PERFORMANCE {#19-3d-performance}

The room should feel rich because of:

``` text
composition
+
quantity of books
+
real book identity
+
spatial interaction
```

not expensive effects.

Prefer:

-   low-poly geometry;
-   efficient book meshes;
-   instancing;
-   texture reuse;
-   culling;
-   simple lighting;
-   restrained post-processing.

------------------------------------------------------------------------

## 20. RESPONSIVE FALLBACK {#20-responsive-fallback}

The 3D room is the ideal experience, but the archive must remain
accessible.

If a device cannot reasonably support the 3D scene:

``` text
3D Room
   ↓
graceful fallback
   ↓
2D shelf/catalogue
```

The fallback must preserve:

``` text
book
→ selection
→ history
```

A user should never lose access to the archive merely because their
device cannot render the ideal room.

------------------------------------------------------------------------

## 21. ACCESSIBILITY {#21-accessibility}

Interactive elements should have:

-   keyboard access where applicable;
-   visible focus;
-   meaningful labels;
-   readable contrast;
-   sensible touch targets.

3D interaction must have a non-3D route to the same information.

A user must never need to successfully manipulate a 3D scene merely to
learn a book\'s history.

------------------------------------------------------------------------

## 22. NO GENERIC AI DESIGN {#22-no-generic-ai-design}

Visual failures include:

-   generic purple AI landing page;
-   huge gradient hero;
-   excessive rounded cards;
-   glassmorphism;
-   glowing cards;
-   random 3D blobs;
-   AI robot imagery;
-   meaningless dashboards;
-   excessive pills;
-   emoji as primary UI;
-   \"AI Magic\" buttons;
-   template-looking layouts.

The product should feel authored.

------------------------------------------------------------------------

## 23. COMPONENT CONSISTENCY {#23-component-consistency}

Before creating a component:

1.  search existing components;
2.  inspect their usages;
3.  reuse when possible;
4.  extend only when justified;
5.  create a new component only when necessary.

Do not create:

-   a second button system;
-   a second modal system;
-   a second navigation system;
-   a second typography system;
-   a second card system.

------------------------------------------------------------------------

## 24. DESIGN DRIFT {#24-design-drift}

Do not casually introduce:

-   new colors;
-   new fonts;
-   new radii;
-   new shadows;
-   new button styles;
-   new spacing scales;
-   new navigation patterns.

Consistency matters more than novelty.

------------------------------------------------------------------------

## 25. HUMAN APPROVAL REQUIRED {#25-human-approval-required}

Ask before changing:

-   global typography;
-   core palette;
-   global spacing;
-   global radii;
-   navigation architecture;
-   fundamental 3D-room visual identity;
-   fundamental book interaction;
-   relationship between the room and archive.

Agents may propose changes but must not silently redefine the product.

------------------------------------------------------------------------

## 26. UI COMPLETION CHECKLIST {#26-ui-completion-checklist}

### Core

-   [ ] Does this strengthen the archive?
-   [ ] Does it preserve 3D Library Room priority?
-   [ ] Does it preserve book → history?

### Visual

-   [ ] Literary/editorial feel
-   [ ] Strong typography
-   [ ] Calm spacing
-   [ ] Restrained visual language
-   [ ] No AI-slop aesthetics

### Interaction

-   [ ] Interaction works
-   [ ] Loading state exists
-   [ ] Error state exists
-   [ ] Book connects to real data
-   [ ] Navigation remains clear

### Performance

-   [ ] No unnecessary 3D complexity
-   [ ] No unnecessary data loading
-   [ ] Room remains usable with many books

------------------------------------------------------------------------

## 27. GOLDEN UI RULE {#27-golden-ui-rule}

The interface should make the user feel:

> **"I am walking into BBB\'s memory."**

Not:

> "I am using another AI-generated website."

**The books are the interface.\
The people are the history.\
The 3D room is the doorway.**
