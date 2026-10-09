"""
Clean up duplicate discussions in Meetup #78 (November 2024).

Context:
In sources/BBB NOV 24.pdf, pages 1-4 contained an unedited copy-paste leftover
from the October 2024 Google Doc template (from Deepak Varadarajan to Bharath),
which duplicated 35 books from Meetup #77 (October 2024).
Only Darshan's presentations:
1. Planning Democracy (Nikhil Menon)
2. Love Letters of Great Men and Women (Ursula Doyle)
were genuine November 2024 presentations.

This script non-destructively removes the 35 spurious discussion rows and 35
imported_book provenance rows from Meetup #78.
"""

import os
import sys
import sqlite3

DB_PATH = "book_club_archivist.db"

def fix_meetup_78():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    try:
        # 1. Get Meetup #78 id
        c.execute("SELECT id FROM meetups WHERE meetup_number = 78")
        row = c.fetchone()
        if not row:
            print("[ERROR] Meetup #78 not found in database!")
            return
        m78_id = row[0]
        print(f"[INFO] Meetup #78 ID: {m78_id}")

        # 2. Identify the genuine November books
        genuine_titles = ["Planning Democracy", "Love Letters of Great Men and Women"]
        c.execute("SELECT id, title FROM canonical_books WHERE title IN (?, ?)", tuple(genuine_titles))
        genuine_books = c.fetchall()
        print(f"[INFO] Genuine November books found: {[b[1] for b in genuine_books]}")
        genuine_book_ids = [b[0] for b in genuine_books]

        # 3. Find discussions in Meetup #78 to remove
        placeholders = ",".join("?" * len(genuine_book_ids))
        c.execute(f"""
            SELECT d.id, b.title, m.display_name
            FROM discussions d
            JOIN canonical_books b ON d.canonical_book_id = b.id
            LEFT JOIN members m ON d.member_id = m.id
            WHERE d.meetup_id = ?
            AND d.canonical_book_id NOT IN ({placeholders})
        """, (m78_id, *genuine_book_ids))
        discussions_to_remove = c.fetchall()
        print(f"[INFO] Spurious discussions to remove: {len(discussions_to_remove)}")

        # 4. Remove spurious discussions
        disc_ids_to_remove = [d[0] for d in discussions_to_remove]
        if disc_ids_to_remove:
            d_placeholders = ",".join("?" * len(disc_ids_to_remove))
            c.execute(f"DELETE FROM discussions WHERE id IN ({d_placeholders})", disc_ids_to_remove)
            print(f"[OK] Deleted {c.rowcount} spurious discussions from Meetup #78.")

        # 5. Remove spurious imported_books provenance for Meetup #78 source
        c.execute("SELECT id FROM sources WHERE file_path = 'BBB NOV 24.pdf'")
        s_row = c.fetchone()
        if s_row:
            s_id = s_row[0]
            c.execute(f"""
                SELECT id, raw_title FROM imported_books
                WHERE source_id = ?
                AND canonical_book_id NOT IN ({placeholders})
            """, (s_id, *genuine_book_ids))
            imp_to_remove = c.fetchall()
            print(f"[INFO] Spurious imported_books to remove: {len(imp_to_remove)}")
            imp_ids_to_remove = [imp[0] for imp in imp_to_remove]
            if imp_ids_to_remove:
                imp_placeholders = ",".join("?" * len(imp_ids_to_remove))
                c.execute(f"DELETE FROM imported_books WHERE id IN ({imp_placeholders})", imp_ids_to_remove)
                print(f"[OK] Deleted {c.rowcount} spurious imported_books.")

        conn.commit()

        # 6. Verify final discussion count for Meetup #77 and Meetup #78
        c.execute("""
            SELECT meet.meetup_number, count(d.id)
            FROM meetups meet
            LEFT JOIN discussions d ON d.meetup_id = meet.id
            WHERE meet.meetup_number IN (77, 78)
            GROUP BY meet.meetup_number
        """)
        for m_num, cnt in c.fetchall():
            print(f"[VERIFY] Meetup #{m_num} now has {cnt} discussions.")

    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Transaction failed: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    fix_meetup_78()
