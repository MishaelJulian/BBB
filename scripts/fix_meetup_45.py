import sqlite3
import uuid
from datetime import datetime

def fix_meetup_45():
    conn = sqlite3.connect('book_club_archivist.db')
    c = conn.cursor()

    meetup_45_id = '8a72e202-f73b-4edb-a03f-1a89359f6f79'
    now_str = datetime.utcnow().isoformat()

    print("Beginning database fix for Meetup #45...")

    # 1. Map of 7 missing books: (imported_book_id, canonical_book_id, title_display)
    missing_books = [
        ('ec8feea9-64e4-4805-921f-502f6dc34409', '55599554-153f-4cf3-ac79-88739944671c', 'Circe'),
        ('f8052d17-cd1c-4832-af55-13f59adf48f7', '89df83bc-4560-473a-a456-02be0be5d07b', 'The Song of Achilles'),
        ('47437e00-2090-4ccb-91c9-7a2d1e2d1089', '7507cfcf-9933-491b-96be-675ecfcc04f2', 'Project Hail Mary'),
        ('23ea8de6-bc99-4d5b-9a7c-7f8b3f2fa523', 'ea231055-0814-4016-a477-db2e9e5e0b3c', 'Annihilation of Caste'),
        ('49c9a7a7-6886-4694-a1e4-28b6bc5f800a', '049cd0f2-c1cd-4b5e-a682-6ed328015f86', 'Hangwoman'),
        ('922bb75c-5a89-456f-8dcc-a55ad42e66eb', '4def1e2f-c1e7-42a7-a49c-f916c0c5d2c8', 'Beautiful World, Where are you?'),
        ('5fa155cd-892a-4319-bf01-b9b09499ce2a', 'f5d8896e-011f-42f2-aa35-1db2d3d247e9', 'Old Man’s War'),
    ]

    for ib_id, cb_id, title in missing_books:
        # A. Link imported_books
        c.execute("UPDATE imported_books SET canonical_book_id = ?, updated_at = ? WHERE id = ?", (cb_id, now_str, ib_id))
        print(f"  [+] Linked imported_book '{title}' ({ib_id}) -> canonical_book ({cb_id})")

        # B. Check if discussion already exists
        c.execute("SELECT id FROM discussions WHERE meetup_id = ? AND canonical_book_id = ?", (meetup_45_id, cb_id))
        existing = c.fetchone()
        if not existing:
            disc_id = str(uuid.uuid4())
            c.execute("""
                INSERT INTO discussions (
                    id, meetup_id, canonical_book_id, member_id, topic, notes,
                    rating, sentiment, confidence_score, source_id, created_at, updated_at
                ) VALUES (?, ?, ?, NULL, NULL, NULL, NULL, NULL, 1.0, NULL, ?, ?)
            """, (disc_id, meetup_45_id, cb_id, now_str, now_str))
            print(f"  [+] Created discussion record ({disc_id}) for '{title}'")
        else:
            print(f"  [~] Discussion already exists for '{title}' ({existing[0]})")

    # 2. Fix Ravi Subramanian (normalize name and link 'God is a Banker')
    ravi_id = '725d2864-e579-435c-871a-441b4a075219'
    c.execute("UPDATE authors SET full_name = 'Ravi Subramanian', normalized_name = 'ravisubramanian', updated_at = ? WHERE id = ?", (now_str, ravi_id))
    c.execute("""
        UPDATE canonical_books 
        SET title = 'God Is a Banker', normalized_title = 'god is a banker',
            author_id = ?, goodreads_id = '1834240', updated_at = ?
        WHERE id = '65a16c9e-8b67-4756-af63-fa8783529b58'
    """, (ravi_id, now_str))
    print("  [+] Fixed author and title of 'God is a Banker' -> Ravi Subramanian")


    # 3. Fix Sujata Massey for 'Murder on Malbar Hill'
    sujata_id = 'ced8380b-5503-4f2f-85c0-d5ec3f3a12bb'
    c.execute("""
        UPDATE canonical_books
        SET author_id = ?, title = 'The Widows of Malabar Hill / Murder on Malabar Hill',
            normalized_title = 'the widows of malabar hill murder on malabar hill', updated_at = ?
        WHERE id = '4ebce4ec-d149-4859-828d-053474217af2'
    """, (sujata_id, now_str))
    print("  [+] Fixed author and title of 'Murder on Malbar Hill' -> Sujata Massey")

    # 4. Fix William Gibson for 'Sprawl Trilogy'
    gibson_id = '99b366a9-2fa5-4026-9e29-505adc126404'
    c.execute("UPDATE canonical_books SET author_id = ?, updated_at = ? WHERE id = '54de8c62-06f2-457a-9319-9a3aac01d06a'", (gibson_id, now_str))
    print("  [+] Fixed author of 'Sprawl Trilogy' -> William Gibson")

    # 5. Fix spelling of Anand Teltumbde
    c.execute("""
        UPDATE canonical_books
        SET title = 'Works of Anand Teltumbde (Persistence of Caste / Republic of Caste)',
            normalized_title = 'works of anand teltumbde persistence of caste republic of caste',
            updated_at = ?
        WHERE id = 'f19b9932-20a7-4ddb-a277-199a2efcfc4f'
    """, (now_str,))
    c.execute("UPDATE authors SET full_name = 'Anand Teltumbde', normalized_name = 'anandteltumbde', updated_at = ? WHERE id = '507a56ec-87a2-4c0e-832e-fe25d90c190c'", (now_str,))
    notes_text = "Discussion on Anand Teltumbde's scholarship and books on caste dynamics"
    c.execute("""
        UPDATE discussions
        SET notes = ?, updated_at = ?
        WHERE meetup_id = ? AND canonical_book_id = 'f19b9932-20a7-4ddb-a277-199a2efcfc4f'
    """, (notes_text, now_str, meetup_45_id))
    print("  [+] Corrected spelling & notes for Anand Teltumbde")


    conn.commit()
    conn.close()
    print("All fixes successfully applied and committed to SQLite database!")

if __name__ == '__main__':
    fix_meetup_45()
