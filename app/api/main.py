"""
BBB Library API — FastAPI Application

This module exposes the BBB archive as REST endpoints.
It reuses the existing SQLAlchemy models and database layer.
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List
from datetime import date

from app.core.database import get_engine, SessionLocal
from app.database.models import (
    CanonicalBook, Meetup, Venue, Author, Member, Discussion, Resource
)

app = FastAPI(
    title="BBB Library API",
    description="REST API for the Broke Bibliophiles of Bangalore Digital Archive",
    version="1.0.0",
)

# Configure CORS for Next.js frontend (allowing any local development port e.g. 3000, 3001)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3002",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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

    return {
        "id": book.id,
        "title": book.title,
        "normalized_title": book.normalized_title,
        "author_id": book.author_id,
        "author_name": author["name"] if author else None,
        "discussion_count": discussion_count,
        "first_discussed_date": min((m["date"] for m in meetups if m["date"]), default=None),
        "last_discussed_date": max((m["date"] for m in meetups if m["date"]), default=None),
        "meetups": meetups,
        "members": members,
    }


def meetup_to_dict(meetup: Meetup, db) -> dict:
    """Convert Meetup to API response dict."""
    venue = None
    if meetup.venue_id:
        venue_obj = db.query(Venue).filter(Venue.id == meetup.venue_id).first()
        if venue_obj:
            venue = venue_obj.name

    # Get books discussed
    books = []
    members = []
    member_ids = set()

    for disc in db.query(Discussion).filter(
        Discussion.meetup_id == meetup.id
    ).all():
        if disc.canonical_book_id:
            book = db.query(CanonicalBook).filter(
                CanonicalBook.id == disc.canonical_book_id
            ).first()
            if book:
                author = None
                if book.author_id:
                    author_obj = db.query(Author).filter(Author.id == book.author_id).first()
                    if author_obj:
                        author = author_obj.full_name

                member_name = None
                if disc.member_id:
                    member = db.query(Member).filter(Member.id == disc.member_id).first()
                    if member:
                        member_name = member.display_name
                        if disc.member_id not in member_ids:
                            member_ids.add(disc.member_id)
                            members.append({
                                "id": member.id,
                                "display_name": member.display_name,
                            })

                books.append({
                    "id": book.id,
                    "title": book.title,
                    "author": author,
                    "member": member_name,
                    "is_discussion_mention": disc.member_id is None,
                })

    return {
        "id": meetup.id,
        "number": meetup.meetup_number,
        "date": meetup.date.isoformat() if meetup.date else None,
        "venue": venue,
        "title": meetup.title,
        "format": meetup.format,
        "book_count": len(books),
        "member_count": len(members),
        "books": books,
        "members": members,
    }


# ============================================
# API Endpoints
# ============================================

@app.get("/stats")
def get_stats():
    """Get archive statistics."""
    db = SessionLocal()
    try:
        stats = {
            "total_meetups": db.query(Meetup).count(),
            "canonical_books": db.query(CanonicalBook).count(),
            "imported_books": db.query(CanonicalBook).count(),  # Using canonical as proxy
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
def get_books(
    search: Optional[str] = None,
    author: Optional[str] = None,
    year: Optional[int] = None,
    sort_by: str = "title",
    sort_order: str = "asc",
    limit: Optional[int] = None,
    offset: Optional[int] = None,
):
    """Get all books with optional filtering."""
    db = SessionLocal()
    try:
        query = db.query(CanonicalBook)

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
        return [book_to_dict(book, db) for book in books]
    finally:
        db.close()


@app.get("/books/{book_id}")
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
        return [meetup_to_dict(m, db) for m in meetups]
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
            "meetups": [meetup_to_dict(m, db) for m in meetups],
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
):
    """Get all BBB members with reading and attendance metrics."""
    db = SessionLocal()
    try:
        query = db.query(Member)
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

            results.append({
                "id": m.id,
                "display_name": m.display_name,
                "book_count": len(book_ids),
                "meetup_count": len(meetup_ids),
                "first_active_date": min(dates, default=None),
                "last_active_date": max(dates, default=None),
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
            "book_count": len(books_map),
            "meetup_count": len(meetups_map),
            "first_active_date": min(dates, default=None),
            "last_active_date": max(dates, default=None),
            "books": list(books_map.values()),
            "meetups": meetup_list,
        }
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

@app.get("/health")
def health():
    """Health check endpoint."""
    return {"status": "healthy", "service": "bbb-library-api"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)

