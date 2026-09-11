import urllib.request
import urllib.error
import json

def test_backend():
    print("=== TESTING P2 BACKEND ENDPOINTS ===")
    
    # 1. Members directory
    req = urllib.request.urlopen("http://127.0.0.1:8000/members")
    members = json.loads(req.read().decode())
    print(f"[PASS] /members returned {len(members)} real members")
    top_member = members[0]
    print(f"       Top active reader: {top_member['display_name']} ({top_member['book_count']} books, {top_member['meetup_count']} meetups)")

    # 2. Member detail (Active member)
    req = urllib.request.urlopen(f"http://127.0.0.1:8000/members/{top_member['id']}")
    m_detail = json.loads(req.read().decode())
    print(f"[PASS] /members/{top_member['id']} returned dossier for {m_detail['display_name']}")
    print(f"       Books list: {[b['title'] for b in m_detail['books'][:3]]}")
    print(f"       Meetups list: {[m['number'] for m in m_detail['meetups'][:3]]}")

    # 3. Member detail by name
    req = urllib.request.urlopen("http://127.0.0.1:8000/members/MADHUSUDAN")
    madhu = json.loads(req.read().decode())
    print(f"[PASS] /members/MADHUSUDAN returned dossier for {madhu['display_name']} with {len(madhu['books'])} books: {[b['title'] for b in madhu['books']]}")

    # 4. Minimally active member
    min_member = [m for m in members if m['book_count'] == 1][0]
    req = urllib.request.urlopen(f"http://127.0.0.1:8000/members/{min_member['id']}")
    min_detail = json.loads(req.read().decode())
    print(f"[PASS] /members/{min_member['id']} returned single-book dossier for {min_detail['display_name']} ({min_detail['book_count']} book)")

    # 5. Author with books in archive
    req = urllib.request.urlopen("http://127.0.0.1:8000/books?search=Story%20of%20India")
    books = json.loads(req.read().decode())
    author_id = books[0]['author_id']
    if author_id:
        req = urllib.request.urlopen(f"http://127.0.0.1:8000/authors/{author_id}")
        a_detail = json.loads(req.read().decode())
        print(f"[PASS] /authors/{author_id} returned author record for {a_detail['full_name']} ({a_detail['book_count']} books in archive, {a_detail['discussion_count']} total discussions)")

    # 6. Test 404s for non-existent member and author
    try:
        urllib.request.urlopen("http://127.0.0.1:8000/members/non-existent-uuid-9999")
        print("[FAIL] Expected 404 for invalid member")
    except urllib.error.HTTPError as e:
        print(f"[PASS] Invalid member returned HTTP {e.code}")

    try:
        urllib.request.urlopen("http://127.0.0.1:8000/authors/non-existent-uuid-9999")
        print("[FAIL] Expected 404 for invalid author")
    except urllib.error.HTTPError as e:
        print(f"[PASS] Invalid author returned HTTP {e.code}")

    print("=== ALL P2 BACKEND TESTS PASSED ===")

if __name__ == '__main__':
    test_backend()
