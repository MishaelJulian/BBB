"""Layout-aware parser for BBB meetup source files (PDF text, text archive, chat export).

Stages 1-4 of the import flow (docs: the approved plan): register the source, extract lines that keep their
indent, detect the layout, and parse items. Nothing here touches the database or the network, so the same file
always gives the same result. Every fault this parser guards against was met in the real files:

  * headings are found by position/shape, not by capital letters ("Dr. CHAITANYA", "Jyoti", "I. Abhiram", "1) Smriti")
  * wrapped lines are joined to the item above (a title, an unbalanced "(Author", an indented tail)
  * URL lines and their wrapped tails ("...The_Village_by_the_S" / "ea") are never items
  * table rows are split at the header's column offsets, so the author column cannot glue onto a title
  * a heading at the foot of a page keeps applying on the next page
  * a file whose layout is unknown, or that has no text layer, is reported instead of guessed
"""
from __future__ import annotations

import os
import re
import shutil
import subprocess
from dataclasses import dataclass, field
from typing import Optional

PARSER_VERSION = "meetup_parser/2026-10-12"

_ZERO_WIDTH = dict.fromkeys(map(ord, "​‌‍﻿⁠"), None)
BULLET = r"[●•∙·▪◦○\-\*\uf0b7\uf0a7\uf0d8]"
RE_BULLET = re.compile(rf"^\s*{BULLET}\s*(.+)$")
RE_NUMBERED = re.compile(r"^\s*(\d{1,3})\s*[\.\)]\s*(\S.*)?$")
RE_URL = re.compile(r"^\s*(https?://|www\.)\S*", re.I)
MEDIA_WORDS = {"movie": "movie", "film": "movie", "show": "tv_series", "documentary": "documentary", "podcast": "podcast",
               "anime": "anime", "app": "website_app", "tv show": "tv_series", "web series": "tv_series"}
GENERAL_HEADINGS = ("TANGENT", "GENERAL", "MENTIONS", "BOOKS MENTIONED", "OTHER MENTIONS")
META_WORDS = re.compile(r"(?i)(@|\bbbb\b|meet-?up|meeting|\bdate\b|\bplace\b|\bvenue\b|books? discussed|broke bibliophiles|discussion list|categorized|mentions by members|summary)")


@dataclass
class Line:
    text: str
    indent: int
    page: int
    no: int
    source: str = "text"          # "text" or "ocr"


@dataclass
class ParsedItem:
    section: str                  # "member" | "general" | "author_discussion"
    heading: Optional[str]        # heading as printed (cleaned of numbering and a trailing colon)
    page: int
    line_from: int
    line_to: int
    raw: str
    title: str
    author: Optional[str] = None
    translator: Optional[str] = None
    media_hint: Optional[str] = None
    goodreads_url: Optional[str] = None
    flags: list = field(default_factory=list)      # e.g. "title may be cut at the column edge", "fragment"


@dataclass
class ParsedSource:
    path: str
    layout: str
    confidence: float
    items: list
    warnings: list
    lines: list = field(default_factory=list)


# --------------------------------------------------------------------------- stage 2: extract
def _clean(s: str) -> str:
    return s.translate(_ZERO_WIDTH).replace(" ", " ").rstrip()


def extract_lines(path: str) -> tuple[list[Line], list[str]]:
    """Lines with indent, page and line numbers. PDFs go through `pdftotext -layout` when poppler is installed,
    otherwise pdfplumber (doubled glyphs removed). A page with no text layer is OCR'd if tesseract exists."""
    warnings: list[str] = []
    if path.lower().endswith(".txt"):
        pages = open(path, encoding="utf-8").read().split("\f")
    else:
        pages = _pdf_pages(path, warnings)
    out, n = [], 0
    for pi, pg in enumerate(pages, start=1):
        for raw in pg.splitlines():
            t = _clean(raw)
            n += 1
            if t.strip():
                out.append(Line(t, len(t) - len(t.lstrip(" ")), pi, n))
    return out, warnings


def _pdf_pages(path: str, warnings: list) -> list[str]:
    if shutil.which("pdftotext"):
        pages = subprocess.run(["pdftotext", "-layout", path, "-"], capture_output=True, text=True).stdout.split("\f")
    else:                                                       # pragma: no cover - fallback without poppler
        import pdfplumber
        pages = []
        with pdfplumber.open(path) as pdf:
            for pg in pdf.pages:
                pages.append(pg.dedupe_chars().extract_text(layout=True) or "")
    if pages and pages[-1].strip() == "":
        pages.pop()                                               # pdftotext ends with a form feed: not a real page
    blank = [i for i, pg in enumerate(pages, start=1) if pg.strip() == ""]
    if blank:
        has_image = _pages_with_images(path)
        for i in blank:
            if i in has_image:                                    # an image-only page: its text is only in the picture
                warnings.append(f"page {i} has no text layer: needs OCR")
                if shutil.which("tesseract") and shutil.which("pdftoppm") and _tesseract_has_english():
                    pages[i - 1] = _ocr_page(path, i)
                elif i == min(has_image & set(blank)):
                    warnings.append("OCR cannot run: tesseract has no English data (install tesseract-data-eng)")
            else:
                warnings.append(f"page {i} is blank")
    return pages


def _pages_with_images(path: str) -> set:
    try:
        import pdfplumber
        with pdfplumber.open(path) as pdf:
            return {i for i, pg in enumerate(pdf.pages, start=1) if pg.images}
    except Exception:                                             # pragma: no cover - without pdfplumber assume the worst
        return set(range(1, 500))


def _tesseract_has_english() -> bool:
    try:
        return "eng" in subprocess.run(["tesseract", "--list-langs"], capture_output=True, text=True).stdout.split()
    except Exception:
        return False


def _ocr_page(path: str, page: int) -> str:                    # pragma: no cover - depends on tesseract
    import tempfile
    with tempfile.TemporaryDirectory() as d:
        subprocess.run(["pdftoppm", "-r", "200", "-f", str(page), "-l", str(page), "-png", path, f"{d}/p"], check=True)
        png = next(f for f in os.listdir(d) if f.endswith(".png"))
        return subprocess.run(["tesseract", f"{d}/{png}", "-", "--psm", "6"], capture_output=True, text=True).stdout


# --------------------------------------------------------------------------- stage 1: meetup number
_MONTHS = {m: i for i, m in enumerate(["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], start=1)}


def meetup_number_for(path: str, lines: list[Line], by_month: dict) -> tuple[Optional[int], str]:
    """(number, how). By filename number, else by month-year (filename or header lines) against `by_month`
    {(year, month): meetup_number}. Returns (None, reason) when it cannot be told: the caller must stop."""
    name = os.path.basename(path)
    m = re.match(r"^(\d{2}) - ", name) or re.search(r"BBB #?(\d{2})[ ,]", name)
    if m:
        return int(m.group(1)), "filename number"
    for s in [name] + [l.text for l in lines[:8]]:
        m = re.search(r"(?i)\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?[\s,\-]*(20\d\d|\d\d)\b", s)
        if m:
            y = int(m.group(2)); y = y + 2000 if y < 100 else y
            n = by_month.get((y, _MONTHS[m.group(1).lower()]))
            if n:
                return n, "month-year"
        m = re.search(r"\b(\d{1,2})[-/](\d{1,2})[-/](20\d\d)\b", s) or re.search(r"\b(20\d\d)-(\d{2})-(\d{2})\b", s)
        if m:
            g = m.groups()
            y, mo = (int(g[2]), int(g[1])) if len(g[0]) <= 2 else (int(g[0]), int(g[1]))
            n = by_month.get((y, mo))
            if n:
                return n, "date line"
    return None, "no number in the filename and no month-year matching a meetup"


# --------------------------------------------------------------------------- stage 3: layout
def detect_layout(lines: list[Line], warnings: list) -> tuple[str, float]:
    head = [l.text for l in lines[:14]]
    body = [l.text for l in lines]
    if not lines or sum(len(t) for t in body) < 300:
        return "unsupported:no_text", 1.0
    if any(re.search(r"\bMember\b.*\bBook\s*Title\b", t) for t in body) and any(re.match(r"^\s*[IVXL]+\s+[A-Z][a-z]+.*\s\d{1,3}\s{2,}\S", t) for t in body):
        return "roman_table", 0.9
    if any(re.search(r"\bTitle\b", t) and re.search(r"\bAuthor", t) for t in head):
        return ("member_table" if any(re.search(r"\bMember\b", t) for t in head) else "table"), 0.9
    if sum(1 for t in body if re.search(r"\s\d{2}/\d{2}/\d{4}\s+\d{2}:\d{2}\s*$", t)) >= 3:
        return "chat", 0.9
    if sum(1 for t in body if re.search(r"\S.*∙\s*\S", t)) >= 3:                 # a bullet glyph in the middle of a line
        return "glued_bullets", 0.9
    if sum(1 for t in body if re.match(r"^\W*[A-Z][A-Z .]{2,}\s*:\s+\S", t)) >= 5:
        return "name_colon", 0.8
    if any("AUTHOR INTERACTION" in t for t in body):
        return "author_interaction", 0.9
    return "blocks", 0.8


# --------------------------------------------------------------------------- stage 4: structure
_PAREN_MEDIA = re.compile(r"\(\s*(movie|film|show|documentary|game|podcast|graphic novel|audiobook|anime|tv show|web series|novella|recordings?)\s*\)\s*$", re.I)


def _balance_open(s: str) -> bool:
    return s.count("(") > s.count(")") or s.count("{") > s.count("}")


def split_title_author(text: str) -> dict:
    """Title and author split once: ', by X', ' by X', trailing '(X)'; translator and media cues are lifted out."""
    t = re.sub(r"\s+", " ", text).strip()
    out = {"title": t, "author": None, "translator": None, "media": None}
    m = _PAREN_MEDIA.search(t)
    if m:
        out["media"] = MEDIA_WORDS.get(m.group(1).lower())
        t = t[: m.start()].strip()
    m = re.search(r"(?i),?\s*\(?\b(?:translated (?:from [A-Za-z ]+ )?by|translator:|tr\.(?:\s*by)?)\s*([^()]+?)\)?\s*$", t)
    if m:
        out["translator"] = m.group(1).strip()
        t = t[: m.start()].strip(" ,")
        if t.count("(") > t.count(")"):                         # "Meditations (Aurelius, tr. by Hays)": the bracket the translator sat in
            t += ")"
    # ', by X' is explicit; a trailing '(X)' comes next; a bare ' by X' only counts when X starts with a capital
    # (so "The Village by the Sea (Anita Desai)" keeps its title).
    m = re.match(r"^(.*?),\s*by\s+(.+)$", t) or re.match(r"^(.*?)\s*\(([^()]+)\)\s*$", t) or re.match(r"^(.*?)\s+by\s+([A-Z].*)$", t)
    if m:
        t, out["author"] = m.group(1).strip(), re.sub(r"\s+and\s+", " & ", m.group(2).strip())
    m = re.search(r"(?i),\s*(movie|film|documentary|show|web series|series(?: on \w+)?|podcast|anime)\s*$", t)
    if m and out["media"] is None:
        out["media"] = MEDIA_WORDS.get(m.group(1).lower().split(" on ")[0], "tv_series" if m.group(1).lower().startswith("series") else None)
        t = t[: m.start()].strip()
    if re.search(r"(?i)\bpodcast\b", t) and out["media"] is None:
        out["media"] = "podcast"
        t = re.sub(r"(?i),?\s*podcast\s*$", "", t).strip()
    out["title"] = t
    return out


def heading_clean(text: str) -> str:
    """'I. Abhiram' -> 'Abhiram', '1) Smriti' -> 'Smriti', trailing ':' dropped. An initial like '.S' stays for the resolver."""
    h = re.sub(r"^(?:[IVXL]+\.|\d{1,2}\))\s+", "", text.strip())
    h = re.sub(r"\s*\d{1,2}/\d{1,2}/\d{4}\s+\d{1,2}:\d{2}\s*$", "", h)               # a chat timestamp glued to the name
    h = re.sub(r"\s*\((?=[^)]*\b[a-z]{3,}\b)[^()]*\)\s*$", "", h)                   # "Harsha (wants historical fiction recommendations)"
    return re.sub(r"\s+", " ", h.rstrip(":-– ")).strip()


def looks_like_heading(text: str) -> bool:
    h = heading_clean(text)
    if not h or len(h) > 38 or META_WORDS.search(heading_clean(text)) or h.islower() or RE_BULLET.match(text) or RE_URL.match(text):
        return False
    if re.search(r"[\d,;()\[\]/&@#|=]", re.sub(r"\.[A-Za-z]\b", "", h)):
        return False
    words = h.split()
    return 1 <= len(words) <= 5 and all(re.match(r"^[A-Za-z’'.\-]+$", w) for w in words)


def _section_of(h: str) -> Optional[str]:
    u = heading_clean(h).upper()
    if u.endswith("AUTHOR OF") or u.startswith("AUTHOR DISCUSSION") or u.startswith("AUTHOR INTERACTION"):
        return "author_discussion"
    if any(u.startswith(g) for g in GENERAL_HEADINGS):
        return "general"
    return None


def _next_is_item(lines: list[Line], i: int) -> bool:
    j = i + 1
    while j < len(lines) and META_WORDS.search(lines[j].text) and not RE_BULLET.match(lines[j].text):
        j += 1                                                          # a page footer between a heading and its first item
    if j >= len(lines):
        return False
    n = lines[j]
    return bool(RE_BULLET.match(n.text) or RE_NUMBERED.match(n.text) or n.indent > lines[i].indent)


def drop_running_headers(lines: list[Line], warnings: list) -> list[Line]:
    """A line that repeats on three or more pages ('Meeting #80 - BBB Jan 2025   2') is a page header or footer, not content.
    A second view of the same books ('Books Categorized by Genre') ends the parse: it repeats what the first view lists."""
    pages: dict[str, set] = {}
    for l in lines:
        pages.setdefault(re.sub(r"\d+", "#", l.text.strip()), set()).add(l.page)
    out = [l for l in lines if not re.fullmatch(r"\d{1,3}", l.text.strip())
           and (len(pages[re.sub(r"\d+", "#", l.text.strip())]) < 3 or len(l.text.strip()) > 70)]
    for i, l in enumerate(out):
        if re.search(r"(?i)categori[sz]ed by (?!person)", l.text):
            warnings.append(f"line {l.no}: a second view of the same books ('{l.text.strip()[:40]}') is not parsed twice")
            return out[:i]
    return out


def parse_blocks(lines: list[Line], warnings: list) -> list[ParsedItem]:
    """Bullets, numbered lists and plain indented blocks (headings at any indent; items bulleted, numbered or deeper)."""
    lines = drop_running_headers(lines, warnings)
    lens = sorted(len(l.text.rstrip()) for l in lines)
    max_len = lens[int(len(lens) * 0.95)] if lens else 0
    prev_len = 0
    items: list[ParsedItem] = []
    heading, section, h_indent = None, "general", 0
    cur: Optional[ParsedItem] = None
    cur_indent, last_was_url, started = 0, False, False
    for i, ln in enumerate(lines):
        t = ln.text.strip()
        nxt = lines[i + 1] if i + 1 < len(lines) else None
        pl, prev_len = prev_len, len(ln.text.rstrip())
        if RE_URL.match(ln.text):
            if cur is not None:
                cur.goodreads_url = (cur.goodreads_url or "") + t
            last_was_url = True
            continue
        if last_was_url and cur is not None and re.fullmatch(r"[\w\-\.=/%?&]+", t) and ln.indent > h_indent:
            cur.goodreads_url = (cur.goodreads_url or "") + t          # wrapped URL tail, never an item
            continue
        last_was_url = False
        m_b, m_n = RE_BULLET.match(ln.text), RE_NUMBERED.match(ln.text)
        if m_n and not m_b and nxt is not None and RE_BULLET.match(nxt.text) and looks_like_heading(m_n.group(2) or ""):
            heading, section, h_indent, cur, started = heading_clean(ln.text), "member", ln.indent, None, True   # "1) Smriti"
            continue
        if m_b or (m_n and (m_n.group(2) or "").strip()):
            body = (m_b.group(1) if m_b else m_n.group(2)).strip()
            url = re.search(r"https?://\S+", body)
            if url:
                body = body[: url.start()].strip()
            cur = ParsedItem(section, heading, ln.page, ln.no, ln.no, body, body, goodreads_url=url.group(0) if url else None)
            cur_indent = ln.indent
            items.append(cur)
            started = True
            continue
        if m_n:                                                        # "3." alone: the title is on the next line
            cur = ParsedItem(section, heading, ln.page, ln.no, ln.no, "", "")
            cur_indent = ln.indent
            items.append(cur)
            continue
        is_heading_shape = looks_like_heading(ln.text) and _next_is_item(lines, i)
        deeper = cur is not None and ln.indent > cur_indent + 1          # deeper than the item above: a wrapped tail, even if it looks like a name
        if cur is not None and not deeper and not is_heading_shape and ln.indent == cur_indent and len(t.split()) <= 2 and pl >= 0.88 * max_len \
                and not RE_BULLET.match(ln.text) and re.search(r"\bby \w+$", cur.raw):
            deeper = True                                                   # "...Disappeared by Jonas" / "Jonasson": the line above filled the page width
        if cur is not None and (deeper or (not is_heading_shape and (_balance_open(cur.raw) or cur.raw == ""))):
            cur.raw = (cur.raw[:-1] + t if cur.raw.endswith("-") and cur.raw[-2:-1].isalpha() else (cur.raw + " " + t)).strip()   # wrapped line
            cur.title = cur.raw; cur.line_to = ln.no
            continue
        sec = _section_of(ln.text) if looks_like_heading(ln.text) or t.upper().endswith("AUTHOR OF") else None
        if sec or is_heading_shape:
            heading, section, h_indent, cur, started = heading_clean(ln.text), (sec or "member"), ln.indent, None, True
            if sec == "author_discussion":
                heading = re.sub(r"(?i),?\s*author of$", "", heading)
            continue
        if started and heading and ln.indent > h_indent and not META_WORDS.search(t):
            cur = ParsedItem(section, heading, ln.page, ln.no, ln.no, t, t)         # plain indented item
            cur_indent = ln.indent
            items.append(cur)
            continue
        if started and not META_WORDS.search(t):
            warnings.append(f"line {ln.no}: not understood and skipped: {t[:60]!r}")
    return _finish(items)


def parse_glued_bullets(lines: list[Line], warnings: list) -> list[ParsedItem]:
    """Aug 2023 style: bullets glued mid-line ('... ∙ Title (Author) https://...'). Split on the glyph, cut at the URL."""
    items = []
    for chunk in "\n".join(l.text for l in lines).split("∙")[1:]:
        before, _, url = chunk.partition("http")
        t = re.sub(r"\s+", " ", before).strip()
        if t:
            items.append(ParsedItem("general", None, lines[0].page, lines[0].no, lines[-1].no, t, t,
                                    goodreads_url=("http" + url.split()[0]) if url.strip() else None))
    return _finish(items)


def parse_table(lines: list[Line], warnings: list) -> list[ParsedItem]:
    """Title | Author | Type | Link table (Jul 2023). Title is the left column only; a title that fills the column is flagged."""
    hdr = next(l.text for l in lines[:14] if re.search(r"\bTitle\b", l.text) and re.search(r"\bAuthor", l.text))
    a = hdr.index("Author")
    items = []
    for ln in lines:
        if ln.text == hdr or ln.text.startswith(" "):
            continue
        title = ln.text[:a].strip()
        if not title:
            continue
        tail = ln.text[a:]
        mt = re.search(r"(AudioBook|WebSeries|WebSite|Website|Anime|Podcast|Movie|Documentary|Book)\b", tail)         # the Type column
        author = (tail[: mt.start()] if mt else tail).strip() or None
        if author and re.fullmatch(r"N/?A", author, re.I):
            author = None
        it = ParsedItem("general", None, ln.page, ln.no, ln.no, ln.text.strip(), title, author=author)
        if mt:
            it.media_hint = {"WebSeries": "tv_series", "WebSite": "website_app", "Website": "website_app", "Anime": "anime", "Podcast": "podcast",
                             "Movie": "movie", "Documentary": "documentary"}.get(mt.group(1))
            if mt.group(1) == "AudioBook":
                it.flags.append("audiobook")
        if len(ln.text[:a].rstrip()) >= a - 2:
            it.flags.append("title may be cut at the column edge")
        items.append(it)
    return items


def parse_member_table(lines: list[Line], warnings: list) -> list[ParsedItem]:
    """Member | # | Book Title | Author(s) (Feb 2026). Columns by header offsets; a member's name is only on their first row."""
    hdr = next(l.text for l in lines[:14] if re.search(r"\bMember\b", l.text) and "Title" in l.text)
    c_num, c_title, c_auth = hdr.index("#"), re.search(r"Book\s*Title", hdr).start(), hdr.index("Author")
    items, member, cur = [], None, None
    for ln in lines:
        s = ln.text
        num = s[c_num:c_title].strip() if len(s) > c_num else ""
        if re.fullmatch(r"\d{1,3}", num):
            member = s[:c_num].strip() or member
            cur = ParsedItem("member", member, ln.page, ln.no, ln.no, s.strip(), s[c_title:c_auth].strip(), author=s[c_auth:].strip() or None)
            items.append(cur)
        elif cur is not None and len(s) > c_title and not s[:c_title].strip():
            et, ea = s[c_title:c_auth].strip(), s[c_auth:].strip()
            cur.title = (cur.title + " " + et).strip() if et else cur.title
            cur.author = ((cur.author or "") + " " + ea).strip() if ea else cur.author
            cur.line_to = ln.no
    for it in items:
        m = re.search(r"\(?translator:\s*([^)]+)\)?", it.author or "", re.I)
        if m:
            it.translator, it.author = m.group(1).strip(), re.sub(r"\(?translator:[^)]+\)?", "", it.author, flags=re.I).strip() or None
    return [it for it in items if it.title]


_RE_DASH = re.compile(r"^(.+?)\s+[-–]\s+([A-Z][\w.’' ]+(?:,? (?:and|&) [A-Z][\w.’' ]+)?)$")


def _dash_file(items: list[ParsedItem]) -> bool:
    """True when most items read 'Title - Author' (Mar 2025): then the dash separates title from author."""
    hits = sum(1 for it in items if _RE_DASH.match(it.raw) and len(_RE_DASH.match(it.raw).group(2).split()) <= 5)
    return len(items) >= 6 and hits / len(items) >= 0.6


def _finish(items: list[ParsedItem]) -> list[ParsedItem]:
    out = []
    dash = _dash_file(items)
    for it in items:
        if not it.raw:
            continue
        if dash and _RE_DASH.match(it.raw):
            m = _RE_DASH.match(it.raw)
            it.raw = f"{m.group(1)}, by {m.group(2)}"
        p = split_title_author(it.raw)
        mb = re.match(r"^(books|works|novels|stories) by (.+)$", it.raw.strip(), re.I)
        if mb:
            who = re.sub(r"\s*\(.*$", "", mb.group(2)).strip()
            p["title"], p["author"] = f"{mb.group(1).title()} by {who}", who
        it.title, it.author, it.translator, it.media_hint = p["title"], p["author"] or it.author, p["translator"], p["media"]
        cue = re.match(r"^(series|movie|film|tv|show)\s*[,;]\s*(.+)$", it.author or "", re.I)
        if cue:
            it.author = cue.group(2).strip()
            if cue.group(1).lower() == "series":
                it.flags.append("series")
            else:
                it.media_hint = it.media_hint or ("tv_series" if cue.group(1).lower() in ("tv", "show") else "movie")
        if "magazine" in it.flags:
            it.media_hint = it.media_hint or "article"
        if not dash and " - " in it.title:
            it.flags.append("dash in title: title/author split uncertain")
        if (len(it.title) < 3 and not re.fullmatch(r"\d+|IT|Is", it.title)) or it.title.lower() in ("the", "a", "an", "of", "and"):
            it.flags.append("fragment")
        out.append(it)
    return out


def parse_roman_table(lines: list[Line], warnings: list) -> list[ParsedItem]:
    """'I   Anindita   1   Title   Author' rows (May 2026). The header is repeated on every page and its columns move from page to page,
    so each row is cut at the offsets of the header above it. A member's name is on their first row only; 'GENERAL DISCUSSION BOOKS'
    starts a member-less group. The ChatGPT summary above the table is prose and is ignored."""
    items, member, section, cur = [], None, "member", None
    c_title = c_auth = None
    left = re.compile(r"^\s*(?:([IVXL]+)\s+(.+?)\s+)?(\d{1,3})\s+(?=\S)")
    for ln in lines:
        t = ln.text
        if re.search(r"\bMember\b.*\bBook\s*Title\b", t):
            c_title, c_auth = re.search(r"Book\s*Title", t).start(), re.search(r"Author", t).start()
            continue
        if c_title is None:
            continue
        if re.search(r"(?i)general discussion", t):
            section, member, cur = "general", None, None
            continue
        m = left.match(t)
        if m and m.end() <= c_title + 4:
            if m.group(2):
                member = m.group(2).strip()
            tpos = m.end()
            title, author = t[tpos:max(tpos, c_auth - 1)].strip(), t[c_auth - 1:].strip() if len(t) > c_auth else ""
            if not author or (t[c_auth - 1:c_auth + 1].strip() and not t[c_auth - 2:c_auth].isspace()):   # columns do not line up: cut at the 2+ space gap
                parts = re.split(r"\s{2,}", t[tpos:].strip())
                title, author = parts[0], parts[-1] if len(parts) > 1 else ""
            cur = ParsedItem(section, member if section == "member" else None, ln.page, ln.no, ln.no, t.strip(), title, author=author or None)
            items.append(cur)
        elif cur is not None and t.strip() and (len(t) - len(t.lstrip())) > 5 and not re.match(r"^\s*(page|noted by)", t, re.I):
            start = len(t) - len(t.lstrip())
            if start >= (c_title + c_auth) // 2:                 # nearer the author column than the title column
                cur.author = ((cur.author or "") + " " + t.strip()).strip()
            else:
                cur.title = (cur.title + " " + t.strip()).strip()
            cur.line_to = ln.no
    for it in items:
        it.raw = it.title
    return items


def parse_author_interaction(lines: list[Line], warnings: list) -> list[ParsedItem]:
    """An author visit (#99): the author's own books, general-discussion lists, then one UPPER-CASE name per member with their books.
    Items are 'Title (Author)' lines; '(series, X)' and '(movie)' are cues."""
    guest = None
    for l in lines[:14]:
        m = re.match(r"^with\s+(.+)$", l.text.strip(), re.I)
        if m:
            guest = m.group(1).strip()
    items, section, heading = [], None, None
    for ln in lines:
        t = ln.text.strip()
        up = t.upper()
        if up.startswith("THE BROKE BIBLIOPHILES") or up.startswith("THANK YOU"):
            break
        if up == "AUTHOR INTERACTION" or up.startswith("BROKE") or up in ("BIBLIOPHILES", "BANGALORE") \
                or re.match(r"(?i)^(meetup #|\d+\w* \w+ \d{4}|@the|with |author of)", t):
            continue
        if up.endswith("'S BOOKS"):
            section, heading = "author_discussion", guest
            continue
        if up in ("RECENT", "FAVORITES", "FAVOURITES"):
            continue
        if up.startswith("GENERAL DISCUSSION") or up.startswith("MENTIONS"):
            section, heading = "general", None
            continue
        if t == up and re.fullmatch(r"[A-Z][A-Z .]+", t) and len(t.split()) <= 3:        # a member's name
            section, heading = "member", t
            continue
        if section and t:
            items.append(ParsedItem(section, heading, ln.page, ln.no, ln.no, t, t))
    return _finish(items)


def parse_name_colon(lines: list[Line], warnings: list) -> list[ParsedItem]:
    """'NAME: Title - Author' lines, or 'NAME:' followed by 'o Title - Author' sub-bullets (BYOB crossover, Nov 2023)."""
    items, heading = [], None
    head = re.compile(r"^\s*[•●∙·-]?\s*([A-Z][A-Z .]+?)\s*[:\-–]\s*(.*)$")
    for ln in lines:
        t = ln.text.strip()
        m = head.match(ln.text)
        sub = re.match(r"^\s*[o○◦]\s+(.+)$", ln.text)
        if sub and heading:
            items.append(ParsedItem("member", heading, ln.page, ln.no, ln.no, sub.group(1).strip(), sub.group(1).strip()))
        elif m and not META_WORDS.search(m.group(1)) and len(m.group(1)) >= 3:
            heading = m.group(1).strip()
            if m.group(2).strip():
                items.append(ParsedItem("member", heading, ln.page, ln.no, ln.no, m.group(2).strip(), m.group(2).strip()))
        elif items and heading and ln.indent > 8 and t and not re.match(r"^[•●∙·o-]\s", t):
            items[-1].raw = (items[-1].raw + " " + t).strip(); items[-1].title = items[-1].raw; items[-1].line_to = ln.no
    for it in items:                                           # 'Title - Author' or 'Title- Author': the LAST dash before a capital separates the author
        mag = re.search(r"\s*\[([^\]]*magazine[^\]]*)\]\s*$", it.raw, re.I)
        if mag:
            it.raw = it.raw[: mag.start()].strip()
            it.flags.append("magazine")
        m = list(re.finditer(r"\s+[-–]\s+(?=[A-Z])|(?<=[a-z])[-–]\s+(?=[A-Z])", it.raw))
        if m:
            it.raw = f"{it.raw[: m[-1].start()].strip()}, by {it.raw[m[-1].end():].strip()}"
    return _finish(items)


_PARSERS = {"blocks": parse_blocks, "glued_bullets": parse_glued_bullets, "table": parse_table, "member_table": parse_member_table,
            "roman_table": parse_roman_table, "author_interaction": parse_author_interaction, "name_colon": parse_name_colon}


def parse_file(path: str) -> ParsedSource:
    lines, warnings = extract_lines(path)
    layout, conf = detect_layout(lines, warnings)
    if layout == "chat":                                             # headings and items share one indent and some items start at column 0
        warnings.append("layout 'chat': headings and items share one indent, so it is reported only (the repair of #67 was made from the source by hand)")
        return ParsedSource(path, layout, conf, [], warnings, lines)
    if layout.startswith("unsupported"):
        warnings.append(f"layout '{layout}' is not parsed automatically: reported only, nothing guessed")
        return ParsedSource(path, layout, conf, [], warnings, lines)
    return ParsedSource(path, layout, conf, _PARSERS[layout](lines, warnings), warnings, lines)
