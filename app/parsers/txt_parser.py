import re
from pathlib import Path
from typing import List, Optional, Tuple

from app.parsers.utils import (
    normalize_title,
    normalize_author,
    parse_meetup_date,
    extract_goodreads_url,
    extract_goodreads_id,
)
from app.schemas.intermediate import (
    IntermediateRecord,
    IntermediateSource,
    IntermediateBook,
    IntermediateAuthor,
    IntermediateMeetup,
    IntermediateMember,
)


# ---------------------------------------------------------------------------
# Meetup boundary detection
# ---------------------------------------------------------------------------

# The text has boundaries like "...BBB Meetup-8" at end of line or "BBB Meetup-9" at start
# We find ALL occurrences and split the text around them
BOUNDARY_RE = re.compile(
    r"(?:\.{1,6})?BBB\s+Meetup[#\s-]*(\d+)",
    re.IGNORECASE,
)


# ---------------------------------------------------------------------------
# Date parsing
# ---------------------------------------------------------------------------

DATE_RE = re.compile(
    r"(\w+ \d{1,2},?\s*\d{4})",
    re.IGNORECASE,
)


# ---------------------------------------------------------------------------
# Book line detection — much stricter
# ---------------------------------------------------------------------------

GOODREADS_RE = re.compile(r"https?://(?:www\.)?goodreads\.com/\S+")

# Lines that are clearly NOT book entries
NARRATIVE_STARTERS = re.compile(
    r"^(?:We |Aaanyway|PS\s|Oh |This was|Until |BBB had|"
    r"Aaaand|Hope|Another|After this|Thats it|THIS IS ALL|"
    r"Some of|The books|The following|And these|So we|"
    r"I am not sure|Yes, this boy|You are intrigued|"
    r"Oh, and just|Aaaand Meetup|The modest|"
    r"A couple|Another good|A hat tip|"
    r":D|\.\.\.|---)",
    re.IGNORECASE,
)


def _is_book_line(line: str) -> bool:
    """Heuristic: does this line look like a book entry?"""
    line = line.strip()
    if not line or len(line) < 3 or len(line) > 300:
        return False
    # Skip narrative
    if NARRATIVE_STARTERS.match(line):
        return False
    # Skip lines that are clearly sentences (contain common words)
    if re.match(r"^(?:I |We |It |So |But |And |The |Oh |PS |Aaanyway|Until|BBB|Oh|Hope|Another|After|That|This|Aaaand)", line):
        # But allow "The" if it looks like a title
        if not re.match(r"^The\s+\w", line):
            return False
    # Must contain a dash separator, URL, or look like a short title
    if GOODREADS_RE.search(line):
        return True
    if re.search(r"\s*[–—-]\s+[A-Z]", line):
        return True
    # Short lines starting with uppercase could be titles
    if re.match(r"^[A-Z0-9\"\']", line) and len(line) < 120:
        # But reject if it contains common narrative words
        if not re.search(r"\b(?:was|were|had|have|has|the|and|for|with|that|this|from|but|not|are|our|who|his|her|its|you|our|who|can|may|its)\b", line, re.I):
            return True
    return False


def _parse_book_line(line: str) -> Optional[dict]:
    """Extract title and author from a single book line."""
    line = line.strip()
    if not line:
        return None

    url = None
    url_match = GOODREADS_RE.search(line)
    if url_match:
        url = url_match.group(0)

    # Remove URL for pattern matching
    clean = GOODREADS_RE.sub("", line).strip()
    clean = re.sub(r"\s*[–—-]\s*$", "", clean).strip()

    title = None
    author = None
    series_name = None

    # Pattern: "Title (by Author)"
    m = re.match(r"^(.+?)\s+\(by\s+(.+?)\)\s*$", clean)
    if m:
        title, author = m.group(1).strip(), m.group(2).strip()
    else:
        # Pattern: "Title (Series, #N) by Author"
        m = re.match(r"^(.+?)\s+\((.+?)[,#]\s*#?\d+\)\s+by\s+(.+?)\s*$", clean)
        if m:
            title = m.group(1).strip()
            series_name = m.group(2).strip()
            author = m.group(3).strip()
        else:
            # Pattern: "Title by Author https://..."
            m = re.match(r"^(.+?)\s+by\s+(.+?)\s+https?://\S+\s*$", line.strip())
            if m:
                title, author = m.group(1).strip(), m.group(2).strip()
            else:
                # Pattern: "Title by Author" (no URL)
                m = re.match(r"^(.+?)\s+by\s+([A-Z].+?)\s*$", clean)
                if m:
                    title, author = m.group(1).strip(), m.group(2).strip()
                else:
                    # Pattern: "Title - Author"
                    m = re.match(r"^(.+?)\s*[–—-]\s+([A-Z].+?)\s*$", clean)
                    if m:
                        title, author = m.group(1).strip(), m.group(2).strip()
                    else:
                        # Pattern: "Title - URL" or "Title - https://..."
                        m = re.match(r"^(.+?)\s*[–—-]\s*https?://\S+\s*$", clean)
                        if m:
                            title = m.group(1).strip()
                        else:
                            # Plain title
                            m = re.match(r"^(.+?)\s*$", clean)
                            if m:
                                title = m.group(1).strip()

    if not title:
        return None

    # Clean title
    title = re.sub(r"\s*[–—-]\s*$", "", title).strip()
    title = title.strip(".,;:")

    # Extract series from title if not already found
    if not series_name:
        sm = re.search(r"\((.+?)[,#]\s*#?\d+\)", title)
        if sm:
            series_name = sm.group(1).strip()

    # Clean author
    if author:
        author = normalize_author(author)
        author = re.sub(r"\s*[-–—]\s*$", "", author).strip()
        if len(author.split()) < 1:
            author = None

    goodreads_id = extract_goodreads_id(url) if url else None

    return {
        "title": title,
        "author_name": author,
        "goodreads_url": url,
        "goodreads_id": goodreads_id,
        "series_name": series_name,
    }


def _split_into_meetups(text: str) -> List[Tuple[int, str]]:
    """Split text into (meetup_number, section_text) tuples."""
    # Find all boundary positions
    boundaries = []
    for m in BOUNDARY_RE.finditer(text):
        boundaries.append((m.start(), int(m.group(1))))

    if not boundaries:
        return []

    sections = []
    for i, (pos, num) in enumerate(boundaries):
        end = boundaries[i + 1][0] if i + 1 < len(boundaries) else len(text)
        section = text[pos:end]
        sections.append((num, section))

    return sections


def _parse_meetup_section(meetup_num: int, section: str, source_file: str, start_offset: int) -> List[IntermediateRecord]:
    """Parse a single meetup section into records."""
    records = []
    lines = section.split("\n")

    # Find venue and date in first few lines
    venue = "Unknown"
    date_str = None
    description_lines = []
    book_start_idx = 0

    known_venues = {
        "atta galatta": ("Atta Galatta", False),
        "bookworm": ("Bookworm", False),
        "online": ("Online", True),
        "zoom": ("Online", True),
    }

    for i, line in enumerate(lines):
        stripped = line.strip()
        if not stripped:
            continue

        # Check for venue
        for key, (name, _) in known_venues.items():
            if key in stripped.lower() and len(stripped) < 50:
                venue = name
                continue

        # Check for date
        dm = DATE_RE.search(stripped)
        if dm and not date_str:
            date_str = dm.group(1)
            continue

        # Once we've seen venue+date, start looking for books
        if venue != "Unknown" and date_str:
            # Skip empty lines and short narrative
            if not stripped:
                continue
            # Check if this looks like a book line
            if _is_book_line(stripped):
                book_start_idx = i
                break
            else:
                description_lines.append(stripped)

    description = " ".join(description_lines[:10])  # cap at 10 lines

    # Create meetup source
    raw_text = section[:2000]
    source = IntermediateSource(
        file_path=source_file,
        source_type="TXT_ARCHIVE",
        meetup_number=meetup_num,
        start_line=start_offset + 1,
        end_line=start_offset + len(lines),
        extraction_confidence=0.95,
        raw_text=raw_text,
        importer_name="txt_meetup_parser_v1",
    )

    # Determine format
    fmt = "ONLINE" if venue == "Online" else "IN_PERSON"

    # Create meetup record
    meetup = IntermediateMeetup(
        meetup_number=meetup_num,
        date=date_str,
        title=f"BBB Meetup #{meetup_num}",
        location=venue,
        description=description[:1000] if description else None,
        format=fmt,
    )

    records.append(IntermediateRecord(source=source, meetup=meetup))

    # Extract members from description
    member_patterns = [
        re.compile(r"new\s+(?:entrant|face|member|attendee)s?\s+(?:today\s+)?(?:in|are)\s+(.+?)(?:\.|!|\s+and\s+\w+\s+finally)", re.I),
        re.compile(r"([A-Z][a-z]+ [A-Z][a-z]+)\s+(?:was|is|has|had|brought|presented|join|finally|awesome)", re.I),
    ]
    for pat in member_patterns:
        for m in pat.finditer(description):
            name_text = m.group(1) if m.lastindex else m.group(0)
            parts = re.split(r",\s*|\s+and\s+", name_text)
            for part in parts:
                part = part.strip().strip(".")
                if re.match(r"^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+$", part) and len(part) < 50:
                    records.append(IntermediateRecord(
                        source=source,
                        member=IntermediateMember(display_name=part),
                        meetup=IntermediateMeetup(meetup_number=meetup_num),
                    ))

    # Extract books
    for i in range(book_start_idx, len(lines)):
        stripped = lines[i].strip()
        if not stripped:
            continue
        # Stop at next boundary
        if BOUNDARY_RE.search(stripped):
            break

        book_data = _parse_book_line(stripped)
        if not book_data:
            continue

        book = IntermediateBook(
            title=book_data["title"],
            author_name=book_data.get("author_name"),
            goodreads_url=book_data.get("goodreads_url"),
            goodreads_id=book_data.get("goodreads_id"),
            series_name=book_data.get("series_name"),
        )

        author = None
        if book_data.get("author_name"):
            author = IntermediateAuthor(full_name=book_data["author_name"])

        book_source = IntermediateSource(
            file_path=source_file,
            source_type="TXT_ARCHIVE",
            meetup_number=meetup_num,
            start_line=start_offset + i + 1,
            end_line=start_offset + i + 1,
            extraction_confidence=0.90,
            raw_text=stripped,
            importer_name="txt_meetup_parser_v1",
        )

        records.append(IntermediateRecord(
            source=book_source,
            book=book,
            author=author,
            meetup=IntermediateMeetup(meetup_number=meetup_num),
        ))

    return records


class TxtMeetupParser:
    """Parser for BBB Meetup-9.txt archive file."""

    importer_name = "txt_meetup_parser_v1"

    def parse(self, file_path: str) -> List[IntermediateRecord]:
        """Parse the full TXT file into IntermediateRecord list."""
        path = Path(file_path)
        text = path.read_text(encoding="utf-8")
        source_file = path.name

        sections = _split_into_meetups(text)
        all_records = []

        # Calculate line offsets for each section
        lines = text.split("\n")
        section_starts = []
        current_pos = 0
        for num, section in sections:
            section_starts.append((num, current_pos, section))
            current_pos += len(section.split("\n"))

        for num, start_line, section in section_starts:
            section_records = _parse_meetup_section(num, section, source_file, start_line)
            all_records.extend(section_records)

        return all_records
