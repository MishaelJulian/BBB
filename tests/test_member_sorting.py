import pytest
from fastapi.testclient import TestClient
from app.api.main import app

client = TestClient(app)

def test_members_list_endpoint():
    """Verify that /members returns with books, meetups, and latest covers."""
    response = client.get("/members")
    assert response.status_code == 200
    members = response.json()
    assert isinstance(members, list)
    if members:
        # Check first member structure
        m = members[0]
        assert "id" in m
        assert "display_name" in m
        assert "book_count" in m
        assert "covers" in m
        assert isinstance(m["covers"], list)

def test_member_dossier_chronological_sorting():
    """Verify that /members/{id} returns books ordered from latest to oldest."""
    # First get a member with books
    response = client.get("/members?sort_by=books")
    assert response.status_code == 200
    members = response.json()
    
    # Find a member who has at least 2 books
    active_member = next((m for m in members if m["book_count"] >= 2), None)
    if not active_member:
        pytest.skip("No member with multiple books in database")

    # Fetch dossier
    dossier_resp = client.get(f"/members/{active_member['id']}")
    assert dossier_resp.status_code == 200
    dossier = dossier_resp.json()
    books = dossier.get("books", [])
    assert len(books) >= 2

    # Verify each book's meetups are sorted latest first
    # And the books list itself is sorted latest meetup first
    book_max_numbers = []
    for b in books:
        meetups = b.get("meetups", [])
        if meetups:
            nums = [m["meetup_number"] for m in meetups if m.get("meetup_number") is not None]
            # Verify book's own meetups list is descending
            assert nums == sorted(nums, reverse=True), f"Book meetups not descending: {nums}"
            book_max_numbers.append(max(nums) if nums else 0)
        else:
            book_max_numbers.append(0)

    # Verify overall books list is in descending order of meetup appearances
    assert book_max_numbers == sorted(book_max_numbers, reverse=True), (
        f"Books not sorted latest to oldest: {book_max_numbers}"
    )
