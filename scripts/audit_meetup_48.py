import sqlite3
import sys
import os
sys.path.insert(0, os.path.abspath('.'))

def audit_meetup_48():
    conn = sqlite3.connect('book_club_archivist.db')
    c = conn.cursor()

    # 1. Meetup metadata
    c.execute("SELECT id, meetup_number, title, date, venue_id, format, attendance_count, description FROM meetups WHERE meetup_number = 48")
    m = c.fetchone()
    print("=== MEETUP 48 METADATA ===")
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

    # 2. Discussions for Meetup 48
    c.execute("""
        SELECT d.id, cb.id, cb.title, a.full_name, cb.goodreads_id, d.notes, d.member_id
        FROM discussions d
        JOIN canonical_books cb ON d.canonical_book_id = cb.id
        LEFT JOIN authors a ON cb.author_id = a.id
        WHERE d.meetup_id = ?
        ORDER BY cb.title ASC
    """, (m[0],))
    discussions = c.fetchall()
    print(f"=== DISCUSSIONS IN DB FOR MEETUP 48: {len(discussions)} ===")

    # 3. Imported Books for Meetup 48
    c.execute("""
        SELECT ib.id, ib.raw_title, ib.raw_author, ib.canonical_book_id,
               cb.title, a.full_name
        FROM imported_books ib
        JOIN sources s ON ib.source_id = s.id
        LEFT JOIN canonical_books cb ON ib.canonical_book_id = cb.id
        LEFT JOIN authors a ON cb.author_id = a.id
        WHERE s.meetup_number = 48
        ORDER BY ib.id
    """)
    imported = c.fetchall()
    print(f"=== RAW IMPORTED_BOOKS IN DB: {len(imported)} ===")
    
    disc_cb_ids = {d[1] for d in discussions}

    no_canonical = []
    has_canonical_no_disc = []
    garbage_entries = []
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
    print(f"2. Imported with NO Canonical Book (Dropped/Unlinked): {len(no_canonical)}")
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

    # 4. Check raw text file BBB Meetup-9.txt lines 1755-1848
    print("\n=== RAW TEXT ARCHIVE COMPARISON (BBB Meetup-9.txt) ===")
    with open('BBB Meetup-9.txt', 'r', encoding='utf-8') as f:
        all_lines = f.readlines()
    
    # Line numbers 1755 to 1848 (0-indexed 1754 to 1848)
    slice_lines = all_lines[1754:1848]
    print(f"Lines slice length: {len(slice_lines)}")

    # 5. Check why unlinked books were not matched or created
    from app.parsers.utils import normalize_title
    from app.pipeline.full_import import normalize_name_for_dedup

    print("\n=== WHY UNLINKED BOOKS WERE NOT CANONICALIZED ===")
    c.execute("""
        SELECT ib.raw_title, ib.raw_author, ib.normalized_title
        FROM imported_books ib
        JOIN sources s ON ib.source_id = s.id
        WHERE s.meetup_number = 48 AND ib.canonical_book_id IS NULL
    """)
    for rt, ra, nt in c.fetchall():
        norm_t = normalize_title(rt)
        norm_a = normalize_name_for_dedup(ra) if ra else ''
        c.execute('SELECT cb.id, cb.title, cb.normalized_title, a.full_name FROM canonical_books cb LEFT JOIN authors a ON cb.author_id = a.id WHERE cb.normalized_title = ?', (norm_t,))
        matches = c.fetchall()
        print(f"Raw: '{rt}' | Author: '{ra}'")
        print(f"   norm_t='{norm_t}', norm_a='{norm_a}'")
        if matches:
            for m in matches:
                auth_norm = normalize_name_for_dedup(m[3]) if m[3] else ''
                print(f"   -> Exact Title in DB: '{m[1]}' | Author: '{m[3]}' (norm_a='{auth_norm}')")
        else:
            c.execute('SELECT cb.id, cb.title, cb.normalized_title, a.full_name FROM canonical_books cb LEFT JOIN authors a ON cb.author_id = a.id WHERE cb.normalized_title LIKE ?', (f'%{norm_t}%',))
            fuzz = c.fetchall()
            if fuzz:
                for fz in fuzz[:2]:
                    print(f"   ~> Partial Title in DB: '{fz[1]}' | Author: '{fz[3]}'")
            else:
                print("   !! Not found in canonical_books at all.")
        print()

    print("\n=== POSSIBLE_DUPLICATES IN DB FOR MEETUP 48 ===")
    c.execute("""
        SELECT pd.id, pd.imported_book_id, pd.candidate_canonical_id, pd.match_confidence, pd.status,
               ib.raw_title, ib.raw_author, cb.title
        FROM possible_duplicates pd
        LEFT JOIN imported_books ib ON pd.imported_book_id = ib.id
        LEFT JOIN canonical_books cb ON pd.candidate_canonical_id = cb.id
        WHERE pd.imported_book_id IN (
            SELECT ib2.id FROM imported_books ib2 JOIN sources s ON ib2.source_id = s.id WHERE s.meetup_number = 48
        )
    """)
    dups = c.fetchall()
    print(f"Total possible duplicates for Meetup 48: {len(dups)}")
    for d in dups:
        print(f"   - '{d[5]}' by '{d[6]}' -> Candidate: '{d[7]}' (conf: {d[3]}, status: '{d[4]}')")

    print("\n=== IMPORT LOGS FOR DUPLICATES / MERGES ===")
    c.execute("SELECT message FROM import_logs WHERE message LIKE '%Merged%' OR message LIKE '%duplicate%'")
    for r in c.fetchall():
        print("  Log:", r[0])

    print("\n=== EXACT UNLINKED ROWS INSPECTION ===")
    c.execute("""
        SELECT ib.id, ib.raw_title, ib.normalized_title, ib.raw_author
        FROM imported_books ib
        JOIN sources s ON ib.source_id = s.id
        WHERE s.meetup_number = 48 AND ib.canonical_book_id IS NULL
    """)
    for r in c.fetchall():
        print(f"ID: {r[0]} | raw_title: {repr(r[1])} | norm_t: {repr(r[2])} | raw_a: {repr(r[3])}")

    print("\n=== WHY THE MIDNIGHT LIBRARY FAILED ===")
    c.execute("""
        SELECT ib.id, ib.raw_title, ib.normalized_title, ib.raw_author, ib.canonical_book_id
        FROM imported_books ib
        WHERE ib.normalized_title = 'the midnight library'
    """)
    for r in c.fetchall():
        print("  ib row:", r)

    c.execute("""
        SELECT cb.id, cb.title, cb.normalized_title, a.full_name, cb.author_id
        FROM canonical_books cb
        LEFT JOIN authors a ON cb.author_id = a.id
        WHERE cb.normalized_title = 'the midnight library'
    """)
    for r in c.fetchall():
        print("  cb row:", r)

    c.execute("""
        SELECT d.id, m.meetup_number, d.canonical_book_id
        FROM discussions d
        JOIN meetups m ON d.meetup_id = m.id
        WHERE d.canonical_book_id = 'ecf9414b-6e4a-4755-90d7-b3aa3f89b331'
    """)
    for r in c.fetchall():
        print("  discussion row:", r)

    print("\n=== TXT_PARSER OUTPUT FOR MEETUP 48 ===")
    from app.parsers.txt_parser import TxtMeetupParser
    parser = TxtMeetupParser()
    records = parser.parse('BBB Meetup-9.txt')
    m48_recs = [r for r in records if r.meetup and r.meetup.meetup_number == 48]
    print(f"Total records parsed by txt_parser for Meetup 48: {len(m48_recs)}")
    for r in m48_recs:
        if r.book and r.book.title and 'midnight library' in r.book.title.lower():
            print("  Midnight Library parsed:", r.book)
        if r.book and r.book.title and 'dated' in r.book.title.lower():
            print("  Dated parsed:", r.book)

    c.execute("""
        SELECT id, created_at, updated_at, source_id, raw_title, raw_author, canonical_book_id
        FROM imported_books
        WHERE id = '6f204feb-0b74-409c-88ce-178ea0ce08e9'
    """)
    print("Timestamp row:", c.fetchone())

if __name__ == '__main__':
    audit_meetup_48()








