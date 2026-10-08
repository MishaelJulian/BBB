import sqlite3
import sys
import os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.path.insert(0, os.path.abspath('.'))


def audit_meetup_47():
    conn = sqlite3.connect('book_club_archivist.db')
    c = conn.cursor()

    # 1. Meetup metadata
    c.execute("SELECT id, meetup_number, title, date, venue_id, format, attendance_count, description FROM meetups WHERE meetup_number = 47")
    m = c.fetchone()
    print("=== MEETUP 47 METADATA ===")
    if not m:
        print("Meetup 47 NOT FOUND in meetups table!")
        return
    print(f"ID: {m[0]}")
    print(f"Number: {m[1]}")
    print(f"Title: {m[2]}")
    print(f"Date: {m[3]}")
    print(f"Venue ID: {m[4]}")
    if m[4]:
        c.execute("SELECT name, address FROM venues WHERE id = ?", (m[4],))
        print(f"Venue Name: {c.fetchone()}")
    print(f"Format: {m[5]}")
    print(f"Attendance: {m[6]}")
    print(f"Description: {m[7]}")
    print()

    # 2. Discussions for Meetup 47
    c.execute("""
        SELECT d.id, cb.id, cb.title, a.full_name, cb.goodreads_id, d.notes, d.member_id
        FROM discussions d
        JOIN canonical_books cb ON d.canonical_book_id = cb.id
        LEFT JOIN authors a ON cb.author_id = a.id
        WHERE d.meetup_id = ?
        ORDER BY cb.title ASC
    """, (m[0],))
    discussions = c.fetchall()
    print(f"=== DISCUSSIONS IN DB FOR MEETUP 47: {len(discussions)} ===")
    for i, d in enumerate(discussions, 1):
        print(f"{i:2d}. '{d[2]}' by '{d[3]}'")

    # 3. Raw Imported Books for Meetup 47
    c.execute("""
        SELECT ib.id, ib.raw_title, ib.raw_author, ib.canonical_book_id,
               cb.title, a.full_name
        FROM imported_books ib
        JOIN sources s ON ib.source_id = s.id
        LEFT JOIN canonical_books cb ON ib.canonical_book_id = cb.id
        LEFT JOIN authors a ON cb.author_id = a.id
        WHERE s.meetup_number = 47
        ORDER BY ib.id
    """)
    imported = c.fetchall()
    print(f"\n=== RAW IMPORTED_BOOKS IN DB FOR MEETUP 47: {len(imported)} ===")

    disc_cb_ids = {d[1] for d in discussions}

    no_canonical = []
    has_canonical_no_disc = []
    valid_discussed = []

    for idx, row in enumerate(imported, 1):
        ib_id, raw_title, raw_author, cb_id, cb_title, author_name = row
        in_disc = cb_id in disc_cb_ids if cb_id else False

        if cb_id is None:
            no_canonical.append((idx, raw_title, raw_author))
        elif not in_disc:
            has_canonical_no_disc.append((idx, raw_title, raw_author, cb_title, author_name))
        else:
            valid_discussed.append((idx, raw_title, raw_author, cb_title, author_name))

    print(f"\n1. Successfully Linked & Discussed: {len(valid_discussed)}")
    print(f"2. Imported with NO Canonical Book: {len(no_canonical)}")
    for idx, rt, ra in no_canonical:
        print(f"   [{idx:02d}] Raw: '{rt}' | Author: '{ra}'")

    print(f"\n3. Has Canonical Book BUT NOT in Discussions: {len(has_canonical_no_disc)}")
    for idx, rt, ra, ct, an in has_canonical_no_disc:
        print(f"   [{idx:02d}] Raw: '{rt}' | Canonical: '{ct}' by '{an}'")

    print(f"\n4. Suspect / Bogus / Garbage Book Records in Discussions:")
    for d in discussions:
        title = d[2]
        author = d[3]
        if "dated" in title.lower() or "2022" in title.lower() or "books discussed" in title.lower():
            print(f"   - Bogus Header Imported As Book: '{title}' by '{author}' (ID: {d[1]})")

    # 4. Compare with raw lines from BBB Meetup-9.txt
    print("\n=== RAW TEXT ARCHIVE COMPARISON (BBB Meetup-9.txt) ===")
    with open('sources/BBB Meetup-9.txt', 'r', encoding='utf-8') as f:
        all_lines = f.readlines()
    
    slice_lines = [l.strip() for l in all_lines[1847:1924] if l.strip()]
    print(f"Total non-empty lines in text slice (1848-1924): {len(slice_lines)}")
    for i, l in enumerate(slice_lines, 1):
        print(f"  {i:2d}: {l}")

if __name__ == '__main__':
    audit_meetup_47()
