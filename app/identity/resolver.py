"""Source resolution chain: try each provider in order, record why each one failed,
and fall back to a mandatory manual entry (publisher and year) when all of them fail."""

import re
import unicodedata
from dataclasses import dataclass, field
from typing import Protocol

MAX_YEAR = 2100  # no lower bound: ancient works and BCE dates are valid (founders, 2026-10-12); dating model pending the council


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


def build_chain(order: str | list[str], registry: dict[str, Provider]) -> list[Provider]:
    """Providers in the configured lookup order (setting IDENTITY_LOOKUP_ORDER, e.g. 'goodreads,openlibrary')."""
    names = [n.strip() for n in order.split(",")] if isinstance(order, str) else list(order)
    names = [n for n in names if n]
    unknown = [n for n in names if n not in registry]
    if unknown:
        raise ValueError(f"unknown lookup providers: {unknown}; available: {sorted(registry)}")
    return [registry[n] for n in names]


def manual_entry_problems(publisher: str | None, year: int | None) -> list[str]:
    """What an admin must still supply when no source identified the book."""
    problems = []
    if not (publisher or "").strip():
        problems.append("publisher is required")
    if year is None or year > MAX_YEAR:
        problems.append(f"publication year is required (any year up to {MAX_YEAR}; use a negative number for BCE)")
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
