"""Source resolution chain: try each provider in order, record why each one failed,
and fall back to a mandatory manual entry (publisher and year) when all of them fail."""

import re
import unicodedata
from dataclasses import dataclass, field
from typing import Protocol

MIN_YEAR, MAX_YEAR = 1000, 2100  # same bounds as imperative_decisions.md section 3


@dataclass(frozen=True)
class Candidate:
    source: str                       # provider that found it
    title: str
    authors: tuple[str, ...]
    work_ids: dict[str, str] = field(default_factory=dict)      # scheme -> value, work level
    edition_ids: dict[str, str] = field(default_factory=dict)   # scheme -> value, edition level


class Provider(Protocol):
    name: str

    def lookup(self, title: str, author: str) -> Candidate | None:
        """Return a candidate whose author matches, None for no match. Raise on transport errors."""


@dataclass
class Resolution:
    candidate: Candidate | None
    trail: list[tuple[str, str]]      # (provider, "match" | "no_match" | "error: <type>")

    @property
    def needs_manual_entry(self) -> bool:
        return self.candidate is None


def resolve(title: str, author: str, providers: list[Provider]) -> Resolution:
    """First provider with a match wins. Errors are recorded, never hidden."""
    trail: list[tuple[str, str]] = []
    for p in providers:
        try:
            found = p.lookup(title, author)
        except Exception as exc:  # a failing source must not stop the chain
            trail.append((p.name, f"error: {type(exc).__name__}"))
            continue
        if found is None:
            trail.append((p.name, "no_match"))
            continue
        trail.append((p.name, "match"))
        return Resolution(found, trail)
    return Resolution(None, trail)


def manual_entry_problems(publisher: str | None, year: int | None) -> list[str]:
    """What an admin must still supply when no source identified the book."""
    problems = []
    if not (publisher or "").strip():
        problems.append("publisher is required")
    if year is None or not (MIN_YEAR <= year <= MAX_YEAR):
        problems.append(f"publication year is required ({MIN_YEAR} to {MAX_YEAR})")
    return problems


def _tokens(name: str) -> set[str]:
    folded = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode() or name
    return set(re.findall(r"\w+", folded.casefold())) or set(re.findall(r"\w+", name.casefold()))


def names_match(query: str, candidates: list[str]) -> bool:
    """True if every word of the query appears in one candidate name, or the last words agree
    and the first initials agree. ponytail: spelling variants (Dostoevsky/Dostoyevsky) do not match;
    they fall through to the next provider or to manual entry."""
    q = _tokens(query)
    if not q:
        return True
    q_words = re.findall(r"\w+", query.casefold())
    for name in candidates:
        t = _tokens(name)
        if q <= t:
            return True
        n_words = re.findall(r"\w+", name.casefold())
        if q_words and n_words and q_words[-1] == n_words[-1] and q_words[0][:1] == n_words[0][:1]:
            return True
    return False
