"""The response shapes Flow D (thin shelf, rich pull) and the closet depend on. Keys may be added; none may disappear or change type.
Runs the real handlers against a copy of the committed database, so a data or importer change that breaks the shape fails here."""
import sqlite3
from pathlib import Path

import pytest
from fastapi import Response
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

ROOT = Path(__file__).resolve().parent.parent

BOOK_KEYS = {"id": str, "title": str, "normalized_title": str, "media_type": str, "discussion_count": int, "first_discussed_date": str,
             "last_discussed_date": str, "meetups": list, "members": list, "is_general_discussion": bool,
             "author_id": (str, type(None)), "author_name": (str, type(None)), "cover_url": (str, type(None)), "thumbnail_url": (str, type(None)),
             "description": (str, type(None)), "goodreads_id": (str, type(None)), "publication_year": (int, type(None)),
             "rating": (float, int, type(None)), "page_count": (int, type(None))}
MEETUP_REF = {"id": str, "number": int, "date": str, "venue": (str, type(None))}
MEMBER_REF = {"id": str, "display_name": str}
MEETUP_KEYS = {"id": str, "number": int, "date": str, "title": str, "format": str, "book_count": int, "member_count": int,
               "books": list, "members": list, "venue": (str, type(None)), "photo_url": (str, type(None)), "pdf_url": (str, type(None))}
MEETUP_BOOK_KEYS = {"id": str, "title": str, "is_discussion_mention": bool, "is_general_discussion": bool,
                    "author": (str, type(None)), "member": (str, type(None)), "cover_url": (str, type(None)), "thumbnail_url": (str, type(None))}


def has_shape(d: dict, shape: dict):
    missing = set(shape) - set(d)
    assert not missing, f"keys removed from the payload: {sorted(missing)}"
    for k, t in shape.items():
        assert isinstance(d[k], t), f"{k} changed type: {type(d[k]).__name__}"


@pytest.fixture(scope="module")
def main(tmp_path_factory):
    from app.api import main as m
    db = tmp_path_factory.mktemp("contract") / "copy.db"
    src = sqlite3.connect(f"file:{ROOT / 'book_club_archivist.db'}?mode=ro", uri=True)
    dst = sqlite3.connect(db)
    src.backup(dst)
    src.close(); dst.close()
    old = m.SessionLocal
    m.SessionLocal = sessionmaker(bind=create_engine(f"sqlite:///{db}"))
    yield m
    m.SessionLocal = old


def books(main, **kw):
    return main.get_books(Response(), limit=kw.pop("limit", 3000), offset=0, **kw)


def test_book_list_shape_and_nested_references(main):
    bs = books(main, limit=200, only_discussed=True)
    assert len(bs) >= 100
    for b in bs[:50]:
        has_shape(b, BOOK_KEYS)
        for mt in b["meetups"]:
            has_shape(mt, MEETUP_REF)
        for mem in b["members"]:
            has_shape(mem, MEMBER_REF)


def test_book_detail_returns_the_same_fields_as_the_list(main):
    b = books(main, limit=20, only_discussed=True)[0]
    one = main.get_book(b["id"], Response())
    assert set(BOOK_KEYS) <= set(one)
    assert one["id"] == b["id"] and one["title"] == b["title"]


def test_filters_the_closet_relies_on(main):
    everything = books(main)
    discussed = books(main, only_discussed=True)
    shelf = books(main, only_discussed=True, exclude_general=True)
    assert 0 < len(shelf) <= len(discussed) <= len(everything)
    assert all(b["discussion_count"] > 0 for b in discussed)
    assert not any(b["is_general_discussion"] for b in shelf)


def test_ids_are_stable_strings_and_unique(main):
    ids = [b["id"] for b in books(main)]
    assert len(ids) == len(set(ids)) and all(isinstance(i, str) and len(i) >= 32 for i in ids)


def test_list_is_publicly_cacheable_with_stale_while_revalidate(main):
    r = Response()
    main.get_books(r, limit=5, offset=0)
    cc = r.headers.get("cache-control", "")
    assert "public" in cc and "stale-while-revalidate" in cc


def test_meetup_list_and_detail_shape(main):
    ms = main.get_meetups(Response())
    assert len(ms) >= 60
    has_shape(ms[0], MEETUP_KEYS)
    detail = main.get_meetup("92", Response())
    has_shape(detail, MEETUP_KEYS)
    assert detail["number"] == 92 and detail["books"]
    for b in detail["books"][:20]:
        has_shape(b, MEETUP_BOOK_KEYS)
