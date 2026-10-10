"""
Expands series discussions into individual constituent books with authentic Goodreads metadata,
covers, authors, publication years, and discussions linked to the reader and meetup.
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import os
import uuid
from datetime import datetime

sys.path.insert(0, os.path.abspath("."))
from app.core.database import SessionLocal
from app.database.models import CanonicalBook, Author, Member, Meetup, Discussion
from app.api.main import enrich_canonical_book_from_goodreads, search_external_books

SERIES_EXPANSIONS = [
    # M#99: Gokul - The Hierarchy
    {
        "meetup_number": 99,
        "reader_name": "Gokul",
        "series_title": "The Hierarchy (Series)",
        "books": [
            {
                "title": "The Will of the Many",
                "author": "James Islington",
                "goodreads_id": "58416952",
                "publication_year": 2023,
                "cover_url": "https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1677090886i/58416952._SY450_.jpg"
            }
        ]
    },
    # M#98: Anindita - The Hidden Hindu series
    {
        "meetup_number": 98,
        "reader_name": "Anindita",
        "series_title": "The Hidden Hindu series",
        "books": [
            {
                "title": "The Hidden Hindu",
                "author": "Akshat Gupta",
                "goodreads_id": "60463280",
                "publication_year": 2022,
                "cover_url": "https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1645423851i/60463280._SY450_.jpg"
            },
            {
                "title": "The Hidden Hindu 2",
                "author": "Akshat Gupta",
                "goodreads_id": "62232970",
                "publication_year": 2023,
                "cover_url": "https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1672322527i/62232970._SY450_.jpg"
            },
            {
                "title": "The Hidden Hindu 3",
                "author": "Akshat Gupta",
                "goodreads_id": "198528994",
                "publication_year": 2024,
                "cover_url": "https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1695022832i/198528994._SY450_.jpg"
            }
        ]
    },
    # M#97: Niveditha - Running Collection Set
    {
        "meetup_number": 97,
        "reader_name": "Niveditha",
        "series_title": "What I Talk About When I Talk About Running, Born To Run, Natural Born Heroes",
        "books": [
            {
                "title": "What I Talk About When I Talk About Running",
                "author": "Haruki Murakami",
                "goodreads_id": "2195464",
                "publication_year": 2007,
                "cover_url": "https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1360051187i/2195464._SY450_.jpg"
            },
            {
                "title": "Born to Run: A Hidden Tribe, Superathletes, and the Greatest Race the World Has Never Seen",
                "author": "Christopher McDougall",
                "goodreads_id": "6289283",
                "publication_year": 2009,
                "cover_url": "https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1327863776i/6289283._SY450_.jpg"
            },
            {
                "title": "Natural Born Heroes: How a Daring Band of Misfits Mastered the Lost Secrets of Strength and Endurance",
                "author": "Christopher McDougall",
                "goodreads_id": "22609433",
                "publication_year": 2015,
                "cover_url": "https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1420793616i/22609433._SY450_.jpg"
            }
        ]
    },
    # M#96: Anjali - St Clare's Series
    {
        "meetup_number": 96,
        "reader_name": "Anjali",
        "series_title": "St Clare’s Series",
        "books": [
            {
                "title": "The Twins at St Clare's",
                "author": "Enid Blyton",
                "goodreads_id": "832962",
                "publication_year": 1941,
                "cover_url": "https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1328849767i/832962._SY450_.jpg"
            },
            {
                "title": "The O'Sullivan Twins",
                "author": "Enid Blyton",
                "goodreads_id": "832960",
                "publication_year": 1942,
                "cover_url": "https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1328849765i/832960._SY450_.jpg"
            },
            {
                "title": "Summer Term at St Clare's",
                "author": "Enid Blyton",
                "goodreads_id": "832961",
                "publication_year": 1943,
                "cover_url": "https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1328849766i/832961._SY450_.jpg"
            },
            {
                "title": "Second Form at St Clare's",
                "author": "Enid Blyton",
                "goodreads_id": "832959",
                "publication_year": 1944,
                "cover_url": "https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1328849764i/832959._SY450_.jpg"
            },
            {
                "title": "Claudine at St Clare's",
                "author": "Enid Blyton",
                "goodreads_id": "832957",
                "publication_year": 1944,
                "cover_url": "https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1328849762i/832957._SY450_.jpg"
            },
            {
                "title": "Fifth Formers of St Clare's",
                "author": "Enid Blyton",
                "goodreads_id": "832958",
                "publication_year": 1945,
                "cover_url": "https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1328849763i/832958._SY450_.jpg"
            }
        ]
    },
    # M#93: Avinash - The First Law Trilogy
    {
        "meetup_number": 93,
        "reader_name": "Avinash",
        "series_title": "The First Law Trilogy",
        "books": [
            {
                "title": "The Blade Itself",
                "author": "Joe Abercrombie",
                "goodreads_id": "944073",
                "publication_year": 2006,
                "cover_url": "https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1519003504i/944073._SY450_.jpg"
            },
            {
                "title": "Before They Are Hanged",
                "author": "Joe Abercrombie",
                "goodreads_id": "902715",
                "publication_year": 2007,
                "cover_url": "https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1320392095i/902715._SY450_.jpg"
            },
            {
                "title": "Last Argument of Kings",
                "author": "Joe Abercrombie",
                "goodreads_id": "944076",
                "publication_year": 2008,
                "cover_url": "https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1388188185i/944076._SY450_.jpg"
            }
        ]
    },
    # M#77 & M#76: Amel / Asif - The Gormenghast Trilogy
    {
        "meetup_number": 77,
        "reader_name": "Amel",
        "series_title": "The Gormenghast Trilogy",
        "books": [
            {
                "title": "Titus Groan",
                "author": "Mervyn Peake",
                "goodreads_id": "39063",
                "publication_year": 1946,
                "cover_url": "https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1388185854i/39063._SY450_.jpg"
            },
            {
                "title": "Gormenghast",
                "author": "Mervyn Peake",
                "goodreads_id": "23546",
                "publication_year": 1950,
                "cover_url": "https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1388185852i/23546._SY450_.jpg"
            },
            {
                "title": "Titus Alone",
                "author": "Mervyn Peake",
                "goodreads_id": "25330",
                "publication_year": 1959,
                "cover_url": "https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1388185850i/25330._SY450_.jpg"
            }
        ]
    },
    # M#77: Amel - Mistborn Era 1
    {
        "meetup_number": 77,
        "reader_name": "Amel",
        "series_title": "Mistborn",
        "books": [
            {
                "title": "The Final Empire",
                "author": "Brandon Sanderson",
                "goodreads_id": "68428",
                "publication_year": 2006,
                "cover_url": "https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1617768316i/68428._SY450_.jpg"
            },
            {
                "title": "The Well of Ascension",
                "author": "Brandon Sanderson",
                "goodreads_id": "68429",
                "publication_year": 2007,
                "cover_url": "https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1617768317i/68429._SY450_.jpg"
            },
            {
                "title": "The Hero of Ages",
                "author": "Brandon Sanderson",
                "goodreads_id": "66050",
                "publication_year": 2008,
                "cover_url": "https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1617768318i/66050._SY450_.jpg"
            }
        ]
    },
    # M#68: Anusha - Heartstopper
    {
        "meetup_number": 68,
        "reader_name": "Anusha",
        "series_title": "The Heartstopper series",
        "books": [
            {
                "title": "Heartstopper: Volume 1",
                "author": "Alice Oseman",
                "goodreads_id": "40495957",
                "publication_year": 2018,
                "cover_url": "https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1553874333i/40495957._SY450_.jpg"
            },
            {
                "title": "Heartstopper: Volume 2",
                "author": "Alice Oseman",
                "goodreads_id": "43307358",
                "publication_year": 2019,
                "cover_url": "https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1553874335i/43307358._SY450_.jpg"
            },
            {
                "title": "Heartstopper: Volume 3",
                "author": "Alice Oseman",
                "goodreads_id": "43307373",
                "publication_year": 2020,
                "cover_url": "https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1553874337i/43307373._SY450_.jpg"
            },
            {
                "title": "Heartstopper: Volume 4",
                "author": "Alice Oseman",
                "goodreads_id": "43307409",
                "publication_year": 2021,
                "cover_url": "https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1598284534i/43307409._SY450_.jpg"
            }
        ]
    },
    # M#65: Amit Charles - Anne Lamott collection
    {
        "meetup_number": 65,
        "reader_name": "Amit Charles",
        "series_title": "Bird by Bird & Almost Everything Notes on Hope By Anne Lamott 2 Books Collection Set",
        "books": [
            {
                "title": "Bird by Bird: Some Instructions on Writing and Life",
                "author": "Anne Lamott",
                "goodreads_id": "12543",
                "publication_year": 1994,
                "cover_url": "https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1360057633i/12543._SY450_.jpg"
            },
            {
                "title": "Almost Everything: Notes on Hope",
                "author": "Anne Lamott",
                "goodreads_id": "39296181",
                "publication_year": 2018,
                "cover_url": "https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1531165243i/39296181._SY450_.jpg"
            }
        ]
    }
]

def main():
    db = SessionLocal()
    try:
        print("=== EXPANDING SERIES BOOKS INTO INDIVIDUAL CANONICAL VOLUMES ===")
        total_created = 0
        total_discs = 0

        for item in SERIES_EXPANSIONS:
            m_num = item["meetup_number"]
            reader_name = item["reader_name"]
            
            meetup = db.query(Meetup).filter(Meetup.meetup_number == m_num).first()
            if not meetup:
                print(f"[WARN] Meetup #{m_num} not found, skipping.")
                continue

            member = None
            if reader_name:
                member = db.query(Member).filter(Member.display_name.ilike(reader_name)).first()
                if not member:
                    member = Member(
                        id=str(uuid.uuid4()),
                        display_name=reader_name,
                        normalized_name=reader_name.lower()
                    )
                    db.add(member)
                    db.flush()

            for b_info in item["books"]:
                title = b_info["title"]
                author_name = b_info["author"]
                gid = b_info["goodreads_id"]
                year = b_info.get("publication_year")
                cover = b_info.get("cover_url")

                # Author
                author = db.query(Author).filter(Author.full_name.ilike(author_name)).first()
                if not author:
                    author = Author(
                        id=str(uuid.uuid4()),
                        full_name=author_name,
                        normalized_name=author_name.lower()
                    )
                    db.add(author)
                    db.flush()

                # Check if canonical book already exists by goodreads_id or title
                book = None
                if gid:
                    book = db.query(CanonicalBook).filter(CanonicalBook.goodreads_id == gid).first()
                if not book:
                    book = db.query(CanonicalBook).filter(CanonicalBook.title.ilike(title), CanonicalBook.author_id == author.id).first()

                if not book:
                    book = CanonicalBook(
                        id=str(uuid.uuid4()),
                        title=title,
                        normalized_title=title.lower(),
                        author_id=author.id,
                        goodreads_id=gid,
                        publication_year=year,
                        cover_url=cover,
                        thumbnail_url=cover,
                        media_type="book",
                        created_at=datetime.utcnow()
                    )
                    db.add(book)
                    db.flush()
                    total_created += 1
                    print(f"[NEW BOOK] Created '{title}' by {author_name} (GR: {gid})")
                else:
                    if not book.goodreads_id and gid:
                        book.goodreads_id = gid
                    if not book.cover_url and cover:
                        book.cover_url = cover
                        book.thumbnail_url = cover
                    if not book.publication_year and year:
                        book.publication_year = year

                # Ensure discussion exists for this meetup and member
                disc = db.query(Discussion).filter(
                    Discussion.meetup_id == meetup.id,
                    Discussion.canonical_book_id == book.id
                ).first()

                if not disc:
                    disc = Discussion(
                        id=str(uuid.uuid4()),
                        meetup_id=meetup.id,
                        canonical_book_id=book.id,
                        member_id=member.id if member else None,
                        media_type="book",
                        notes=f"Discussed at Meetup #{m_num}. Part of {item['series_title']}.",
                        created_at=datetime.utcnow()
                    )
                    db.add(disc)
                    total_discs += 1
                    print(f"  [NEW DISC] Linked '{title}' -> Meetup #{m_num} (Reader: {reader_name})")
                else:
                    if member and not disc.member_id:
                        disc.member_id = member.id
                        print(f"  [UPDATED DISC] Added reader {reader_name} to existing discussion for '{title}'")

        db.commit()
        print(f"\nSUCCESS! Created {total_created} individual canonical books and {total_discs} new reader discussions.")

        # Re-check total canonical books and discussed books
        total_canon = db.query(CanonicalBook).count()
        total_discussed = db.query(Discussion.canonical_book_id).filter(Discussion.canonical_book_id.isnot(None)).distinct().count()
        print(f"Current database totals:")
        print(f"  Total canonical books: {total_canon}")
        print(f"  Total distinct discussed books: {total_discussed}")

    finally:
        db.close()

if __name__ == '__main__':
    main()
