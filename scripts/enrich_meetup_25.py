"""
Enrich Meetup #25 books with covers, ratings, descriptions directly from their Goodreads IDs.
"""

import sys
import os
import time

sys.path.insert(0, os.path.abspath("."))

from app.core.database import SessionLocal
from app.database.models import Meetup, Discussion, CanonicalBook, Author
from app.api.main import fetch_book_metadata_from_web

def enrich_m25():
    db = SessionLocal()
    try:
        meetup = db.query(Meetup).filter(Meetup.meetup_number == 25).first()
        if not meetup:
            print("Meetup 25 not found")
            return

        discs = db.query(Discussion).filter(Discussion.meetup_id == meetup.id).all()
        book_ids = list({d.canonical_book_id for d in discs if d.canonical_book_id})
        print(f"Total unique books in Meetup 25: {len(book_ids)}")

        enriched = 0
        already_had = 0

        for b_id in book_ids:
            book = db.query(CanonicalBook).filter(CanonicalBook.id == b_id).first()
            if not book:
                continue

            if book.cover_url and book.description and len(book.description) > 20:
                already_had += 1
                continue

            if not book.goodreads_id:
                continue

            author_name = ""
            if book.author_id:
                a = db.query(Author).filter(Author.id == book.author_id).first()
                if a:
                    author_name = a.full_name

            print(f"Fetching metadata for '{book.title}' (Goodreads ID: {book.goodreads_id})...")
            try:
                meta = fetch_book_metadata_from_web(book.title, author_name, book.goodreads_id)
                changed = False
                if meta.get("cover_url") and not book.cover_url:
                    book.cover_url = meta["cover_url"]
                    book.thumbnail_url = meta["cover_url"]
                    changed = True
                if meta.get("description") and not book.description:
                    book.description = meta["description"]
                    changed = True
                if meta.get("rating") and not book.rating:
                    book.rating = meta["rating"]
                    changed = True
                if meta.get("page_count") and not book.page_count:
                    book.page_count = meta["page_count"]
                    changed = True

                if changed:
                    db.commit()
                    enriched += 1
                    print(f"  [+] Enriched: cover={bool(book.cover_url)}, desc_len={len(book.description or '')}")
                else:
                    print(f"  [-] No new fields found")
            except Exception as e:
                print(f"  [!] Error: {e}")

            time.sleep(0.2)  # respectful delay

        print(f"\nFinished! Enriched: {enriched}, Already complete: {already_had}")

    finally:
        db.close()

if __name__ == "__main__":
    enrich_m25()
