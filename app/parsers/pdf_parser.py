import re
from pathlib import Path
from typing import List, Optional

from app.parsers.utils import (
    normalize_title,
    normalize_author,
    parse_meetup_date,
    extract_goodreads_url,
    extract_goodreads_id,
)
from app.parsers.scanner import parse_filename_metadata
from app.schemas.intermediate import (
    IntermediateRecord,
    IntermediateSource,
    IntermediateBook,
    IntermediateAuthor,
    IntermediateMeetup,
    IntermediateMember,
)


GOODREADS_RE = re.compile(r"https?://(?:www\.)?goodreads\.com/\S+")


def _extract_text_from_pdf(pdf_path: str) -> str:
    """Extract all text from a PDF using pdfplumber."""
    import pdfplumber
    full_text = ""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text() or ""
                full_text += page_text + "\n"
    except Exception:
        pass
    return full_text


def _parse_pdf_book_line(line: str) -> Optional[dict]:
    """Parse a single line that looks like a book entry from a PDF."""
    line = line.strip()
    if not line or len(line) < 3:
        return None

    url = None
    url_match = GOODREADS_RE.search(line)
    if url_match:
        url = url_match.group(0)

    # Remove URL for parsing
    clean = GOODREADS_RE.sub("", line).strip()
    clean = re.sub(r"\s*[–—-]\s*$", "", clean).strip()

    # Remove bullet points and numbering
    clean = re.sub(r"^[•●\-\d\.]+\s*", "", clean).strip()

    title = None
    author = None

    # Pattern: "Title by Author" or "Title, by Author"
    m = re.match(r"^(.+?)(?:\s*,?\s*by\s+|\s*,\s+by\s+)([A-Z].+?)$", clean)
    if m:
        title = m.group(1).strip()
        author = m.group(2).strip()
    else:
        # Pattern: "Title (Author)"
        m = re.match(r"^(.+?)\s*\(([A-Z][^)]+)\)\s*$", clean)
        if m:
            title = m.group(1).strip()
            author = m.group(2).strip()
        else:
            # Pattern: "Title - Author" (em dash or hyphen)
            m = re.match(r"^(.+?)\s*[–—-]\s+([A-Z].+?)$", clean)
            if m:
                title = m.group(1).strip()
                author = m.group(2).strip()
            else:
                # Pattern: "Title Author" (space-separated, author is last 2+ words)
                # Heuristic: if the line has 3+ words and ends with what looks like a name
                words = clean.split()
                if len(words) >= 3:
                    # Check if last 2-3 words look like an author name
                    # Author names typically: "First Last" or "First Middle Last"
                    last_words = words[-2:]
                    if all(w[0].isupper() for w in last_words if w):
                        # Check if second-to-last word is not a common title word
                        common_title_words = {'the', 'a', 'an', 'of', 'in', 'on', 'at', 'for', 'and', 'or', 'but', 'is', 'are', 'was', 'were'}
                        if words[-2].lower() not in common_title_words:
                            author = ' '.join(last_words)
                            title = ' '.join(words[:-2])
                if not title:
                    # Pattern: "Number. Title" or "Number Title"
                    m = re.match(r"^\d+[\.\)]\s*(.+)$", clean)
                    if m:
                        title = m.group(1).strip()
                    else:
                        # Plain title
                        title = clean.strip()

    if not title:
        return None

    # Clean title
    title = title.strip(".,;:")
    title = re.sub(r"\s*[–—-]\s*$", "", title).strip()

    # Clean author
    if author:
        author = normalize_author(author)
        author = re.sub(r"\s*[-–—]\s*$", "", author).strip()
        # Remove parenthetical notes like "(translator:...)"
        author = re.sub(r"\(translator:.*?\)", "", author, flags=re.I).strip()
        author = re.sub(r"\(.*?\)", "", author).strip()
        if not author:
            author = None

    goodreads_id = extract_goodreads_id(url) if url else None

    return {
        "title": title,
        "author_name": author,
        "goodreads_url": url,
        "goodreads_id": goodreads_id,
    }


def _extract_member_books(text: str) -> List[tuple]:
    """Extract member names and their books from PDF text.

    Returns list of (member_name, book_entries) tuples.
    Handles multiple formats:
    - Member name followed by "Title — Author" lines
    - Member name followed by numbered "1. Title — Author" lines
    - Roman numeral prefixed sections (I, II, III, etc.)
    """
    results = []
    lines = text.split("\n")

    current_member = None
    current_books = []
    in_book_section = False

    # Member name patterns — title case, short
    # Matches: "Madhusudan", "Niveditha", "Dr Chaitanya", "Vinay Leo"
    MEMBER_RE = re.compile(
        r"^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\s*$"
    )

    # Roman numeral member prefix pattern (e.g., "I Anindita", "XII Dr Chaitanya")
    ROMAN_MEMBER_RE = re.compile(
        r"^([IVX]+)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\s*$"
    )

    # Book line with em-dash: "Title — Author" or "Number. Title — Author"
    BOOK_DASH_RE = re.compile(
        r"^(?:\d+[\.\)]\s*)?(.+?)\s*[–—]\s+([A-Z].+?)$"
    )

    # Header patterns to skip
    HEADER_RE = re.compile(
        r"^(BBB|Broke|Title|Member|@The|AUTHOR|GENERAL|Meetup|Date|Venue|"
        r"Books\s+by\s+Member|List\s*of|Book\s*Title|Summary|"
        r"\d{2}[-/]\d{2}[-/]\d{4}|Meetup\s*#)",
        re.I
    )

    for i, line in enumerate(lines):
        stripped = line.strip()
        if not stripped:
            continue

        # Skip header lines
        if HEADER_RE.match(stripped):
            continue

        # Detect "General Discussion" section
        if re.match(r"^General\s+Discussion", stripped, re.I):
            in_book_section = True
            if current_member and current_books:
                results.append((current_member, current_books))
                current_member = None
                current_books = []
            continue

        # Check for Roman numeral member prefix (e.g., "I Anindita")
        roman_match = ROMAN_MEMBER_RE.match(stripped)
        if roman_match:
            if current_member and current_books:
                results.append((current_member, current_books))
            current_member = roman_match.group(2).strip()
            current_books = []
            continue

        # Check if this is a member name line (title case, no dash, short)
        if MEMBER_RE.match(stripped) and len(stripped) < 30:
            # Verify next line looks like a book (contains em-dash or starts with number)
            next_line = lines[i + 1].strip() if i + 1 < len(lines) else ""
            if BOOK_DASH_RE.match(next_line) or re.match(r"^\d+[\.\)]\s*", next_line):
                if current_member and current_books:
                    results.append((current_member, current_books))
                current_member = stripped
                current_books = []
                continue

        # Try to parse as book entry with em-dash
        book_match = BOOK_DASH_RE.match(stripped)
        if book_match:
            title = book_match.group(1).strip()
            author = book_match.group(2).strip()
            # Clean up numbering if present
            title = re.sub(r"^\d+[\.\)]\s*", "", title).strip()
            if title and author:
                current_books.append({
                    "title": title,
                    "author_name": author,
                    "goodreads_url": None,
                    "goodreads_id": None,
                })
                continue

        # Try standard book line parsing
        book_data = _parse_pdf_book_line(stripped)
        if book_data and book_data.get("title"):
            current_books.append(book_data)

    # Save last member
    if current_member and current_books:
        results.append((current_member, current_books))

    return results


def _extract_books_flat(text: str) -> List[dict]:
    """Extract books from a flat list format (no member grouping).

    Handles multiple formats:
    - "Title by Author"
    - "1 Title Author" (numbered list)
    - "1. Title - Author" (numbered with punctuation)
    """
    books = []
    lines = text.split("\n")

    # Track if we're in the book list section
    in_book_section = False

    # Noise patterns to skip
    NOISE_PATTERNS = re.compile(
        r"^(Member\s+Book\s*Title|BOOKTITLE|AUTHOR|Summary|Meetup\s*#|"
        r"BBB\s+Meetup|Broke\s+Bibliophiles|The\s+\w+\s+\d{4}\s+edition|"
        r"brought\s+together|reading\s+months|Several\s+notable|"
        r"presence\s+through|authors\s+were|others,\s+while|"
        r"history,\s+and|continued\s+enthusiasm|additional\s+books|"
        r"of\s+,|bringing\s+the\s+total|List\s*of\s*Books?\s*Discussed|"
        r"noted\s+by|Members?\s+who|This\s+time|In\s+addition|"
        r"\(Multiple\s+cast|\(via\s+ChatGPT|\d{2}[-/]\d{2}[-/]\d{4}|"
        r"^st\d{4}|^nd\d{4}|^rd\d{4}|^th\d{4}|"
        r"^participants\s+\d+|^science\s+fiction|^regional\s+Indian|"
        r"^ranging\s+from|^Harry\s+Potter\s+and\s+the\s+Philosopher|"
        r"^Turton,\s+Arthur|^additional\s+books|^of\s+,|"
        r"^continued\s+enthusiasm|^The\s+modest)",
        re.IGNORECASE,
    )

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        # Detect start of book list section
        if re.match(r"^(List\s*of\s*Books?\s*Discussed|GENERAL\s*DISCUSSION)", stripped, re.I):
            in_book_section = True
            continue

        # Skip noise patterns
        if NOISE_PATTERNS.match(stripped):
            continue

        # Skip very short lines (likely noise or continuation)
        if len(stripped) < 5:
            continue

        # Skip lines that are clearly not book titles
        if re.match(r"^[IVX]+\s+\w[\w\s]*$", stripped):
            # This is just a member name without a book
            continue

        # Handle numbered list format: "1 Title Author" or "1. Title - Author"
        m = re.match(r"^(\d+)[\.\)]\s*(.+)$", stripped)
        if m:
            rest = m.group(2).strip()
            book_data = _parse_pdf_book_line(rest)
            if book_data:
                books.append(book_data)
                continue

        # Handle member prefix format: "I Anindita 1 Title Author"
        m = re.match(r"^[IVX]+\s+\w[\w\s]*\s+(\d+)[\.\)]?\s*(.+)$", stripped)
        if m:
            rest = m.group(2).strip()
            book_data = _parse_pdf_book_line(rest)
            if book_data:
                books.append(book_data)
                continue

        # Try standard book line parsing
        book_data = _parse_pdf_book_line(stripped)
        if book_data:
            books.append(book_data)

    return books


class PdfMeetupParser:
    """Parser for BBB PDF meetup files."""

    importer_name = "pdf_meetup_parser_v1"

    def parse(self, file_path: str) -> List[IntermediateRecord]:
        """Parse a single PDF file into IntermediateRecord list."""
        path = Path(file_path)
        source_file = path.name

        # Extract metadata from filename
        meta = parse_filename_metadata(source_file)
        meetup_num = meta.get("meetup_number")
        date_str = meta.get("date_str")

        # Extract text
        text = _extract_text_from_pdf(file_path)
        if not text.strip():
            return []

        # Try to extract meetup number from text if not in filename
        if not meetup_num:
            m = re.search(r"Meetup?\s*#?(\d+)", text, re.I)
            if m:
                meetup_num = int(m.group(1))

        # Determine venue from text
        venue = "Bookworm"  # default for PDFs
        if re.search(r"bookworm|church\s*street", text, re.I):
            venue = "Bookworm"
        elif re.search(r"atta\s*galatta", text, re.I):
            venue = "Atta Galatta"
        elif re.search(r"online|zoom|google\s*meet", text, re.I):
            venue = "Online"

        records = []

        # Create source
        source = IntermediateSource(
            file_path=source_file,
            source_type="PDF_DOCUMENT",
            meetup_number=meetup_num,
            pdf_page=1,
            extraction_confidence=0.85,
            raw_text=text[:2000],
            importer_name=self.importer_name,
        )

        # Create meetup record
        if meetup_num:
            meetup = IntermediateMeetup(
                meetup_number=meetup_num,
                date=date_str,
                title=f"BBB Meetup #{meetup_num}",
                location=venue,
                format="IN_PERSON" if venue != "Online" else "ONLINE",
            )
            records.append(IntermediateRecord(source=source, meetup=meetup))

        # Try member-grouped extraction first
        member_books = _extract_member_books(text)

        # Use member extraction if it found a reasonable number of members
        # (at least 3 members with books suggests successful extraction)
        use_member_extraction = member_books and len(member_books) >= 3

        if use_member_extraction:
            for member_name, books in member_books:
                # Create member
                records.append(IntermediateRecord(
                    source=source,
                    member=IntermediateMember(display_name=member_name),
                    meetup=IntermediateMeetup(meetup_number=meetup_num) if meetup_num else None,
                ))

                for book_data in books:
                    book = IntermediateBook(
                        title=book_data["title"],
                        author_name=book_data.get("author_name"),
                        goodreads_url=book_data.get("goodreads_url"),
                        goodreads_id=book_data.get("goodreads_id"),
                    )
                    author = None
                    if book_data.get("author_name"):
                        author = IntermediateAuthor(full_name=book_data["author_name"])

                    book_source = IntermediateSource(
                        file_path=source_file,
                        source_type="PDF_DOCUMENT",
                        meetup_number=meetup_num,
                        extraction_confidence=0.85,
                        raw_text=book_data["title"],
                        importer_name=self.importer_name,
                    )

                    records.append(IntermediateRecord(
                        source=book_source,
                        book=book,
                        author=author,
                        meetup=IntermediateMeetup(meetup_number=meetup_num) if meetup_num else None,
                    ))
        else:
            # Fall back to flat book extraction
            books = _extract_books_flat(text)
            for book_data in books:
                book = IntermediateBook(
                    title=book_data["title"],
                    author_name=book_data.get("author_name"),
                    goodreads_url=book_data.get("goodreads_url"),
                    goodreads_id=book_data.get("goodreads_id"),
                )
                author = None
                if book_data.get("author_name"):
                    author = IntermediateAuthor(full_name=book_data["author_name"])

                book_source = IntermediateSource(
                    file_path=source_file,
                    source_type="PDF_DOCUMENT",
                    meetup_number=meetup_num,
                    extraction_confidence=0.80,
                    raw_text=book_data["title"],
                    importer_name=self.importer_name,
                )

                records.append(IntermediateRecord(
                    source=book_source,
                    book=book,
                    author=author,
                    meetup=IntermediateMeetup(meetup_number=meetup_num) if meetup_num else None,
                ))

        return records
