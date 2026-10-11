"""S2: the public synopsis GET never fetches from the web and never writes."""

from app.api import main
from app.database.models import CanonicalBook


def test_synopsis_get_does_not_fetch_or_write(db_session, monkeypatch):
    book = CanonicalBook(title="Meditations", normalized_title="meditations")
    db_session.add(book)
    db_session.commit()

    def no_web(*args, **kwargs):
        raise AssertionError("public GET must not call the web")

    monkeypatch.setattr(main, "SessionLocal", lambda: db_session)
    monkeypatch.setattr(main, "fetch_book_metadata_from_web", no_web)

    book_id = book.id
    out = main.get_book_synopsis_endpoint(book_id)

    assert "Bangalore Book Club" in out["description"]  # fallback text, not stored
    book = db_session.get(CanonicalBook, book_id)  # the endpoint closed the session
    assert book.description is None and book.page_count is None and book.rating is None
