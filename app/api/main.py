"""
BBB Library API — FastAPI Application

This module exposes the BBB archive as REST endpoints.
It reuses the existing SQLAlchemy models and database layer.
"""

from fastapi import FastAPI, HTTPException, Query, Request, UploadFile, File
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.gzip import GZipMiddleware
from starlette.concurrency import run_in_threadpool
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List
from collections import defaultdict
from datetime import date, datetime
from pydantic import BaseModel, field_validator
import urllib.error
import urllib.request
import urllib.parse
import ipaddress
import socket
import json
import re
import time
import os
import hmac
import logging
from collections import deque

from sqlalchemy import func, text

from app.core.database import get_engine, SessionLocal
from app.core.config import settings
from app.core.paths import ASSETS_DIR, asset_path
from app.database.models import (
    CanonicalBook, ImportedBook, Meetup, Venue, Author, Member, Discussion, Resource,
    CurrentRead, DiscussionParticipant, Quote, Recommendation
)

app = FastAPI(
    title="BBB Library API",
    description="REST API for the Broke Bibliophiles of Bangalore Digital Archive",
    version="1.0.0",
)

# Ensure assets directories exist and mount them at /assets
os.makedirs("assets/uploads/meetups", exist_ok=True)
os.makedirs("assets/generated_pdfs", exist_ok=True)
os.makedirs("assets/fonts", exist_ok=True)
os.makedirs("assets/templates", exist_ok=True)
app.mount("/assets", StaticFiles(directory="assets"), name="assets")

# Configure CORS for Next.js frontend (allowing any local development port e.g. 3000, 3001)
app.add_middleware(
    CORSMiddleware,
    # Dev: localhost + private LAN (the admin page calls :8000 directly from phones on the LAN).
    # Production origins come from CORS_ORIGINS. No cookies are used, so credentials stay off.
    allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()],
    # LAN origins only in development; in production the browser reaches the API through the
    # same-origin Vercel proxy, so no cross-origin access is needed (F3).
    allow_origin_regex=(
        r"^https?://(localhost|127\.0\.0\.1|10(\.\d{1,3}){3}|192\.168(\.\d{1,3}){2}|172\.(1[6-9]|2\d|3[01])(\.\d{1,3}){2})(:\d+)?$"
        if settings.ENV == "development" else None
    ),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.add_middleware(GZipMiddleware, minimum_size=1000)  # D22

logger = logging.getLogger("bbb.api")
if not logger.handlers:  # B6: the API had no log output of its own
    _h = logging.StreamHandler()
    _h.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s"))
    logger.addHandler(_h)
    logger.setLevel(logging.INFO)

_ERROR_TYPES = {
    400: "validation_error", 401: "auth_error", 403: "permission_error", 404: "not_found",
    409: "conflict", 413: "validation_error", 422: "validation_error", 429: "rate_limited",
}


def _error(status: int, message, code: str = "", headers=None) -> JSONResponse:
    """One error envelope (PRD §11.2). `detail` stays for existing clients; `error` is the standard."""
    etype = _ERROR_TYPES.get(status, "server_error" if status >= 500 else "validation_error")
    text_msg = message if isinstance(message, str) else "Invalid request."
    return JSONResponse(
        status_code=status,
        content={"detail": message, "error": {"type": etype, "code": code or etype, "message": text_msg}},
        headers=headers,
    )


@app.exception_handler(StarletteHTTPException)
async def _http_error(request: Request, exc: StarletteHTTPException):
    if exc.status_code >= 500:
        logger.error("%s %s failed", request.method, request.url.path, exc_info=exc.__cause__ or exc)
        return _error(exc.status_code, "Something went wrong on the server.")
    return _error(exc.status_code, exc.detail, headers=getattr(exc, "headers", None))


@app.exception_handler(RequestValidationError)
async def _validation_error(request: Request, exc: RequestValidationError):
    return _error(422, exc.errors(), code="invalid_parameters")


@app.exception_handler(Exception)
async def _unhandled_error(request: Request, exc: Exception):
    logger.exception("%s %s failed", request.method, request.url.path)
    return _error(500, "Something went wrong on the server.")


# ponytail: in-memory sliding window, correct for one API process; move to Redis if we ever run several.
_RATE_LIMITS = {"read": (300, 60.0), "write": (30, 60.0)}  # requests per window (seconds)
_hits: dict = defaultdict(deque)


def _rate_limited(key: str, kind: str) -> bool:
    limit, window = _RATE_LIMITS[kind]
    now = time.monotonic()
    q = _hits[(key, kind)]
    while q and now - q[0] > window:
        q.popleft()
    if len(q) >= limit:
        return True
    q.append(now)
    return False


_PRIVATE_PREFIXES = ("/admin", "/api/admin", "/api/auth", "/auth")


def _session_user(cookie: str):
    """Ask the login service who this cookie belongs to. None = not signed in or service down (fail closed)."""
    if "session_token" not in cookie:
        return None
    req = urllib.request.Request(
        settings.AUTH_INTERNAL_URL.rstrip("/") + "/api/auth/get-session", headers={"cookie": cookie}
    )
    try:
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read() or b"null")
    except Exception:
        logger.exception("login service check failed")
        return None
    return (data or {}).get("user")


@app.middleware("http")
async def _edge_guard(request: Request, call_next):
    """Origin lock (D35), per-IP rate limit, security headers, no caching of private routes."""
    secret = settings.ORIGIN_SECRET
    path = request.url.path
    if secret and path != "/health":
        if not hmac.compare_digest(request.headers.get("x-origin-secret", ""), secret):
            return _error(403, "Direct access is not allowed.", code="origin_required")
    # Trust the proxy's visitor IP only when the request proved it came through the proxy.
    ip = (request.headers.get("x-real-ip") if secret else None) or (request.client.host if request.client else "unknown")
    kind = "read" if request.method in ("GET", "HEAD", "OPTIONS") else "write"
    if _rate_limited(ip, kind):
        return _error(429, "Too many requests. Please wait a minute and try again.", headers={"Retry-After": "60"})
    user = None
    if settings.AUTH_REQUIRED and (kind == "write" or path.startswith(("/admin", "/api/admin"))) and request.method != "OPTIONS":
        user = await run_in_threadpool(_session_user, request.headers.get("cookie", ""))
        if user is None:
            return _error(401, "Please sign in.", code="login_required")
        if user.get("role") != "admin":  # presenter routes arrive with the presenter form (P3)
            return _error(403, "Your account cannot do this.", code="admin_only")
    response = await call_next(request)
    if kind == "write" and user:
        logger.info("write %s %s by %s -> %s", request.method, path, user.get("email"), response.status_code)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    if kind == "write" or path.startswith(_PRIVATE_PREFIXES):
        response.headers["Cache-Control"] = "private, no-store"
    return response


# ============================================
# Helper functions
# ============================================

def get_db():
    """Get database session."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


# ============================================
# Response models (simplified for API)
# ============================================

def book_to_dict(book: CanonicalBook, db) -> dict:
    """Convert CanonicalBook to API response dict."""
    # Count discussions
    discussion_count = db.query(Discussion).filter(
        Discussion.canonical_book_id == book.id
    ).count()

    # Get meetups
    meetups = []
    for disc in db.query(Discussion).filter(
        Discussion.canonical_book_id == book.id
    ).all():
        if disc.meetup_id:
            meetup = db.query(Meetup).filter(Meetup.id == disc.meetup_id).first()
            if meetup:
                venue = db.query(Venue).filter(Venue.id == meetup.venue_id).first()
                meetups.append({
                    "id": meetup.id,
                    "number": meetup.meetup_number,
                    "date": meetup.date.isoformat() if meetup.date else None,
                    "venue": venue.name if venue else None,
                })

    # Get members
    members = []
    member_ids = set()
    for disc in db.query(Discussion).filter(
        Discussion.canonical_book_id == book.id
    ).all():
        if disc.member_id and disc.member_id not in member_ids:
            member_ids.add(disc.member_id)
            member = db.query(Member).filter(Member.id == disc.member_id).first()
            if member:
                members.append({
                    "id": member.id,
                    "display_name": member.display_name,
                })

    # Get author
    author = None
    if book.author_id:
        author_obj = db.query(Author).filter(Author.id == book.author_id).first()
        if author_obj:
            author = {
                "id": author_obj.id,
                "name": author_obj.full_name,
            }

    # Check general discussion
    discussions = db.query(Discussion).filter(Discussion.canonical_book_id == book.id).all()
    is_general = any(
        ((d.topic and "general" in d.topic.lower()) or (d.notes and "general" in d.notes.lower()))
        for d in discussions
    )

    return {
        "id": book.id,
        "title": book.title,
        "normalized_title": book.normalized_title,
        "author_id": book.author_id,
        "author_name": author["name"] if author else None,
        "cover_url": book.cover_url,
        "thumbnail_url": book.thumbnail_url or book.cover_url,
        "description": book.description,
        "goodreads_id": book.goodreads_id,
        "publication_year": book.publication_year,
        "rating": book.rating,
        "page_count": book.page_count,
        "discussion_count": discussion_count,
        "first_discussed_date": min((m["date"] for m in meetups if m["date"]), default=None),
        "last_discussed_date": max((m["date"] for m in meetups if m["date"]), default=None),
        "meetups": meetups,
        "members": members,
        "is_general_discussion": is_general,
    }


def batch_books_to_dict(books: list, db) -> list:
    """Convert a list of CanonicalBook models to API response dicts efficiently in batch."""
    if not books:
        return []
    
    book_ids = [b.id for b in books]
    
    # 1. Fetch authors in batch
    author_ids = [b.author_id for b in books if b.author_id]
    author_map = {}
    if author_ids:
        authors = db.query(Author).filter(Author.id.in_(author_ids)).all()
        author_map = {a.id: a.full_name for a in authors}
        
    # 2. Fetch discussions joined with member and meetup info in ONE query
    disc_rows = db.query(
        Discussion.canonical_book_id,
        Discussion.topic,
        Discussion.notes,
        Member.id.label("member_id"),
        Member.display_name.label("member_name"),
        Meetup.id.label("meetup_id"),
        Meetup.meetup_number,
        Meetup.date.label("meetup_date"),
        Venue.name.label("venue_name"),
        Discussion.media_type.label("disc_media_type")
    ).outerjoin(Member, Discussion.member_id == Member.id)\
     .outerjoin(Meetup, Discussion.meetup_id == Meetup.id)\
     .outerjoin(Venue, Meetup.venue_id == Venue.id)\
     .filter(Discussion.canonical_book_id.in_(book_ids)).all()
     
    book_discs_count = defaultdict(int)
    book_members = defaultdict(list)
    book_meetups = defaultdict(list)
    book_dates = defaultdict(list)
    book_proper_count = defaultdict(int)
    book_general_count = defaultdict(int)
    seen_members = defaultdict(set)
    seen_meetups = defaultdict(set)
    
    for row in disc_rows:
        b_id, topic, notes, mem_id, mem_name, m_id, m_num, m_date, v_name, disc_media = row
        is_disc_general = (
            (topic and ("general" in topic.lower() or "tangent" in topic.lower())) or
            (notes and ("general" in notes.lower() or "tangent" in notes.lower())) or
            (disc_media == "tangent")
        )
        if is_disc_general:
            book_general_count[b_id] += 1
        else:
            book_proper_count[b_id] += 1
            book_discs_count[b_id] += 1
            if mem_id and mem_id not in seen_members[b_id]:
                seen_members[b_id].add(mem_id)
                book_members[b_id].append({"id": mem_id, "display_name": mem_name or "Reader"})
            if m_id and m_id not in seen_meetups[b_id]:
                seen_meetups[b_id].add(m_id)
                d_str = m_date.isoformat() if m_date else None
                book_meetups[b_id].append({
                    "id": m_id,
                    "number": m_num,
                    "date": d_str,
                    "venue": v_name
                })
                if d_str:
                    book_dates[b_id].append(d_str)
            
    results = []
    for b in books:
        dates = book_dates[b.id]
        b_media = getattr(b, "media_type", "book") or "book"
        is_gen = (b_media == "tangent") or (book_proper_count[b.id] == 0 and book_general_count[b.id] > 0)
        results.append({
            "id": b.id,
            "title": b.title,
            "normalized_title": b.normalized_title,
            "author_id": b.author_id,
            "author_name": author_map.get(b.author_id),
            "cover_url": b.cover_url,
            "thumbnail_url": b.thumbnail_url or b.cover_url,
            "description": b.description,
            "goodreads_id": b.goodreads_id,
            "publication_year": b.publication_year,
            "rating": b.rating,
            "page_count": b.page_count,
            "media_type": b_media,
            "discussion_count": book_proper_count[b.id] if book_proper_count[b.id] > 0 else book_general_count[b.id],
            "first_discussed_date": min(dates) if dates else None,
            "last_discussed_date": max(dates) if dates else None,
            "meetups": book_meetups[b.id],
            "members": book_members[b.id],
            "is_general_discussion": is_gen,
        })
    return results


def meetup_to_dict(meetup: Meetup, db) -> dict:
    """Convert Meetup to API response dict."""
    return meetups_to_dicts([meetup], db)[0]


def meetups_to_dicts(meetups: list, db) -> list:
    """Batch version of meetup_to_dict: 5 queries for any number of meetups (fixes B1's N+1)."""
    from collections import defaultdict

    meetup_ids = [m.id for m in meetups]
    venue_names = {
        v.id: v.name
        for v in db.query(Venue).filter(Venue.id.in_({m.venue_id for m in meetups if m.venue_id})).all()
    }
    discs_by_meetup = defaultdict(list)
    for d in db.query(Discussion).filter(Discussion.meetup_id.in_(meetup_ids)).all():
        discs_by_meetup[d.meetup_id].append(d)
    all_discs = [d for ds in discs_by_meetup.values() for d in ds]
    books_by_id = {
        b.id: b
        for b in db.query(CanonicalBook).filter(
            CanonicalBook.id.in_({d.canonical_book_id for d in all_discs if d.canonical_book_id})
        ).all()
    }
    author_names = {
        a.id: a.full_name
        for a in db.query(Author).filter(
            Author.id.in_({b.author_id for b in books_by_id.values() if b.author_id})
        ).all()
    }
    members_by_id = {
        m.id: m
        for m in db.query(Member).filter(Member.id.in_({d.member_id for d in all_discs if d.member_id})).all()
    }
    return [
        _meetup_dict(m, venue_names, discs_by_meetup[m.id], books_by_id, author_names, members_by_id)
        for m in meetups
    ]


def _meetup_dict(meetup, venue_names, discussions, books_by_id, author_names, members_by_id) -> dict:
    from collections import defaultdict

    venue = venue_names.get(meetup.venue_id) if meetup.venue_id else None

    # Group by canonical_book_id to avoid duplicate book rows
    grouped_discs = defaultdict(list)
    for disc in discussions:
        if disc.canonical_book_id:
            grouped_discs[disc.canonical_book_id].append(disc)

    books = []
    members = []
    member_ids = set()

    for book_id, disc_list in grouped_discs.items():
        book = books_by_id.get(book_id)
        if not book:
            continue

        author = author_names.get(book.author_id) if book.author_id else None

        member_names = []
        for disc in disc_list:
            if disc.member_id:
                member = members_by_id.get(disc.member_id)
                if member and member.display_name:
                    if member.display_name not in member_names:
                        member_names.append(member.display_name)
                    if member.id not in member_ids:
                        member_ids.add(member.id)
                        members.append({
                            "id": member.id,
                            "display_name": member.display_name,
                        })

        member_str = ", ".join(member_names) if member_names else None
        is_gen = any(
            ((d.topic and "general" in d.topic.lower()) or (d.notes and "general" in d.notes.lower()))
            for d in disc_list
        )
        books.append({
            "id": book.id,
            "title": book.title,
            "author": author,
            "member": member_str,
            "cover_url": book.cover_url,
            "thumbnail_url": book.thumbnail_url,
            "is_discussion_mention": is_gen,
            "is_general_discussion": is_gen,
        })

    # Keep general discussion books down of the list in meetup view
    books.sort(key=lambda x: (
        1 if x["is_discussion_mention"] else 0,
        x["title"].lower() if x["title"] else ""
    ))

    return {
        "id": meetup.id,
        "number": meetup.meetup_number,
        "date": meetup.date.isoformat() if meetup.date else None,
        "venue": venue,
        "title": meetup.title,
        "format": meetup.format,
        "book_count": len(books),
        "member_count": len(members),
        "photo_url": getattr(meetup, "photo_url", None),
        "pdf_url": getattr(meetup, "pdf_url", None),
        "books": books,
        "members": members,
    }


# ============================================
# API Endpoints
# ============================================

@app.get("/health")
def health():
    """Liveness + database reachability, for docker compose and monitoring."""
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "ok"}
    except Exception:
        return JSONResponse(status_code=503, content={"status": "error", "database": "unreachable"})
    finally:
        db.close()


@app.get("/stats")
def get_stats():
    """Get archive statistics."""
    db = SessionLocal()
    try:
        stats = {
            "total_meetups": db.query(Meetup).count(),
            # Meetup numbers are sequential, so the latest number = meetups held.
            "meetups_expected": db.query(func.max(Meetup.meetup_number)).scalar() or 0,
            "canonical_books": db.query(CanonicalBook).count(),
            "books_discussed": db.query(func.count(func.distinct(Discussion.canonical_book_id))).scalar(),
            "imported_books": db.query(ImportedBook).count(),
            "authors": db.query(Author).count(),
            "members": db.query(Member).count(),
            "venues": db.query(Venue).count(),
            "discussions": db.query(Discussion).count(),
            "resources": db.query(Resource).count(),
        }
        return stats
    finally:
        db.close()


@app.get("/books")
@app.get("/api/books")
def get_books(
    search: Optional[str] = None,
    author: Optional[str] = None,
    year: Optional[int] = None,
    sort_by: str = "title",
    sort_order: str = "asc",
    # E6: every list has a maximum. 3,000 covers the whole archive today (2,783 books); Flow E paging replaces this.
    limit: int = Query(3000, ge=1, le=3000),
    offset: int = Query(0, ge=0),
    only_discussed: Optional[bool] = False,
    exclude_general: Optional[bool] = False,
):
    """Get all books with optional filtering."""
    db = SessionLocal()
    try:
        query = db.query(CanonicalBook)

        # Filter: only discussed books and/or exclude general discussions & tangents
        if only_discussed or exclude_general:
            proper_discs = (
                db.query(Discussion.canonical_book_id)
                .filter(
                    Discussion.canonical_book_id.isnot(None),
                    Discussion.media_type == "book",
                    (Discussion.topic == None) | (~Discussion.topic.ilike("%general%") & ~Discussion.topic.ilike("%tangent%")),
                    (Discussion.notes == None) | (~Discussion.notes.ilike("%general%") & ~Discussion.notes.ilike("%tangent%"))
                )
            )
            query = query.filter(
                CanonicalBook.id.in_(proper_discs),
                CanonicalBook.media_type == "book"
            )
        elif only_discussed:
            query = query.filter(
                CanonicalBook.id.in_(
                    db.query(Discussion.canonical_book_id).filter(Discussion.canonical_book_id.isnot(None))
                )
            )

        # Join with Author for author filtering
        if author:
            query = query.join(Author, CanonicalBook.author_id == Author.id, isouter=True)
            query = query.filter(Author.full_name.ilike(f"%{author}%"))

        # Search filter
        if search:
            if not author:
                query = query.join(Author, CanonicalBook.author_id == Author.id, isouter=True)
            query = query.filter(
                (CanonicalBook.title.ilike(f"%{search}%")) |
                (Author.full_name.ilike(f"%{search}%"))
            )

        # Sorting
        if sort_by == "discussionCount":
            # Subquery for discussion count
            from sqlalchemy import func
            subquery = db.query(
                Discussion.canonical_book_id,
                func.count(Discussion.id).label("disc_count")
            ).group_by(Discussion.canonical_book_id).subquery()

            query = query.outerjoin(
                subquery, CanonicalBook.id == subquery.c.canonical_book_id
            )
            query = query.order_by(
                subquery.c.disc_count.desc() if sort_order == "desc" else subquery.c.disc_count.asc()
            )
        elif sort_by == "firstDiscussedYear":
            query = query.order_by(CanonicalBook.created_at.desc() if sort_order == "desc" else CanonicalBook.created_at.asc())
        else:
            query = query.order_by(CanonicalBook.title.desc() if sort_order == "desc" else CanonicalBook.title.asc())

        # Pagination
        if offset:
            query = query.offset(offset)
        if limit:
            query = query.limit(limit)

        books = query.all()
        return batch_books_to_dict(books, db)
    finally:
        db.close()


@app.get("/books/{book_id}")
@app.get("/api/books/{book_id}")
def get_book(book_id: str):
    """Get a single book by ID."""
    db = SessionLocal()
    try:
        book = db.query(CanonicalBook).filter(CanonicalBook.id == book_id).first()
        if not book:
            raise HTTPException(status_code=404, detail="Book not found")
        return book_to_dict(book, db)
    finally:
        db.close()


def fetch_book_metadata_from_web(title: str, author: str = "", goodreads_id: str = None) -> dict:
    """Fetch book synopsis, page count, rating, and cover image from Goodreads JSON-LD or Apple Books."""
    result = {"description": None, "page_count": None, "rating": None, "cover_url": None}
    # 1. Try Goodreads if goodreads_id is present
    if goodreads_id:
        try:
            url = f"https://www.goodreads.com/book/show/{goodreads_id}"
            req = urllib.request.Request(
                url,
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
                }
            )
            with urllib.request.urlopen(req, timeout=3.5) as resp:
                html = resp.read().decode("utf-8", errors="ignore")
                m = re.search(r'<script type="application/ld\+json">(.*?)</script>', html, re.DOTALL)
                if m:
                    data = json.loads(m.group(1))
                    if isinstance(data, dict):
                        if data.get("image") and "nophoto" not in str(data.get("image")):
                            result["cover_url"] = str(data["image"])
                        if data.get("description"):
                            result["description"] = re.sub(r'<[^>]+>', ' ', data["description"]).strip()
                        if data.get("numberOfPages"):
                            try:
                                result["page_count"] = int(data["numberOfPages"])
                            except Exception:
                                pass
                        if data.get("aggregateRating") and isinstance(data["aggregateRating"], dict):
                            try:
                                result["rating"] = float(data["aggregateRating"].get("ratingValue"))
                            except Exception:
                                pass
                        if result["description"] and result["cover_url"]:
                            return result
                m2 = re.search(r'data-testid="description"[^>]*>(.*?)</div>', html, re.DOTALL)
                if m2:
                    result["description"] = re.sub(r'<[^>]+>', ' ', m2.group(1)).strip()
        except Exception:
            pass

    # 2. Try Apple Books API
    try:
        q = urllib.parse.quote(f"{title} {author}".strip())
        url = f"https://itunes.apple.com/search?term={q}&entity=ebook&limit=1"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=3.0) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            results = data.get("results", [])
            if results and len(results) > 0:
                first = results[0]
                if first.get("artworkUrl100") and not result.get("cover_url"):
                    result["cover_url"] = first["artworkUrl100"].replace("100x100bb", "600x600bb")
                if first.get("description") and not result.get("description"):
                    result["description"] = re.sub(r'<[^>]+>', ' ', first["description"]).strip()
                if first.get("averageUserRating") and not result["rating"]:
                    result["rating"] = float(first["averageUserRating"])
                return result
    except Exception:
        pass

    return result


def fetch_book_synopsis_from_web(title: str, author: str = "", goodreads_id: str = None) -> Optional[str]:
    """Compatibility wrapper returning synopsis string."""
    meta = fetch_book_metadata_from_web(title, author, goodreads_id)
    return meta.get("description")


@app.get("/books/{book_id}/synopsis")
def get_book_synopsis_endpoint(book_id: str):
    """Get book synopsis, page count, and rating, fetching from Goodreads if missing in database."""
    db = SessionLocal()
    try:
        book = db.query(CanonicalBook).filter(CanonicalBook.id == book_id).first()
        if not book:
            raise HTTPException(status_code=404, detail="Book not found")
            
        has_full_info = (
            book.description and len(book.description.strip()) > 20 and
            book.page_count and book.page_count > 0 and
            book.rating is not None and
            book.cover_url and "nophoto" not in book.cover_url
        )
        
        if not has_full_info:
            author_name = ""
            if book.author_id:
                author_obj = db.query(Author).filter(Author.id == book.author_id).first()
                if author_obj:
                    author_name = author_obj.full_name
                    
            meta = fetch_book_metadata_from_web(book.title, author_name, book.goodreads_id)
            updated = False
            if meta.get("cover_url") and (not book.cover_url or "nophoto" in book.cover_url):
                book.cover_url = meta["cover_url"]
                updated = True
            if meta.get("description") and (not book.description or len(book.description.strip()) <= 20):
                book.description = meta["description"]
                updated = True
            if meta.get("page_count") and (not book.page_count or book.page_count <= 0):
                book.page_count = meta["page_count"]
                updated = True
            if meta.get("rating") is not None and book.rating is None:
                book.rating = meta["rating"]
                updated = True
            if updated:
                db.commit()
                
        fallback_desc = book.description
        if not fallback_desc or len(fallback_desc.strip()) <= 20:
            meetups = db.query(Meetup.meetup_number).join(Discussion, Discussion.meetup_id == Meetup.id)\
                .filter(Discussion.canonical_book_id == book.id).distinct().all()
            meetup_nums = [f"#{m[0]}" for m in meetups if m[0]]
            meetup_str = f" at {', '.join(meetup_nums)}" if meetup_nums else ""
            fallback_desc = f"Featured and discussed by the Bangalore Book Club community{meetup_str}."

        return {
            "description": fallback_desc,
            "page_count": book.page_count,
            "rating": book.rating,
            "cover_url": book.cover_url,
            "source": "goodreads" if book.goodreads_id else "archive"
        }
    finally:
        db.close()


@app.get("/meetups")
def get_meetups(
    search: Optional[str] = None,
    year: Optional[int] = None,
):
    """Get all meetups."""
    db = SessionLocal()
    try:
        query = db.query(Meetup)

        # Search by meetup number
        if search:
            try:
                num = int(search.replace("#", ""))
                query = query.filter(Meetup.meetup_number == num)
            except ValueError:
                pass

        # Filter by year
        if year:
            from sqlalchemy import extract
            query = query.filter(extract("year", Meetup.date) == year)

        # Sort by date (newest first)
        query = query.order_by(Meetup.date.desc())

        meetups = query.all()
        return meetups_to_dicts(meetups, db)
    finally:
        db.close()


@app.get("/meetups/{meetup_id}")
def get_meetup(meetup_id: str):
    """Get a single meetup by ID or number."""
    db = SessionLocal()
    try:
        # Try by number first
        try:
            num = int(meetup_id.replace("#", ""))
            meetup = db.query(Meetup).filter(Meetup.meetup_number == num).first()
        except ValueError:
            meetup = None

        # Try by ID if not found
        if not meetup:
            meetup = db.query(Meetup).filter(Meetup.id == meetup_id).first()

        if not meetup:
            raise HTTPException(status_code=404, detail="Meetup not found")

        return meetup_to_dict(meetup, db)
    finally:
        db.close()


@app.get("/search")
def search(q: str = Query(..., min_length=1)):
    """Search across books and meetups."""
    db = SessionLocal()
    try:
        # Search books
        books = db.query(CanonicalBook).filter(
            CanonicalBook.title.ilike(f"%{q}%")
        ).limit(10).all()

        # Search meetups by number
        meetups = []
        try:
            num = int(q.replace("#", ""))
            meetups = db.query(Meetup).filter(
                Meetup.meetup_number == num
            ).all()
        except ValueError:
            pass

        return {
            "books": [book_to_dict(b, db) for b in books],
            "meetups": meetups_to_dicts(meetups, db),
        }
    finally:
        db.close()


# ============================================
# Members & Readers Endpoints
# ============================================

@app.get("/members")
def get_members(
    search: Optional[str] = None,
    sort_by: str = "books",  # 'books', 'name', 'meetups'
    include_hidden: bool = False,
):
    """Get all BBB members with reading and attendance metrics."""
    db = SessionLocal()
    try:
        query = db.query(Member)
        if not include_hidden:
            query = query.filter((Member.is_hidden == False) | (Member.is_hidden == None))
        if search:
            query = query.filter(Member.display_name.ilike(f"%{search}%"))

        members = query.all()

        results = []
        for m in members:
            # Query discussions by this member
            discs = db.query(Discussion).filter(Discussion.member_id == m.id).all()
            meetup_ids = set()
            book_ids = set()
            dates = []

            for d in discs:
                if d.canonical_book_id:
                    book_ids.add(d.canonical_book_id)
                if d.meetup_id:
                    meetup_ids.add(d.meetup_id)
                    meetup = db.query(Meetup).filter(Meetup.id == d.meetup_id).first()
                    if meetup and meetup.date:
                        dates.append(meetup.date.isoformat())

            # Query sample book covers for reader preview
            sample_covers = []
            for b_id in list(book_ids)[:8]:
                cb = db.query(CanonicalBook).filter(CanonicalBook.id == b_id).first()
                if cb and (cb.cover_url or cb.thumbnail_url):
                    sample_covers.append(cb.cover_url or cb.thumbnail_url)
                if len(sample_covers) >= 4:
                    break

            results.append({
                "id": m.id,
                "display_name": m.display_name,
                "is_hidden": bool(m.is_hidden),
                "book_count": len(book_ids),
                "meetup_count": len(meetup_ids),
                "first_active_date": min(dates, default=None),
                "last_active_date": max(dates, default=None),
                "covers": sample_covers,
            })

        if sort_by == "name":
            results.sort(key=lambda x: x["display_name"].lower())
        elif sort_by == "meetups":
            results.sort(key=lambda x: (x["meetup_count"], x["book_count"]), reverse=True)
        else:
            results.sort(key=lambda x: (x["book_count"], x["meetup_count"]), reverse=True)

        return results
    finally:
        db.close()


@app.get("/members/{member_id}")
def get_member(member_id: str):
    """Get detailed archival dossier for a single member."""
    db = SessionLocal()
    try:
        # Match by ID or display_name
        member = db.query(Member).filter(Member.id == member_id).first()
        if not member:
            member = db.query(Member).filter(Member.display_name.ilike(member_id)).first()

        if not member:
            raise HTTPException(status_code=404, detail="Member not found in archive")

        # Get all discussions
        discussions = db.query(Discussion).filter(Discussion.member_id == member.id).all()

        books_map = {}
        meetups_map = {}

        for disc in discussions:
            meetup = None
            venue_name = None
            if disc.meetup_id:
                meetup = db.query(Meetup).filter(Meetup.id == disc.meetup_id).first()
                if meetup:
                    if meetup.id not in meetups_map:
                        if meetup.venue_id:
                            v = db.query(Venue).filter(Venue.id == meetup.venue_id).first()
                            venue_name = v.name if v else None
                        meetups_map[meetup.id] = {
                            "id": meetup.id,
                            "number": meetup.meetup_number,
                            "date": meetup.date.isoformat() if meetup.date else None,
                            "venue": venue_name,
                        }

            if disc.canonical_book_id:
                book = db.query(CanonicalBook).filter(CanonicalBook.id == disc.canonical_book_id).first()
                if book:
                    author_name = None
                    if book.author_id:
                        a = db.query(Author).filter(Author.id == book.author_id).first()
                        if a:
                            author_name = a.full_name

                    if book.id not in books_map:
                        books_map[book.id] = {
                            "id": book.id,
                            "title": book.title,
                            "author_id": book.author_id,
                            "author_name": author_name,
                            "cover_url": book.cover_url,
                            "thumbnail_url": book.thumbnail_url,
                            "meetups": [],
                        }

                    if meetup:
                        books_map[book.id]["meetups"].append({
                            "meetup_number": meetup.meetup_number,
                            "date": meetup.date.isoformat() if meetup.date else None,
                            "venue": venue_name,
                        })

        meetup_list = sorted(meetups_map.values(), key=lambda x: x["number"] if x["number"] else 0, reverse=True)
        dates = [m["date"] for m in meetup_list if m["date"]]

        return {
            "id": member.id,
            "display_name": member.display_name,
            "bio": member.bio,
            "is_hidden": bool(member.is_hidden),
            "book_count": len(books_map),
            "meetup_count": len(meetups_map),
            "first_active_date": min(dates, default=None),
            "last_active_date": max(dates, default=None),
            "books": list(books_map.values()),
            "meetups": meetup_list,
        }
    finally:
        db.close()


class MemberVisibilityRequest(BaseModel):
    is_hidden: bool = True


@app.put("/admin/members/{member_id}/visibility")
@app.post("/admin/members/{member_id}/toggle-hide")
def set_member_visibility(member_id: str, req: Optional[MemberVisibilityRequest] = None):
    """Temporarily hide or restore a member from the public Readers Archive."""
    db = SessionLocal()
    try:
        member = db.query(Member).filter((Member.id == member_id) | (Member.display_name.ilike(member_id))).first()
        if not member:
            raise HTTPException(status_code=404, detail="Member not found")
        
        if req is not None and hasattr(req, "is_hidden"):
            member.is_hidden = req.is_hidden
        else:
            member.is_hidden = not bool(member.is_hidden)
            
        db.commit()
        state_str = "hidden from" if member.is_hidden else "restored to"
        return {
            "success": True, 
            "id": member.id, 
            "display_name": member.display_name, 
            "is_hidden": bool(member.is_hidden),
            "message": f"Member '{member.display_name}' {state_str} public archive."
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to update member visibility") from e
    finally:
        db.close()


@app.delete("/admin/members/{member_id}")
def delete_member(member_id: str):
    """Permanently remove a member from the members table, while keeping a recovery snapshot."""
    db = SessionLocal()
    try:
        member = db.query(Member).filter((Member.id == member_id) | (Member.display_name.ilike(member_id))).first()
        if not member:
            raise HTTPException(status_code=404, detail="Member not found")

        # 1. Capture snapshot of member's discussions for clean recovery
        discs = db.query(Discussion.id).filter(Discussion.member_id == member.id).all()
        disc_ids = [d[0] for d in discs]

        db.execute(
            text("""
                INSERT INTO removed_members_archive (id, display_name, normalized_name, bio, discussions_snapshot)
                VALUES (:id, :display_name, :normalized_name, :bio, :discussions_snapshot)
                ON CONFLICT(id) DO UPDATE SET 
                    display_name = :display_name,
                    normalized_name = :normalized_name,
                    bio = :bio,
                    discussions_snapshot = :discussions_snapshot,
                    removed_at = CURRENT_TIMESTAMP
            """),
            {
                "id": member.id,
                "display_name": member.display_name,
                "normalized_name": member.normalized_name,
                "bio": member.bio,
                "discussions_snapshot": json.dumps(disc_ids),
            }
        )

        # 2. Safely unlink foreign key references so discussion historical books remain in meetups
        db.query(Discussion).filter(Discussion.member_id == member.id).update({"member_id": None}, synchronize_session=False)
        db.query(Quote).filter(Quote.member_id == member.id).update({"member_id": None}, synchronize_session=False)
        db.query(Recommendation).filter(Recommendation.recommender_id == member.id).update({"recommender_id": None}, synchronize_session=False)
        db.query(CurrentRead).filter(CurrentRead.member_id == member.id).delete(synchronize_session=False)
        db.query(DiscussionParticipant).filter(DiscussionParticipant.member_id == member.id).delete(synchronize_session=False)

        # 3. Actually delete the member record
        member_name = member.display_name
        member_id_str = member.id
        db.delete(member)
        db.commit()

        return {
            "success": True,
            "id": member_id_str,
            "display_name": member_name,
            "message": f"Member '{member_name}' removed from database."
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to remove member") from e
    finally:
        db.close()


@app.get("/admin/removed-members")
def get_removed_members():
    """Get all removed members from the archive table."""
    db = SessionLocal()
    try:
        rows = db.execute(text("SELECT id, display_name, removed_at, discussions_snapshot FROM removed_members_archive ORDER BY removed_at DESC")).fetchall()
        return [
            {
                "id": r.id,
                "display_name": r.display_name,
                "removed_at": str(r.removed_at) if r.removed_at else None,
                "book_count": len(json.loads(r.discussions_snapshot or "[]")),
            }
            for r in rows
        ]
    finally:
        db.close()


@app.post("/admin/members/{member_id}/restore")
def restore_member(member_id: str):
    """Restore a previously removed member from the archive back into the members table."""
    db = SessionLocal()
    try:
        row = db.execute(
            text("SELECT id, display_name, normalized_name, bio, discussions_snapshot FROM removed_members_archive WHERE id = :id OR display_name = :id"),
            {"id": member_id}
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Removed member record not found in archive")

        # Re-create Member in members table
        new_m = Member(
            id=row.id,
            display_name=row.display_name,
            normalized_name=row.normalized_name,
            bio=row.bio,
        )
        db.add(new_m)
        db.flush()

        # Re-link discussions
        if row.discussions_snapshot:
            disc_ids = json.loads(row.discussions_snapshot)
            if disc_ids:
                db.query(Discussion).filter(Discussion.id.in_(disc_ids)).update({"member_id": new_m.id}, synchronize_session=False)

        # Remove from archive table
        db.execute(text("DELETE FROM removed_members_archive WHERE id = :id"), {"id": row.id})
        db.commit()

        return {
            "success": True,
            "id": row.id,
            "display_name": row.display_name,
            "message": f"Member '{row.display_name}' restored to database."
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to restore member") from e
    finally:
        db.close()



# ============================================
# Authors Endpoints
# ============================================

@app.get("/authors/{author_id}")
def get_author(author_id: str):
    """Get author archival record and books discussed at BBB."""
    db = SessionLocal()
    try:
        author = db.query(Author).filter(Author.id == author_id).first()
        if not author:
            author = db.query(Author).filter(Author.full_name.ilike(author_id)).first()

        if not author:
            raise HTTPException(status_code=404, detail="Author not found in archive")

        # Get all canonical books by this author
        books = db.query(CanonicalBook).filter(CanonicalBook.author_id == author.id).all()

        book_records = []
        total_discussions = 0

        for b in books:
            book_dict = book_to_dict(b, db)
            total_discussions += book_dict["discussion_count"]
            book_records.append(book_dict)

        # Sort books by discussion count desc
        book_records.sort(key=lambda x: x["discussion_count"], reverse=True)

        return {
            "id": author.id,
            "full_name": author.full_name,
            "country": author.country,
            "description": author.description,
            "book_count": len(book_records),
            "discussion_count": total_discussions,
            "books": book_records,
        }
    finally:
        db.close()


# ============================================
# Health check
# ============================================

# ============================================
# Admin / Manual Database Management Endpoints
# ============================================

def to_title_case_name(name: str) -> str:
    """Helper to convert names to Title Case, preserving single-letter initials."""
    if not name:
        return name
    words = name.strip().split()
    title_words = []
    for w in words:
        if len(w) == 1:
            title_words.append(w.upper())
        elif w.isupper():
            title_words.append(w.capitalize())
        else:
            title_words.append(w[0].upper() + w[1:])
    return " ".join(title_words)


class _LinkFields(BaseModel):
    """F2: stored links must be http(s); javascript:, data: and other schemes are refused."""

    @field_validator("url", "cover_url", "thumbnail_url", check_fields=False)
    @classmethod
    def _http_only(cls, v):
        if v and urllib.parse.urlparse(v.strip()).scheme not in ("http", "https"):
            raise ValueError("must be an http or https link")
        return v.strip() if v else v


class MeetupUpdateRequest(BaseModel):
    date: Optional[str] = None
    venue: Optional[str] = None
    title: Optional[str] = None

class BookUpdateRequest(_LinkFields):
    title: str
    author: Optional[str] = None
    member: Optional[str] = None
    discussion_id: Optional[str] = None
    notes: Optional[str] = None
    cover_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    publication_year: Optional[int] = None
    rating: Optional[float] = None
    goodreads_id: Optional[str] = None
    description: Optional[str] = None
    is_general_discussion: Optional[bool] = None
    media_type: Optional[str] = "book"
    url: Optional[str] = None

class AddBookToMeetupRequest(_LinkFields):
    title: str
    author: Optional[str] = None
    member: Optional[str] = None
    notes: Optional[str] = None
    cover_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    publication_year: Optional[int] = None
    rating: Optional[float] = None
    goodreads_id: Optional[str] = None
    description: Optional[str] = None
    is_general_discussion: Optional[bool] = False
    media_type: Optional[str] = "book"
    url: Optional[str] = None

class ToggleGeneralDiscussionRequest(BaseModel):
    is_general_discussion: bool

class MemberVisibilityRequest(BaseModel):
    is_hidden: bool = True



@app.get("/admin/meetups")
def get_admin_meetups():
    """Get all meetups with detailed editable book and discussion records."""
    db = SessionLocal()
    try:
        from collections import defaultdict
        query = db.query(Meetup).order_by(Meetup.meetup_number.desc())
        meetups = query.all()
        result = []
        for m in meetups:
            venue = db.query(Venue).filter(Venue.id == m.venue_id).first()
            discussions = db.query(Discussion).filter(Discussion.meetup_id == m.id).all()
            
            # Group discussions by canonical_book_id so books discussed by multiple members appear once
            grouped_discs = defaultdict(list)
            for d in discussions:
                if d.canonical_book_id:
                    grouped_discs[d.canonical_book_id].append(d)
                else:
                    grouped_discs[f"disc_{d.id}"].append(d)

            books_list = []
            for group_key, disc_list in grouped_discs.items():
                first_disc = disc_list[0]
                book = None
                if first_disc.canonical_book_id:
                    book = db.query(CanonicalBook).filter(CanonicalBook.id == first_disc.canonical_book_id).first()
                if not book:
                    continue

                author = db.query(Author).filter(Author.id == book.author_id).first() if book.author_id else None
                
                # Combine all discussant names
                member_names = []
                for d in disc_list:
                    if d.member_id:
                        member = db.query(Member).filter(Member.id == d.member_id).first()
                        if member and member.display_name and member.display_name not in member_names:
                            member_names.append(member.display_name)

                member_str = ", ".join(member_names) if member_names else None
                
                is_gen = any(
                    bool((d.notes and "general" in d.notes.lower()) or (d.topic and "general" in d.topic.lower()))
                    for d in disc_list
                )
                note_val = next((d.notes for d in disc_list if d.notes), None)

                books_list.append({
                    "discussion_id": first_disc.id,
                    "discussion_ids": [d.id for d in disc_list],
                    "book_id": book.id,
                    "title": book.title,
                    "author": author.full_name if author else None,
                    "member": member_str,
                    "notes": note_val,
                    "is_general_discussion": is_gen,
                    "media_type": getattr(first_disc, "media_type", None) or getattr(book, "media_type", "book") or "book",
                    "url": getattr(first_disc, "external_url", None) or getattr(book, "external_url", None),
                    "cover_url": book.cover_url or book.thumbnail_url,
                    "thumbnail_url": book.thumbnail_url or book.cover_url,
                    "rating": book.rating,
                    "publication_year": book.publication_year,
                    "goodreads_id": book.goodreads_id,
                })
            # sort books: regular books first (alphabetical), general discussion books down of the list (alphabetical)
            books_list.sort(key=lambda x: (
                1 if x.get("is_general_discussion") else 0,
                x["title"].lower() if x["title"] else ""
            ))
            result.append({
                "id": m.id,
                "number": m.meetup_number,
                "date": m.date.isoformat() if m.date else None,
                "venue": venue.name if venue else None,
                "title": m.title,
                "photo_url": m.photo_url,
                "pdf_url": m.pdf_url,
                "books_count": len(books_list),
                "books": books_list,
            })
        return result
    finally:
        db.close()


@app.put("/admin/meetups/{meetup_number}")
def update_admin_meetup(meetup_number: int, req: MeetupUpdateRequest):
    """Update meetup date, venue, or title."""
    db = SessionLocal()
    try:
        meetup = db.query(Meetup).filter(Meetup.meetup_number == meetup_number).first()
        if not meetup:
            raise HTTPException(status_code=404, detail="Meetup not found")
        if req.date:
            try:
                meetup.date = datetime.strptime(req.date, "%Y-%m-%d").date()
            except ValueError:
                pass
        if req.title is not None:
            meetup.title = req.title.strip()
        if req.venue is not None:
            venue_obj = db.query(Venue).filter(Venue.name.ilike(req.venue.strip())).first()
            if not venue_obj and req.venue.strip():
                venue_obj = Venue(name=req.venue.strip(), city="Bangalore")
                db.add(venue_obj)
                db.flush()
            if venue_obj:
                meetup.venue_id = venue_obj.id
        db.commit()
        return {"success": True, "message": f"Meetup #{meetup_number} updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Something went wrong on the server.") from e
    finally:
        db.close()


# ponytail: 4.5 MB cap set by the founders (2026-10-09) to match Vercel's 4.5 MB request-body limit (D36).
# Multipart headers add a few hundred bytes, so a file right at the cap may be refused by Vercel before it gets here.
MAX_UPLOAD_BYTES = 4_500_000


@app.post("/admin/meetups/{meetup_number}/photo")
async def upload_meetup_photo(meetup_number: int, file: UploadFile = File(...)):
    """Upload group picture or media for a meetup."""
    content = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File is larger than 4.5 MB")

    db = SessionLocal()
    try:
        meetup = db.query(Meetup).filter(Meetup.meetup_number == meetup_number).first()
        if not meetup:
            raise HTTPException(status_code=404, detail="Meetup not found")

        ext = os.path.splitext(file.filename or "")[1].lower()
        if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
            ext = ".jpg"

        dest_filename = f"meetup_{meetup_number}_photo{ext}"
        dest_path = asset_path("uploads", "meetups", dest_filename)
        os.makedirs(os.path.dirname(dest_path), exist_ok=True)

        with open(dest_path, "wb") as f:
            f.write(content)

        photo_url = f"/assets/uploads/meetups/{dest_filename}"
        meetup.photo_url = photo_url
        db.commit()

        return {
            "success": True,
            "photo_url": photo_url,
            "message": f"Group photo for Meetup #{meetup_number} uploaded successfully"
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Something went wrong on the server.") from e
    finally:
        db.close()


@app.delete("/admin/meetups/{meetup_number}/photo")
def delete_meetup_photo(meetup_number: int):
    """Remove uploaded group photo for a meetup."""
    db = SessionLocal()
    try:
        meetup = db.query(Meetup).filter(Meetup.meetup_number == meetup_number).first()
        if not meetup:
            raise HTTPException(status_code=404, detail="Meetup not found")

        meetup.photo_url = None
        db.commit()
        return {"success": True, "message": "Group photo removed"}
    finally:
        db.close()


@app.post("/admin/meetups/{meetup_number}/generate-pdf")
def generate_meetup_pdf_endpoint(meetup_number: int):
    """
    Generate a full-fidelity Canva-style PDF magazine for the meetup,
    incorporating the books discussed, book covers, and group picture.
    """
    from app.services.pdf_generator import generate_meetup_pdf
    db = SessionLocal()
    try:
        meetup = db.query(Meetup).filter(Meetup.meetup_number == meetup_number).first()
        if not meetup:
            raise HTTPException(status_code=404, detail="Meetup not found")

        pdf_path = generate_meetup_pdf(meetup_number, db)
        pdf_url = f"/assets/generated_pdfs/bbb_meetup_{meetup_number}.pdf"
        meetup.pdf_url = pdf_url
        db.commit()

        return {
            "success": True,
            "pdf_url": pdf_url,
            "meetup_number": meetup_number,
            "message": f"Magazine PDF for Meetup #{meetup_number} generated successfully!"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Something went wrong on the server.") from e
    finally:
        db.close()


@app.get("/meetups/{meetup_number}/pdf")
def public_meetup_pdf(meetup_number: int):
    """Public PDF download. Generates into the file cache when missing, never writes the database
    (public GETs stay read-only; the admin route records pdf_url)."""
    from app.services.pdf_generator import generate_meetup_pdf
    db = SessionLocal()
    try:
        if not db.query(Meetup.id).filter(Meetup.meetup_number == meetup_number).first():
            raise HTTPException(status_code=404, detail="Meetup not found")
        pdf_path = asset_path("generated_pdfs", f"bbb_meetup_{meetup_number}.pdf")
        if not os.path.exists(pdf_path):
            pdf_path = asset_path(os.path.relpath(generate_meetup_pdf(meetup_number, db), ASSETS_DIR))
            db.rollback()  # discard anything the generator may have staged
        return FileResponse(pdf_path, media_type="application/pdf",
                            filename=f"BBB_{meetup_number}_Books_Discussed.pdf")
    finally:
        db.close()


@app.get("/admin/meetups/{meetup_number}/pdf")
def download_meetup_pdf_endpoint(meetup_number: int):
    """Download the generated PDF for the meetup, generating it on-demand if not already generated."""
    from app.services.pdf_generator import generate_meetup_pdf
    db = SessionLocal()
    try:
        meetup = db.query(Meetup).filter(Meetup.meetup_number == meetup_number).first()
        if not meetup:
            raise HTTPException(status_code=404, detail="Meetup not found")

        pdf_path = asset_path("generated_pdfs", f"bbb_meetup_{meetup_number}.pdf")
        if not os.path.exists(pdf_path):
            pdf_path = asset_path(os.path.relpath(generate_meetup_pdf(meetup_number, db), ASSETS_DIR))
            meetup.pdf_url = f"/assets/generated_pdfs/bbb_meetup_{meetup_number}.pdf"
            db.commit()

        return FileResponse(
            pdf_path,
            media_type="application/pdf",
            filename=f"BBB_{meetup_number}_Books_Discussed.pdf"
        )
    finally:
        db.close()


@app.put("/admin/books/{book_id}")
def update_admin_book(book_id: str, req: BookUpdateRequest):
    """Update book title, author, and meetup discussion contributor/notes."""
    db = SessionLocal()
    try:
        book = db.query(CanonicalBook).filter(CanonicalBook.id == book_id).first()
        if not book:
            raise HTTPException(status_code=404, detail="Book not found")
        book.title = req.title.strip()
        book.normalized_title = req.title.strip().lower()
        if req.author is not None:
            author_clean = req.author.strip()
            if author_clean:
                author_obj = db.query(Author).filter(Author.full_name.ilike(author_clean)).first()
                if not author_obj:
                    author_obj = Author(
                        full_name=author_clean,
                        normalized_name=author_clean.lower()
                    )
                    db.add(author_obj)
                    db.flush()
                book.author_id = author_obj.id
            else:
                book.author_id = None

        # Update Discussion records (Readers / Discussed By & Notes) if discussion_id is provided
        if req.discussion_id:
            disc = db.query(Discussion).filter(Discussion.id == req.discussion_id).first()
            if disc:
                meetup_id = disc.meetup_id
                target_book_id = disc.canonical_book_id or book.id

                # Fetch all existing discussions for this book in this meetup
                book_discs = db.query(Discussion).filter(
                    Discussion.meetup_id == meetup_id,
                    Discussion.canonical_book_id == target_book_id
                ).all()
                if not book_discs:
                    book_discs = [disc]

                if req.member is not None:
                    member_raw = req.member.strip()
                    raw_names = [n.strip() for n in member_raw.split(",") if n.strip()]
                    cleaned_names = []
                    for n in raw_names:
                        if n.lower() not in ["unknown", "--", "none"]:
                            tc = to_title_case_name(n)
                            if tc and tc not in cleaned_names:
                                cleaned_names.append(tc)

                    if not cleaned_names:
                        # No members assigned: retain 1 discussion row with member_id = None
                        first_d = book_discs[0]
                        first_d.member_id = None
                        for extra_d in book_discs[1:]:
                            db.delete(extra_d)
                        book_discs = [first_d]
                    else:
                        target_member_ids = []
                        for name in cleaned_names:
                            mem = db.query(Member).filter(Member.display_name.ilike(name)).first()
                            if not mem:
                                mem = Member(
                                    display_name=name,
                                    normalized_name=name.lower()
                                )
                                db.add(mem)
                                db.flush()
                            target_member_ids.append(mem.id)

                        existing_by_member = {}
                        discs_without_member = []
                        for d in book_discs:
                            if d.member_id:
                                existing_by_member[d.member_id] = d
                            else:
                                discs_without_member.append(d)

                        updated_discs = []
                        for mem_id in target_member_ids:
                            if mem_id in existing_by_member:
                                updated_discs.append(existing_by_member[mem_id])
                                del existing_by_member[mem_id]
                            elif discs_without_member:
                                reuse_d = discs_without_member.pop()
                                reuse_d.member_id = mem_id
                                updated_discs.append(reuse_d)
                            else:
                                new_d = Discussion(
                                    meetup_id=meetup_id,
                                    canonical_book_id=target_book_id,
                                    member_id=mem_id,
                                    topic=disc.topic,
                                    notes=disc.notes,
                                )
                                db.add(new_d)
                                updated_discs.append(new_d)

                        for left_d in existing_by_member.values():
                            db.delete(left_d)
                        for left_d in discs_without_member:
                            db.delete(left_d)

                        book_discs = updated_discs

                # Update notes & general discussion status across all discussions for this book in this meetup
                for d in book_discs:
                    if req.notes is not None:
                        notes_clean = req.notes.strip()
                        d.notes = notes_clean if notes_clean else None

                    if req.media_type is not None:
                        d.media_type = req.media_type
                    if req.url is not None:
                        d.external_url = req.url

                    if req.is_general_discussion is not None:
                        if req.is_general_discussion:
                            d.topic = "General Discussion"
                            if not d.notes or "general" not in d.notes.lower():
                                d.notes = "General Discussion"
                        else:
                            if d.topic and "general" in d.topic.lower():
                                d.topic = None
                            if d.notes and "general" in d.notes.lower():
                                d.notes = None

        if req.media_type is not None:
            book.media_type = req.media_type
        if req.url is not None:
            book.external_url = req.url
        if req.cover_url:
            book.cover_url = req.cover_url
            book.thumbnail_url = req.thumbnail_url or req.cover_url
        if req.publication_year is not None:
            book.publication_year = req.publication_year
        if req.rating is not None:
            book.rating = req.rating
        if req.goodreads_id is not None:
            book.goodreads_id = req.goodreads_id

        db.commit()
        return {"success": True, "message": f"Book '{book.title}' updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Something went wrong on the server.") from e
    finally:
        db.close()


@app.patch("/admin/discussions/{discussion_id}/general")
def toggle_admin_discussion_general(discussion_id: str, req: ToggleGeneralDiscussionRequest):
    """Directly toggle General Discussion flag for a discussion record (and all related readers for this book in this meetup)."""
    db = SessionLocal()
    try:
        disc = db.query(Discussion).filter(Discussion.id == discussion_id).first()
        if not disc:
            raise HTTPException(status_code=404, detail="Discussion entry not found")
        
        discs = [disc]
        if disc.meetup_id and disc.canonical_book_id:
            discs = db.query(Discussion).filter(
                Discussion.meetup_id == disc.meetup_id,
                Discussion.canonical_book_id == disc.canonical_book_id
            ).all()

        for d in discs:
            if req.is_general_discussion:
                d.topic = "General Discussion"
                if not d.notes or "general" not in d.notes.lower():
                    d.notes = "General Discussion"
            else:
                if d.topic and "general" in d.topic.lower():
                    d.topic = None
                if d.notes and "general" in d.notes.lower():
                    d.notes = None
                
        db.commit()
        return {
            "success": True,
            "discussion_id": discussion_id,
            "is_general_discussion": req.is_general_discussion,
            "notes": disc.notes,
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Something went wrong on the server.") from e
    finally:
        db.close()


@app.delete("/admin/discussions/{discussion_id}")
def delete_admin_discussion(discussion_id: str):
    """Remove a book discussion association (including all readers of this book) from a meetup."""
    db = SessionLocal()
    try:
        disc = db.query(Discussion).filter(Discussion.id == discussion_id).first()
        if not disc:
            raise HTTPException(status_code=404, detail="Discussion entry not found")
        if disc.meetup_id and disc.canonical_book_id:
            db.query(Discussion).filter(
                Discussion.meetup_id == disc.meetup_id,
                Discussion.canonical_book_id == disc.canonical_book_id
            ).delete(synchronize_session=False)
        else:
            db.delete(disc)
        db.commit()
        return {"success": True, "message": "Book removed from meetup successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Something went wrong on the server.") from e
    finally:
        db.close()


@app.post("/admin/meetups/{meetup_number}/books")
def add_book_to_meetup(meetup_number: int, req: AddBookToMeetupRequest):
    """Add a book to a meetup with multi-reader support."""
    db = SessionLocal()
    try:
        meetup = db.query(Meetup).filter(Meetup.meetup_number == meetup_number).first()
        if not meetup:
            raise HTTPException(status_code=404, detail="Meetup not found")

        # Find or create author
        author_id = None
        if req.author and req.author.strip():
            author_name = req.author.strip()
            author_obj = db.query(Author).filter(Author.full_name.ilike(author_name)).first()
            if not author_obj:
                author_obj = Author(full_name=author_name, normalized_name=author_name.lower())
                db.add(author_obj)
                db.flush()
            author_id = author_obj.id

        # Find or create canonical book
        title_clean = req.title.strip()
        book = db.query(CanonicalBook).filter(CanonicalBook.normalized_title == title_clean.lower()).first()
        m_type = req.media_type or "book"
        ext_url = req.url.strip() if req.url and req.url.strip() else None

        if not book:
            book = CanonicalBook(
                title=title_clean,
                normalized_title=title_clean.lower(),
                author_id=author_id,
                cover_url=req.cover_url,
                thumbnail_url=req.thumbnail_url or req.cover_url,
                publication_year=req.publication_year,
                rating=req.rating,
                goodreads_id=req.goodreads_id,
                description=req.description,
                media_type=m_type,
                external_url=ext_url,
            )
            db.add(book)
            db.flush()
        else:
            # Check if this book is ALREADY in this meetup's list
            existing_meetup_disc = db.query(Discussion).filter(
                Discussion.meetup_id == meetup.id,
                Discussion.canonical_book_id == book.id
            ).first()
            if existing_meetup_disc:
                raise HTTPException(
                    status_code=400,
                    detail=f"Item '{book.title}' is already in Meetup #{meetup_number}'s list. Edit the existing item to update details or add discussants."
                )

            # Enrich existing book with incoming metadata if missing
            if req.cover_url and not book.cover_url:
                book.cover_url = req.cover_url
                book.thumbnail_url = req.thumbnail_url or req.cover_url
            if req.publication_year and not book.publication_year:
                book.publication_year = req.publication_year
            if req.rating and not book.rating:
                book.rating = req.rating
            if req.goodreads_id and not book.goodreads_id:
                book.goodreads_id = req.goodreads_id
            if req.description and not book.description:
                book.description = req.description
            if author_id and not book.author_id:
                book.author_id = author_id
            if m_type != "book" and (not book.media_type or book.media_type == "book"):
                book.media_type = m_type
            if ext_url and not book.external_url:
                book.external_url = ext_url

        # Find or create member(s)
        cleaned_names = []
        if req.member and req.member.strip():
            raw_names = [n.strip() for n in req.member.split(",") if n.strip()]
            for n in raw_names:
                if n.lower() not in ["unknown", "--", "none"]:
                    tc = to_title_case_name(n)
                    if tc and tc not in cleaned_names:
                        cleaned_names.append(tc)

        # Create discussion link(s)
        is_gen = req.is_general_discussion or (m_type != "book")
        topic = "General Discussion" if is_gen else None
        notes_val = req.notes.strip() if req.notes and req.notes.strip() else None
        if is_gen and not notes_val:
            notes_val = "General Discussion"

        if not cleaned_names:
            # Check if discussion already exists for this book in this meetup
            existing_disc = db.query(Discussion).filter(
                Discussion.meetup_id == meetup.id,
                Discussion.canonical_book_id == book.id
            ).first()
            if not existing_disc:
                disc = Discussion(
                    meetup_id=meetup.id,
                    canonical_book_id=book.id,
                    member_id=None,
                    topic=topic,
                    notes=notes_val,
                    media_type=m_type,
                    external_url=ext_url,
                )
                db.add(disc)
        else:
            for name in cleaned_names:
                member_obj = db.query(Member).filter(Member.display_name.ilike(name)).first()
                if not member_obj:
                    member_obj = Member(display_name=name, normalized_name=name.lower())
                    db.add(member_obj)
                    db.flush()

                # Check if this member already has a discussion for this book in this meetup
                existing_disc = db.query(Discussion).filter(
                    Discussion.meetup_id == meetup.id,
                    Discussion.canonical_book_id == book.id,
                    Discussion.member_id == member_obj.id
                ).first()
                if not existing_disc:
                    disc = Discussion(
                        meetup_id=meetup.id,
                        canonical_book_id=book.id,
                        member_id=member_obj.id,
                        topic=topic,
                        notes=notes_val,
                        media_type=m_type,
                        external_url=ext_url,
                    )
                    db.add(disc)

        db.commit()
        return {"success": True, "message": f"Added '{title_clean}' to Meetup #{meetup_number}"}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Something went wrong on the server.") from e
    finally:
        db.close()


# ============================================
# Book Autocomplete & External Integration
# ============================================

_SUGGESTION_CACHE = {}

def search_external_books(q: str) -> list:
    """
    Search external book sources (Goodreads autocomplete with Apple Books fallback).
    Returns standardized list of book dictionaries.
    """
    results = []
    q_clean = q.strip()
    if not q_clean:
        return results

    # 1. Query Goodreads autocomplete
    try:
        url = f"https://www.goodreads.com/book/auto_complete?format=json&q={urllib.parse.quote(q_clean)}"
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
            },
        )
        with urllib.request.urlopen(req, timeout=3.0) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            for item in data[:8]:
                raw_title = item.get("bookTitleBare") or item.get("title") or ""
                if not raw_title:
                    continue
                # Skip standalone study guides unless explicitly searched
                if "study guide" in raw_title.lower() and "study guide" not in q_clean.lower():
                    continue
                if "summary & study" in raw_title.lower():
                    continue

                author_obj = item.get("author")
                author = author_obj.get("name") if isinstance(author_obj, dict) else None
                if author:
                    author = re.sub(r"\s+", " ", author).strip()

                img = item.get("imageUrl")
                # Upgrade Goodreads thumbnail to higher resolution
                high_img = re.sub(r"\._S[XY]\d+_\.", "._SY450_.", img) if img else None

                rating = None
                try:
                    if item.get("avgRating"):
                        rating = float(item.get("avgRating"))
                except (ValueError, TypeError):
                    pass

                results.append({
                    "title": raw_title.strip(),
                    "author": author,
                    "cover_url": high_img,
                    "thumbnail_url": img,
                    "goodreads_id": str(item.get("bookId")) if item.get("bookId") else None,
                    "rating": rating,
                    "ratings_count": item.get("ratingsCount"),
                    "num_pages": item.get("numPages"),
                    "source": "goodreads",
                    "source_label": "Goodreads",
                })
    except Exception as e:
        # Fall through to Apple Books fallback
        pass

    # 2. Apple Books fallback if Goodreads returned no results or timed out
    if not results:
        try:
            url = f"https://itunes.apple.com/search?term={urllib.parse.quote(q_clean)}&entity=ebook&limit=6"
            with urllib.request.urlopen(url, timeout=3.0) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                for item in data.get("results", []):
                    img = item.get("artworkUrl100")
                    high_img = img.replace("100x100bb", "600x600bb") if img else None
                    year = None
                    if item.get("releaseDate"):
                        try:
                            year = int(item["releaseDate"][:4])
                        except ValueError:
                            pass
                    results.append({
                        "title": item.get("trackName"),
                        "author": item.get("artistName"),
                        "cover_url": high_img,
                        "thumbnail_url": img,
                        "publication_year": year,
                        "description": item.get("description"),
                        "source": "apple_books",
                        "source_label": "Apple Books",
                    })
        except Exception:
            pass

    return results


def _is_public_http_url(url: str) -> bool:
    """SSRF guard: http(s) only, and the host must resolve solely to public IPs."""
    parts = urllib.parse.urlparse(url)
    if parts.scheme not in ("http", "https") or not parts.hostname:
        return False
    try:
        infos = socket.getaddrinfo(parts.hostname, parts.port or None)
    except (socket.gaierror, ValueError):
        return False
    return all(ipaddress.ip_address(info[4][0]).is_global for info in infos)


class _PublicOnlyRedirects(urllib.request.HTTPRedirectHandler):
    """Re-check every redirect target so a public URL can't bounce to an internal one."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not _is_public_http_url(newurl):
            raise urllib.error.HTTPError(newurl, code, "redirect to non-public address blocked", headers, fp)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def _host_is(url: str, *domains: str) -> bool:
    """True if the URL's host is one of `domains` or a subdomain of one (not a substring match)."""
    host = (urllib.parse.urlparse(url).hostname or "").lower()
    return any(host == d or host.endswith("." + d) for d in domains)


# ponytail: resolve-then-fetch leaves a DNS-rebinding window; pin the resolved IP if this endpoint goes public.
_public_opener = urllib.request.build_opener(_PublicOnlyRedirects)


def resolve_media_url(url: str) -> dict:
    """
    Auto-detects and extracts metadata from pasted URLs:
    - YouTube videos / playlists (via YouTube oEmbed)
    - YouTube channels (via channel page / handle extraction)
    - IMDb / Letterboxd / Goodreads / Wikipedia / general websites (via OpenGraph & HTML tags)
    """
    clean_url = url.strip()
    if not clean_url:
        return {}

    if not clean_url.startswith("http://") and not clean_url.startswith("https://"):
        clean_url = "https://" + clean_url

    # 1. YouTube video, shorts, or playlist via official free oEmbed
    yt_path = urllib.parse.urlparse(clean_url).path
    if _host_is(clean_url, "youtu.be") or (_host_is(clean_url, "youtube.com") and yt_path.startswith(("/watch", "/shorts/"))):
        try:
            oembed_url = f"https://www.youtube.com/oembed?url={urllib.parse.quote(clean_url)}&format=json"
            req = urllib.request.Request(oembed_url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=3.5) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return {
                    "media_type": "youtube",
                    "title": data.get("title") or "YouTube Video",
                    "author": data.get("author_name"),
                    "creator": data.get("author_name"),
                    "thumbnail_url": data.get("thumbnail_url"),
                    "cover_url": data.get("thumbnail_url"),
                    "url": clean_url,
                    "source": "youtube_oembed",
                    "source_label": "YouTube Video"
                }
        except Exception:
            pass

    # 2. General OpenGraph & HTML scraper (YouTube channel, IMDb, Goodreads, Wondrium, Substack, etc.)
    try:
        if not _is_public_http_url(clean_url):
            raise ValueError("URL does not resolve to a public address")
        req = urllib.request.Request(
            clean_url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9"
            }
        )
        with _public_opener.open(req, timeout=4.0) as resp:
            raw_html = resp.read()[:800000].decode("utf-8", errors="ignore")

        # Title
        title_m = re.search(r'<meta[^>]+property=[\'"]og:title[\'"][^>]+content=[\'"](.*?)[\'"]', raw_html, re.I)
        if not title_m:
            title_m = re.search(r'<meta[^>]+content=[\'"](.*?)[\'"][^>]+property=[\'"]og:title[\'"]', raw_html, re.I)
        if not title_m:
            title_m = re.search(r'<title[^>]*>(.*?)</title>', raw_html, re.I)

        title = title_m.group(1).strip() if title_m else ""
        title = re.sub(r'\s*-\s*YouTube$', '', title, flags=re.I)
        title = re.sub(r'&amp;', '&', title)
        title = re.sub(r'&#39;', "'", title)
        title = re.sub(r'&quot;', '"', title)

        # Image
        img_m = re.search(r'<meta[^>]+property=[\'"]og:image[\'"][^>]+content=[\'"](.*?)[\'"]', raw_html, re.I)
        if not img_m:
            img_m = re.search(r'<meta[^>]+content=[\'"](.*?)[\'"][^>]+property=[\'"]og:image[\'"]', raw_html, re.I)
        image = img_m.group(1).strip() if img_m else None

        # Description
        desc_m = re.search(r'<meta[^>]+property=[\'"]og:description[\'"][^>]+content=[\'"](.*?)[\'"]', raw_html, re.I)
        if not desc_m:
            desc_m = re.search(r'<meta[^>]+content=[\'"](.*?)[\'"][^>]+property=[\'"]og:description[\'"]', raw_html, re.I)
        desc = desc_m.group(1).strip() if desc_m else None

        # Site Name
        site_m = re.search(r'<meta[^>]+property=[\'"]og:site_name[\'"][^>]+content=[\'"](.*?)[\'"]', raw_html, re.I)
        site_name = site_m.group(1).strip() if site_m else None

        # Detect media type
        media_type = "tangent"
        creator = site_name

        if _host_is(clean_url, "youtube.com", "youtu.be"):
            media_type = "youtube"
            creator = title if "@" in clean_url else "YouTube"
        elif _host_is(clean_url, "imdb.com", "letterboxd.com"):
            media_type = "movie"
            creator = site_name or "Cinema"
        elif _host_is(clean_url, "goodreads.com"):
            media_type = "book"
        elif _host_is(clean_url, "spotify.com", "podcasts.apple.com"):
            media_type = "podcast"
            creator = site_name or "Podcast"
        else:
            domain = urllib.parse.urlparse(clean_url).netloc.replace("www.", "")
            creator = site_name or domain

        return {
            "media_type": media_type,
            "title": title or urllib.parse.urlparse(clean_url).netloc.replace("www.", ""),
            "author": creator,
            "creator": creator,
            "thumbnail_url": image,
            "cover_url": image,
            "description": desc,
            "url": clean_url,
            "source": "opengraph",
            "source_label": site_name or "Web Resource"
        }
    except Exception:
        domain = urllib.parse.urlparse(clean_url).netloc.replace("www.", "")
        m_type = "youtube" if _host_is(clean_url, "youtube.com", "youtu.be") else "tangent"
        return {
            "media_type": m_type,
            "title": clean_url,
            "author": domain,
            "creator": domain,
            "thumbnail_url": None,
            "cover_url": None,
            "url": clean_url,
            "source": "url",
            "source_label": domain
        }


def search_external_media(q: str, media_type: str = "book") -> list:
    """
    Multi-source media search engine:
    - book: Goodreads autocomplete + Apple Books
    - movie / show: DuckDuckGo Instant Answer + TVMaze
    - podcast: Apple Podcasts API
    - youtube / tangent: URL auto-resolver or fallback suggestion
    """
    q_clean = q.strip()
    if not q_clean:
        return []

    # If query is a URL, resolve directly regardless of tab
    if q_clean.startswith(("http://", "https://")) or _host_is("https://" + q_clean, "youtube.com", "youtu.be"):
        resolved = resolve_media_url(q_clean)
        return [resolved] if resolved else []

    if media_type in ("movie", "show", "cinema", "tv"):
        results = []
        # 1. DuckDuckGo film search
        try:
            ddg_url = f"https://api.duckduckgo.com/?q={urllib.parse.quote(q_clean + ' film')}&format=json"
            req = urllib.request.Request(ddg_url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=3.0) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                heading = data.get("Heading")
                abstract = data.get("AbstractText", "")
                image = data.get("Image")
                if heading:
                    img_url = f"https://duckduckgo.com{image}" if image and image.startswith("/") else image
                    year = None
                    ym = re.search(r'\b(19\d\d|20\d\d)\b', abstract)
                    if ym:
                        year = int(ym.group(1))
                    clean_title = re.sub(r'\s*\((film|movie|TV series)\)', '', heading, flags=re.I).strip()
                    results.append({
                        "title": clean_title,
                        "author": "Film",
                        "creator": "Film",
                        "publication_year": year,
                        "cover_url": img_url,
                        "thumbnail_url": img_url,
                        "description": abstract[:250] if abstract else None,
                        "media_type": "movie",
                        "source": "duckduckgo",
                        "source_label": "Film / Cinema"
                    })
        except Exception:
            pass

        # 2. TVMaze series search
        try:
            tv_url = f"https://api.tvmaze.com/search/shows?q={urllib.parse.quote(q_clean)}"
            req = urllib.request.Request(tv_url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=3.0) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                for item in data[:4]:
                    s = item.get("show", {})
                    network = (s.get("network") or s.get("webChannel") or {}).get("name") or "TV Series"
                    img = (s.get("image") or {}).get("medium")
                    year = None
                    if s.get("premiered"):
                        try:
                            year = int(s["premiered"][:4])
                        except ValueError:
                            pass
                    results.append({
                        "title": s.get("name"),
                        "author": network,
                        "creator": network,
                        "publication_year": year,
                        "cover_url": img,
                        "thumbnail_url": img,
                        "description": re.sub(r'<[^>]+>', '', s.get("summary", ""))[:250] if s.get("summary") else None,
                        "media_type": "show",
                        "source": "tvmaze",
                        "source_label": "TV Series"
                    })
        except Exception:
            pass

        return results

    elif media_type == "podcast":
        results = []
        try:
            pod_url = f"https://itunes.apple.com/search?term={urllib.parse.quote(q_clean)}&media=podcast&limit=6"
            req = urllib.request.Request(pod_url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=3.0) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                for r in data.get("results", []):
                    img = r.get("artworkUrl600") or r.get("artworkUrl100")
                    results.append({
                        "title": r.get("collectionName"),
                        "author": r.get("artistName"),
                        "creator": r.get("artistName"),
                        "cover_url": img,
                        "thumbnail_url": img,
                        "url": r.get("trackViewUrl") or r.get("feedUrl"),
                        "media_type": "podcast",
                        "source": "apple_podcasts",
                        "source_label": "Apple Podcasts"
                    })
        except Exception:
            pass
        return results

    elif media_type == "youtube":
        return [{
            "title": q_clean,
            "author": "YouTube Channel / Creator",
            "creator": "YouTube",
            "media_type": "youtube",
            "source": "custom",
            "source_label": "YouTube"
        }]

    # Default to book
    return search_external_books(q_clean)


@app.get("/admin/media/resolve-url")
@app.get("/api/media/resolve-url")
def api_resolve_media_url(url: str = Query(..., min_length=3, description="URL to inspect")):
    """Inspect and resolve live metadata (title, thumbnail, creator, type) for any pasted URL."""
    return resolve_media_url(url)


@app.get("/admin/books/suggest")
@app.get("/api/books/suggest")
@app.get("/admin/media/suggest")
@app.get("/api/media/suggest")
def suggest_books(
    q: str = Query(..., min_length=2, description="Search term for book title/author or media"),
    media_type: str = Query("book", description="Media type: book, movie, show, podcast, youtube, tangent")
):
    """
    Live autocomplete suggestion endpoint.
    Combines local SQLite database with Goodreads, TVMaze, DuckDuckGo Film, and Apple Podcasts.
    """
    q_clean = q.strip()
    cache_key = f"{media_type}:{q_clean.lower()}"
    now = time.time()
    if cache_key in _SUGGESTION_CACHE:
        timestamp, cached_data = _SUGGESTION_CACHE[cache_key]
        if now - timestamp < 600:
            return cached_data

    # If non-book media requested, dispatch to external media search
    if media_type != "book":
        results = search_external_media(q_clean, media_type)
        _SUGGESTION_CACHE[cache_key] = (now, results)
        return results

    db = SessionLocal()
    suggestions = []
    seen_keys = set()

    try:
        # 1. Search local SQLite database first
        search_term = f"%{q_clean}%"
        local_books = (
            db.query(CanonicalBook)
            .join(Author, CanonicalBook.author_id == Author.id, isouter=True)
            .filter(
                (CanonicalBook.title.ilike(search_term)) |
                (CanonicalBook.normalized_title.ilike(search_term)) |
                (Author.full_name.ilike(search_term))
            )
            .limit(4)
            .all()
        )

        for b in local_books:
            author_name = b.author.full_name if b.author else None
            norm_key = (b.title.lower().strip(), (author_name or "").lower().strip())
            seen_keys.add(norm_key)
            suggestions.append({
                "id": b.id,
                "title": b.title,
                "author": author_name,
                "creator": author_name,
                "cover_url": b.cover_url or b.thumbnail_url,
                "thumbnail_url": b.thumbnail_url or b.cover_url,
                "publication_year": b.publication_year,
                "rating": b.rating,
                "goodreads_id": b.goodreads_id,
                "media_type": getattr(b, "media_type", "book") or "book",
                "in_archive": True,
                "source": "archive",
                "source_label": "In BBB Archive",
            })

        # 2. Query Goodreads autocomplete (+ Apple Books fallback)
        external_results = search_external_books(q_clean)
        for ext in external_results:
            norm_key = (ext["title"].lower().strip(), (ext.get("author") or "").lower().strip())
            if norm_key not in seen_keys:
                seen_keys.add(norm_key)
                ext["in_archive"] = False
                ext["media_type"] = "book"
                suggestions.append(ext)
                if len(suggestions) >= 8:
                    break

        _SUGGESTION_CACHE[cache_key] = (now, suggestions)
        return suggestions
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Something went wrong on the server.") from e
    finally:
        db.close()


@app.get("/admin/members/suggest")
@app.get("/api/members/suggest")
def suggest_members(
    q: Optional[str] = Query(None, description="Search term for member/reader name"),
    book_id: Optional[str] = Query(None, description="Optional canonical book ID to check if reader has already read it")
):
    """
    Live autocomplete suggestion endpoint for BBB book club readers/members.
    Counts unique books discussed by each member (distinct canonical books),
    so discussing the same book across multiple meetups does NOT artificially inflate book count.
    """
    db = SessionLocal()
    try:
        from sqlalchemy import func
        disc_subquery = (
            db.query(
                Discussion.member_id,
                func.count(func.distinct(Discussion.canonical_book_id)).label("disc_count")
            )
            .filter(Discussion.member_id != None)
            .group_by(Discussion.member_id)
            .subquery()
        )

        query = db.query(
            Member,
            func.coalesce(disc_subquery.c.disc_count, 0).label("discussions_count")
        ).outerjoin(disc_subquery, Member.id == disc_subquery.c.member_id)

        # Exclude junk titles / non-member keywords
        junk_names = [
            "bibliophiles bangalore", "bangalore", "name", "people",
            "discussed", "books mentioned", "mentions", "qissa comics"
        ]
        for j in junk_names:
            query = query.filter(Member.normalized_name != j)

        if q and q.strip():
            q_clean = q.strip()
            search_term = f"%{q_clean}%"
            query = query.filter(
                (Member.display_name.ilike(search_term)) |
                (Member.normalized_name.ilike(search_term))
            )
            members_data = query.all()
            q_lower = q_clean.lower()
            members_data.sort(
                key=lambda item: (
                    0 if item[0].display_name.lower().startswith(q_lower) else 1,
                    -item[1],
                    item[0].display_name.lower()
                )
            )
            members_data = members_data[:15]
        else:
            # When q is empty, return top 15 readers by distinct book count
            members_data = (
                query.order_by(disc_subquery.c.disc_count.desc().nullslast(), Member.display_name.asc())
                .limit(15)
                .all()
            )

        results = []
        for member, count in members_data:
            already_read = False
            already_read_meetups = []
            if book_id:
                past_discs = (
                    db.query(Meetup.meetup_number)
                    .join(Discussion, Discussion.meetup_id == Meetup.id)
                    .filter(Discussion.member_id == member.id, Discussion.canonical_book_id == book_id)
                    .distinct()
                    .all()
                )
                if past_discs:
                    already_read = True
                    already_read_meetups = sorted([m[0] for m in past_discs if m[0] is not None])

            results.append({
                "id": member.id,
                "name": member.display_name,
                "discussions_count": count or 0,
                "books_count": count or 0,
                "already_read": already_read,
                "already_read_meetups": already_read_meetups,
            })
        return results
    finally:
        db.close()


def enrich_canonical_book_from_goodreads(book_id: str, db, force: bool = False) -> dict:
    """Enrich a single canonical book by fetching metadata from Goodreads API."""
    book = db.query(CanonicalBook).filter(CanonicalBook.id == book_id).first()
    if not book:
        return {"success": False, "message": "Book not found"}

    if not force and book.goodreads_id and book.cover_url:
        return {"success": True, "book_id": book.id, "title": book.title, "already_enriched": True}
    
    author_obj = db.query(Author).filter(Author.id == book.author_id).first() if book.author_id else None
    author_name = author_obj.full_name if author_obj else None
    
    title_clean = book.title.strip()
    if "@" in title_clean or "participants" in title_clean.lower() or len(title_clean) < 2:
        return {"success": False, "message": "Skipped invalid title"}
    
    query_title = re.sub(r"[\u2018\u2019\u201c\u201d]", "'", title_clean)
    query = f"{query_title} {author_name}" if author_name else query_title
    results = search_external_books(query)
    if not results and author_name:
        results = search_external_books(query_title)
    
    if not results:
        return {"success": False, "message": "No Goodreads results found"}
        
    filtered = []
    for r in results:
        t = r.get("title", "").lower()
        if any(bad in t for bad in ["summary of", "summary & study", "study guide", "analysis of", "workbook for", "trivia-on-books", "summary:"]):
            continue
        filtered.append(r)
        
    candidates = filtered if filtered else results
    best = candidates[0]
    
    if author_name:
        auth_clean = author_name.lower()
        auth_tokens = [tok for tok in re.split(r'\W+', auth_clean) if len(tok) > 2]
        for c in candidates:
            c_auth = (c.get("author") or "").lower()
            if any(tok in c_auth for tok in auth_tokens):
                best = c
                break
                
    if best.get("cover_url"):
        book.cover_url = best["cover_url"]
        book.thumbnail_url = best.get("thumbnail_url") or best["cover_url"]
    if best.get("rating") is not None:
        book.rating = best["rating"]
    if best.get("goodreads_id"):
        book.goodreads_id = best["goodreads_id"]
    if best.get("publication_year"):
        book.publication_year = best["publication_year"]
    if best.get("description") and not book.description:
        book.description = best["description"]
        
    if not book.author_id and best.get("author"):
        c_author = best["author"].strip()
        auth_record = db.query(Author).filter(Author.full_name.ilike(c_author)).first()
        if not auth_record:
            auth_record = Author(full_name=c_author, normalized_name=c_author.lower())
            db.add(auth_record)
            db.flush()
        book.author_id = auth_record.id
        
    db.commit()
    return {
        "success": True,
        "book_id": book.id,
        "title": book.title,
        "matched_title": best.get("title"),
        "author": best.get("author"),
        "cover_url": book.cover_url,
        "rating": book.rating,
        "goodreads_id": book.goodreads_id,
        "publication_year": book.publication_year,
    }


@app.post("/admin/books/{book_id}/enrich-goodreads")
def enrich_single_book_endpoint(book_id: str):
    """Enrich a single book record with Goodreads metadata."""
    db = SessionLocal()
    try:
        res = enrich_canonical_book_from_goodreads(book_id, db, force=True)
        return res
    finally:
        db.close()


@app.post("/admin/meetups/{meetup_number}/enrich-goodreads")
def enrich_meetup_books_endpoint(meetup_number: int):
    """Enrich all books in a meetup with Goodreads metadata in parallel."""
    from concurrent.futures import ThreadPoolExecutor, as_completed

    db = SessionLocal()
    try:
        meetup = db.query(Meetup).filter(Meetup.meetup_number == meetup_number).first()
        if not meetup:
            raise HTTPException(status_code=404, detail="Meetup not found")

        discussions = db.query(Discussion).filter(Discussion.meetup_id == meetup.id).all()
        book_ids = list({d.canonical_book_id for d in discussions if d.canonical_book_id})
        total_books = len(book_ids)

        def _enrich_worker(b_id):
            thread_db = SessionLocal()
            try:
                return enrich_canonical_book_from_goodreads(b_id, thread_db)
            finally:
                thread_db.close()

        enriched_count = 0
        with ThreadPoolExecutor(max_workers=8) as executor:
            futures = [executor.submit(_enrich_worker, b_id) for b_id in book_ids]
            for f in as_completed(futures):
                try:
                    res = f.result()
                    if res.get("success"):
                        enriched_count += 1
                except Exception:
                    pass

        return {
            "success": True,
            "meetup_number": meetup_number,
            "total_books": total_books,
            "enriched_count": enriched_count,
            "message": f"Enriched {enriched_count} of {total_books} books in Meetup #{meetup_number} from Goodreads"
        }
    finally:
        db.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)


