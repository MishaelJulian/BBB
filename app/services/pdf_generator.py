import os
import re
import urllib.request
import hashlib
from datetime import date
from collections import defaultdict
from PIL import Image

from reportlab.lib.colors import HexColor, white, black
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Register custom fonts extracted from official Canva templates
FONTS_DIR = os.path.join(os.getcwd(), "assets", "fonts")
SPECIAL_ELITE_PATH = os.path.join(FONTS_DIR, "SpecialElite-Regular.ttf")
ART_NUVO_PATH = os.path.join(FONTS_DIR, "ArtNuvoStamp.ttf")
GLACIAL_PATH = os.path.join(FONTS_DIR, "GlacialIndifference-Regular.ttf")

FONT_SPECIAL_ELITE = "Helvetica-Bold"
FONT_TITLE_STAMP = "Helvetica-Bold"
FONT_BODY = "Helvetica"

if os.path.exists(SPECIAL_ELITE_PATH):
    try:
        pdfmetrics.registerFont(TTFont("SpecialElite", SPECIAL_ELITE_PATH))
        FONT_SPECIAL_ELITE = "SpecialElite"
    except Exception as e:
        print("Failed to register SpecialElite font:", e)

if os.path.exists(ART_NUVO_PATH):
    try:
        pdfmetrics.registerFont(TTFont("ArtNuvoStamp", ART_NUVO_PATH))
        FONT_TITLE_STAMP = "ArtNuvoStamp"
    except Exception as e:
        print("Failed to register ArtNuvoStamp font:", e)

if os.path.exists(GLACIAL_PATH):
    try:
        pdfmetrics.registerFont(TTFont("GlacialIndifference", GLACIAL_PATH))
        FONT_BODY = "GlacialIndifference"
    except Exception as e:
        print("Failed to register GlacialIndifference font:", e)

BG_PARCHMENT = HexColor("#e1d1b9")
BG_CREAM = HexColor("#efe8de")
COLOR_TEXT_MAIN = HexColor("#14130F")
COLOR_AMBER_RULE = HexColor("#22201D")

PAGE_WIDTH = 810.0
PAGE_HEIGHT = 1012.5

COVERS_CACHE_DIR = os.path.join(os.getcwd(), "assets", "cache", "covers")
os.makedirs(COVERS_CACHE_DIR, exist_ok=True)


def download_and_cache_image(url: str) -> str:
    """Download an image from URL and cache locally."""
    if not url:
        return None
    if os.path.exists(url):
        return url
    
    url_hash = hashlib.md5(url.encode("utf-8")).hexdigest()
    cached_path = os.path.join(COVERS_CACHE_DIR, f"{url_hash}.jpg")
    if os.path.exists(cached_path) and os.path.getsize(cached_path) > 100:
        return cached_path

    try:
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
        )
        with urllib.request.urlopen(req, timeout=8) as resp:
            content = resp.read()
            with open(cached_path, "wb") as f:
                f.write(content)
        
        # Verify valid image
        with Image.open(cached_path) as img:
            img.verify()
        return cached_path
    except Exception as e:
        # If download failed, clean up corrupted file if any
        if os.path.exists(cached_path):
            try:
                os.remove(cached_path)
            except Exception:
                pass
        return None


def wrap_text(text: str, max_width: float, font_name: str, font_size: float) -> list:
    """Wrap string into lines that fit within max_width."""
    words = text.split()
    if not words:
        return []
    lines = []
    curr = []
    for w in words:
        trial = " ".join(curr + [w])
        if pdfmetrics.stringWidth(trial, font_name, font_size) <= max_width:
            curr.append(w)
        else:
            if curr:
                lines.append(" ".join(curr))
            curr = [w]
    if curr:
        lines.append(" ".join(curr))
    return lines


def format_meetup_date(d: date) -> str:
    """Format date to '23rd August 2026' or similar friendly string."""
    if not d:
        return "2026"
    day = d.day
    if 4 <= day <= 20 or 24 <= day <= 30:
        suffix = "th"
    else:
        suffix = ["st", "nd", "rd"][day % 10 - 1]
    return d.strftime(f"{day}{suffix} %B %Y")


def draw_centered_text_with_shadow(
    c: canvas.Canvas,
    text: str,
    y: float,
    font_name: str,
    font_size: float,
    text_color=white,
    shadow_color=HexColor("#1A1815"),
    shadow_offset=2.0
):
    """Draw text centered with a subtle drop shadow for readability."""
    c.setFont(font_name, font_size)
    text_w = pdfmetrics.stringWidth(text, font_name, font_size)
    x = (PAGE_WIDTH - text_w) / 2.0
    
    # Shadow
    c.setFillColor(shadow_color)
    c.drawString(x + shadow_offset, y - shadow_offset, text)
    # Foreground
    c.setFillColor(text_color)
    c.drawString(x, y, text)


def generate_meetup_pdf(
    meetup_number: int,
    db,
    output_path: str = None,
    custom_photo_path: str = None
) -> str:
    """
    Generate a full-fidelity PDF magazine for a meetup in the exact Canva style
    of BBB 99 & BBB 98, with book covers, group picture, and reader sections.
    """
    from app.database.models import Meetup, Discussion, CanonicalBook, Author, Member, Venue

    meetup = db.query(Meetup).filter(Meetup.meetup_number == meetup_number).first()
    if not meetup:
        raise ValueError(f"Meetup #{meetup_number} not found in database")

    venue_name = "The Bookworm"
    if meetup.venue_id:
        v = db.query(Venue).filter(Venue.id == meetup.venue_id).first()
        if v and v.name:
            venue_name = v.name

    date_str = format_meetup_date(meetup.date)

    # Fetch and organize discussions
    discussions = db.query(Discussion).filter(Discussion.meetup_id == meetup.id).all()

    # Group by reader
    readers_books = defaultdict(list)
    general_discussion_books = []
    seen_canonical_ids = set()

    for d in discussions:
        if not d.canonical_book_id:
            continue
        book = db.query(CanonicalBook).filter(CanonicalBook.id == d.canonical_book_id).first()
        if not book:
            continue
        author = db.query(Author).filter(Author.id == book.author_id).first() if book.author_id else None
        author_name = author.full_name if author else "Unknown"

        is_gen = bool(
            (d.notes and "general" in d.notes.lower()) or
            (d.topic and "general" in d.topic.lower())
        )

        member_name = None
        if d.member_id:
            m = db.query(Member).filter(Member.id == d.member_id).first()
            if m and m.display_name:
                member_name = m.display_name

        book_info = {
            "title": book.title,
            "author": author_name,
            "cover_url": book.cover_url or book.thumbnail_url,
            "is_general": is_gen,
            "member": member_name,
        }

        if is_gen or not member_name:
            # Check duplicate in general
            if book.id not in seen_canonical_ids:
                seen_canonical_ids.add(book.id)
                general_discussion_books.append(book_info)
        else:
            readers_books[member_name].append(book_info)

    # Ensure output path
    if not output_path:
        os.makedirs(os.path.join(os.getcwd(), "assets", "generated_pdfs"), exist_ok=True)
        output_path = os.path.join(
            os.getcwd(), "assets", "generated_pdfs", f"bbb_meetup_{meetup_number}.pdf"
        )

    c = canvas.Canvas(output_path, pagesize=(PAGE_WIDTH, PAGE_HEIGHT))
    c.setTitle(f"Broke Bibliophiles Bangalore - Meetup #{meetup_number}")
    c.setAuthor("Broke Bibliophiles Bangalore")

    # Template background images
    cover_bg = os.path.join(os.getcwd(), "assets", "templates", "bbb99", "page_1_img_1.jpeg")
    closing_bg = os.path.join(os.getcwd(), "assets", "templates", "bbb99", "page_13_img_1.jpeg")

    # Determine group photo
    group_photo = None
    if custom_photo_path and os.path.exists(custom_photo_path):
        group_photo = custom_photo_path
    elif meetup.photo_url and os.path.exists(meetup.photo_url.lstrip("/")):
        group_photo = meetup.photo_url.lstrip("/")
    elif os.path.exists(os.path.join(os.getcwd(), "assets", "uploads", f"meetup_{meetup_number}_photo.jpg")):
        group_photo = os.path.join(os.getcwd(), "assets", "uploads", f"meetup_{meetup_number}_photo.jpg")
    elif os.path.exists(os.path.join(os.getcwd(), "assets", "templates", "bbb99", "page_12_img_1.jpeg")):
        group_photo = os.path.join(os.getcwd(), "assets", "templates", "bbb99", "page_12_img_1.jpeg")

    # =========================================================================
    # PAGE 1: COVER PAGE
    # =========================================================================
    if os.path.exists(cover_bg):
        c.drawImage(cover_bg, 0, 0, width=PAGE_WIDTH, height=PAGE_HEIGHT)
        # Subtle dark overlay tint so white text pops
        c.setFillColor(HexColor("#000000"))
        c.setFillAlpha(0.28)
        c.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)
        c.setFillAlpha(1.0)
    else:
        c.setFillColor(BG_PARCHMENT)
        c.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)

    # Main Brand Header
    draw_centered_text_with_shadow(c, "BROKE", 790, FONT_SPECIAL_ELITE, 76)
    draw_centered_text_with_shadow(c, "BIBLIOPHILES", 705, FONT_SPECIAL_ELITE, 76)
    draw_centered_text_with_shadow(c, "BANGALORE", 620, FONT_SPECIAL_ELITE, 76)

    # Subtitle Details
    draw_centered_text_with_shadow(c, f"Meetup #{meetup_number}", 260, FONT_SPECIAL_ELITE, 40)
    draw_centered_text_with_shadow(c, date_str, 205, FONT_SPECIAL_ELITE, 30)
    draw_centered_text_with_shadow(c, f"@{venue_name}", 155, FONT_SPECIAL_ELITE, 30)
    c.showPage()

    # =========================================================================
    # HELPER TO DRAW CONTENT BACKGROUND
    # =========================================================================
    def draw_parchment_background():
        c.setFillColor(BG_PARCHMENT)
        c.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)

    def draw_bottom_covers(covers_to_draw):
        """Draw up to 3 book covers side-by-side at the bottom of the page."""
        if not covers_to_draw:
            return
        cover_w = 175.0
        cover_h = 245.0
        y_pos = 45.0
        
        # Calculate horizontal positions for 1, 2, or 3 covers
        n = min(len(covers_to_draw), 3)
        total_w = n * cover_w + (n - 1) * 35.0
        start_x = (PAGE_WIDTH - total_w) / 2.0

        for idx, book_item in enumerate(covers_to_draw[:3]):
            x_pos = start_x + idx * (cover_w + 35.0)
            local_img = download_and_cache_image(book_item.get("cover_url"))

            # Shadow / frame backing
            c.setFillColor(HexColor("#C9B79F"))
            c.rect(x_pos + 3, y_pos - 3, cover_w, cover_h, fill=1, stroke=0)

            if local_img and os.path.exists(local_img):
                try:
                    c.drawImage(local_img, x_pos, y_pos, width=cover_w, height=cover_h)
                    c.setStrokeColor(HexColor("#8C7A65"))
                    c.setLineWidth(1)
                    c.rect(x_pos, y_pos, cover_w, cover_h, fill=0, stroke=1)
                    continue
                except Exception as e:
                    print("Error drawing cover image:", e)

            # Fallback stylized book card
            c.setFillColor(HexColor("#FDFBF7"))
            c.rect(x_pos, y_pos, cover_w, cover_h, fill=1, stroke=0)
            c.setStrokeColor(HexColor("#9C8A75"))
            c.setLineWidth(1)
            c.rect(x_pos, y_pos, cover_w, cover_h, fill=0, stroke=1)
            
            c.setFillColor(COLOR_TEXT_MAIN)
            c.setFont(FONT_SPECIAL_ELITE, 12)
            title_lines = wrap_text(book_item["title"], cover_w - 20, FONT_SPECIAL_ELITE, 12)
            cur_card_y = y_pos + cover_h - 40
            for l in title_lines[:5]:
                c.drawString(x_pos + 10, cur_card_y, l)
                cur_card_y -= 16

            if book_item.get("author"):
                c.setFont(FONT_SPECIAL_ELITE, 10)
                c.setFillColor(HexColor("#555048"))
                c.drawString(x_pos + 10, y_pos + 20, f"by {book_item['author'][:22]}")

    # =========================================================================
    # PAGES 2..N: BOOKS BY READERS
    # =========================================================================
    draw_parchment_background()
    current_y = 930.0
    LEFT_MARGIN = 75.0
    USABLE_WIDTH = PAGE_WIDTH - 2 * LEFT_MARGIN
    BOTTOM_LIMIT = 320.0  # Leave room for 3 bottom covers below y=320

    current_page_covers = []
    book_counter = 1

    # Sort readers alphabetically
    sorted_readers = sorted(readers_books.keys())

    for reader_name in sorted_readers:
        books = readers_books[reader_name]
        
        # Calculate needed height for this reader
        # Header + underline: ~45pt
        # Each book: ~24pt * num_lines
        needed_h = 45.0
        for b in books:
            b_text = f"{book_counter}. {b['title']}, by {b['author']}"
            lines = wrap_text(b_text, USABLE_WIDTH, FONT_SPECIAL_ELITE, 17)
            needed_h += len(lines) * 24.0 + 4.0
        needed_h += 20.0  # margin bottom

        # If it doesn't fit on this page, finish page with covers and start fresh
        if current_y - needed_h < BOTTOM_LIMIT:
            draw_bottom_covers(current_page_covers)
            c.showPage()
            draw_parchment_background()
            current_y = 930.0
            current_page_covers = []

        # Draw Reader Header (Uppercase, SpecialElite font)
        c.setFillColor(COLOR_TEXT_MAIN)
        c.setFont(FONT_SPECIAL_ELITE, 28)
        c.drawString(LEFT_MARGIN, current_y, reader_name.upper())

        # Underline rule beneath reader name
        c.setStrokeColor(COLOR_AMBER_RULE)
        c.setLineWidth(2.2)
        c.line(LEFT_MARGIN, current_y - 6, LEFT_MARGIN + 320.0, current_y - 6)
        current_y -= 38.0

        # Draw books
        c.setFont(FONT_SPECIAL_ELITE, 17)
        for b in books:
            if b.get("cover_url") and len(current_page_covers) < 3:
                current_page_covers.append(b)

            b_text = f"{book_counter}. {b['title']}, by {b['author']}"
            lines = wrap_text(b_text, USABLE_WIDTH, FONT_SPECIAL_ELITE, 17)
            for l in lines:
                c.drawString(LEFT_MARGIN, current_y, l)
                current_y -= 24.0
            current_y -= 4.0
            book_counter += 1

        current_y -= 18.0  # space after reader block

    # Flush covers for the last readers page
    draw_bottom_covers(current_page_covers)
    c.showPage()

    # =========================================================================
    # GENERAL DISCUSSION PAGE
    # =========================================================================
    if general_discussion_books:
        draw_parchment_background()
        current_y = 930.0
        current_page_covers = []

        c.setFillColor(COLOR_TEXT_MAIN)
        c.setFont(FONT_SPECIAL_ELITE, 28)
        c.drawString(LEFT_MARGIN, current_y, "GENERAL DISCUSSION")
        c.setStrokeColor(COLOR_AMBER_RULE)
        c.setLineWidth(2.2)
        c.line(LEFT_MARGIN, current_y - 6, LEFT_MARGIN + 360.0, current_y - 6)
        current_y -= 38.0

        c.setFont(FONT_SPECIAL_ELITE, 16)
        for b in general_discussion_books:
            if b.get("cover_url") and len(current_page_covers) < 3:
                current_page_covers.append(b)

            auth_str = f", by {b['author']}" if b['author'] and b['author'] != 'Unknown' else ""
            b_text = f"• {b['title']}{auth_str}"
            lines = wrap_text(b_text, USABLE_WIDTH, FONT_SPECIAL_ELITE, 16)
            
            if current_y - len(lines) * 22.0 < BOTTOM_LIMIT:
                # Overflow to another page
                draw_bottom_covers(current_page_covers)
                c.showPage()
                draw_parchment_background()
                current_y = 930.0
                current_page_covers = []
                c.setFont(FONT_SPECIAL_ELITE, 16)
                c.setFillColor(COLOR_TEXT_MAIN)

            for l in lines:
                c.drawString(LEFT_MARGIN, current_y, l)
                current_y -= 22.0
            current_y -= 4.0

        draw_bottom_covers(current_page_covers)
        c.showPage()

    # =========================================================================
    # GROUP PICTURE PAGE
    # =========================================================================
    if group_photo and os.path.exists(group_photo):
        draw_parchment_background()

        # Header
        draw_centered_text_with_shadow(
            c, "THE BROKE BIBLIOPHILES", 930, FONT_SPECIAL_ELITE, 36,
            text_color=COLOR_TEXT_MAIN, shadow_color=HexColor("#C9B79F"), shadow_offset=1.5
        )
        draw_centered_text_with_shadow(
            c, f"MEETUP #{meetup_number} @ {venue_name.upper()}", 880, FONT_SPECIAL_ELITE, 24,
            text_color=HexColor("#4A443D"), shadow_color=HexColor("#C9B79F"), shadow_offset=1.0
        )

        # Photo frame
        photo_max_w = 680.0
        photo_max_h = 580.0
        try:
            with Image.open(group_photo) as img:
                orig_w, orig_h = img.size
                ratio = min(photo_max_w / orig_w, photo_max_h / orig_h)
                render_w = orig_w * ratio
                render_h = orig_h * ratio
        except Exception:
            render_w = photo_max_w
            render_h = 480.0

        photo_x = (PAGE_WIDTH - render_w) / 2.0
        photo_y = (PAGE_HEIGHT - render_h) / 2.0 - 20.0

        # White Polaroid-style frame with shadow
        c.setFillColor(HexColor("#B8A58D"))
        c.rect(photo_x - 12 + 4, photo_y - 12 - 4, render_w + 24, render_h + 24, fill=1, stroke=0)
        c.setFillColor(HexColor("#FFFFFF"))
        c.rect(photo_x - 12, photo_y - 12, render_w + 24, render_h + 24, fill=1, stroke=0)
        c.setStrokeColor(HexColor("#DDD6C7"))
        c.setLineWidth(1.5)
        c.rect(photo_x - 12, photo_y - 12, render_w + 24, render_h + 24, fill=0, stroke=1)

        # Draw image
        c.drawImage(group_photo, photo_x, photo_y, width=render_w, height=render_h)

        # Caption
        draw_centered_text_with_shadow(
            c, f"Bangalore Chapter · {date_str}", photo_y - 45, FONT_SPECIAL_ELITE, 18,
            text_color=HexColor("#5A5248"), shadow_color=white, shadow_offset=1.0
        )
        c.showPage()

    # =========================================================================
    # CLOSING / THANK YOU PAGE
    # =========================================================================
    if os.path.exists(closing_bg):
        c.drawImage(closing_bg, 0, 0, width=PAGE_WIDTH, height=PAGE_HEIGHT)
        c.setFillColor(HexColor("#000000"))
        c.setFillAlpha(0.30)
        c.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)
        c.setFillAlpha(1.0)
    else:
        draw_parchment_background()

    draw_centered_text_with_shadow(c, "THANK YOU", 740, FONT_SPECIAL_ELITE, 70)
    draw_centered_text_with_shadow(c, "FOR JOINING US!", 650, FONT_SPECIAL_ELITE, 62)

    draw_centered_text_with_shadow(c, f"Meetup #{meetup_number}", 260, FONT_SPECIAL_ELITE, 40)
    draw_centered_text_with_shadow(c, date_str, 205, FONT_SPECIAL_ELITE, 30)
    draw_centered_text_with_shadow(c, f"@{venue_name}", 155, FONT_SPECIAL_ELITE, 30)
    c.showPage()

    # Save PDF
    c.save()
    return output_path
