# Flow Comparison

> **Status:** analysis, 2026-10-09. It compares the documented flows with the code, measures their cost, and collects lessons from library and information science. Decisions stay in `docs/BBB_PRD_TRD.md` §9; this file is the reasoning behind them. Sources are listed in §7.

---

## 1. Flows compared

Three descriptions of how data reaches the reader exist in the docs. Each one covers a different part of the trip.

### 1.1 Request path (`bbb-library-architecture.md`)

```text
Browser → Next.js (UI only) → HTTP fetch → FastAPI → SQLAlchemy → SQLite
```

This is the server side of one request. It says nothing about what the browser does with the data once it arrives.

### 1.2 Debug trace (PRD §9.1)

```text
SQLite → SQLAlchemy → FastAPI route → JSON response → Frontend API client
→ Adapter / normalization → TypeScript model → Closet state
→ ShelfWall → ClosetSpine → CriterionDetailModal → Book detail page
```

This is the full path, read from the database upward. It is the method for debugging: the first boundary where real data stops flowing is the place to fix.

Older copies of this trace name `Shelf → Book3D`. Those components are unused; the live closet renders `ShelfWall` and `ClosetSpine` inside `CriterionBookCloset.tsx`.

### 1.3 Reader flow (PRD §2A)

```text
Browse shelf → Hover / focus on book → Pull book from shelf
→ Featured detail state → Archival history (who, which meetup, when, context,
  members, related information) → Full book detail
```

This is what the reader experiences. Each step implies data that must already be in the browser or must be fetched at that moment.

---

## 2. Differences between the docs and the code

| Step | Request path doc | PRD trace / reader flow | Code today |
|---|---|---|---|
| Request path | Browser → Next → FastAPI → SQLAlchemy → SQLite | Same, read upward | Same |
| Server work | Not described | Not described | `batch_books_to_dict` (`app/api/main.py`) runs 3 queries whatever the number of books: the books, their authors (`IN` list), their discussions joined with members and meetups (`IN` list). There is no "one query per book" problem |
| Text filters | Not described | Not described | `search`, `author` and the general/tangent filter use `ilike '%x%'`. A pattern that starts with `%` cannot use an index, so every filter reads the whole table |
| Adapter / normalization | Not described | Listed as its own layer | No adapter exists. `frontend/src/lib/api.ts` returns the JSON as typed objects. Filtering and sorting happen inside the closet component (`CriterionBookCloset.tsx:1011`) |
| Hover / focus | Not described | "Hover / focus" | Hover only. Each spine is a `div` with `onClick` and mouse events; it has no `tabIndex` and no key handler (`CriterionBookCloset.tsx:106`). A keyboard user cannot reach any book |
| Pull | Not described | Pulled-book card | No book request: the data is already in memory. Only the synopsis is fetched (`CriterionDetailModal.tsx:511`) |
| Who × which meetup | Not described | Required by §2A | The API returns `meetups[]` and `members[]` as two separate lists, so the card cannot tell which member introduced the book at which meetup (Flow D task D2) |
| Full detail page | Not described | Last step | `frontend/src/app/books/[id]/page.tsx:28` fetches `/books/{id}` again, although the closet already holds that book |

---

## 3. Compute complexity

### 3.1 Variables

| Symbol | Meaning | Value today (measured) |
|---|---|---|
| N | Books loaded into the closet | 2,018 |
| D | Discussion rows | 2,686 |
| k | Books drawn at once (one closet section) | 360 |
| D_b | Discussions of one book | small; median detail payload 794 B |
| r_full | Bytes per book in today's response | 2,167,473 / 2,018 ≈ 1,074 B |
| r_shelf | Bytes per book with shelf fields, covers and meetup numbers | 837,940 / 2,018 ≈ 415 B |
| g_shelf | Same, after gzip | 154,887 / 2,018 ≈ 77 B |

Payload size is roughly a straight line: **bytes ≈ N × r**. Lowering r (fewer fields per book) or N (fewer books per request) are the only two levers.

### 3.2 The three flows

| Flow | First load | Server per request | Browser | Pull / detail |
|---|---|---|---|---|
| **A: load everything** (today) | N × r_full = 2,167,473 B, sent uncompressed | 3 queries; work O(N + D) | Filter and sort O(N log N) per change; DOM O(k) | Pull O(1); detail page refetches O(D_b) |
| **D: thin shelf, details on demand** (decided, PRD §9.2) | N × r_shelf = 837,940 B raw, 154,887 B gzip | Same | Same | Hover prefetch O(D_b); detail page reuses the cached book |
| **E: anchored window** (proposed here) | k × r_shelf ≈ 360 × 415 ≈ 149,000 B, **independent of N** | Index seek O(log N + k) | O(k) | Same as D |

How to read the big-O terms:

- **O(N log N) sort in the browser.** Sorting 2,018 books takes about N × log₂N ≈ 2,018 × 11 ≈ 22,000 comparisons. A browser does that in well under a frame, so client sorting is no problem at today's size.
- **O(N + D) on the server.** Each book and each discussion is touched once while building the response. Doubling the archive doubles the work; nothing grows faster than that.
- **O(log N + k) for an index seek.** A B-tree index finds the starting key in about log₂N steps (11 steps for 2,018 books, 20 steps for a million), then reads k rows in order.

### 3.3 Flow E in detail

Flow E is how library catalogues do shelf browsing. Every book gets a sort key, the way every shelved book has a call number. The server keeps an index on that key and returns a window of books after a given key:

```text
GET /books?fields=shelf&sort=sort_title&after=<last key seen>&limit=360
```

This is **keyset paging**. The alternative, `offset`, is slower in a way that grows with the archive:

- `OFFSET 1800 LIMIT 360` makes the database walk past 1,800 rows before returning anything: cost O(offset + k).
- `WHERE sort_title > :last ORDER BY sort_title LIMIT 360` jumps straight to the key through the index: cost O(log N + k).

The trade-off: every page change and every filter change becomes a request, and filters must run in SQL (so `discussion_count` and the general/tangent flag need to become indexed columns). The closet loses its instant client-side filtering.

### 3.4 When Flow E becomes worth it

Flow D's payload still grows with N; Flow E's does not. A reasonable switch point is when the gzipped shelf payload passes about 1 MB. **That 1 MB line is a judgment call** (a slow mobile connection at about 1 MB/s would then wait a second before the first shelf), and it can move.

At 77 gzip bytes per book, 1 MB is reached at about 1,000,000 / 77 ≈ 13,000 books. The archive holds 2,018 discussed books from 53 meetups with book records, about 38 per meetup. Reaching 13,000 would take roughly (13,000 − 2,018) / 38 ≈ 290 more such meetups. Flow E is therefore a long-range option, documented so the decision is quick when the numbers say so.

---

## 4. Schools of thought

| School | Example | Logic | Strength | Weakness for BBB |
|---|---|---|---|---|
| **Layered n-tier** | `bbb-library-architecture.md` | Each layer talks only to the one below it | Low coupling: the UI never touches the database, so swapping SQLite for PostgreSQL is a connection-string change plus a data migration. Matches PRD §7.0 (one contract, one client) | Describes the request path only; silent about client cost |
| **Load everything into the client** | Flow A, local-first apps | Pay once up front, then every interaction is in memory | Instant filtering and sorting; pulling a book costs nothing | Payload grows as N × r_full; 2.17 MB uncompressed today |
| **Progressive disclosure** | Flow D; Shneiderman's "overview first, zoom and filter, then details on demand" | Send only what the reader is looking at; fetch detail when they show interest | Load cost follows attention; keeps instant client filtering | Payload still grows with N, about 2.6× more slowly than A (1,074 / 415) |
| **Shelf browse around an anchor** | Flow E; VuFind alphabetic browse, Harvard StackLife, Koha `OPACShelfBrowser`; Ranganathan's fourth law, "save the time of the reader" | Precompute a sorted key once; answer "what is next to this book" with an index seek | Payload stays the same however large the archive grows | A request per page or filter; needs indexes and a stable sort key |

The library systems show the cost of skipping the index. Koha's own setting text warns that its shelf browser "uses up a fairly large amount of resources on your server, and should be avoided if your collection has a large number of items". The setting gives no reason; the likely cause is that it looks up neighbours on demand for each item. VuFind avoids this by building a sorted browse index ahead of time and seeking into it.

These schools stack. The layered model governs the server, Flow D governs what the browser loads, and Flow E is the upgrade path for D. The PRD §9.1 trace stays the debugging method under all of them.

---

## 5. Recommendation

In order:

1. **Turn on gzip.** One line, no new dependency (`GZipMiddleware` ships with FastAPI):
   ```python
   app.add_middleware(GZipMiddleware, minimum_size=1000)
   ```
   The current full load drops from 2,167,473 B to 523,519 B, which is 75.8 % smaller (1 − 523,519 / 2,167,473). This is API backlog item A3.
2. **Build Flow D**, as decided in PRD §9.2.
3. **Keep Flow E on file** until the gzipped shelf payload nears the threshold in §3.4.
4. **Fix the gaps from §2, each on its own:**
   - Make spines keyboard-reachable: a `<button>`, or `tabIndex={0}` with Enter and Space handlers. Accessibility is a hard requirement.
   - Let the detail page reuse the book the closet already holds.
   - Return discussions as (meetup number, date, member) entries (Flow D task D2).

---

## 6. Lessons from the ISI DRTC MS(LIS) syllabus

The Indian Statistical Institute's MS in Library and Information Science is taught **only at the Bengaluru centre** (DRTC, founded in 1962 under S. R. Ranganathan). The Kolkata campus has the Library, Documentation and Information Science Division, which runs the institute library. The lessons below come from the official course brochure (§7); paper (P) and unit (U) numbers refer to it.

### 6.1 Act now: cheap fixes for real gaps

**1. Filing rules: ignore leading articles when sorting** (P03 U07, filing of entries)

Library catalogues file "The Elephant in the Brain" under E. The archive already stores this: `canonical_books.sort_title` holds `Elephant in the Brain, The`, filled for 2,622 of 2,783 books. The API does not return it, and the closet sorts on the raw `title` (`CriterionBookCloset.tsx:1056`). **800 of 2,783 titles start with "The", "A" or "An"** (measured), so they pile up under T and A in the A to Z order.

Fix: return `sort_title` from the API and sort on it, falling back to `title` for the 161 books without one. The same key is the anchor Flow E needs (§3.3).

**2. Duplicate matching by blocking** (P13 practice, OpenRefine clustering)

OpenRefine clusters messy names in two steps:

1. **Key collision.** Compute a fingerprint for each title: lowercase, strip punctuation and accents, split into words, remove duplicates, sort, join. `"The Elephant in the Brain"` and `"Elephant in the brain, The"` both become `brain elephant in the`. Titles with the same fingerprint fall into the same bucket. Cost: one pass, O(M) for M new titles, using a dictionary.
2. **Nearest neighbour inside each bucket.** Run the expensive comparison (edit distance, or `SequenceMatcher`) only between titles that share a bucket.

Why it is faster: today's matcher compares each new title with every canonical title of similar length, so comparisons grow like M × C (new titles × canonical titles). With blocking, comparisons are the sum over buckets of b × (b − 1) / 2, where b is a bucket's size. Most buckets hold one or two titles, so the total stays close to M.

This uses only the standard library (`unicodedata`, `str`, `dict`). Per the ponytail rule, build it once an import has been timed and found slow (backlog R2).

**3. Ranked search with SQLite FTS5** (P11 M3 to M5, IR models and evaluation)

The course covers the classic retrieval models. The one that matters here is term weighting:

- **TF-IDF:** a word's weight in a document is tf × log(N / df), where tf is how often it appears in that document and df is how many documents contain it. Rare words count for more.
- **BM25**, the probabilistic refinement used by modern search engines, adds two corrections: repeated words give diminishing returns, and long documents are not favoured just for being long.

SQLite ships FTS5 with a built-in `bm25()` ranking function, and **FTS5 is compiled into the Python SQLite used here** (verified). A full-text index over title, author and discussion notes replaces today's unranked `ilike '%x%'` scans and covers the build item "search across authors and discussion notes" with no new dependency.

Evaluate it the way the course does (P11 U29): pick about 10 queries with known right answers and measure **precision** (share of returned books that are right) and **recall** (share of right books that were returned).

### 6.2 Design input for open items

**4. FRBR: what a "book" is** (P03 U20; answers the core of backlog R1)

FRBR describes a book at four levels:

| Level | Meaning | Example |
|---|---|---|
| Work | The creation itself | *One Hundred Years of Solitude* |
| Expression | A version of the text | Gregory Rabassa's English translation |
| Manifestation | One published edition | A 2006 paperback, with its own ISBN |
| Item | One physical copy | The copy a member brought to a meetup |

`CanonicalBook` is a **Work**. An ISBN identifies a **Manifestation**: every edition and format gets its own. So the archive must never deduplicate books on ISBN; two ISBNs can be the same Work. If an edition or translation matters for a discussion, record it on the discussion as "edition read". A four-table model is not needed now (YAGNI).

**5. Authority files** (P03 U16)

A catalogue keeps one authoritative form of each name and points every variant to it ("see" references), so a renamed author stays one person. The archive has an `aliases` table with 1 row. It is the right place to record author and member name variants (218 author names changed in commit `6af556d`) instead of rewriting names in place and losing the old forms.

**6. Co-discussion as a recommendation signal** (P16 U15, co-citation and bibliographic coupling)

In citation analysis, two papers are related if they are often cited together. The same logic applies to meetups: two books are related if they were discussed at the same meetup, and more related the more meetups they share.

Cost: a meetup with b books produces b × (b − 1) / 2 pairs. Over the 53 meetups with book records (the largest has 100 books) that is **75,450 pairs in total** (measured). One SQL self-join on `discussions` computes it, and the result can be stored and refreshed after each import. This answers the time-complexity concern in backlog R3: no machine learning, and the cost grows with the size of each meetup, independent of the archive's total size.

**7. Facets for genres** (P02 U11, Ranganathan's facet analysis, PMEST)

Ranganathan split every subject into five facets: Personality (the core subject), Matter, Energy (action or process), Space and Time. For BBB that suggests filters along separate axes: subject or genre, place (setting or country of origin) and period. Meetup number and date already work as the time facet. The `genres` table has 0 rows, so the design can start clean with facets instead of one flat genre list.

**8. Call numbers and harvesting cursors** (P02 U17, P03 U03, P17 U33)

A call number is a precomputed shelf position; the shelf list is the catalogue sorted by it. OAI-PMH, the standard harvesting protocol, pages large result sets with a `resumptionToken`, a cursor the server hands back. Both are the library world's version of Flow E's sort key and keyset paging (§3.3).

**9. Bibliometric laws for the statistics feature** (P16 M3, M5)

| Law | Statement | BBB question it answers |
|---|---|---|
| Lotka | The number of authors with n papers is roughly proportional to 1 / n² | How many members introduced 1, 2, 3 ... books |
| Zipf | The r-th most frequent item has frequency roughly proportional to 1 / r | Do a few books get most of the discussion |
| Bradford / 80-20 | A small core produces most of the output | What share of discussions comes from the top 20 % of members |
| Half-life | Time until half of all references to an item have occurred | How long a book keeps being discussed after its first meetup |

Whether BBB's data follows these curves is a question to test, with no assumption made here. All of them are counts and group-bys that SQLite handles at this size; **PostgreSQL is not needed for these statistics**.

**10. OAIS packages** (P13 U07)

The Open Archival Information System model names three packages: what arrives (Submission, SIP), what is preserved (Archival, AIP) and what is handed out (Dissemination, DIP). They match the three layers in `domain_model.md`: raw import = SIP, canonical record = AIP, API response = DIP. Flow D's shelf and detail payloads are two DIPs cut from the same AIP. This confirms the existing model; it needs no work.

### 6.3 Skip for now

| Topic | Paper | Why it waits |
|---|---|---|
| Semantic Web: RDF, OWL, SPARQL | P18 | The relation tables already form a knowledge graph. Revisit only if MCP or RAG work ever needs RDF |
| Z39.50, SRU, MARC crosswalks | P17 M6, U13 | For exchanging records with library catalogues; BBB has no such consumers |
| Dublin Core export | P07 U11 | Only when someone wants to harvest the archive |
| Open Graph and SEO tags | P17 U03 | Useful for the public website's link previews; do it at deployment |

---

## 7. Sources

**Repository**

- `docs/BBB_PRD_TRD.md` §2A (reader flow), §7.0 (constraints), §9.1 to §9.3 (trace, Flow D, measurements)
- `docs/architecture/bbb-library-architecture.md` (request path)
- `app/api/main.py` (`get_books`, `batch_books_to_dict`)
- `frontend/src/components/library/CriterionBookCloset.tsx`, `CriterionDetailModal.tsx`, `frontend/src/app/books/[id]/page.tsx`
- `book_club_archivist.db`, read-only queries on 2026-10-09 for the counts in §3.4 and §6

**External**

- ISI MS(LIS) students' brochure, detailed syllabi: https://www.isibang.ac.in/~adean/infsys/acadata/Brochures/mslis_new.pdf
- DRTC MS(LIS) programme page: https://drtc.isibang.ac.in/courses/ms-lis
- ISI postgraduate programmes (MS(LIS) offered only at Bengaluru): https://dean.isical.ac.in/static/academics/academic_programmes/postgraduate
- Koha shelf browser preference text: https://github.com/Koha-Community/Koha
- VuFind and its browse handler: https://github.com/vufind-org/vufind, https://github.com/vufind-org/vufind-browse-handler
- Harvard StackLife: https://github.com/harvard-lil/stacklife
