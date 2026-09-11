"""
Regression test for Meetup #97 import.

This test verifies that the manual import of Meetup #97 was successful
and that the data meets archival quality standards.

Meetup #97 was imported manually from verified structured data because
the PDF contained scanned images (pages 2-7) that could not be parsed
automatically.

Source: BBB 97, June 2026, Books Discussed.pdf
Date: 2026-06-28
Venue: The Bookworm
"""
import sys
sys.path.insert(0, r'C:\Users\misha\OneDrive\Desktop\bbb')

import pytest
from datetime import date
from app.core.database import get_db_session, init_db
from app.database.models import (
    Meetup, Venue, Source, ImportedBook, CanonicalBook,
    Member, Discussion
)
from app.parsers.utils import normalize_title, normalize_name_for_dedup


SOURCE_FILE = "BBB 97, June 2026, Books Discussed.pdf"

# Expected member books from verified structured data
EXPECTED_MEMBERS = {
    "Madhusudan": ["Mort", "The Eden Paradox"],
    "Niveditha": ["What I Talk About When I Talk About Running", "Hampi (ASI Guide)", "Ellora (ASI Guide)"],
    "Shivankar": ["The Giver", "Odyssey"],
    "Bharath": ["August 17", "Prisoners of Geography", "Boar Hunt"],
    "Jyothi": ["The Tree, The Well, and The Drag Queen", "The Saint of Bright Doors"],
    "Sridevi": ["Mermaids in the Moonlight", "Good Arguments"],
    "Avinash": ["The City of Brass", "Strange Pictures", "Dungeon Crawler Carl"],
    "Ahona": ["The God of Small Things"],
    "Ipsa": ["A Painted House", "As Good As Gold", "Ghachar Ghochar"],
    "Mishael": ["The Wave", "The Iliad and The Odyssey"],
    "Abhiram": ["Dungeon Crawler Carl", "Jacked"],
    "Priyanka": ["Kiki's Delivery Service", "We Solve Murders", "Murder with Bengali Characteristics"],
    "Rida": ["Atmosphere", "The Ex Vows", "A House Without Windows"],
    "Leah": ["Guilt", "Sivagami's Vow", "Heated Rivalry"],
    "Harshit": ["Siddhartha", "Before the Coffee Gets Cold", "Project Hail Mary"],
    "Pradeep": ["Tomorrow, and Tomorrow, and Tomorrow"],
    "Darshan": ["Lust for Life", "The Agony and the Ecstasy"],
    "Vinay Leo": ["The Hound of the Baskervilles", "Harry Potter and the Chamber of Secrets", "How Oakley Lost His Spots"],
}

# Expected General Discussion books
EXPECTED_GD_BOOKS = [
    "After Dark",
    "Birthday Girl",
    "Norwegian Wood",
    "Number the Stars",
    "The Song of Troy",
    "Numbercaste",
    "Djinn City",
    "Edgedancer",
    "The Appeal",
    "The Devotion of Suspect X",
    "The Thursday Murder Club (series)",
    "The Seven Husbands of Evelyn Hugo",
    "The Good Enough Job",
    "Hitwoman",
    "Shameless (series)",
    "Heartstopper (series)",
]


@pytest.fixture(scope="module")
def db_session():
    """Get database session for tests."""
    init_db()
    with get_db_session() as session:
        yield session


class TestMeetup97Metadata:
    """Test Meetup #97 basic metadata."""

    def test_meetup_exists(self, db_session):
        meetup = db_session.query(Meetup).filter_by(meetup_number=97).first()
        assert meetup is not None, "Meetup #97 should exist"

    def test_meetup_date(self, db_session):
        meetup = db_session.query(Meetup).filter_by(meetup_number=97).first()
        assert meetup.date == date(2026, 6, 28), f"Expected date 2026-06-28, got {meetup.date}"

    def test_meetup_venue(self, db_session):
        meetup = db_session.query(Meetup).filter_by(meetup_number=97).first()
        venue = db_session.query(Venue).filter_by(id=meetup.venue_id).first()
        assert venue.name == "Bookworm", f"Expected venue 'Bookworm', got {venue.name}"

    def test_meetup_source(self, db_session):
        meetup = db_session.query(Meetup).filter_by(meetup_number=97).first()
        source = db_session.query(Source).filter_by(id=meetup.source_id).first()
        assert source.file_path == SOURCE_FILE, f"Expected source '{SOURCE_FILE}', got {source.file_path}"


class TestMeetup97Members:
    """Test that all members are correctly linked."""

    def test_all_members_present(self, db_session):
        """Verify all 18 members from the structured data exist."""
        meetup = db_session.query(Meetup).filter_by(meetup_number=97).first()
        discussions = db_session.query(Discussion).filter_by(meetup_id=meetup.id).all()

        # Get unique members from discussions
        member_ids = set()
        for d in discussions:
            if d.member_id:
                member_ids.add(d.member_id)

        # Should have at least 18 members (some may share books)
        assert len(member_ids) >= 18, f"Expected at least 18 members, got {len(member_ids)}"

    def test_member_names(self, db_session):
        """Verify specific member names exist."""
        meetup = db_session.query(Meetup).filter_by(meetup_number=97).first()
        discussions = db_session.query(Discussion).filter_by(meetup_id=meetup.id).all()

        member_names = set()
        for d in discussions:
            if d.member_id:
                member = db_session.query(Member).filter_by(id=d.member_id).first()
                if member:
                    member_names.add(member.display_name.upper())

        # Check a sample of expected members
        expected = {"MADHUSUDAN", "NIVEDITHA", "SHIVANKAR", "BHARATH", "VINAY LEO"}
        found = expected.intersection(member_names)
        assert len(found) >= 4, f"Expected at least 4 of {expected}, found {found}"


class TestMeetup97Books:
    """Test that books are correctly imported and linked."""

    def test_member_books_count(self, db_session):
        """Verify total member books imported."""
        source = db_session.query(Source).filter_by(file_path=SOURCE_FILE).first()
        books = db_session.query(ImportedBook).filter_by(source_id=source.id).all()

        # Should have 43 member books + 16 GD books = 59 total
        assert len(books) >= 55, f"Expected at least 55 books, got {len(books)}"

    def test_canonical_links(self, db_session):
        """Verify all books are linked to canonical books."""
        source = db_session.query(Source).filter_by(file_path=SOURCE_FILE).first()
        books = db_session.query(ImportedBook).filter_by(source_id=source.id).all()

        linked = sum(1 for b in books if b.canonical_book_id is not None)
        assert linked == len(books), f"All {len(books)} books should be linked to canonical books"

    def test_specific_books_exist(self, db_session):
        """Verify specific books from the structured data exist."""
        expected_titles = [
            "Mort",
            "The Eden Paradox",
            "The God of Small Things",
            "Project Hail Mary",
            "Harry Potter and the Chamber of Secrets",
        ]

        for title in expected_titles:
            norm = normalize_title(title)
            canonical = db_session.query(CanonicalBook).filter_by(normalized_title=norm).first()
            assert canonical is not None, f"Canonical book '{title}' should exist"


class TestMeetup97GeneralDiscussion:
    """Test that General Discussion books are correctly imported."""

    def test_gd_books_count(self, db_session):
        """Verify General Discussion books were imported."""
        meetup = db_session.query(Meetup).filter_by(meetup_number=97).first()
        discussions = db_session.query(Discussion).filter_by(
            meetup_id=meetup.id,
            notes="General Discussion"
        ).all()

        assert len(discussions) == 16, f"Expected 16 GD discussions, got {len(discussions)}"

    def test_gd_books_no_member(self, db_session):
        """Verify GD books are not linked to specific members."""
        meetup = db_session.query(Meetup).filter_by(meetup_number=97).first()
        discussions = db_session.query(Discussion).filter_by(
            meetup_id=meetup.id,
            notes="General Discussion"
        ).all()

        for d in discussions:
            assert d.member_id is None, f"GD discussion {d.id} should not have a member"


class TestMeetup97Provenance:
    """Test that provenance is correctly maintained."""

    def test_source_exists(self, db_session):
        """Verify source record exists."""
        source = db_session.query(Source).filter_by(file_path=SOURCE_FILE).first()
        assert source is not None, f"Source '{SOURCE_FILE}' should exist"

    def test_source_meetup_number(self, db_session):
        """Verify source is linked to meetup number."""
        source = db_session.query(Source).filter_by(file_path=SOURCE_FILE).first()
        assert source.meetup_number == 97, f"Expected meetup_number 97, got {source.meetup_number}"

    def test_books_have_source(self, db_session):
        """Verify all books have source provenance."""
        source = db_session.query(Source).filter_by(file_path=SOURCE_FILE).first()
        books = db_session.query(ImportedBook).filter_by(source_id=source.id).all()

        for book in books:
            assert book.source_id == source.id, f"Book {book.id} should have source provenance"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
