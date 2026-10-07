"""
Script to ingest Meetup #99 into the BBB Digital Archive SQLite database.
Extracts all books, authors, readers, general discussions, attaches group photo,
and links the authentic Meetup #99 PDF.
"""

import os
import sys
import shutil
from datetime import date

sys.path.insert(0, os.path.abspath("."))

from app.core.database import SessionLocal
from app.database.models import (
    Meetup, CanonicalBook, Author, Member, Discussion, Venue
)
from app.api.main import enrich_canonical_book_from_goodreads

def main():
    db = SessionLocal()
    try:
        print("=== INGESTING MEETUP #99 ===")

        # 1. Ensure directories and copy media assets
        os.makedirs("assets/uploads/meetups", exist_ok=True)
        os.makedirs("assets/generated_pdfs", exist_ok=True)
        os.makedirs("assets/cache/covers", exist_ok=True)

        # Copy the genuine group picture for Meetup 99
        photo_src = "assets/templates/bbb99_extracted/p12_0_X4.jpg"
        photo_dst = "assets/uploads/meetups/meetup_99_photo.jpeg"
        if os.path.exists(photo_src):
            shutil.copyfile(photo_src, photo_dst)
            print(f"[OK] Copied group picture to {photo_dst}")

        # Copy the genuine PDF for Meetup 99
        pdf_src = "BBB 99, Books Discussion List.pdf"
        pdf_dst = "assets/generated_pdfs/bbb_meetup_99.pdf"
        if os.path.exists(pdf_src):
            shutil.copyfile(pdf_src, pdf_dst)
            print(f"[OK] Copied original publication PDF to {pdf_dst}")

        # 2. Get Venue (The Bookworm)
        venue = db.query(Venue).filter(Venue.name.ilike("%bookworm%")).first()
        venue_id = venue.id if venue else None

        # 3. Create or update Meetup #99
        meetup = db.query(Meetup).filter(Meetup.meetup_number == 99).first()
        if not meetup:
            meetup = Meetup(
                meetup_number=99,
                date=date(2026, 8, 23),
                title="BBB Meetup #99",
                venue_id=venue_id,
                format="IN_PERSON",
                photo_url="/assets/uploads/meetups/meetup_99_photo.jpeg",
                pdf_url="/assets/generated_pdfs/bbb_meetup_99.pdf",
                description='Author Interaction with Sowmiya Ashok (author of "The Dig"), followed by member presentations and general discussion.',
            )
            db.add(meetup)
            db.flush()
            print(f"[OK] Created Meetup #99 (ID: {meetup.id})")
        else:
            meetup.date = date(2026, 8, 23)
            meetup.title = "BBB Meetup #99"
            meetup.venue_id = venue_id
            meetup.photo_url = "/assets/uploads/meetups/meetup_99_photo.jpeg"
            meetup.pdf_url = "/assets/generated_pdfs/bbb_meetup_99.pdf"
            meetup.description = 'Author Interaction with Sowmiya Ashok (author of "The Dig"), followed by member presentations and general discussion.'
            db.flush()
            print(f"[OK] Updated existing Meetup #99 (ID: {meetup.id})")

        # 4. Define all books from BBB 99 PDF
        # Format: (title, author, member_name, is_general, notes, custom_cover)
        books_data = [
            # Page 2: Author Interaction
            ("The Dig", "Sowmiya Ashok", "Sowmiya Ashok", False, "Featured Author Interaction", "assets/templates/bbb99_extracted/p2_1_X6.jpg"),

            # Page 3: Sowmiya's Books & Recent Favorites
            ("Bird by Bird", "Anne Lamott", "Sowmiya Ashok", False, "Sowmiya's Recommendations", None),
            ("Following Fish", "Samanth Subramanian", "Sowmiya Ashok", False, "Sowmiya's Recommendations", None),
            ("Country Driving", "Peter Hessler", "Sowmiya Ashok", False, "Sowmiya's Recommendations", None),
            ("A Fine Balance", "Rohinton Mistry", "Sowmiya Ashok", False, "Sowmiya's Recommendations", None),
            ("The Hungry Tide", "Amitav Ghosh", "Sowmiya Ashok", False, "Sowmiya's Recommendations", None),
            ("Tiger Lessons", "Srinath Reddy", "Sowmiya Ashok", False, "Recent Favorites", None),
            ("The Loneliness of Sonia and Sunny", "Kiran Desai", "Sowmiya Ashok", False, "Recent Favorites", None),
            ("Empire of AI", "Karen Hao", "Sowmiya Ashok", False, "Recent Favorites", None),

            # Page 6: Gokul, Amit Chowdhury, Sanyukta
            ("The Hierarchy (Series)", "James Islington", "Gokul", False, None, None),
            ("The Only One Left", "Riley Sager", "Gokul", False, None, None),
            ("Brave New World", "Aldous Huxley", "Amit Chowdhury", False, None, None),
            ("1984", "George Orwell", "Amit Chowdhury", False, None, None),
            ("Dream Machine", "Appupen & Laurent Daudet", "Sanyukta", False, None, None),
            ("Meditations", "Marcus Aurelius", "Sanyukta", False, "tr. by Gregory Hays", None),

            # Page 7: Priyanka, Keshav
            ("Fieldwork as a Sex Object", "Meena Kandasamy", "Priyanka", False, None, None),
            ("The Correspondent", "Virginia Evans", "Priyanka", False, None, None),
            ("Happiness as Such", "Natalia Ginzburg", "Priyanka", False, None, None),
            ("Family Lexicon", "Natalia Ginzburg", "Priyanka", False, None, None),
            ("Murder in the House of Omari", "Taku Ashibe", "Keshav", False, None, None),
            ("A Social History of the Deccan", "Richard M. Eaton", "Keshav", False, None, None),

            # Page 8: Srihari, Srikari
            ("Adrift in the South", "Xiao", "Srihari", False, None, None),
            ("1929", "Andrew Ross Sorkin", "Srihari", False, None, None),
            ("The Power and the Glory", "Graham Greene", "Srihari", False, None, None),
            ("Kaikeyi", "Vaishnavi Patel", "Srikari", False, None, None),
            ("Before the Coffee Gets Cold", "Toshikazu Kawaguchi", "Srikari", False, None, None),
            ("Piranesi", "Susanna Clarke", "Srikari", False, None, None),

            # Page 9: Bharath, Chaitanya
            ("Fractured Communities", "Khalid", "Bharath", False, None, None),
            ("The Odyssey", "Homer", "Bharath", False, None, None),
            ("Remarkably Bright Creatures", "Shelby Van Pelt", "Chaitanya", False, None, None),
            ("Elena Knows", "Claudia Piñeiro", "Chaitanya", False, None, None),
            ("Absolute Jafar", "Qudsia Banerjee", "Chaitanya", False, None, None),
            ("The Blind Owl", "Sadegh Hedayat", "Chaitanya", False, None, None),
            ("The Orange and Other Poems", "Wendy Cope", "Chaitanya", False, None, None),
            ("The Arrival", "Shaun Tan", "Chaitanya", False, None, None),

            # Page 10: Reshma, Madhusudan, Mishael
            ("Fasting, Feasting", "Anita Desai", "Reshma", False, None, None),
            ("The Web Beneath the Waves", "Samanth Subramanian", "Madhusudan", False, None, None),
            ("Perfect Victims", "Mohammed El-Kurd", "Madhusudan", False, None, None),
            ("A Knight of the Seven Kingdoms", "George R.R. Martin", "Madhusudan", False, None, None),
            ("Roadside Picnic", "Arkady and Boris Strugatsky", "Mishael", False, None, None),
            ("A Brief History of Seven Killings", "Marlon James", "Mishael", False, None, None),

            # Page 11: Irene, Vinay Leo, Darshan
            ("84, Charing Cross Road", "Helene Hanff", "Irene", False, None, None),
            ("Before the Coffee Gets Cold", "Toshikazu Kawaguchi", "Irene", False, None, None),
            ("The Village by the Sea", "Anita Desai", "Vinay Leo", False, None, None),
            ("Silences", "Gulzar", "Vinay Leo", False, None, None),
            ("How to Train Your Dragon", "Cressida Cowell", "Darshan", False, None, None),

            # Page 4: General Discussion
            ("The Midnight Train", "Matt Haig", None, True, "General Discussion", None),
            ("The Island", "Aldous Huxley", None, True, "General Discussion", None),
            ("India in the Persianate Age", "Richard M. Eaton", None, True, "General Discussion", None),
            ("Killers of the Flower Moon", "David Grann", None, True, "General Discussion", None),
            ("The Wager", "David Grann", None, True, "General Discussion", None),
            ("The White Tiger", "Aravind Adiga", None, True, "General Discussion", None),
            ("There is Gunpowder in the Air", "Manoranjan Byapari", None, True, "General Discussion", None),
            ("Big Shot", "Michael Lewis", None, True, "General Discussion", None),

            # Page 5: General Discussion
            ("Ghachar Ghochar", "Vivek Shanbhag", None, True, "General Discussion", None),
            ("Roadside Picnic (Movie)", "Arkady and Boris Strugatsky", None, True, "General Discussion", None),
            ("Sacred Games", "Vikram Chandra", None, True, "General Discussion", None),
            ("How to Train Your Dragon (Movie)", "Cressida Cowell", None, True, "General Discussion", None),
            ("Pluto Poems", "Gulzar", None, True, "General Discussion", None),
            ("Jonathan Strange and Mr Norrell", "Susanna Clarke", None, True, "General Discussion", None),
            ("Iliad", "Homer", None, True, "General Discussion", None),
            ("Percy Jackson (Series)", "Rick Riordan", None, True, "General Discussion", None),
        ]

        added_count = 0
        canonical_ids_to_enrich = []

        for title, author_name, member_name, is_general, notes, custom_cover in books_data:
            # 1. Author
            author_id = None
            if author_name:
                clean_auth = author_name.strip()
                author_obj = db.query(Author).filter(Author.full_name.ilike(clean_auth)).first()
                if not author_obj:
                    author_obj = Author(
                        full_name=clean_auth,
                        normalized_name=clean_auth.lower()
                    )
                    db.add(author_obj)
                    db.flush()
                author_id = author_obj.id

            # 2. Canonical Book
            clean_title = title.strip()
            book = db.query(CanonicalBook).filter(CanonicalBook.normalized_title == clean_title.lower()).first()
            if not book:
                cover_url = None
                if custom_cover and os.path.exists(custom_cover):
                    # Copy cover to assets/cache/covers
                    ext = os.path.splitext(custom_cover)[1]
                    import hashlib
                    hash_val = hashlib.md5(clean_title.encode('utf-8')).hexdigest()
                    dst_cover = f"assets/cache/covers/{hash_val}{ext}"
                    shutil.copyfile(custom_cover, dst_cover)
                    cover_url = f"/{dst_cover}"

                book = CanonicalBook(
                    title=clean_title,
                    normalized_title=clean_title.lower(),
                    author_id=author_id,
                    cover_url=cover_url,
                    thumbnail_url=cover_url,
                )
                db.add(book)
                db.flush()
                canonical_ids_to_enrich.append(book.id)
            else:
                if author_id and not book.author_id:
                    book.author_id = author_id

            # 3. Member
            member_id = None
            if member_name:
                clean_mem = member_name.strip()
                mem_obj = db.query(Member).filter(Member.display_name.ilike(clean_mem)).first()
                if not mem_obj:
                    mem_obj = Member(
                        display_name=clean_mem,
                        normalized_name=clean_mem.lower()
                    )
                    db.add(mem_obj)
                    db.flush()
                member_id = mem_obj.id

            # 4. Discussion
            topic = "General Discussion" if is_general else ("Featured Author Interaction" if "Sowmiya" in str(notes) else None)
            disc_notes = notes or ("General Discussion" if is_general else None)

            # Check if discussion already exists for this book in meetup 99
            existing_disc = db.query(Discussion).filter(
                Discussion.meetup_id == meetup.id,
                Discussion.canonical_book_id == book.id,
                Discussion.member_id == member_id
            ).first()

            if not existing_disc:
                disc = Discussion(
                    meetup_id=meetup.id,
                    canonical_book_id=book.id,
                    member_id=member_id,
                    topic=topic,
                    notes=disc_notes
                )
                db.add(disc)
                added_count += 1

        db.commit()
        print(f"[OK] Successfully added {added_count} discussions for Meetup #99!")

        # 5. Enrich books from Goodreads
        print(f"Enriching {len(canonical_ids_to_enrich)} newly created books from Goodreads...")
        enriched = 0
        for b_id in canonical_ids_to_enrich:
            try:
                res = enrich_canonical_book_from_goodreads(b_id, db)
                if res.get("success"):
                    enriched += 1
            except Exception as e:
                pass
        print(f"[OK] Enriched {enriched} books with Goodreads metadata & covers!")

        print("\n=== MEETUP #99 INGESTION COMPLETE ===")

    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    main()
