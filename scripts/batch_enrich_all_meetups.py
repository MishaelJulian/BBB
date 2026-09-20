"""
Batch enrich all meetup books in the BBB archive with Goodreads API metadata.
Enriches cover artwork, ratings, publication year, goodreads_id, and author associations.
"""

import sys
import os
import re
import time

# Ensure project root is in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

from app.core.database import SessionLocal
from app.database.models import Meetup, Discussion, CanonicalBook, Author
from app.api.main import enrich_canonical_book_from_goodreads

def batch_enrich():
    db = SessionLocal()
    try:
        meetups = db.query(Meetup).order_by(Meetup.meetup_number.desc()).all()
        print(f"==================================================")
        print(f"Starting Goodreads Batch Enrichment across {len(meetups)} Meetups")
        print(f"==================================================")

        total_processed = 0
        total_enriched = 0
        total_already_had_cover = 0
        total_skipped = 0

        for m in meetups:
            discs = db.query(Discussion).filter(Discussion.meetup_id == m.id).all()
            if not discs:
                continue

            print(f"\n--- Meetup #{m.meetup_number} ({len(discs)} books discussed) ---")
            meetup_enriched = 0

            # Collect unique canonical book IDs for this meetup
            seen_books = set()
            for d in discs:
                if not d.canonical_book_id or d.canonical_book_id in seen_books:
                    continue
                seen_books.add(d.canonical_book_id)

                book = db.query(CanonicalBook).filter(CanonicalBook.id == d.canonical_book_id).first()
                if not book:
                    continue

                total_processed += 1

                # Check if already has goodreads cover
                if book.cover_url and book.goodreads_id:
                    total_already_had_cover += 1
                    continue

                # Enrich book
                try:
                    res = enrich_canonical_book_from_goodreads(book.id, db)
                    if res.get("success"):
                        meetup_enriched += 1
                        total_enriched += 1
                        author_str = res.get("author") or "Unknown"
                        rating_str = f"★ {res.get('rating')}" if res.get("rating") else ""
                        safe_title = book.title.encode('ascii', 'replace').decode('ascii')
                        safe_match = (res.get("matched_title") or "").encode('ascii', 'replace').decode('ascii')
                        print(f"  [+] '{safe_title}' -> '{safe_match}' by {author_str} {rating_str}")
                    else:
                        total_skipped += 1
                        safe_title = book.title.encode('ascii', 'replace').decode('ascii')
                        print(f"  [-] Skipped '{safe_title}': {res.get('message')}")
                except Exception as ex:
                    total_skipped += 1
                    safe_title = book.title.encode('ascii', 'replace').decode('ascii')
                    print(f"  [!] Error on '{safe_title}': {ex}")

                # Be polite to Goodreads API
                time.sleep(0.12)

            print(f"Meetup #{m.meetup_number} complete: {meetup_enriched} newly enriched from Goodreads.")

        print(f"\n==================================================")
        print(f"Enrichment Finished!")
        print(f"Total Unique Books Processed: {total_processed}")
        print(f"Newly Enriched from Goodreads: {total_enriched}")
        print(f"Already Had Cover/Metadata: {total_already_had_cover}")
        print(f"Skipped / Unmatched: {total_skipped}")
        print(f"==================================================")

    finally:
        db.close()

if __name__ == "__main__":
    batch_enrich()
