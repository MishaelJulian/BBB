import re
import unicodedata
from datetime import datetime, date
from typing import Optional


def normalize_title(title: str) -> str:
    """Lowercase, strip accents, remove non-alphanumeric, collapse spaces."""
    title = unicodedata.normalize("NFKD", title)
    title = "".join(c for c in title if not unicodedata.combining(c))
    title = title.lower()
    title = re.sub(r"[^a-z0-9\s]", "", title)
    title = re.sub(r"\s+", " ", title).strip()
    return title


def normalize_author(name: str) -> str:
    """Normalize author name: strip 'by' prefix, URLs, normalize whitespace."""
    name = name.strip()
    name = re.sub(r"^by\s+", "", name, flags=re.IGNORECASE)
    name = re.sub(r"https?://\S+$", "", name).strip()
    name = re.sub(r"\s+", " ", name)
    return name.strip(" -–—")


def normalize_name_for_dedup(name: str) -> str:
    """Strict normalization: lowercase, strip non-alphanumeric for matching."""
    name = unicodedata.normalize("NFKD", name)
    name = "".join(c for c in name if not unicodedata.combining(c))
    name = name.lower()
    name = re.sub(r"[^a-z0-9]", "", name)
    return name


def parse_meetup_date(date_str: str) -> Optional[date]:
    """Parse date strings like 'February 24, 2018', '27th Mar 2022', 'Sep 2024'."""
    if not date_str:
        return None
    # Strip ordinal suffixes
    date_str = re.sub(r"(\d+)(?:st|nd|rd|th)", r"\1", date_str.strip())
    formats = [
        "%B %d, %Y",
        "%b %d, %Y",
        "%d %B %Y",
        "%d %b %Y",
        "%d %B, %Y",
        "%B %Y",
        "%b %Y",
        "%Y-%m-%d",
        "%d_%m_%Y",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(date_str.strip(), fmt).date()
        except ValueError:
            continue
    return None


def extract_goodreads_url(text: str) -> Optional[str]:
    """Extract a Goodreads URL from text."""
    match = re.search(r"https?://(?:www\.)?goodreads\.com/\S+", text)
    return match.group(0) if match else None


def extract_goodreads_id(url: str) -> Optional[str]:
    """Extract Goodreads book ID from a URL like /book/show/12345-slug."""
    if not url:
        return None
    match = re.search(r"/book/show/(\d+)", url)
    return match.group(1) if match else None


def compute_sort_title(title: str) -> str:
    """Compute sort title by moving leading articles to the end."""
    title = title.strip()
    match = re.match(r"^(The|A|An)\s+(.+)$", title, re.IGNORECASE)
    if match:
        return f"{match.group(2)}, {match.group(1)}"
    return title
