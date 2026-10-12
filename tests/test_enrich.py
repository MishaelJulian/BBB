"""The Enrich button's worker: honest outcomes, retries, a title that must agree, and covers that must answer. The network is patched out."""
import pytest

from app.api import main
from app.database.models import Author, CanonicalBook


def make_book(db_session, title="Bhima: Lone Warrior", author="M.T. Vasudevan Nair", **kw):
    a = Author(full_name=author, normalized_name=author.lower()) if author else None
    if a:
        db_session.add(a); db_session.flush()
    b = CanonicalBook(title=title, normalized_title=title.lower(), author_id=a.id if a else None, language="en", **kw)
    db_session.add(b); db_session.commit()
    return b


def cand(title="Bhima: Lone Warrior", author="M.T. Vasudevan Nair", cover="https://i.gr-assets.com/x.jpg"):
    return {"title": title, "author": author, "cover_url": cover, "thumbnail_url": cover, "goodreads_id": "18481907", "rating": 4.1, "publication_year": 2013}


@pytest.fixture(autouse=True)
def no_waiting(monkeypatch):
    monkeypatch.setattr(main.time, "sleep", lambda s: None)


def test_matching_result_with_a_working_cover_is_enriched(db_session, monkeypatch):
    b = make_book(db_session)
    monkeypatch.setattr(main, "_goodreads_search", lambda q: [cand()])
    monkeypatch.setattr(main, "_cover_url_ok", lambda u: True)
    r = main.enrich_canonical_book_from_goodreads(b.id, db_session)
    assert r["status"] == "enriched" and b.goodreads_id == "18481907" and b.cover_url


def test_goodreads_failing_is_reported_as_failed_not_as_no_result(db_session, monkeypatch):
    b = make_book(db_session)
    calls = []

    def boom(q):
        calls.append(q)
        raise TimeoutError("slow")
    monkeypatch.setattr(main, "_goodreads_search", boom)
    r = main.enrich_canonical_book_from_goodreads(b.id, db_session)
    assert r["status"] == "failed" and "TimeoutError" in r["message"] and len(calls) >= 3      # retried


def test_a_transient_error_is_retried_and_then_succeeds(db_session, monkeypatch):
    b = make_book(db_session)
    state = {"n": 0}

    def flaky(q):
        state["n"] += 1
        if state["n"] < 3:
            raise ConnectionError("reset")
        return [cand()]
    monkeypatch.setattr(main, "_goodreads_search", flaky)
    monkeypatch.setattr(main, "_cover_url_ok", lambda u: True)
    assert main.enrich_canonical_book_from_goodreads(b.id, db_session)["status"] == "enriched"


def test_an_empty_answer_is_no_result(db_session, monkeypatch):
    b = make_book(db_session)
    monkeypatch.setattr(main, "_goodreads_search", lambda q: [])
    monkeypatch.setattr(main, "search_external_books", lambda q: [])
    assert main.enrich_canonical_book_from_goodreads(b.id, db_session)["status"] == "no_result"


def test_a_different_book_is_never_taken_for_this_one(db_session, monkeypatch):
    b = make_book(db_session, title="A People's Constitution", author="Rohit De")
    monkeypatch.setattr(main, "_goodreads_search", lambda q: [cand(title="The Lost Founder: James Wilson and the Forgotten Fight for a People's Constitution", author="Jesse Wegman")])
    r = main.enrich_canonical_book_from_goodreads(b.id, db_session)
    assert r["status"] == "no_result" and b.goodreads_id is None


def test_a_dead_cover_link_is_not_written(db_session, monkeypatch):
    b = make_book(db_session)
    monkeypatch.setattr(main, "_goodreads_search", lambda q: [cand()])
    monkeypatch.setattr(main, "_cover_url_ok", lambda u: False)
    r = main.enrich_canonical_book_from_goodreads(b.id, db_session)
    assert r["status"] == "enriched" and b.cover_url is None and b.goodreads_id == "18481907"


def test_a_complete_book_with_a_working_cover_is_skipped_and_one_with_a_dead_cover_is_not(db_session, monkeypatch):
    b = make_book(db_session, goodreads_id="1", cover_url="https://i.gr-assets.com/old.jpg")
    monkeypatch.setattr(main, "_cover_url_ok", lambda u: True)
    assert main.enrich_canonical_book_from_goodreads(b.id, db_session)["status"] == "skipped"
    monkeypatch.setattr(main, "_cover_url_ok", lambda u: u != "https://i.gr-assets.com/old.jpg")
    monkeypatch.setattr(main, "_goodreads_search", lambda q: [cand(cover="https://m.media-amazon.com/new.jpg")])
    r = main.enrich_canonical_book_from_goodreads(b.id, db_session)
    assert r["status"] == "enriched" and b.cover_url == "https://m.media-amazon.com/new.jpg"


def test_cover_check_refuses_placeholders_and_private_hosts():
    assert main._cover_url_ok("https://s.gr-assets.com/assets/facebook/goodreads_wide-e23f6858.png") is False
    assert main._cover_url_ok("http://127.0.0.1/cover.jpg") is False
    assert main._cover_url_ok(None) is False


def test_our_own_translator_label_is_not_sent_to_goodreads(db_session, monkeypatch):
    b = make_book(db_session, title="Heart Lamp (tr. Deepa Bhasthi)", author="Banu Mushtaq")
    seen = []
    monkeypatch.setattr(main, "_goodreads_search", lambda q: seen.append(q) or [cand(title="Heart Lamp", author="Banu Mushtaq")])
    monkeypatch.setattr(main, "_cover_url_ok", lambda u: True)
    assert main.enrich_canonical_book_from_goodreads(b.id, db_session)["status"] == "enriched"
    assert "tr." not in seen[0]


def test_goodreads_is_not_asked_about_a_tv_series_a_podcast_or_an_app(db_session, monkeypatch):
    for media in ("tv_series", "podcast", "website_app", "movie"):
        b = make_book(db_session, title=f"Kingdom {media}", author=None, media_type=media)
        monkeypatch.setattr(main, "_goodreads_search", lambda q: pytest.fail("Goodreads must not be called for a non-book"))
        assert main.enrich_canonical_book_from_goodreads(b.id, db_session)["status"] == "skipped"


def test_an_id_we_already_hold_is_never_replaced_by_another_edition(db_session, monkeypatch):
    b = make_book(db_session, goodreads_id="18481907", cover_url="https://i.gr-assets.com/dead.jpg")
    other = cand(cover="https://m.media-amazon.com/new.jpg"); other["goodreads_id"] = "99999999"; other["rating"] = 1.0
    monkeypatch.setattr(main, "_goodreads_search", lambda q: [other])
    monkeypatch.setattr(main, "_cover_url_ok", lambda u: "dead" not in u)
    r = main.enrich_canonical_book_from_goodreads(b.id, db_session)
    assert r["status"] == "enriched" and b.goodreads_id == "18481907" and b.cover_url == "https://m.media-amazon.com/new.jpg" and b.rating is None


def test_a_title_of_one_or_two_words_without_an_author_is_never_guessed(db_session, monkeypatch):
    b = make_book(db_session, title="Whistleblower", author=None)
    popular = cand(title="Whistleblower", author="Kay Cove"); popular["ratings_count"] = 50000
    monkeypatch.setattr(main, "_goodreads_search", lambda q: [popular])
    r = main.enrich_canonical_book_from_goodreads(b.id, db_session)
    assert r["status"] == "no_result" and b.author_id is None
