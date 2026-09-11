import pytest
from datetime import date
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import IntegrityError

from app.db.base import Base
from app.models import (
    Source,
    Venue,
    Author,
    CanonicalBook,
    ImportedBook,
    PossibleDuplicate,
    Meetup,
    Discussion,
    Member,
)


def get_test_session():
    """Creates a sync SQLite in-memory session for model integrity tests."""
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    return Session()


def test_source_model_creation_and_fields():
    session = get_test_session()
    source = Source(
        file_path="BBB Meetup-9.txt",
        source_type="TXT_ARCHIVE",
        meetup_number=20,
        start_line=10,
        end_line=25,
        raw_text="Sample raw meetup notes text",
    )
    session.add(source)
    session.commit()
    session.refresh(source)

    assert source.id is not None
    assert len(source.id) == 36
    assert source.created_at is not None
    assert source.file_path == "BBB Meetup-9.txt"
    assert source.raw_text == "Sample raw meetup notes text"


def test_author_uniqueness_constraint():
    session = get_test_session()
    a1 = Author(full_name="Virginia Woolf", normalized_name="virginia woolf")
    session.add(a1)
    session.commit()

    a2 = Author(full_name="Virginia Woolf Duplicate", normalized_name="virginia woolf")
    session.add(a2)

    with pytest.raises(IntegrityError):
        session.commit()
    session.rollback()


def test_venue_and_meetup_relationship():
    session = get_test_session()
    venue = Venue(name="Atta Galatta", city="Bengaluru", is_online=False)
    session.add(venue)
    session.commit()

    meetup = Meetup(
        meetup_number=20,
        date=date(2019, 6, 30),
        venue_id=venue.id,
        format="IN_PERSON",
    )
    session.add(meetup)
    session.commit()

    session.refresh(meetup)
    assert meetup.venue_id == venue.id


def test_three_layer_book_archive_and_review_queue():
    session = get_test_session()
    source = Source(file_path="BBB Meetup-9.txt", raw_text="Pachinko by Min Jin Lee")
    session.add(source)
    session.commit()

    canonical = CanonicalBook(
        title="Pachinko",
        normalized_title="pachinko",
    )
    session.add(canonical)
    session.commit()

    imported = ImportedBook(
        raw_title="Pachinko",
        normalized_title="pachinko",
        source_id=source.id,
        canonical_book_id=canonical.id,
    )
    session.add(imported)
    session.commit()

    dup = PossibleDuplicate(
        imported_book_id=imported.id,
        candidate_canonical_id=canonical.id,
        match_confidence=0.95,
        status="PENDING_REVIEW",
    )
    session.add(dup)
    session.commit()

    session.refresh(dup)
    assert dup.status == "PENDING_REVIEW"
    assert dup.match_confidence == 0.95


def test_discussion_relationship_integrity():
    session = get_test_session()
    source = Source(file_path="BBB Meetup-9.txt", raw_text="Discussion on Born a Crime")
    venue = Venue(name="Bookworm", city="Bengaluru")
    author = Author(full_name="Trevor Noah", normalized_name="trevor noah")
    member = Member(display_name="Rahul Kondi", normalized_name="rahul kondi")

    session.add_all([source, venue, author, member])
    session.commit()

    meetup = Meetup(meetup_number=22, date=date(2019, 8, 22), venue_id=venue.id)
    book = CanonicalBook(title="Born a Crime", normalized_title="born a crime", author_id=author.id)
    session.add_all([meetup, book])
    session.commit()

    discussion = Discussion(
        meetup_id=meetup.id,
        canonical_book_id=book.id,
        member_id=member.id,
        notes="High energy review of Born a Crime.",
        source_id=source.id,
    )
    session.add(discussion)
    session.commit()

    session.refresh(discussion)
    assert discussion.meetup_id == meetup.id
    assert discussion.canonical_book_id == book.id
    assert discussion.member_id == member.id
