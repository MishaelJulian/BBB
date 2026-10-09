<!-- Generated: 2026-10-09 | Commit: 9ee6c4d | Files scanned: 1 -->

# Backend Codemap

**Last Updated:** 2026-10-09

## Summary

FastAPI app with 33 route decorators (some paths have `/api/` aliases). CORS middleware only (no auth). All routes in `app/api/main.py` (2,215 lines, 40 functions). Middleware: CORS configured to allow localhost, 10.x, 192.168.x, 172.16-31.x ranges for local LAN admin access.

## Route Groups

### Public Read (11 unique GET paths)

| Method | Path | Handler | Lines | Notes |
|--------|------|---------|-------|-------|
| GET | `/health` | `health()` | 343-353 | Database liveness check for Docker compose |
| GET | `/stats` | `get_stats()` | 355-376 | Record counts: canonical_books, discussions, imported_books, members, authors, venues, meetups, sources |
| GET | `/books` | `get_books()` | 378-459 | 2 aliases: `/books`, `/api/books`; filters: limit, skip, only_discussed, exclude_general, sort_by, search_title |
| GET | `/books/{book_id}` | `get_book()` | 464-476 | 2 aliases: `/books/{id}`, `/api/books/{id}` |
| GET | `/books/{book_id}/synopsis` | `get_book_synopsis_endpoint()` | 548-601 | Fetch from Goodreads if missing; updates db.description, page_count, rating |
| GET | `/meetups` | `get_meetups()` | 607-637 | Filters: limit, skip, sort_by; returns 53 meetups with book counts |
| GET | `/meetups/{meetup_id}` | `get_meetup()` | 639-661 | Single meetup with all books, members, resources |
| GET | `/search` | `search()` | 663-693 | Query books and members by title/name; returns 10 results per type |
| GET | `/members` | `get_members()` | 695-755 | Filters: limit, skip, sort_by; returns display_name, bio, discussion count |
| GET | `/members/{member_id}` | `get_member()` | 757-840 | Member profile with all discussions, current reads, recommendations |
| GET | `/authors/{author_id}` | `get_author()` | 842-887 | Author profile with all books they wrote |

### Admin Write (8 unique paths)

| Method | Path | Handler | Lines | Notes |
|--------|------|---------|-------|-------|
| GET | `/admin/meetups` | `get_admin_meetups()` | 945-1029 | List all meetups with edit UI state (date, venue, photo, PDF) |
| PUT | `/admin/meetups/{meetup_number}` | `update_admin_meetup()` | 1031-1066 | Update date, venue_id, format, attendance_count, description |
| POST | `/admin/meetups/{meetup_number}/photo` | `upload_meetup_photo()` | 1068-1109 | Upload photo (30 MB cap, no image check), store at `/assets/uploads/meetups/{number}.jpg` |
| DELETE | `/admin/meetups/{meetup_number}/photo` | `delete_meetup_photo()` | 1111-1125 | Remove photo file |
| POST | `/admin/meetups/{meetup_number}/generate-pdf` | `generate_meetup_pdf_endpoint()` | 1127-1156 | Render PDF (reportlab), save at `/assets/generated_pdfs/meetup_{number}.pdf` |
| GET | `/admin/meetups/{meetup_number}/pdf` | `download_meetup_pdf_endpoint()` | 1158-1181 | Download generated PDF |
| PUT | `/admin/books/{book_id}` | `update_admin_book()` | 1183-1331 | Update title, author_id, publisher_id, series_id, isbn, description, cover_url, external_url, media_type, rating |
| PATCH | `/admin/discussions/{discussion_id}/general` | `toggle_admin_discussion_general()` | 1333-1372 | Toggle `media_type` between "book" and "general" |
| DELETE | `/admin/discussions/{discussion_id}` | `delete_admin_discussion()` | 1374-1396 | Soft-delete (status, not removal) or hard-delete |
| POST | `/admin/meetups/{meetup_number}/books` | `add_book_to_meetup()` | 1398-1547 | Add a book to meetup's discussions (search Goodreads or create new canonical) |

### Media Resolution & Suggestions (5 routes with `/api/` aliases)

| Method | Path | Handler | Lines | Notes |
|--------|------|---------|-------|-------|
| GET | `/admin/media/resolve-url` | `api_resolve_media_url()` | 1921-1926 | 2 aliases: `/admin/...`, `/api/...`; returns title, cover_url, media_type from YouTube oEmbed or OpenGraph |
| GET | `/api/media/resolve-url` | (same) | | |
| GET | `/admin/books/suggest` | `suggest_books()` | 1928-2011 | 2 aliases: `/admin/...`, `/api/...`; search Goodreads or return "Create New" |
| GET | `/api/books/suggest` | (same) | | |
| GET | `/admin/media/suggest` | (same) | | Redirect to books suggest |
| GET | `/api/media/suggest` | (same) | | |
| GET | `/admin/members/suggest` | `suggest_members()` | 2013-2102 | 2 aliases: `/admin/...`, `/api/...`; search by name |
| GET | `/api/members/suggest` | (same) | | |

### Enrichment (2 POST routes)

| Method | Path | Handler | Lines | Notes |
|--------|------|---------|-------|-------|
| POST | `/admin/books/{book_id}/enrich-goodreads` | `enrich_single_book_endpoint()` | 2180-2189 | Fetch Goodreads metadata, update canonical_book |
| POST | `/admin/meetups/{meetup_number}/enrich-goodreads` | `enrich_meetup_books_endpoint()` | 2191-2207 | Enrich all books in a meetup |

## Helper Functions (in main.py, not routes)

| Function | Lines | Purpose |
|----------|-------|---------|
| `get_db()` | 65-71 | SQLAlchemy session factory (yield pattern) |
| `book_to_dict()` | 78-153 | Convert CanonicalBook to JSON (discussions, meetups, cover, author) |
| `batch_books_to_dict()` | 155-249 | Convert list of CanonicalBooks to JSON |
| `meetup_to_dict()` | 251-340 | Convert Meetup to JSON (books, members, venue, resources) |
| `fetch_book_metadata_from_web()` | 478-540 | Call Goodreads JSON-LD or Apple Books API; return dict with cover_url, description, page_count, rating |
| `fetch_book_synopsis_from_web()` | 542-546 | Call fetch_book_metadata_from_web(), return description only |
| `search_external_books()` | 1549-1641 | Search Goodreads autocomplete or Apple Books; return 10 results |
| `_is_public_http_url()` | 1643-1662 | SSRF guard: check if URL resolves to public IP (not private/loopback) |
| `_host_is()` | 1664-1672 | Check if URL hostname matches list of domains |
| `resolve_media_url()` | 1674-1797 | Auto-detect YouTube, IMDb, Goodreads, general websites; return metadata via oEmbed or OpenGraph |
| `search_external_media()` | 1800-1919 | Multi-source search (Goodreads, Apple Books, DuckDuckGo, TVMaze, Apple Podcasts) |
| `to_title_case_name()` | 889-943 | Normalize person names ("doe, john" → "John Doe") |
| `enrich_canonical_book_from_goodreads()` | 2104-2178 | Fetch and merge Goodreads data into canonical_book |

## Request/Response Models (Pydantic)

Defined in `main.py` lines 1-2215. All inherit from `BaseModel`.

- `MeetupUpdateRequest` (for PUT /admin/meetups/{number})
- `BookUpdateRequest` (for PUT /admin/books/{id})
- `ToggleGeneralDiscussionRequest` (for PATCH /admin/discussions/{id}/general)
- `AddBookToMeetupRequest` (for POST /admin/meetups/{number}/books)

## Middleware

- **CORS:** configured with regex allow for `localhost`, `127.0.0.1`, `10.x.x.x`, `192.168.x.x`, `172.16-31.x.x` (local network)
- **Static files:** `/assets` directory mounted for uploads, PDFs, fonts, templates
- **No auth:** all routes open (no JWT, no login, no session)

## External API Calls (from main.py)

| Service | Call | Lines | Purpose |
|---------|------|-------|---------|
| Goodreads JSON-LD | `https://www.goodreads.com/book/show/{goodreads_id}` | 484 | Fetch cover, synopsis, page count, rating |
| Apple Books | `https://itunes.apple.com/search?term=...&entity=ebook` | 522 | Fallback book search |
| YouTube oEmbed | `https://www.youtube.com/oembed?url=...` | 1692 | Auto-detect video metadata |
| OpenGraph HTML scraper | Generic HTTP HEAD + regex parse | 1722 | Detect title, image, description from any URL |
| DuckDuckGo API | `https://api.duckduckgo.com/?q=...` | 1821 | Film/show search |
| TVMaze API | `https://api.tvmaze.com/search/shows?q=` | 1845 | TV show metadata |
| Apple Podcasts | `https://podcasts.apple.com/search?term=...` | 1893 | Podcast metadata |

## Related Areas

- See `architecture.md` for system diagram and data flow
- See `data.md` for database schema and table relationships
- See `dependencies.md` for all external services in detail
- Full file at `app/api/main.py` (2,215 lines)
