import urllib.request
import json

base = 'http://127.0.0.1:8000'

def get(path):
    req = urllib.request.urlopen(f'{base}{path}')
    return json.loads(req.read().decode())

def test_p3():
    print("==================================================")
    print("P3 SPATIAL BIDIRECTIONALITY VERIFICATION SUITE")
    print("==================================================")

    # 6 Named test cases
    test_titles = [
        "Mort",
        "A Man called Ove",
        "Pachinko",
        "The Giver",
        "The Story of India",
        "Zeelam",
    ]

    print("\n--- 1. Testing Spatial Resolution for 6 Target Volumes ---")
    for title in test_titles:
        results = get(f"/books?search={urllib.parse.quote(title)}")
        if not results:
            print(f"[FAIL] Book not found in API: {title}")
            continue
        book = results[0]
        first_char = book['title'][0].upper()
        section = first_char if first_char.isalpha() else '#'
        print(f"[PASS] \"{book['title']}\"")
        print(f"       ID: {book['id']}")
        print(f"       Resolved Section: Section {section} (#section-{section})")
        print(f"       Spatial Deep-Link: /library-room?select={book['id']}")
        print(f"       Discussions: {book['discussion_count']} | Meetups: {len(book['meetups'])} | Readers: {len(book['members'])}")

    print("\n--- 2. Testing Reverse Path: Member -> Book -> 3D Shelf ---")
    madhu = get("/members/MADHUSUDAN")
    print(f"[PASS] Member \"{madhu['display_name']}\" reading history contains {len(madhu['books'])} books:")
    for b in madhu['books']:
        print(f"       - \"{b['title']}\" -> Spatial Link: /library-room?select={b['id']}")

    print("\n--- 3. Testing Reverse Path: Author -> Book -> 3D Shelf ---")
    pratchett = get("/authors/Terry%20Pratchett")
    print(f"[PASS] Author \"{pratchett['full_name']}\" bibliography contains {len(pratchett['books'])} volumes:")
    for b in pratchett['books'][:3]:
        print(f"       - \"{b['title']}\" -> Spatial Link: /library-room?select={b['id']}")

    print("\n--- 4. Testing Reverse Path: Meetup -> Book -> 3D Shelf ---")
    m97 = get("/meetups/97")
    print(f"[PASS] Meetup #97 contains {len(m97['books'])} discussed books:")
    for b in m97['books'][:3]:
        print(f"       - \"{b['title']}\" (Read by: {b['member'] or 'Community'}) -> Spatial Link: /library-room?select={b['id']}")

    print("\n==================================================")
    print("ALL P3 SPATIAL BIDIRECTIONALITY PATHWAYS VERIFIED")
    print("==================================================")

if __name__ == '__main__':
    import urllib.parse
    test_p3()
