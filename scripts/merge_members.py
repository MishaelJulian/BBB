"""
Merge duplicate members in book_club_archivist.db:
1. Merge "Deepak V", "Deepak Varadaraj", "Deepak Varadarajan", "Deepakvaradaraj" -> "Deepak"
2. Merge "Jyothi", "Jyothi Menon" -> "Jyoti"
3. Merge "John" -> "John Raju"

Removes all duplicate member rows and consolidates all discussions cleanly under the canonical member.
"""

import os
import sqlite3
import shutil

DB_PATH = "book_club_archivist.db"
BACKUP_PATH = "book_club_archivist.db.merge_bak"

MERGE_PLAN = [
    {
        "canonical_name": "Deepak",
        "aliases": ["Deepak V", "Deepak Varadaraj", "Deepak Varadarajan", "Deepakvaradaraj"],
    },
    {
        "canonical_name": "Jyoti",
        "aliases": ["Jyothi", "Jyothi Menon"],
    },
    {
        "canonical_name": "John Raju",
        "aliases": ["John"],
    },
    {
        "canonical_name": "Chaitanya",
        "aliases": ["Dr. Chaitanya"],
    },
]

def merge_members():
    print("=== BACKING UP DATABASE ===")
    shutil.copyfile(DB_PATH, BACKUP_PATH)
    print(f"Backed up to {BACKUP_PATH}")

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    try:
        c.execute("PRAGMA foreign_keys = ON;")

        for plan in MERGE_PLAN:
            c_name = plan["canonical_name"]
            aliases = plan["aliases"]

            print(f"\n==========================================")
            print(f"Merging group -> Canonical: '{c_name}'")
            print(f"Aliases to merge: {aliases}")
            print(f"==========================================")

            # 1. Fetch canonical member
            c.execute("SELECT id, display_name FROM members WHERE display_name = ?", (c_name,))
            canon_row = c.fetchone()
            if not canon_row:
                raise ValueError(f"Canonical member '{c_name}' not found in members table!")
            canon_id, canon_display = canon_row
            print(f"Canonical ID: {canon_id} ({canon_display})")

            # 2. Fetch alias member records
            alias_placeholders = ",".join("?" * len(aliases))
            c.execute(f"SELECT id, display_name FROM members WHERE display_name IN ({alias_placeholders})", aliases)
            alias_rows = c.fetchall()
            print(f"Found {len(alias_rows)} alias member record(s) to merge: {[r[1] for r in alias_rows]}")

            for alias_id, alias_display in alias_rows:
                # Update discussions
                c.execute("UPDATE discussions SET member_id = ? WHERE member_id = ?", (canon_id, alias_id))
                disc_updated = c.rowcount
                print(f"  [{alias_display}] Re-linked {disc_updated} discussions to '{c_name}'")

                # Update notes in discussions where alias name was recorded in text
                c.execute(
                    "UPDATE discussions SET notes = REPLACE(notes, ?, ?) WHERE member_id = ? AND notes LIKE ?",
                    (f"Presented by {alias_display}.", f"Presented by {c_name}.", canon_id, f"%Presented by {alias_display}.%")
                )

                # Re-link any other relations if present
                for tbl in ["discussion_participants", "current_reads", "quotes"]:
                    c.execute(f"UPDATE {tbl} SET member_id = ? WHERE member_id = ?", (canon_id, alias_id))
                c.execute("UPDATE recommendations SET recommender_id = ? WHERE recommender_id = ?", (canon_id, alias_id))

                # Delete duplicate member
                c.execute("DELETE FROM members WHERE id = ?", (alias_id,))
                print(f"  [{alias_display}] Deleted duplicate member record (ID: {alias_id})")

            # Check discussions under canonical member
            c.execute("SELECT count(*) FROM discussions WHERE member_id = ?", (canon_id,))
            total_discs = c.fetchone()[0]
            c.execute("SELECT count(DISTINCT canonical_book_id) FROM discussions WHERE member_id = ?", (canon_id,))
            unique_books = c.fetchone()[0]
            c.execute("SELECT count(DISTINCT meetup_id) FROM discussions WHERE member_id = ?", (canon_id,))
            unique_meetups = c.fetchone()[0]
            print(f"[OK] '{c_name}' now has {total_discs} discussions ({unique_books} unique books across {unique_meetups} meetups).")

        conn.commit()
        print("\n=== ALL MEMBER MERGES COMMITTED SUCCESSFULLY ===")

        # Clean up backup on success
        if os.path.exists(BACKUP_PATH):
            os.remove(BACKUP_PATH)
            print(f"Removed temporary backup {BACKUP_PATH}")

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Merging failed: {e}")
        if os.path.exists(BACKUP_PATH):
            shutil.copyfile(BACKUP_PATH, DB_PATH)
            print(f"Restored database from {BACKUP_PATH}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    merge_members()
