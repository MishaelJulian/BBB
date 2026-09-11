import sqlite3

conn = sqlite3.connect('book_club_archivist.db')
cursor = conn.cursor()

# List all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
tables = cursor.fetchall()
print("=== DATABASE TABLES ===")
for t in tables:
    name = t[0]
    count = conn.execute(f"SELECT COUNT(*) FROM [{name}]").fetchone()[0]
    print(f"  {name}: {count} rows")

print("\n=== MEETUP DETAILS ===")
cursor.execute("SELECT meetup_number, date, location, title FROM meetups ORDER BY meetup_number")
for row in cursor.fetchall():
    print(f"  #{row[0]} | {row[1]} | {row[2]} | {row[3]}")

print("\n=== DISCUSSION INTERACTION TYPES ===")
cursor.execute("SELECT reading_status, COUNT(*) FROM discussions GROUP BY reading_status ORDER BY COUNT(*) DESC")
for row in cursor.fetchall():
    print(f"  {row[0]}: {row[1]}")

print("\n=== BOOK SAMPLE (first 10) ===")
cursor.execute("SELECT title, publication_year FROM books LIMIT 10")
for row in cursor.fetchall():
    print(f"  {row[0]} ({row[1]})")

print("\n=== AUTHOR COUNT ===")
cursor.execute("SELECT COUNT(DISTINCT id) FROM authors")
print(f"  Unique authors: {cursor.fetchone()[0]}")

print("\n=== SOURCES ===")
cursor.execute("SELECT DISTINCT file_path FROM sources ORDER BY file_path")
for row in cursor.fetchall():
    print(f"  {row[0]}")

print("\n=== VENUE/LOCATION DISTRIBUTION ===")
cursor.execute("SELECT location, COUNT(*) FROM meetups GROUP BY location ORDER BY COUNT(*) DESC")
for row in cursor.fetchall():
    print(f"  {row[0]}: {row[1]}")

conn.close()
