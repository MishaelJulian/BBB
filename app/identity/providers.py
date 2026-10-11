"""Lookup providers for the resolution chain. Each takes an injectable fetcher so tests need no network.

Endpoints checked live on 2026-10-12:
  Open Library  GET /search.json?title=&author=&fields=   -> docs[].key (/works/OL..W), author_name
  Inventaire    GET /api/search?types=works&search=       -> results[].uri (wd:Q..)
                GET /api/entities?action=by-uris&uris=wd:Q.. -> claims (wdt:P50 = author URIs), multilingual labels
"""

import json
import urllib.parse
import urllib.request
from typing import Callable

from app.identity.resolver import Candidate, names_match

USER_AGENT = "BBB-library/0.1 (book club archive; https://github.com/MishaelJulian/BBB)"
Fetch = Callable[[str], object]


def http_get_json(url: str, timeout: float = 6.0):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


class GoodreadsProvider:
    """Edition-level id (Goodreads bookId). search_fn is app.api.main.search_external_books, injected
    so this module does not import the API. Caveat: that function swallows its own errors and returns [],
    so an outage reads as no_match here."""

    name = "goodreads"

    def __init__(self, search_fn: Callable[[str], list[dict]]):
        self._search = search_fn

    def lookup(self, title: str, author: str) -> Candidate | None:
        for item in self._search(f"{title} {author}".strip()):
            if item.get("source") != "goodreads" or not item.get("goodreads_id"):
                continue
            if author and not names_match(author, [item.get("author") or ""]):
                continue
            return Candidate(
                source=self.name, title=item["title"], authors=(item.get("author") or "",),
                edition_ids={"goodreads_book": str(item["goodreads_id"])},
            )
        return None


class OpenLibraryProvider:
    """Work-level id (Open Library work key). Open Library filters by author itself, which also
    handles transliterations such as Dostoevsky/Достоевский."""

    name = "openlibrary"

    def __init__(self, fetch: Fetch = http_get_json, base: str = "https://openlibrary.org"):
        self._fetch, self._base = fetch, base

    def lookup(self, title: str, author: str) -> Candidate | None:
        params = {"title": title, "limit": 1, "fields": "key,title,author_name"}
        if author:
            params["author"] = author
        data = self._fetch(f"{self._base}/search.json?{urllib.parse.urlencode(params)}")
        docs = (data or {}).get("docs") or []
        if not docs:
            return None
        d = docs[0]
        return Candidate(
            source=self.name, title=d.get("title", title), authors=tuple(d.get("author_name") or ()),
            work_ids={"openlibrary_work": d["key"].rsplit("/", 1)[-1]},
        )


class InventaireProvider:
    """Work-level id (Wikidata Q-id). Search is by title only, so the author is verified through the
    work's P50 claim against the author's multilingual labels and aliases."""

    name = "inventaire"

    def __init__(self, fetch: Fetch = http_get_json, base: str = "https://inventaire.io", candidates: int = 3):
        self._fetch, self._base, self._n = fetch, base, candidates

    def _entity(self, uri: str) -> dict:
        q = urllib.parse.urlencode({"action": "by-uris", "uris": uri})
        return ((self._fetch(f"{self._base}/api/entities?{q}") or {}).get("entities") or {}).get(uri) or {}

    @staticmethod
    def _names(entity: dict) -> list[str]:
        names = list((entity.get("labels") or {}).values())
        for alias_list in (entity.get("aliases") or {}).values():
            names.extend(alias_list)
        return names

    def lookup(self, title: str, author: str) -> Candidate | None:
        q = urllib.parse.urlencode({"search": title, "types": "works", "limit": self._n})
        results = ((self._fetch(f"{self._base}/api/search?{q}") or {}).get("results") or [])[: self._n]
        for r in results:
            work = self._entity(r["uri"])
            author_uris = (work.get("claims") or {}).get("wdt:P50") or []
            author_names = [n for a in author_uris for n in self._names(self._entity(a))]
            if author and not names_match(author, author_names):
                continue
            return Candidate(
                source=self.name, title=r.get("label", title), authors=tuple(author_names[:3]),
                work_ids={"wikidata": r["uri"].split(":", 1)[1]},
            )
        return None
