import sqlite3

conn = sqlite3.connect('book_club_archivist.db')
cursor = conn.cursor()

# Check full schema
cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' ORDER BY name")
for row in cursor.fetchall():
    if row[0]:
        print(row[0])
        print()

conn.close()
