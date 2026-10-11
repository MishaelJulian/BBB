"""ISBN rules (ISO 2108). An ISBN names one edition and format, never a work."""

import re

_SEPARATORS = re.compile(r"[\s-]")


def _isbn13_ok(s: str) -> bool:
    total = sum(int(c) * (3 if i % 2 else 1) for i, c in enumerate(s))
    return total % 10 == 0


def _isbn10_ok(s: str) -> bool:
    total = sum((10 - i) * (10 if c == "X" else int(c)) for i, c in enumerate(s))
    return total % 11 == 0


def normalize_isbn(raw: str | None) -> str | None:
    """Return the ISBN-13 (digits only) for a valid ISBN-10 or ISBN-13, else None."""
    s = _SEPARATORS.sub("", raw or "").upper()
    if len(s) == 13 and s.isdigit() and s[:3] in ("978", "979") and _isbn13_ok(s):
        return s
    if len(s) == 10 and re.fullmatch(r"\d{9}[\dX]", s) and _isbn10_ok(s):
        body = "978" + s[:9]
        check = (10 - sum(int(c) * (3 if i % 2 else 1) for i, c in enumerate(body)) % 10) % 10
        return body + str(check)
    return None
