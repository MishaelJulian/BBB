# BBB LIBRARY --- AI AGENT & ENGINEERING RULES {#bbb-library--ai-agent--engineering-rules}

**Version:** 1.0\
**Project:** Broke Bibliophiles of Bangalore (BBB) Library\
**Status:** Existing partially-built application --- **CONTINUE, DO NOT
RESTART**

------------------------------------------------------------------------

## 1. PROJECT IDENTITY {#1-project-identity}

This is a digital archive/library for the Broke Bibliophiles of
Bangalore.

It is **not primarily a generic book catalogue**.

Its central idea is:

> Reconstruct the living history of BBB through the books discussed by
> its members.

The product chain is:

``` text
BBB meetup records
        ↓
people
        ↓
books
        ↓
3D library room
        ↓
take a book from the shelf
        ↓
who discussed/read/recommended it + when
        ↓
archival history
```

------------------------------------------------------------------------

## 2. CORE PRIORITY {#2-core-priority}

### P0 --- THE 3D LIBRARY ROOM {#p0--the-3d-library-room}

The user must be able to enter a convincing 3D library containing the
**actual BBB book collection**.

The shelf is not decoration. The books are the archive.

### P1 --- BOOK INTERACTION {#p1--book-interaction}

The user should be able to select/pull a book from the shelf.

### P2 --- BOOK HISTORY {#p2--book-history}

A selected book should reveal, where the data exists:

-   title
-   author
-   people associated with it
-   meetup number
-   meetup date
-   discussion/recommendation context
-   other occurrences
-   relevant source information

### P3 --- CATALOGUE {#p3--catalogue}

Search, alphabetical browsing, filters, grid/list views, etc. are
secondary ways to reach the archive.

### P4 --- SECONDARY SECTIONS {#p4--secondary-sections}

Meetups, Timeline, Collections and About provide context but must not
displace the 3D room.

**Priority order:**

``` text
3D Library Room
→ book interaction
→ archival history
→ catalogue/search
→ secondary pages
```

------------------------------------------------------------------------

## 3. GOLDEN RULE {#3-golden-rule}

Never replace the core 3D library experience with a normal catalogue
simply because the catalogue is easier to implement.

If a task conflicts with the 3D Library Room:

1.  preserve the 3D room;
2.  explain the conflict;
3.  make the smallest compatible change;
4.  ask for approval if the architecture must change.

------------------------------------------------------------------------

## 4. EXISTING PROJECT RULE {#4-existing-project-rule}

This repository already contains substantial work.

**Do not start over.**

Do not:

-   create a new app;
-   replace the architecture without evidence;
-   create a parallel frontend;
-   create a second API;
-   discard working components;
-   rebuild working features unnecessarily;
-   replace real BBB data with fake data.

Before editing:

``` text
project memory
→ repository inspection
→ actual architecture
→ actual API/data
→ relevant existing code
→ smallest safe change
→ verification
```

The repository is the final authority on current implementation state.

------------------------------------------------------------------------

## 5. SOURCE OF TRUTH {#5-source-of-truth}

For project decisions:

1.  explicit human instruction
2.  `MASTER_FOUNDATION_PROMPT.md`
3.  `BUILD_GUIDE.md`
4.  `AGENT_PLAYBOOK.md`
5.  `SESSION_LOG.md`
6.  `BBB_RULES.md`
7.  `BBB_UI.md`
8.  existing implementation
9.  general engineering convention

If sources conflict, report the conflict.

------------------------------------------------------------------------

## 6. NEVER INVENT PROJECT STATE {#6-never-invent-project-state}

Never claim the project has a route, endpoint, table, component, 3D
scene, dependency, data field, or working integration unless you
inspected it.

Never fabricate BBB archival data.

Never invent:

-   meetup attendance;
-   who read a book;
-   dates;
-   recommendations;
-   authors;
-   book metadata;
-   relationships between people and books.

If information is unavailable, represent it as unavailable.

------------------------------------------------------------------------

## 7. REAL ARCHIVAL DATA {#7-real-archival-data}

The actual BBB meetup records are the source material.

Transform them as:

``` text
source record
→ normalized record
→ database
→ API
→ UI / 3D room
```

Do not silently change the meaning of the source.

The same book appearing at multiple meetups is **historical
information**, not duplicate noise.

Conceptually:

``` text
BOOK
  ↓
BOOK OCCURRENCE
  ↓
MEETUP
  ↓
PERSON
```

Preserve those occurrences.

------------------------------------------------------------------------

## 8. BOOK IDENTITY {#8-book-identity}

Books require a stable canonical identity.

Do not create duplicate books because of differences in:

-   capitalization;
-   punctuation;
-   formatting;
-   author-name spelling;
-   repeated meetup appearances.

Normalize where appropriate, but preserve every meaningful archival
occurrence.

------------------------------------------------------------------------

## 9. API CONTRACT {#9-api-contract}

The frontend and backend share a contract.

Before adding an endpoint, search for an existing one.

Never silently change a response shape.

If it must change:

``` text
backend
→ types/schema
→ consumers
→ tests
→ documentation
```

------------------------------------------------------------------------

## 10. DATABASE SAFETY {#10-database-safety}

Do not destructively modify archival data.

Never run:

``` text
DROP
TRUNCATE
mass DELETE
```

without explicit human approval.

Do not destroy source records to solve a UI problem.

------------------------------------------------------------------------

## 11. 3D LIBRARY RULES {#11-3d-library-rules}

The 3D library is **P0**.

It is not a decorative animation.

Minimum intended journey:

``` text
ENTER LIBRARY
    ↓
SEE REAL BOOKS
    ↓
NAVIGATE / LOOK AROUND
    ↓
SELECT BOOK
    ↓
PULL / TAKE BOOK
    ↓
BOOK DETAIL
    ↓
ARCHIVAL HISTORY
```

The room should remain usable even when secondary API features fail.

Do not fabricate metadata to make the room look complete.

------------------------------------------------------------------------

## 12. DATA-DRIVEN SHELF {#12-data-driven-shelf}

Do not hardcode hundreds of individual books into the 3D scene.

Prefer:

``` text
book data
→ shelf layout
→ book instances
```

Every 3D book must have a stable mapping to its canonical `bookId`.

The scene should scale as the archive grows.

------------------------------------------------------------------------

## 13. PULL-BOOK RULE {#13-pull-book-rule}

A pulled book must resolve to its real record:

``` text
3D book instance
→ canonical book ID
→ API/database
→ correct book
→ correct history
```

Never:

``` text
click random book
→ show random book data
```

If a record cannot be resolved, show a controlled unavailable state.

------------------------------------------------------------------------

## 14. 3D PERFORMANCE {#14-3d-performance}

Prefer:

-   instancing;
-   efficient meshes;
-   texture reuse;
-   culling;
-   lazy loading;
-   simple materials;
-   restrained lighting;
-   efficient book rendering.

Do not add expensive effects merely for spectacle.

The goal is:

``` text
many real books
+
convincing spatial experience
+
stable interaction
```

------------------------------------------------------------------------

## 15. ASYNC / ERROR STATES {#15-async--error-states}

Every network action must visibly support:

``` text
idle
loading
success
error
```

The user must know what is happening.

Errors should preserve access to whatever still works.

For example:

``` text
The archive record could not be opened.

The Library Room is still available.

Try again.
```

------------------------------------------------------------------------

## 16. NO MOCKING A BROKEN CORE {#16-no-mocking-a-broken-core}

Do not solve:

-   API bugs with hardcoded data;
-   3D bugs by replacing the room with a grid;
-   missing archive data by inventing records.

Temporary fixtures are allowed only when clearly isolated for
development.

------------------------------------------------------------------------

## 17. AI-SLOP PREVENTION {#17-ai-slop-prevention}

BBB Library must not become a generic AI SaaS website.

Avoid:

-   purple/blue AI gradients;
-   glassmorphism;
-   glowing cards;
-   meaningless dashboards;
-   generic AI illustrations;
-   huge gradient heroes;
-   excessive pills/cards;
-   random decorative 3D objects;
-   excessive animation;
-   buzzword-heavy copy.

Target visual character:

``` text
literary
editorial
archival
quiet
warm
curated
tactile
```

------------------------------------------------------------------------

## 18. DEPENDENCIES {#18-dependencies}

Before adding a dependency:

1.  inspect `package.json`;
2.  check whether the existing stack already solves the problem;
3.  assess bundle/performance impact;
4.  avoid unnecessary additions;
5.  do not blindly install `latest`.

------------------------------------------------------------------------

## 19. SECURITY {#19-security}

Never commit:

-   `.env`;
-   `.env.local`;
-   API keys;
-   credentials;
-   database passwords;
-   service-role keys.

Never expose server-side secrets to the browser.

------------------------------------------------------------------------

## 20. GIT {#20-git}

The human developer controls remote Git operations.

The agent must not:

-   force-push;
-   rewrite shared history;
-   push to `main` without explicit approval;
-   merge branches without approval.

Before work:

``` bash
git status
git branch --show-current
```

Before handoff:

``` bash
git status
git diff
```

------------------------------------------------------------------------

## 21. CHANGE PROCESS {#21-change-process}

For non-trivial work establish:

``` text
Problem:
Expected behavior:
Affected files:
Implementation:
Verification:
```

Then make the smallest coherent change.

Do not mix unrelated cleanup into a focused task.

------------------------------------------------------------------------

## 22. VERIFICATION {#22-verification}

Code written ≠ task complete.

For 3D-library work, verify where applicable:

-   app starts;
-   Library Room opens;
-   3D scene renders;
-   real books appear;
-   book IDs map correctly;
-   selection works;
-   pulled book resolves correctly;
-   archival history loads;
-   API failures are controlled;
-   no new console errors exist.

------------------------------------------------------------------------

## 23. SESSION CONTINUITY {#23-session-continuity}

At the end of every meaningful session, update `SESSION_LOG.md` with:

-   what was inspected;
-   what changed;
-   what was verified;
-   remaining failures;
-   next recommended task;
-   important discoveries;
-   decisions made;
-   files changed.

The next agent must be able to continue without reconstructing history
from memory.

------------------------------------------------------------------------

## 24. STOP RULE {#24-stop-rule}

If a requested task requires a major architectural decision:

``` text
STOP
```

Report:

``` text
Current state
Problem
Options
Recommendation
Risks
```

Wait for human approval.

------------------------------------------------------------------------

## 25. FINAL PRODUCT CHAIN {#25-final-product-chain}

The defining chain is:

``` text
REAL BBB DATA
    ↓
DATABASE
    ↓
API
    ↓
3D LIBRARY ROOM
    ↓
REAL BOOK ON SHELF
    ↓
TAKE BOOK
    ↓
BOOK DETAIL
    ↓
WHO / WHEN / MEETUP
    ↓
LIVING ARCHIVE
```

That chain is the product.
