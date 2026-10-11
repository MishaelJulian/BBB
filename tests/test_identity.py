"""Identity layer: ISBN rules, the resolution chain, provider parsing, and the schema constraints."""

import importlib.util
from pathlib import Path

import pytest
from sqlalchemy import create_engine, event, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database.base import Base
from app.database.identity_models import Edition, EditionIdentifier, WorkIdentifier
from app.database.models import CanonicalBook, Publisher
from app.identity.isbn import normalize_isbn
from app.identity.providers import GoodreadsProvider, InventaireProvider, OpenLibraryProvider
from app.identity.resolver import Candidate, manual_entry_problems, names_match, resolve

# ---------- ISBN ----------

def test_isbn10_and_isbn13_of_the_same_edition_agree():
    # the pair Open Library returned for one edition of Crime and Punishment
    assert normalize_isbn("0393270157") == normalize_isbn("978-0-393-27015-0") == "9780393270150"

def test_isbn_rejects_bad_checksum_and_junk():
    assert normalize_isbn("9780393270151") is None
    assert normalize_isbn("123") is None and normalize_isbn(None) is None
    assert normalize_isbn("9770393270150") is None  # 977 is not an ISBN prefix

def test_isbn10_with_x_check_digit():
    assert normalize_isbn("0-8044-2957-X") == "9780804429573"

# ---------- resolution chain ----------

class Stub:
    def __init__(self, name, result=None, boom=None):
        self.name, self._r, self._b = name, result, boom
    def lookup(self, title, author):
        if self._b:
            raise self._b
        return self._r

HIT = Candidate(source="x", title="T", authors=("A",), work_ids={"wikidata": "Q1"})

def test_chain_returns_first_match_and_stops():
    r = resolve("T", "A", [Stub("goodreads", HIT), Stub("openlibrary", boom=RuntimeError())])
    assert r.candidate is HIT and r.trail == [("goodreads", "match")] and not r.needs_manual_entry

def test_chain_records_errors_and_falls_through():
    r = resolve("T", "A", [Stub("goodreads", boom=TimeoutError()), Stub("openlibrary"), Stub("inventaire", HIT)])
    assert r.trail == [("goodreads", "error: TimeoutError"), ("openlibrary", "no_match"), ("inventaire", "match")]

def test_all_providers_failing_requires_manual_entry():
    r = resolve("T", "A", [Stub("goodreads"), Stub("openlibrary", boom=OSError())])
    assert r.needs_manual_entry and r.candidate is None

def test_manual_entry_needs_publisher_and_year():
    assert manual_entry_problems("Penguin", 1950) == []
    assert len(manual_entry_problems("", None)) == 2
    assert manual_entry_problems("Penguin", 3000) == ["publication year is required (1000 to 2100)"]

def test_names_match_handles_initials_order_and_rejects_other_authors():
    assert names_match("Dostoevsky", ["Fyodor Dostoevsky"])
    assert names_match("F. Dostoevsky", ["Fyodor Dostoevsky"])
    assert not names_match("Tolstoy", ["Fyodor Dostoevsky"])

# ---------- providers (canned responses, no network) ----------

def test_openlibrary_provider_maps_work_key():
    fake = lambda url: {"docs": [{"key": "/works/OL32525579W", "title": "Crime and Punishment", "author_name": ["X"]}]}
    c = OpenLibraryProvider(fetch=fake).lookup("Crime and Punishment", "Dostoevsky")
    assert c.work_ids == {"openlibrary_work": "OL32525579W"} and c.edition_ids == {}

def test_openlibrary_provider_no_docs_is_no_match():
    assert OpenLibraryProvider(fetch=lambda url: {"docs": []}).lookup("zzz", "") is None

def test_inventaire_provider_verifies_author_through_p50_labels():
    def fake(url):
        if "/api/search" in url:
            return {"results": [{"uri": "wd:Q165318", "label": "Crime and Punishment"}]}
        if "Q165318" in url:
            return {"entities": {"wd:Q165318": {"claims": {"wdt:P50": ["wd:Q991"]}}}}
        return {"entities": {"wd:Q991": {"labels": {"en": "Fyodor Dostoevsky", "ru": "Фёдор Достоевский"}}}}
    p = InventaireProvider(fetch=fake)
    assert p.lookup("Crime and Punishment", "Dostoevsky").work_ids == {"wikidata": "Q165318"}
    assert p.lookup("Crime and Punishment", "Tolstoy") is None

def test_goodreads_provider_only_accepts_goodreads_items_with_matching_author():
    items = [
        {"source": "apple", "title": "T", "author": "A", "goodreads_id": None},
        {"source": "goodreads", "title": "T", "author": "Other Person", "goodreads_id": "9"},
        {"source": "goodreads", "title": "T", "author": "Ann Author", "goodreads_id": "42"},
    ]
    c = GoodreadsProvider(lambda q: items).lookup("T", "Author")
    assert c.edition_ids == {"goodreads_book": "42"}

# ---------- schema constraints (foreign keys switched on, as the app does) ----------

def _seed_schemes(session):
    path = next(Path("alembic/versions").glob("*identity_layer.py"))
    spec = importlib.util.spec_from_file_location("identity_migration", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    for s, l, k, r in mod.SCHEMES:
        session.execute(text("INSERT INTO identifier_schemes VALUES (:s,:l,:k,:r)"), dict(s=s, l=l, k=k, r=r))
    session.commit()

@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:")
    event.listen(engine, "connect", lambda c, _: c.execute("PRAGMA foreign_keys=ON"))
    Base.metadata.create_all(engine)
    with Session(engine) as s:
        _seed_schemes(s)
        yield s

def _work(db, title="Meditations"):
    w = CanonicalBook(title=title, normalized_title=title.lower())
    db.add(w); db.commit()
    return w

def _edition(db, work, **kw):
    e = Edition(work_id=work.id, **kw)
    db.add(e); db.commit()
    return e

def test_edition_cannot_exist_without_a_work(db):
    db.add(Edition(work_id="no-such-work", identity_basis="isbn13"))
    with pytest.raises(IntegrityError):
        db.commit()

def test_work_with_editions_cannot_be_deleted(db):
    w = _work(db); _edition(db, w, identity_basis="isbn13")
    with pytest.raises(IntegrityError):
        db.execute(text("DELETE FROM canonical_books WHERE id = :i"), {"i": w.id}); db.commit()

def test_manual_edition_requires_publisher_and_year(db):
    w = _work(db)
    db.add(Edition(work_id=w.id, identity_basis="manual"))
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()
    p = Publisher(name="Penguin"); db.add(p); db.commit()
    _edition(db, w, identity_basis="manual", publisher_id=p.id, publication_year=1950)

def test_same_manual_edition_cannot_be_entered_twice(db):
    w = _work(db); p = Publisher(name="Penguin"); db.add(p); db.commit()
    _edition(db, w, identity_basis="manual", publisher_id=p.id, publication_year=1950)
    db.add(Edition(work_id=w.id, identity_basis="manual", publisher_id=p.id, publication_year=1950))
    with pytest.raises(IntegrityError):
        db.commit()

def test_one_isbn_belongs_to_one_edition(db):
    w = _work(db); e1 = _edition(db, w, identity_basis="isbn13"); e2 = _edition(db, w, identity_basis="isbn13")
    db.add(EditionIdentifier(scheme="isbn13", value="9780393270150", edition_id=e1.id)); db.commit()
    db.add(EditionIdentifier(scheme="isbn13", value="9780393270150", edition_id=e2.id))
    with pytest.raises(IntegrityError):
        db.commit()

def test_isbn13_must_be_13_digits(db):
    e = _edition(db, _work(db), identity_basis="isbn13")
    db.add(EditionIdentifier(scheme="isbn13", value="97803932701X0", edition_id=e.id))
    with pytest.raises(IntegrityError):
        db.commit()

def test_scheme_levels_cannot_be_mixed(db):
    w = _work(db); e = _edition(db, w, identity_basis="isbn13")
    db.add(EditionIdentifier(scheme="wikidata", value="Q165318", edition_id=e.id))  # a work-level scheme
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()
    db.add(WorkIdentifier(scheme="isbn13", value="9780393270150", work_id=w.id))    # an edition-level scheme
    with pytest.raises(IntegrityError):
        db.commit()

def test_one_wikidata_id_belongs_to_one_work(db):
    a, b = _work(db, "A"), _work(db, "B")
    db.add(WorkIdentifier(scheme="wikidata", value="Q1", work_id=a.id)); db.commit()
    db.add(WorkIdentifier(scheme="wikidata", value="Q1", work_id=b.id))
    with pytest.raises(IntegrityError):
        db.commit()

def test_deleting_an_edition_removes_its_identifiers(db):
    e = _edition(db, _work(db), identity_basis="isbn13")
    db.add(EditionIdentifier(scheme="isbn13", value="9780393270150", edition_id=e.id)); db.commit()
    db.execute(text("DELETE FROM editions WHERE id = :e"), {"e": e.id}); db.commit()
    assert db.execute(text("SELECT count(*) FROM edition_identifiers")).scalar() == 0
