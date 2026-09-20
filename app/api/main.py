"""
BBB Library API — FastAPI Application

This module exposes the BBB archive as REST endpoints.
It reuses the existing SQLAlchemy models and database layer.
"""

from fastapi import FastAPI, HTTPException, Query, UploadFile, File
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List
from datetime import date, datetime
from pydantic import BaseModel
import urllib.request
import urllib.parse
import json
import re
import time
import os

from app.core.database import get_engine, SessionLocal
from app.database.models import (
    CanonicalBook, Meetup, Venue, Author, Member, Discussion, Resource
)

app = FastAPI(
    title="BBB Library API",
    description="REST API for the Broke Bibliophiles of Bangalore Digital Archive",
    version="1.0.0",
)

# Ensure static directories exist and mount static files router
os.makedirs("static/uploads/meetups", exist_ok=True)
os.makedirs("static/generated_pdfs", exist_ok=True)
os.makedirs("static/fonts", exist_ok=True)
os.makedirs("static/templates", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

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

    # Get books discussed, grouped by canonical_book_id to avoid duplicate book rows
    discussions = db.query(Discussion).filter(
        Discussion.meetup_id == meetup.id
    ).all()
    from collections import defaultdict
    grouped_discs = defaultdict(list)
    for disc in discussions:
        if disc.canonical_book_id:
            grouped_discs[disc.canonical_book_id].append(disc)

    books = []
    members = []
    member_ids = set()

    for book_id, disc_list in grouped_discs.items():
        book = db.query(CanonicalBook).filter(
            CanonicalBook.id == book_id
        ).first()
        if not book:
            continue

        author = None
        if book.author_id:
            author_obj = db.query(Author).filter(Author.id == book.author_id).first()
            if author_obj:
                author = author_obj.full_name

        member_names = []
        for disc in disc_list:
            if disc.member_id:
                member = db.query(Member).filter(Member.id == disc.member_id).first()
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


class MeetupUpdateRequest(BaseModel):
    date: Optional[str] = None
    venue: Optional[str] = None
    title: Optional[str] = None

class BookUpdateRequest(BaseModel):
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

class AddBookToMeetupRequest(BaseModel):
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

class ToggleGeneralDiscussionRequest(BaseModel):
    is_general_discussion: bool


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
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@app.post("/admin/meetups/{meetup_number}/photo")
async def upload_meetup_photo(meetup_number: int, file: UploadFile = File(...)):
    """Upload group picture or media for a meetup."""
    db = SessionLocal()
    try:
        meetup = db.query(Meetup).filter(Meetup.meetup_number == meetup_number).first()
        if not meetup:
            raise HTTPException(status_code=404, detail="Meetup not found")

        ext = os.path.splitext(file.filename or "")[1].lower()
        if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
            ext = ".jpg"

        upload_dir = os.path.join("static", "uploads", "meetups")
        os.makedirs(upload_dir, exist_ok=True)
        dest_filename = f"meetup_{meetup_number}_photo{ext}"
        dest_path = os.path.join(upload_dir, dest_filename)

        content = await file.read()
        with open(dest_path, "wb") as f:
            f.write(content)

        photo_url = f"/static/uploads/meetups/{dest_filename}"
        meetup.photo_url = photo_url
        db.commit()

        return {
            "success": True,
            "photo_url": photo_url,
            "message": f"Group photo for Meetup #{meetup_number} uploaded successfully"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
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
        pdf_url = f"/static/generated_pdfs/bbb_meetup_{meetup_number}.pdf"
        meetup.pdf_url = pdf_url
        db.commit()

        return {
            "success": True,
            "pdf_url": pdf_url,
            "meetup_number": meetup_number,
            "message": f"Magazine PDF for Meetup #{meetup_number} generated successfully!"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
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

        pdf_path = os.path.join("static", "generated_pdfs", f"bbb_meetup_{meetup_number}.pdf")
        if not os.path.exists(pdf_path):
            pdf_path = generate_meetup_pdf(meetup_number, db)
            meetup.pdf_url = f"/static/generated_pdfs/bbb_meetup_{meetup_number}.pdf"
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

        db.commit()
        return {"success": True, "message": f"Book '{book.title}' updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
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
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
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
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
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
                    detail=f"Book '{book.title}' is already in Meetup #{meetup_number}'s book list. Edit the existing book to update details or add readers."
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
        topic = "General Discussion" if req.is_general_discussion else None
        notes_val = req.notes.strip() if req.notes and req.notes.strip() else None
        if req.is_general_discussion and not notes_val:
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
                    )
                    db.add(disc)

        db.commit()
        return {"success": True, "message": f"Added '{title_clean}' to Meetup #{meetup_number}"}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
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


@app.get("/admin/books/suggest")
@app.get("/api/books/suggest")
def suggest_books(q: str = Query(..., min_length=2, description="Search term for book title/author")):
    """
    Live autocomplete suggestion endpoint.
    Combines canonical books from the local BBB SQLite database with live Goodreads
    results (and Apple Books fallback) for instant Amazon-style drop-down autocompletion.
    """
    q_clean = q.strip()
    cache_key = q_clean.lower()
    now = time.time()
    if cache_key in _SUGGESTION_CACHE:
        timestamp, cached_data = _SUGGESTION_CACHE[cache_key]
        if now - timestamp < 600:
            return cached_data

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
                "cover_url": b.cover_url or b.thumbnail_url,
                "thumbnail_url": b.thumbnail_url or b.cover_url,
                "publication_year": b.publication_year,
                "rating": b.rating,
                "goodreads_id": b.goodreads_id,
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
                suggestions.append(ext)
                if len(suggestions) >= 8:
                    break

        _SUGGESTION_CACHE[cache_key] = (now, suggestions)
        return suggestions
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@app.get("/admin/members/suggest")
@app.get("/api/members/suggest")
def suggest_members(q: Optional[str] = Query(None, description="Search term for member/reader name")):
    """
    Live autocomplete suggestion endpoint for BBB book club readers/members.
    Analyzes the database, surfaces active discussants first, and returns filtered list.
    """
    db = SessionLocal()
    try:
        from sqlalchemy import func
        disc_subquery = (
            db.query(Discussion.member_id, func.count(Discussion.id).label("disc_count"))
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
            # When q is empty, return top 15 readers by discussion count
            members_data = (
                query.order_by(disc_subquery.c.disc_count.desc().nullslast(), Member.display_name.asc())
                .limit(15)
                .all()
            )

        results = []
        for member, count in members_data:
            results.append({
                "id": member.id,
                "name": member.display_name,
                "discussions_count": count,
            })
        return results
    finally:
        db.close()


def enrich_canonical_book_from_goodreads(book_id: str, db) -> dict:
    """Enrich a single canonical book by fetching metadata from Goodreads API."""
    book = db.query(CanonicalBook).filter(CanonicalBook.id == book_id).first()
    if not book:
        return {"success": False, "message": "Book not found"}
    
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
        res = enrich_canonical_book_from_goodreads(book_id, db)
        return res
    finally:
        db.close()


@app.post("/admin/meetups/{meetup_number}/enrich-goodreads")
def enrich_meetup_books_endpoint(meetup_number: int):
    """Enrich all books in a meetup with Goodreads metadata."""
    db = SessionLocal()
    try:
        meetup = db.query(Meetup).filter(Meetup.meetup_number == meetup_number).first()
        if not meetup:
            raise HTTPException(status_code=404, detail="Meetup not found")
            
        discussions = db.query(Discussion).filter(Discussion.meetup_id == meetup.id).all()
        enriched_count = 0
        total_books = len(discussions)
        
        for d in discussions:
            if not d.canonical_book_id:
                continue
            res = enrich_canonical_book_from_goodreads(d.canonical_book_id, db)
            if res.get("success"):
                enriched_count += 1
                
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


