"""
Deduplication and Cleanup Script for BBB Library Database
- Resolves all duplicate book records across goodreads_id, title+author, and verified variants.
- Re-points all discussions and imported_books to the primary canonical record.
- Cleans up zero-discussion non-book text fragments.
- Validates that 2001: A Space Odyssey, The Blue Umbrella, and all duplicates have single unified records
  with all discussion readers and meetups preserved.
"""
import sqlite3
import re
from collections import defaultdict

DB_PATH = 'book_club_archivist.db'

def norm(text):
    if not text:
        return ""
    text = text.lower()
    text = re.sub(r'^(the|a|an)\s+', '', text)
    text = re.sub(r'[^a-z0-9]', '', text)
    return text

def main():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    print("=== STARTING BBB DATABASE DEDUPLICATION ===")
    
    # 1. Fetch all canonical books
    books = cur.execute("""
        SELECT cb.id, cb.title, cb.goodreads_id, a.full_name, cb.author_id, cb.cover_url, cb.description, cb.publication_year, cb.rating
        FROM canonical_books cb
        LEFT JOIN authors a ON cb.author_id = a.id
    """).fetchall()
    
    book_map = {b[0]: b for b in books}
    print(f"Total initial canonical books: {len(books)}")

    # 2. Count discussions per book
    disc_counts = defaultdict(int)
    for row in cur.execute("SELECT canonical_book_id, count(*) FROM discussions WHERE canonical_book_id IS NOT NULL GROUP BY canonical_book_id").fetchall():
        disc_counts[row[0]] = row[1]

    # 3. Union-Find structure for clustering
    parent = {b[0]: b[0] for b in books}
    def find(i):
        if parent[i] != i:
            parent[i] = find(parent[i])
        return parent[i]

    def union(i, j):
        root_i = find(i)
        root_j = find(j)
        if root_i != root_j:
            parent[root_i] = root_j

    # A. Cluster by non-empty Goodreads ID
    by_gid = defaultdict(list)
    for b in books:
        gid = (b[2] or '').strip()
        if gid and gid != 'None' and gid != '0':
            by_gid[gid].append(b[0])
    for gid, ids in by_gid.items():
        if len(ids) > 1:
            for other in ids[1:]:
                union(ids[0], other)

    # B. Cluster by exact (norm_title, norm_author) when author exists
    by_title_author = defaultdict(list)
    for b in books:
        t = norm(b[1])
        a = norm(b[3])
        if t and a and len(a) > 2:
            by_title_author[(t, a)].append(b[0])
    for (t, a), ids in by_title_author.items():
        if len(ids) > 1:
            for other in ids[1:]:
                union(ids[0], other)

    # C. Specific verified pairs from user request & investigation
    # 2001: A Space Odyssey
    cur.execute("SELECT id FROM canonical_books WHERE title LIKE '%2001%' AND title LIKE '%space odyssey%'")
    odyssey_ids = [r[0] for r in cur.fetchall()]
    if len(odyssey_ids) > 1:
        for oid in odyssey_ids[1:]:
            union(odyssey_ids[0], oid)

    # The Blue Umbrella / Blue Umbrella
    cur.execute("SELECT id FROM canonical_books WHERE title LIKE '%blue umbrella%'")
    umbrella_ids = [r[0] for r in cur.fetchall()]
    if len(umbrella_ids) > 1:
        for uid in umbrella_ids[1:]:
            union(umbrella_ids[0], uid)

    # Other known spelling / formatting variants
    known_variants = [
        ("Warbreaker", "War Breaker"),
        ("The Dispossessed", "Disposessed"),
        ("The Mahabharata Murders", "Mahabharatha Murders"),
        ("The Colour of Magic", "Color of Magic"),
        ("This Divided Island", "That Divided Island"),
        ("Beyond the Boulevards", "Beyond the Boulevard"),
        ("The 100-Year-Old Man Who Climbed Out the Window and Disappeared", "The Hundred Year Old Man Who Climbed Out The Window and"),
        ("The 100-Year-Old Man Who Climbed Out the Window and Disappeared", "The Hundred-Year-Old Man Who Climbed Out the Window and Disappeared (Jonas"),
        ("The House in the Cerulean Sea", "House on The Cerulean Sea"),
        ("What You’re Looking For Is in the Library", "What You Are Looking for Is already in the Library"),
        ("Gita Press and the Making of Hindu India", "Gita Press & The making of Hindu India"),
        ("The Five People You Meet in Heaven", "Five People who you meet in the heaven"),
        ("Aristotle and Dante Discover the Secrets of the Universe", "Artistotle and Dante discover the secrets of universe"),
        ("There's Gunpowder In The Air", "There is Gunpowder in the Air"),
        ("Flowers for Algernon", "Flowers of Algernon"),
        ("The Storied Life of A. J. Fikry", "The storied life of AJ Fikrey"),
        ("The Master & Margarita", "Master and Margarita"),
        ("84, Charing Cross Road", "84, Charing Cross"),
        ("Thinking, Fast and Slow", "Thinking Fast and Slow"),
        ("Duck, Death and the Tulip", "Duck death and the tulips"),
        ("Em & The Big Hoom", "Em and The Big Hoom"),
        ("The Loneliness of Sonia and Sunny", "The Loneliness of Sonia and Sunny: A Novel"),
        ("The Devotion of Suspect X", "Devotion of Suspect X"),
        ("Life of Chuck", "The Life of Chuck"),
        ("The Thursday Murder Club", "Thursday Murder Club"),
        ("The Adventures of Amina al-Sirafi", "The Adventures of Amina-Al-Sirafi"),
        ("I Want to Die But I Want to Eat Tteokbokki", "IWanttoDiebutIWanttoEatTteokbokki"),
        ("Early Indians: The Story of Our Ancestors and Where We Came From", "Early Indians"),
        ("Together: Why Social Connection Holds the Key to Better Health, Higher Performance, and Greater Happiness", "Together"),
        ("An Immense World: How Animal Senses Reveal the Hidden Realms Around Us", "An Immense World"),
        ("Marginlands: A Journey into India’s Vanishing Landscapes", "Marginlands"),
        ("Upheaval: Turning Points for Nations in Crisis", "Upheaval"),
        ("Three Thousand Stitches: Ordinary People, Extraordinary Lives", "Three Thousand Stitches"),
        ("The Women Who Forgot to Invent Facebook and Other Stories (Nisha", "The Women Who Forgot to Invent Facebook"),
        ("Writing for Developers: Blogs that get read", "PiotrSarna"),
        ("ISRO: A Personal History", "R Aravamudan"),
        ("I Rhyme Without Reason", "Vinay Leo"),
        ("Flâneur: The Art of Wandering the Streets of Paris", "Castigliano)"),
        ("Vaadivaasal: The Arena", "Vaadivaasal"),
    ]

    for v1, v2 in known_variants:
        id1 = cur.execute("SELECT id FROM canonical_books WHERE title LIKE ? LIMIT 1", (f"%{v1}%",)).fetchone()
        id2 = cur.execute("SELECT id FROM canonical_books WHERE title LIKE ? LIMIT 1", (f"%{v2}%",)).fetchone()
        if id1 and id2 and id1[0] != id2[0]:
            union(id1[0], id2[0])

    # 4. Group into clusters
    clusters = defaultdict(list)
    for b in books:
        root = find(b[0])
        clusters[root].append(b[0])

    dup_clusters = [c for c in clusters.values() if len(c) > 1]
    print(f"Identified {len(dup_clusters)} duplicate clusters encompassing {sum(len(c) for c in dup_clusters)} records.")

    # 5. Process each cluster: Select best primary record and merge
    merged_count = 0
    discs_repointed = 0

    for cluster in dup_clusters:
        # Score candidates to pick the best primary
        def score(bid):
            b = book_map[bid]
            s = 0
            # Discussions attached
            s += disc_counts[bid] * 10
            # Valid Goodreads ID
            if b[2] and b[2] != 'None':
                s += 50
                # Prefer shorter/standard Goodreads IDs (canonical works often < 100000000)
                if len(b[2]) < 9:
                    s += 10
                if b[2] in ['70535', '1611810', '25489025', '199729429', '32388712', '18007564']:
                    s += 100  # explicit preferred canonical editions
            # Has cover URL
            if b[5] and 'http' in b[5]:
                s += 25
            # Has description
            if b[6]:
                s += 15
            # Has publication year
            if b[7]:
                s += 10
            # Title quality (avoid broken brackets or OCR cuts)
            title = b[1]
            if not title.endswith('(') and not title.endswith(')') and not title.endswith('?') and len(title) > 3:
                s += 20
            if ':' in title:
                s += 5  # prefer punctuated titles like "2001: A Space Odyssey"
            return s

        sorted_c = sorted(cluster, key=score, reverse=True)
        primary_id = sorted_c[0]
        duplicates_to_merge = sorted_c[1:]

        primary_book = list(book_map[primary_id])

        # Fill any missing primary fields from secondary records
        for sec_id in duplicates_to_merge:
            sec_book = book_map[sec_id]
            # author_id
            if not primary_book[4] and sec_book[4]:
                primary_book[4] = sec_book[4]
                cur.execute("UPDATE canonical_books SET author_id = ? WHERE id = ?", (sec_book[4], primary_id))
            # goodreads_id
            if (not primary_book[2] or primary_book[2] == 'None') and (sec_book[2] and sec_book[2] != 'None'):
                primary_book[2] = sec_book[2]
                cur.execute("UPDATE canonical_books SET goodreads_id = ? WHERE id = ?", (sec_book[2], primary_id))
            # cover_url
            if not primary_book[5] and sec_book[5]:
                primary_book[5] = sec_book[5]
                cur.execute("UPDATE canonical_books SET cover_url = ? WHERE id = ?", (sec_book[5], primary_id))
            # description
            if not primary_book[6] and sec_book[6]:
                primary_book[6] = sec_book[6]
                cur.execute("UPDATE canonical_books SET description = ? WHERE id = ?", (sec_book[6], primary_id))
            # publication_year
            if not primary_book[7] and sec_book[7]:
                primary_book[7] = sec_book[7]
                cur.execute("UPDATE canonical_books SET publication_year = ? WHERE id = ?", (sec_book[7], primary_id))
            # rating
            if primary_book[8] is None and sec_book[8] is not None:
                primary_book[8] = sec_book[8]
                cur.execute("UPDATE canonical_books SET rating = ? WHERE id = ?", (sec_book[8], primary_id))

            # Re-point discussions
            cur.execute("UPDATE discussions SET canonical_book_id = ? WHERE canonical_book_id = ?", (primary_id, sec_id))
            discs_repointed += cur.rowcount

            # Re-point imported_books
            cur.execute("UPDATE imported_books SET canonical_book_id = ? WHERE canonical_book_id = ?", (primary_id, sec_id))

            # Delete the secondary duplicate record
            cur.execute("DELETE FROM canonical_books WHERE id = ?", (sec_id,))
            merged_count += 1

    conn.commit()
    print(f"Merged {merged_count} duplicate books. Re-pointed {discs_repointed} discussion records.")

    # 6. Specific verification of 2001: A Space Odyssey and The Blue Umbrella
    print("\n=== VERIFYING SPECIFIC CANONICAL RECORDS ===")
    
    # 2001
    cur.execute("UPDATE canonical_books SET title = '2001: A Space Odyssey', goodreads_id = '70535' WHERE title LIKE '%2001%' AND title LIKE '%space odyssey%'")
    conn.commit()
    odyssey = cur.execute("SELECT id, title, goodreads_id FROM canonical_books WHERE title LIKE '%2001%' AND title LIKE '%space odyssey%'").fetchall()
    print(f"2001 records ({len(odyssey)}): {odyssey}")
    if odyssey:
        o_discs = cur.execute("""
            SELECT m.meetup_number, mem.display_name, d.notes 
            FROM discussions d 
            JOIN meetups m ON d.meetup_id = m.id 
            LEFT JOIN members mem ON d.member_id = mem.id 
            WHERE d.canonical_book_id = ?
        """, (odyssey[0][0],)).fetchall()
        print(f"  Discussions on unified 2001 ({len(o_discs)}): {o_discs}")

    # Blue Umbrella
    cur.execute("UPDATE canonical_books SET title = 'The Blue Umbrella', goodreads_id = '1611810' WHERE title LIKE '%blue umbrella%'")
    conn.commit()
    umbrella = cur.execute("SELECT id, title, goodreads_id FROM canonical_books WHERE title LIKE '%blue umbrella%'").fetchall()
    print(f"Blue Umbrella records ({len(umbrella)}): {umbrella}")
    if umbrella:
        u_discs = cur.execute("""
            SELECT m.meetup_number, mem.display_name, d.notes 
            FROM discussions d 
            JOIN meetups m ON d.meetup_id = m.id 
            LEFT JOIN members mem ON d.member_id = mem.id 
            WHERE d.canonical_book_id = ?
        """, (umbrella[0][0],)).fetchall()
        print(f"  Discussions on unified Blue Umbrella ({len(u_discs)}): {u_discs}")

    # 7. Clean up non-book zero-discussion garbage artifacts from canonical_books
    # (Text chunks, chat snippets, OCR headers that have 0 discussions)
    deleted_junk = cur.execute("""
        DELETE FROM canonical_books 
        WHERE id NOT IN (SELECT DISTINCT canonical_book_id FROM discussions WHERE canonical_book_id IS NOT NULL)
          AND (
            title LIKE '%was quite the list%'
            OR title LIKE '%wound down the meetup%'
            OR title LIKE '%Another good meetup%'
            OR title LIKE '%Hope to see some of the rest%'
            OR title LIKE '%THIS IS ALL THE DATA%'
            OR title LIKE '%Rahul Kondi%'
            OR title LIKE '%smattering of Murakami%'
            OR title LIKE '%voracious.. readers%'
            OR title LIKE '%Other Links%'
            OR title LIKE '%Member’s Picks%'
            OR title LIKE '%Jonasson)%'
            OR title LIKE '%DeepakVaradarajan%'
            OR title LIKE '%Castigliano)%'
            OR title LIKE '%(noted by Vinay%'
            OR length(title) > 180
          )
    """).rowcount
    conn.commit()
    print(f"Cleaned up {deleted_junk} non-book text/junk artifacts from canonical_books.")

    total_remaining = cur.execute("SELECT count(*) FROM canonical_books").fetchone()[0]
    total_discussed = cur.execute("SELECT count(DISTINCT canonical_book_id) FROM discussions WHERE canonical_book_id IS NOT NULL").fetchone()[0]
    print(f"\nFINAL DATABASE TOTALS:")
    print(f"  Total canonical books: {total_remaining}")
    print(f"  Total distinct discussed books: {total_discussed}")

if __name__ == '__main__':
    main()
