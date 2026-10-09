"""
Ingest newly uploaded BBB Meetup PDFs into book_club_archivist.db.

Meetups handled:
- Meetup #68 (BBB JAN 24.pdf, 2024-01-20)
- Meetup #69 (BBB FEB 24.pdf, 2024-02-24)
- Meetup #70 (BBB MAR 24.pdf, 2024-03-24) - updates pdf_url
- Meetup #75 (BBB AUG 24.pdf, 2024-08-25) - updates pdf_url
- Meetup #76 (BBB SEP 24.pdf, 2024-09-29) - updates pdf_url
- Meetup #77 (BBB OCT 24.pdf, 2024-10-27)
- Meetup #78 (BBB NOV 24.pdf, 2024-11-24)
- Meetup #79 (BBB DEC 24.pdf, 2024-12-21)
- Meetup #89 (BBB OCT 2025 - BOOKS DISCUSSED.pdf, 2025-10-26)
"""

import os
import sys
import re
from datetime import date
from typing import List, Dict, Optional, Tuple

sys.path.insert(0, os.path.abspath("."))

import fitz
from app.core.database import SessionLocal
from app.database.models import (
    Meetup, CanonicalBook, Author, Member, Discussion, ImportedBook, Venue, Source
)


def clean_text(t: str) -> str:
    return re.sub(r'[\u200b\u200c\u200d\uFEFF]', '', t).strip()


def normalize_str(s: Optional[str]) -> str:
    if not s:
        return ""
    # Lowercase, remove non-alphanumeric except spaces
    cleaned = re.sub(r"[^\w\s]", "", s.lower())
    return " ".join(cleaned.split())


def extract_goodreads_id(url: Optional[str]) -> Optional[str]:
    if not url:
        return None
    m = re.search(r"show/(\d+)", url)
    if m:
        return m.group(1)
    return None


def parse_pdf_items(file_path: str) -> List[Dict]:
    doc = fitz.open(file_path)
    raw_lines = []
    for page in doc:
        for l in page.get_text().splitlines():
            cl = clean_text(l)
            if cl:
                raw_lines.append(cl)

    # 1. Join split URLs
    lines = []
    idx = 0
    while idx < len(raw_lines):
        line = raw_lines[idx]
        if line.startswith("http://") or line.startswith("https://"):
            while idx + 1 < len(raw_lines):
                nxt = raw_lines[idx + 1]
                if nxt.startswith(("●", "•")) or re.match(r"^\d+[\.\)]", nxt):
                    break
                if nxt.startswith("http"):
                    break
                if idx + 2 < len(raw_lines) and re.match(r"^1[\.\)]", raw_lines[idx + 2]):
                    break
                # URL continuation
                line += nxt
                idx += 1
        lines.append(line)
        idx += 1

    # 2. Extract books and members
    items = []
    current_member = None
    is_tangent = False

    header_patterns = [
        r"^BBB\s+MEET", r"^@THE\s+BOOKWORM", r"^@SAMAGATHA", r"^CHURCH\s+STREET",
        r"^DATE\s*:", r"^PLACE\s*:", r"^SUMMARY", r"^VENUE"
    ]

    for i, line in enumerate(lines):
        if any(re.search(pat, line, re.I) for pat in header_patterns):
            continue

        if re.search(r"^TANGENTS", line, re.I) or re.search(r"GENERAL\s+DISCUSSION", line, re.I):
            is_tangent = True
            current_member = None
            continue

        if line.startswith("http"):
            if items:
                items[-1]["url"] = line
            continue

        is_member_header = False
        if i + 1 < len(lines) and re.match(r"^1[\.\)]", lines[i + 1]) and not line.startswith(("●", "•")) and not line.startswith("http"):
            is_member_header = True
        elif not is_tangent and line.isupper() and 2 <= len(line) <= 30 and not any(c in line for c in "0123456789()/:"):
            if line not in ["PAGE", "BOOKS DISCUSSED", "AUTHOR DISCUSSION", "GENERAL MENTIONS"]:
                is_member_header = True

        if is_member_header:
            current_member = line.title()
            is_tangent = False
            continue

        entry = line
        url = None
        m_url = re.search(r"(https?://\S+)", entry)
        if m_url:
            url = m_url.group(1)
            entry = entry.replace(url, "").strip()

        # Clean bullet / numbering
        entry = re.sub(r"^[●•\*\-∙]\s*", "", entry)
        entry = re.sub(r"^\d+[\.\)]\s*", "", entry).strip()

        title, author = "", ""
        if ", by " in entry or ",by " in entry:
            parts = re.split(r",\s*by\s+", entry, maxsplit=1, flags=re.I)
            title = parts[0].strip()
            author = parts[1].strip() if len(parts) > 1 else ""
        elif " by " in entry:
            parts = re.split(r"\s+by\s+", entry, maxsplit=1, flags=re.I)
            title = parts[0].strip()
            author = parts[1].strip() if len(parts) > 1 else ""
        elif "(" in entry and ")" in entry:
            m = re.match(r"^(.*?)\s*\((.*?)\)$", entry)
            if m:
                title = m.group(1).strip()
                author = m.group(2).strip()
            else:
                title = entry
        else:
            title = entry

        title = title.strip("-•●* ")
        if len(title) >= 2 and title.lower() not in ["the", "by", "and", "nice", "summary"]:
            items.append({
                "title": title,
                "author": author,
                "member": current_member,
                "is_tangent": is_tangent or (current_member is None),
                "url": url,
                "raw": line
            })

    return items


def ingest_meetups():
    db = SessionLocal()
    try:
        print("=== INGESTING / UPDATING MEETUPS IN SITE DATABASE ===")

        # Ensure Bookworm venue exists
        venue = db.query(Venue).filter(Venue.name.ilike("%bookworm%")).first()
        if not venue:
            venue = Venue(name="Bookworm", city="Bengaluru", is_online=False)
            db.add(venue)
            db.flush()
        bookworm_id = venue.id

        # Update existing meetups 70, 75, 76 with clean pdf_url
        updates_70s = [
            (70, "/assets/generated_pdfs/bbb_meetup_70.pdf"),
            (75, "/assets/generated_pdfs/bbb_meetup_75.pdf"),
            (76, "/assets/generated_pdfs/bbb_meetup_76.pdf"),
        ]
        for m_num, pdf_url in updates_70s:
            m = db.query(Meetup).filter(Meetup.meetup_number == m_num).first()
            if m:
                m.pdf_url = pdf_url
                print(f"[OK] Updated Meetup #{m_num} pdf_url -> {pdf_url}")

        # Meetups to fully ingest
        meetups_to_ingest = [
            {
                "meetup_number": 68,
                "date": date(2024, 1, 20),
                "title": "BBB Meetup #68",
                "pdf_file": "BBB JAN 24.pdf",
                "pdf_url": "/assets/generated_pdfs/bbb_meetup_68.pdf",
                "description": "January 2024 meetup at The Bookworm. Discussions covering new year reads, tangents, and member presentations.",
            },
            {
                "meetup_number": 69,
                "date": date(2024, 2, 24),
                "title": "BBB Meetup #69",
                "pdf_file": "BBB FEB 24.pdf",
                "pdf_url": "/assets/generated_pdfs/bbb_meetup_69.pdf",
                "description": "February 2024 meetup at The Bookworm. Discussions covering biography, history, psychology, and fiction.",
            },
            {
                "meetup_number": 77,
                "date": date(2024, 10, 27),
                "title": "BBB Meetup #77",
                "pdf_file": "BBB OCT 24.pdf",
                "pdf_url": "/assets/generated_pdfs/bbb_meetup_77.pdf",
                "description": "October 2024 meetup at The Bookworm. Discussions of fiction, personal essays, philosophy, and translated works.",
            },
            {
                "meetup_number": 78,
                "date": date(2024, 11, 24),
                "title": "BBB Meetup #78",
                "pdf_file": "BBB NOV 24.pdf",
                "pdf_url": "/assets/generated_pdfs/bbb_meetup_78.pdf",
                "description": "November 2024 meetup at The Bookworm. Discussions on political history, contemporary fiction, and member favorites.",
            },
            {
                "meetup_number": 79,
                "date": date(2024, 12, 21),
                "title": "BBB Meetup #79",
                "pdf_file": "BBB DEC 24.pdf",
                "pdf_url": "/assets/generated_pdfs/bbb_meetup_79.pdf",
                "description": "December 2024 year-end meetup at The Bookworm. Tangents, technology, mythology, food history, and member book discussions.",
            },
            {
                "meetup_number": 89,
                "date": date(2025, 10, 26),
                "title": "BBB Meetup #89",
                "pdf_file": "BBB OCT 2025 - BOOKS DISCUSSED.pdf",
                "pdf_url": "/assets/generated_pdfs/bbb_meetup_89.pdf",
                "description": "October 2025 meetup at The Bookworm. In-depth discussions on world literature, classic translations, history, and horror.",
            },
        ]

        total_new_meetups = 0
        total_new_books = 0
        total_linked_books = 0
        total_discussions = 0

        for config in meetups_to_ingest:
            m_num = config["meetup_number"]
            m_date = config["date"]
            pdf_file = config["pdf_file"]
            pdf_url = config["pdf_url"]
            desc = config["description"]
            title = config["title"]

            print(f"\n--- Processing Meetup #{m_num} ({pdf_file}) ---")

            # 1. Source record
            source = db.query(Source).filter(
                (Source.file_path == pdf_file) | (Source.meetup_number == m_num)
            ).first()
            if not source:
                source = Source(
                    file_path=pdf_file,
                    source_type="PDF_DOCUMENT",
                    meetup_number=m_num,
                    pdf_page=1,
                    extraction_confidence=0.95,
                    raw_text=f"Imported from {pdf_file}",
                    importer_name="pdf_meetup_ingest_v2",
                )
                db.add(source)
                db.flush()
            else:
                source.meetup_number = m_num
                db.flush()

            # 2. Meetup record
            meetup = db.query(Meetup).filter(Meetup.meetup_number == m_num).first()
            if not meetup:
                meetup = Meetup(
                    meetup_number=m_num,
                    date=m_date,
                    title=title,
                    venue_id=bookworm_id,
                    format="IN_PERSON",
                    description=desc,
                    pdf_url=pdf_url,
                    source_id=source.id,
                )
                db.add(meetup)
                db.flush()
                total_new_meetups += 1
                print(f"[OK] Created Meetup #{m_num} in DB (ID: {meetup.id})")
            else:
                meetup.date = m_date
                meetup.title = title
                meetup.venue_id = bookworm_id
                meetup.pdf_url = pdf_url
                meetup.source_id = source.id
                db.flush()
                print(f"[OK] Updated existing Meetup #{m_num} in DB (ID: {meetup.id})")

            # 3. Parse items from PDF
            pdf_path_to_read = os.path.join("sources", pdf_file) if not os.path.exists(pdf_file) and os.path.exists(os.path.join("sources", pdf_file)) else pdf_file
            items = parse_pdf_items(pdf_path_to_read)
            # Meetup #78 (BBB NOV 24.pdf) contains unedited copy-paste leftover
            # from October 2024 template starting from Deepak Varadarajan. Only
            # Darshan's entries on page 1 before the leftover block are genuine November reads.
            if m_num == 78:
                items = [it for it in items if it.get("member") == "Darshan" and it.get("title") in ["Planning Democracy", "Love Letters of Great Men and Women"]]
            print(f"  Parsed {len(items)} items from {pdf_file}")

            for item in items:
                raw_title = item["title"]
                raw_author = item["author"]
                member_name = item["member"]
                is_tangent = item["is_tangent"]
                url = item["url"]
                gid = extract_goodreads_id(url)

                norm_title = normalize_str(raw_title)
                if not norm_title or len(norm_title) < 2:
                    continue

                # Author resolution
                author_id = None
                if raw_author:
                    norm_auth = normalize_str(raw_author)
                    author = db.query(Author).filter(
                        (Author.normalized_name == norm_auth) |
                        (Author.full_name.ilike(raw_author))
                    ).first()
                    if not author:
                        author = Author(
                            full_name=raw_author,
                            normalized_name=norm_auth
                        )
                        db.add(author)
                        db.flush()
                    author_id = author.id

                # Member resolution
                member_id = None
                if member_name:
                    norm_mem = normalize_str(member_name)
                    # Canonical member name resolution
                    member_canonical_map = {
                        "deepak v": "Deepak",
                        "deepak varadaraj": "Deepak",
                        "deepak varadarajan": "Deepak",
                        "deepakvaradaraj": "Deepak",
                        "jyothi": "Jyoti",
                        "jyothi menon": "Jyoti",
                        "john": "John Raju",
                        "dr. chaitanya": "Chaitanya",
                        "dr chaitanya": "Chaitanya",
                    }
                    if norm_mem in member_canonical_map:
                        member_name = member_canonical_map[norm_mem]
                        norm_mem = normalize_str(member_name)

                    member = db.query(Member).filter(
                        (Member.normalized_name == norm_mem) |
                        (Member.display_name.ilike(member_name))
                    ).first()
                    if not member:
                        member = Member(
                            display_name=member_name,
                            normalized_name=norm_mem
                        )
                        db.add(member)
                        db.flush()
                    member_id = member.id

                # Canonical Book resolution
                book = None
                if gid:
                    book = db.query(CanonicalBook).filter(CanonicalBook.goodreads_id == gid).first()
                if not book:
                    book = db.query(CanonicalBook).filter(
                        (CanonicalBook.normalized_title == norm_title) |
                        (CanonicalBook.title.ilike(raw_title))
                    ).first()

                media_type = "tangent" if is_tangent else "book"

                if not book:
                    book = CanonicalBook(
                        title=raw_title,
                        normalized_title=norm_title,
                        author_id=author_id,
                        goodreads_id=gid,
                        external_url=url,
                        media_type="book",
                    )
                    db.add(book)
                    db.flush()
                    total_new_books += 1
                else:
                    total_linked_books += 1
                    if not book.goodreads_id and gid:
                        book.goodreads_id = gid
                    if not book.author_id and author_id:
                        book.author_id = author_id
                    if not book.external_url and url:
                        book.external_url = url
                    db.flush()

                # Imported Book provenance
                imp = db.query(ImportedBook).filter(
                    ImportedBook.canonical_book_id == book.id,
                    ImportedBook.source_id == source.id
                ).first()
                if not imp:
                    imp = ImportedBook(
                        raw_title=raw_title,
                        raw_author=raw_author or "",
                        normalized_title=norm_title,
                        source_id=source.id,
                        canonical_book_id=book.id,
                    )
                    db.add(imp)
                    db.flush()

                # Discussion record
                disc = db.query(Discussion).filter(
                    Discussion.meetup_id == meetup.id,
                    Discussion.canonical_book_id == book.id,
                    Discussion.member_id == member_id
                ).first()

                topic_str = "Tangents / General Discussion" if is_tangent else "Member Presentation"
                notes_str = f"Discussed at Meetup #{m_num} ({m_date.strftime('%B %Y')})."
                if member_name:
                    notes_str += f" Presented by {member_name}."
                if url:
                    notes_str += f" Goodreads: {url}"

                if not disc:
                    disc = Discussion(
                        meetup_id=meetup.id,
                        canonical_book_id=book.id,
                        member_id=member_id,
                        topic=topic_str,
                        notes=notes_str,
                        confidence_score=1.0,
                        media_type=media_type,
                        external_url=url,
                        source_id=source.id,
                    )
                    db.add(disc)
                    total_discussions += 1

        db.commit()
        print("\n=== INGESTION SUCCESSFUL! ===")
        print(f"Total new meetups created: {total_new_meetups}")
        print(f"Total new canonical books: {total_new_books}")
        print(f"Total existing canonical books linked: {total_linked_books}")
        print(f"Total discussions recorded: {total_discussions}")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Ingestion failed: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    ingest_meetups()
