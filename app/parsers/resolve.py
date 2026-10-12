"""Stage 5 helpers: which member a printed heading means, and which book a printed title means.

Ambiguity is reported, never guessed. Evidence tiers for a heading, strongest first:
  1. an explicit alias (the `aliases` table or a caller-supplied map)
  2. the exact display name
  3. first name + initial that fits exactly one member      ("ARAVIND .S" -> Aravind S, "ANAND .G" -> Anand Ganapathy)
  4. the same heading already attached to one member at other meetups (alias evidence)   ("DEEPAK VARADARAJ" -> Deepak)
  5. the one member whose whole name starts the heading     ("DARSHAN K" -> Darshan, "AMEL A R" -> Amel)
  6. a close spelling of exactly one first name, marked inferred   ("MADHUSUDHAN" -> Madhusudan)
Anything else (several candidates, or none) is unresolved.
"""
from __future__ import annotations

import difflib
import re
from collections import Counter
from dataclasses import dataclass
from typing import Optional


_NUM = {"1": "one", "2": "two", "3": "three", "4": "four", "5": "five", "6": "six", "7": "seven", "8": "eight", "9": "nine", "10": "ten", "11": "eleven", "12": "twelve"}


def norm_title(s: str) -> str:
    """Case, accents' apostrophes, '&' = 'and', and a lone 1-12 = its word ('7 Killings' = 'Seven Killings'), punctuation dropped."""
    t = re.sub(r"\s+", " ", re.sub(r"[^a-z0-9' ]+", " ", s.lower().replace("’", "'").replace("&", " and "))).strip()
    return " ".join(_NUM.get(w, w) for w in t.split())


def _bare(s: str) -> str:
    """Normalised title without a leading article, so 'Psychology of Money' meets 'The Psychology of Money: ...'."""
    return re.sub(r"^(the|a|an) ", "", norm_title(s))


def heading_key(h: str) -> str:
    h = re.sub(r"^(?:[IVXL]+\.|\d{1,2}\))\s+", "", h.strip())
    h = re.sub(r"^(dr|mr|ms|mrs)\.?\s+", "", h.rstrip(":-– "), flags=re.I)
    return re.sub(r"\s+", " ", h).strip().lower()


def _strip_initial(h: str) -> str:
    h = re.sub(r"\s+\.\s*[A-Za-z](?:\.[A-Za-z])*\.?$", "", h)
    return re.sub(r"\s*\.[A-Za-z](?:\.[A-Za-z])*\.?$", "", h).strip()


@dataclass
class Resolution:
    member_id: Optional[str]
    how: str
    inferred: bool = False


class MemberResolver:
    def __init__(self, members: dict[str, str], evidence: Optional[dict[str, Counter]] = None, aliases: Optional[dict[str, str]] = None):
        """members: display_name -> id. evidence: heading key -> Counter(display_name). aliases: heading key -> display_name."""
        self.members = {n.lower(): (n, i) for n, i in members.items()}
        self.evidence = evidence or {}
        self.aliases = {k.lower(): v for k, v in (aliases or {}).items()}

    def add_member(self, name: str, member_id: str) -> None:
        self.members[name.lower()] = (name, member_id)

    def resolve(self, heading: str) -> Resolution:
        key = heading_key(heading)
        if key in self.aliases and self.aliases[key].lower() in self.members:
            return Resolution(self.members[self.aliases[key].lower()][1], "explicit alias")
        if key in self.members:
            return Resolution(self.members[key][1], "exact name")
        m = re.match(r"^([A-Za-z’']+)\s+\.?\s*([A-Za-z])(?:\.[A-Za-z])*\.?$", key)
        if m:
            first, ini = m.group(1).lower(), m.group(2).lower()
            cands = [v for k, v in self.members.items() if len(k.split()) >= 2 and k.split()[0] == first and k.split()[1].startswith(ini)]
            if len(cands) == 1:
                return Resolution(cands[0][1], f"first name + initial fits only {cands[0][0]}")
        ev = self.evidence.get(key)
        if ev:
            top = ev.most_common(2)
            if len(top) == 1 or top[0][1] > top[1][1]:
                n = top[0][0].lower()
                if n in self.members:
                    return Resolution(self.members[n][1], f"same heading attached to {top[0][0]} elsewhere ({top[0][1]} items)")
        base = _strip_initial(key)
        t = base.split()
        if base in self.members:
            return Resolution(self.members[base][1], "exact name once the initial is dropped")
        cands = [k for k in self.members if k.split() == t[: len(k.split())]]
        if cands:
            best = max(cands, key=lambda k: len(k.split()))
            ties = [k for k in cands if len(k.split()) == len(best.split())]
            if len(ties) == 1:
                return Resolution(self.members[best][1], "the one member whose name starts the heading")
        if t:
            firsts: dict[str, list[str]] = {}
            for k in self.members:
                firsts.setdefault(k.split()[0], []).append(k)
            if t[0] in firsts and len(firsts[t[0]]) > 1:
                return Resolution(None, "ambiguous: several members share the first name: " + ", ".join(self.members[k][0] for k in firsts[t[0]]))
            near = [f for f in firsts if f != t[0] and difflib.SequenceMatcher(None, f, t[0]).ratio() >= 0.88]
            if len(near) == 1 and len(firsts[near[0]]) == 1:
                return Resolution(self.members[firsts[near[0]][0]][1], f"spelling variant of {self.members[firsts[near[0]][0]][0]}", inferred=True)
        return Resolution(None, "no member matches this heading")


class BookMatcher:
    def __init__(self, books: list[tuple]):
        """books: (id, title, author_name or '') or (id, title, author_name, media_type)."""
        self.books = [(b[0], b[1], _bare(b[1]), norm_title(b[2] or ""), (b[3] if len(b) > 3 else "book") or "book") for b in books]

    def add(self, book_id: str, title: str, author: str = "", media: str = "book") -> None:
        self.books.append((book_id, title, _bare(title), norm_title(author or ""), media or "book"))

    @staticmethod
    def _agree(item_author: str, cand_author: str) -> bool:
        """Authors never exclude a same-title book: the author fields in the archive are too uneven (glued words, surnames only, spelling
        variants) to gate on. Authors are used only to let a ONE-word title abbreviate a longer one (see candidates)."""
        return True

    def candidates(self, title: str, author: Optional[str] = None, exact_only: bool = False, media: str = "book") -> tuple[list[str], str]:
        """All books the line could be, best kind of match first:
        1 same title, same medium, author agrees  2 longer title, same medium, author agrees  3 same title in another medium (an old row
        typed loosely), only when nothing better exists AND the line gives no author that the row lacks (a movie row is not a book by someone).
        """
        tn = _bare(title)
        same = [b for b in self.books if b[2] == tn and self._agree(author, b[3])]
        ex = [b for b in same if b[4] == media]
        if ex:
            return [b[0] for b in ex], "exact"
        if not exact_only:
            pre = [b for b in self.books if b[2].startswith(tn + " ") and b[4] == media and self._agree(author, b[3])]
            if len(tn.split()) < 2:     # a one-word title ("Bhima", "Empire") may abbreviate a longer one only when an author name word agrees
                at = {w for w in norm_title(author or "").split() if len(w) > 2}
                pre = [b for b in pre if at & set(b[3].split())]
            if pre:
                return [b[0] for b in pre], "longer title"
        other = [b for b in same if b[4] != media and not (author and not b[3])]
        if other:
            return [b[0] for b in other], "exact (another medium)"
        return [], "NEW"

    def match(self, title: str, author: Optional[str] = None, exact_only: bool = False, media: str = "book") -> tuple[Optional[str], str]:
        ids, how = self.candidates(title, author, exact_only, media)
        return (ids[0], how) if ids else (None, how)

    def near(self, title: str, cutoff: Optional[float] = None) -> Optional[tuple[str, str]]:
        """(id, title) of the existing book that `title` almost equals ('Tblisi' for 'Tbilisi'), or None. Titles whose digits differ
        ('Volume 1' / 'Volume 2') are never the same book; only a swapped-digit typo ('Born 1892' / 'Born 1982') is."""
        tn = _bare(title)
        cutoff = cutoff if cutoff is not None else (0.88 if len(tn) >= 25 else 0.92)     # a longer title tolerates a slightly bigger typo
        digits = re.findall(r"\d+", tn)
        best = max(((difflib.SequenceMatcher(None, tn, b[2]).ratio(), b[0], b[1]) for b in self.books if b[4] == 'book' or True
                    if abs(len(b[2]) - len(tn)) <= 3 and sorted("".join(re.findall(r"\d+", b[2]))) == sorted("".join(digits))
                    and (re.findall(r"\d+", b[2]) == digits or re.sub(r"\d+", "#", b[2]) == re.sub(r"\d+", "#", tn))), default=(0, None, None))
        return (best[1], best[2]) if best[0] >= cutoff and _bare(best[2]) != tn else None


_STOP = {"a", "the", "of", "and", "in", "on", "to", "for", "an", "is", "at", "by"}


def name_like(s: str) -> bool:
    """A person's name: two or three alphabetic words, the first capitalised, no little words ('A History of Japan' is not)."""
    w = s.split()
    return 2 <= len(w) <= 3 and all(re.fullmatch(r"[A-Za-z.’'\-]+", x) for x in w) and w[0][:1].isupper() and not any(x.lower() in _STOP for x in w)
