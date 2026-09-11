from pathlib import Path
from typing import Dict, List, Optional
import re


# Month name to number mapping for 2-digit year expansion
MONTH_ABBREVS = {
    "jan": 1, "january": 1, "feb": 2, "february": 2, "mar": 3, "march": 3,
    "apr": 4, "april": 4, "may": 5, "jun": 6, "june": 6,
    "jul": 7, "july": 7, "aug": 8, "august": 8, "sep": 9, "sept": 9,
    "september": 9, "oct": 10, "october": 10, "nov": 11, "november": 11,
    "dec": 12, "december": 12,
}


def _expand_2digit_year(year_str: str, month_str: Optional[str] = None) -> int:
    """Expand a 2-digit year to 4-digit year.

    Heuristic: years 00-30 map to 2000-2030, 31-99 map to 1931-1999.
    For BBB context (started ~2017), anything > 15 maps to 2000+.
    """
    year = int(year_str)
    if year <= 30:
        return 2000 + year
    else:
        return 1900 + year


def _extract_month_year(text: str):
    """Extract month and year from a text fragment.

    Returns (month_name, year_int) or (None, None).
    Handles both 4-digit and 2-digit years.
    """
    # Try "Month YYYY" or "Month YY"
    m = re.search(r"([A-Za-z]+)\s+(\d{2,4})", text)
    if m:
        month = m.group(1)
        year_str = m.group(2)
        if len(year_str) == 2:
            year = _expand_2digit_year(year_str, month)
        else:
            year = int(year_str)
        return month, year
    return None, None


class ArchiveScanner:
    """Scan the BBB data directory for all source files."""

    def scan(self, data_dir: Path) -> Dict[str, List[Path]]:
        """Return dict with 'txt_files' and 'pdf_files' lists."""
        txt_files = sorted(data_dir.glob("BBB Meetup*.txt"))
        pdf_files = sorted(data_dir.glob("*.pdf"))
        return {
            "txt_files": txt_files,
            "pdf_files": pdf_files,
        }


def parse_filename_metadata(filename: str) -> dict:
    """Extract meetup number and date from PDF filename.

    Uses multiple parsing strategies to handle the wide variety of BBB filename formats.
    Returns dict with keys: meetup_number, date_str, month, year.
    """
    result = {"meetup_number": None, "date_str": None, "month": None, "year": None}

    # =========================================================================
    # Strategy 1: Explicit meetup number in filename
    # =========================================================================

    # "70 - BBB Meetup 70 - Mar 2024.pdf" or "76 - BBB Meetup 76 - SEP 24.pdf"
    m = re.match(r"^(\d+)\s*-?\s*BBB\s+(?:Meetup\s+)?(\d+)\s*-?\s*(\w+)\s+(\d{2,4})", filename, re.I)
    if m:
        result["meetup_number"] = int(m.group(2))
        month = m.group(3)
        year_str = m.group(4)
        year = _expand_2digit_year(year_str, month) if len(year_str) == 2 else int(year_str)
        result["month"] = month
        result["year"] = year
        result["date_str"] = f"{month} {year}"
        return result

    # "BBB #93 Feb 2026, Books Discussed.pdf" or "BBB 97, June 2026, Books Discussed.pdf"
    m = re.match(r"^BBB\s*#?(\d+)[,\s]+(\w+)[,\s]+(\d{4})", filename, re.I)
    if m:
        result["meetup_number"] = int(m.group(1))
        result["month"] = m.group(2)
        result["year"] = int(m.group(3))
        result["date_str"] = f"{m.group(2)} {m.group(3)}"
        return result

    # "BBB 85 - Books Discussed.pdf"
    m = re.match(r"^BBB\s+(\d+)\s*-?\s*Books?\s+Discussed", filename, re.I)
    if m:
        result["meetup_number"] = int(m.group(1))
        return result

    # "BBB #96 May 2026, Books Discussed.pdf" (with comma)
    m = re.match(r"^BBB\s*#(\d+)\s+(\w+)\s+(\d{4})", filename, re.I)
    if m:
        result["meetup_number"] = int(m.group(1))
        result["month"] = m.group(2)
        result["year"] = int(m.group(3))
        result["date_str"] = f"{m.group(2)} {m.group(3)}"
        return result

    # "80 - BBB Meetup - Jan 2025.pdf" (number at start, no second number)
    m = re.match(r"^(\d+)\s*-?\s*BBB\s+Meetup\s*-?\s*(\w+)\s+(\d{2,4})", filename, re.I)
    if m:
        result["meetup_number"] = int(m.group(1))
        month = m.group(2)
        year_str = m.group(3)
        year = _expand_2digit_year(year_str, month) if len(year_str) == 2 else int(year_str)
        result["month"] = month
        result["year"] = year
        result["date_str"] = f"{month} {year}"
        return result

    # "86 - BBB Meetup - Books Discussed - July 2025.pdf"
    m = re.match(r"^(\d+)\s*-?\s*BBB\s+Meetup\s*-?\s*Books?\s+Discussed\s*-?\s*(\w+)\s+(\d{2,4})", filename, re.I)
    if m:
        result["meetup_number"] = int(m.group(1))
        month = m.group(2)
        year_str = m.group(3)
        year = _expand_2digit_year(year_str, month) if len(year_str) == 2 else int(year_str)
        result["month"] = month
        result["year"] = year
        result["date_str"] = f"{month} {year}"
        return result

    # =========================================================================
    # Strategy 2: Date-only patterns (no meetup number in filename)
    # =========================================================================

    # "BBB Books Discussed - Aug 2023.pdf"
    m = re.match(r"^BBB\s+Books?\s+Discussed?\s*-?\s*(\w+)\s+(\d{4})", filename, re.I)
    if m:
        result["month"] = m.group(1)
        result["year"] = int(m.group(2))
        result["date_str"] = f"{m.group(1)} {m.group(2)}"
        return result

    # "BBB AUG 2025 - BOOKS DISCUSSED.pdf" or "BBB DEC 2025 - BOOKS DISCUSSED LIST.pdf"
    m = re.match(r"^BBB\s+(\w+)\s+(\d{4})\s*-?\s*BOOKS?\s+DISCUSSED(?:\s+LIST)?", filename, re.I)
    if m:
        result["month"] = m.group(1)
        result["year"] = int(m.group(2))
        result["date_str"] = f"{m.group(1)} {m.group(2)}"
        return result

    # "Books Discussed — BBB JULY 2025.pdf"
    m = re.match(r"^Books?\s+Discussed?\s*[—–-]\s*BBB\s+(\w+)\s+(\d{4})", filename, re.I)
    if m:
        result["month"] = m.group(1)
        result["year"] = int(m.group(2))
        result["date_str"] = f"{m.group(1)} {m.group(2)}"
        return result

    # "BBB Meetup - October 2023 (Books Discussed).pdf"
    m = re.match(r"^BBB\s+Meetup\s*-?\s*(\w+)\s+(\d{4})", filename, re.I)
    if m:
        result["month"] = m.group(1)
        result["year"] = int(m.group(2))
        result["date_str"] = f"{m.group(1)} {m.group(2)}"
        return result

    # "BBB OCT 2025 - BOOKS DISCUSSED (1).pdf"
    m = re.match(r"^BBB\s+(\w+)\s+(\d{4})\s*-?\s*BOOKS?\s+DISCUSSED", filename, re.I)
    if m:
        result["month"] = m.group(1)
        result["year"] = int(m.group(2))
        result["date_str"] = f"{m.group(1)} {m.group(2)}"
        return result

    # "BBB SEPT 2025 - BOOKS DISCUSSED.pdf"
    m = re.match(r"^BBB\s+(\w+)\s+(\d{4})\s*-?\s*BOOKS?\s+DISCUSSED", filename, re.I)
    if m:
        result["month"] = m.group(1)
        result["year"] = int(m.group(2))
        result["date_str"] = f"{m.group(1)} {m.group(2)}"
        return result

    # "BYOB +BBB - Nov 2023 (25th Nov Meet) - Copy.pdf"
    m = re.search(r"(\w+)\s+(\d{4})", filename)
    if m:
        result["month"] = m.group(1)
        result["year"] = int(m.group(2))
        result["date_str"] = f"{m.group(1)} {m.group(2)}"
        return result

    # "30_12_2023 15_33.pdf" (date-based, DD_MM_YYYY)
    m = re.match(r"^(\d{2})_(\d{2})_(\d{4})", filename)
    if m:
        result["date_str"] = f"{m.group(3)}-{m.group(2)}-{m.group(1)}"
        result["year"] = int(m.group(3))
        return result

    return result
