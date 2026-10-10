"""
generate_vinay_guide_pdf.py
---------------------------
Generates a comprehensive, publication-grade editorial PDF walkthrough & admin guide
for Vinay Leo regarding the Busy Bibliophiles Bangalore (BBB) platform.
"""

import os
import sys
from PIL import Image

from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ---------------------------------------------------------
# 1. Colors & Constants
# ---------------------------------------------------------
PAGE_WIDTH, PAGE_HEIGHT = A4  # 595.27 x 841.89 points
MARGIN = 36.0                 # 0.5 inch margins

# Palette
C_DARK        = HexColor("#14130F")  # Espresso / near-black
C_DARK_BG     = HexColor("#1C1917")  # Deep titanium
C_AMBER       = HexColor("#D97706")  # Accent amber / gold
C_AMBER_DEEP  = HexColor("#B45309")  # Deep amber
C_AMBER_LIGHT = HexColor("#F59E0B")  # Light amber
C_CREAM       = HexColor("#FAF7F2")  # Off-white paper
C_CARD_BG     = HexColor("#F7F3EE")  # Warm card background
C_CARD_ALT    = HexColor("#EFE8DE")  # Slightly darker card
C_BORDER      = HexColor("#D8CFC4")  # Subtle border
C_MUTED       = HexColor("#78716C")  # Muted secondary text
C_WHITE       = HexColor("#FFFFFF")
C_GREEN       = HexColor("#059669")  # Success accent
C_GREEN_BG    = HexColor("#EDF7F1")

# ---------------------------------------------------------
# 2. Register Fonts
# ---------------------------------------------------------
FONTS_DIR = os.path.join(os.getcwd(), "assets", "fonts")
SPECIAL_ELITE_PATH = os.path.join(FONTS_DIR, "SpecialElite-Regular.ttf")

FONT_MONO = "Courier-Bold"
FONT_BODY = "Helvetica"
FONT_BODY_BOLD = "Helvetica-Bold"

if os.path.exists(SPECIAL_ELITE_PATH):
    try:
        pdfmetrics.registerFont(TTFont("SpecialElite", SPECIAL_ELITE_PATH))
        FONT_MONO = "SpecialElite"
    except Exception as e:
        print("SpecialElite registration error:", e)

# ---------------------------------------------------------
# 3. Two-Pass Numbered Canvas
# ---------------------------------------------------------
class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_decorations(self, total_pages):
        self.saveState()
        
        # Don't draw running header on cover (Page 1)
        if self._pageNumber > 1:
            # Top Header Line
            self.setStrokeColor(HexColor("#D8CFC4"))
            self.setLineWidth(0.75)
            self.line(MARGIN, PAGE_HEIGHT - 28, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 28)
            
            # Running Header Text
            self.setFont("Helvetica-Bold", 7.5)
            self.setFillColor(HexColor("#B45309"))
            self.drawString(MARGIN, PAGE_HEIGHT - 24, "BUSY BIBLIOPHILES BANGALORE")
            self.setFont("Helvetica", 7.5)
            self.setFillColor(HexColor("#78716C"))
            self.drawString(MARGIN + 152, PAGE_HEIGHT - 24, "—  The Living Archival Platform & Co-Admin Guide")
            self.drawRightString(PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 24, "PREPARED FOR VINAY LEO")

        # Bottom Footer Line
        self.setStrokeColor(HexColor("#D8CFC4"))
        self.setLineWidth(0.75)
        self.line(MARGIN, 32, PAGE_WIDTH - MARGIN, 32)

        # Footer Text
        self.setFont("Helvetica", 7.5)
        self.setFillColor(HexColor("#78716C"))
        self.drawString(MARGIN, 22, "BBB Digital Platform  •  https://bbb-library.vercel.app  •  Official Archival Document")
        self.drawRightString(PAGE_WIDTH - MARGIN, 22, f"Page {self._pageNumber} of {total_pages}")
        
        self.restoreState()

# ---------------------------------------------------------
# 4. Helper Styles
# ---------------------------------------------------------
def setup_styles():
    styles = {
        'CoverSuper': ParagraphStyle(
            'CoverSuper',
            fontName=FONT_MONO,
            fontSize=9.5,
            leading=12,
            textColor=C_AMBER,
            spaceAfter=6
        ),
        'CoverTitle': ParagraphStyle(
            'CoverTitle',
            fontName='Times-Bold',
            fontSize=27,
            leading=31,
            textColor=C_DARK,
            spaceAfter=8
        ),
        'CoverSub': ParagraphStyle(
            'CoverSub',
            fontName='Times-Italic',
            fontSize=12.5,
            leading=16,
            textColor=HexColor("#44403C"),
            spaceAfter=12
        ),
        'SectionTitle': ParagraphStyle(
            'SectionTitle',
            fontName='Times-Bold',
            fontSize=17,
            leading=21,
            textColor=C_DARK,
            spaceAfter=4
        ),
        'SectionSuper': ParagraphStyle(
            'SectionSuper',
            fontName=FONT_MONO,
            fontSize=8,
            leading=10,
            textColor=C_AMBER_DEEP,
            spaceAfter=4
        ),
        'H2': ParagraphStyle(
            'H2',
            fontName='Helvetica-Bold',
            fontSize=11,
            leading=15,
            textColor=C_DARK,
            spaceAfter=4
        ),
        'H3': ParagraphStyle(
            'H3',
            fontName='Helvetica-Bold',
            fontSize=9.5,
            leading=13,
            textColor=C_AMBER_DEEP,
            spaceAfter=3
        ),
        'Body': ParagraphStyle(
            'Body',
            fontName=FONT_BODY,
            fontSize=9,
            leading=13,
            textColor=HexColor("#292524"),
            spaceAfter=6
        ),
        'BodyLarge': ParagraphStyle(
            'BodyLarge',
            fontName=FONT_BODY,
            fontSize=9.5,
            leading=14,
            textColor=HexColor("#292524"),
            spaceAfter=6
        ),
        'BodyBold': ParagraphStyle(
            'BodyBold',
            fontName=FONT_BODY_BOLD,
            fontSize=9,
            leading=13,
            textColor=C_DARK,
            spaceAfter=4
        ),
        'BodySmall': ParagraphStyle(
            'BodySmall',
            fontName=FONT_BODY,
            fontSize=8,
            leading=11.5,
            textColor=HexColor("#44403C"),
            spaceAfter=3
        ),
        'BulletSmall': ParagraphStyle(
            'BulletSmall',
            fontName=FONT_BODY,
            fontSize=8,
            leading=11.5,
            textColor=HexColor("#292524"),
            leftIndent=10,
            firstLineIndent=-10,
            spaceAfter=3
        ),
        'CalloutText': ParagraphStyle(
            'CalloutText',
            fontName='Times-Italic',
            fontSize=9.5,
            leading=14,
            textColor=HexColor("#1C1917")
        ),
        'TableHeader': ParagraphStyle(
            'TableHeader',
            fontName='Helvetica-Bold',
            fontSize=8,
            leading=10.5,
            textColor=C_WHITE,
            alignment=1
        ),
        'TableCell': ParagraphStyle(
            'TableCell',
            fontName=FONT_BODY,
            fontSize=8,
            leading=11,
            textColor=HexColor("#1C1917")
        ),
        'TableCellBold': ParagraphStyle(
            'TableCellBold',
            fontName=FONT_BODY_BOLD,
            fontSize=8,
            leading=11,
            textColor=C_DARK
        ),
        'BadgeText': ParagraphStyle(
            'BadgeText',
            fontName=FONT_MONO,
            fontSize=8,
            leading=10,
            textColor=C_AMBER_DEEP,
            alignment=1
        ),
        'StatNumber': ParagraphStyle(
            'StatNumber',
            fontName='Times-Bold',
            fontSize=22,
            leading=24,
            textColor=C_AMBER_DEEP,
            alignment=1
        ),
        'StatLabel': ParagraphStyle(
            'StatLabel',
            fontName=FONT_MONO,
            fontSize=7,
            leading=8.5,
            textColor=HexColor("#78716C"),
            alignment=1
        ),
    }
    return styles

# ---------------------------------------------------------
# 5. Build Flowables
# ---------------------------------------------------------
def build_pdf(output_filename="BBB_Admin_Platform_Guide_Vinay.pdf"):
    doc = SimpleDocTemplate(
        output_filename,
        pagesize=A4,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=MARGIN,
        bottomMargin=MARGIN
    )

    styles = setup_styles()
    story = []
    avail_w = PAGE_WIDTH - 2 * MARGIN  # 523.27 pt

    # =========================================================================
    # PAGE 1: COVER & EXECUTIVE VISION (WELCOME VINAY LEO)
    # =========================================================================
    story.append(Paragraph("CRITERION ARCHIVAL SERIES  •  EXECUTIVE BRIEFING  •  VOLUME 01", styles['CoverSuper']))
    story.append(Paragraph("The Living Library of Busy Bibliophiles Bangalore", styles['CoverTitle']))
    story.append(Paragraph("A Comprehensive Digital Architecture, Feature Walkthrough, & Co-Admin Operations Guide", styles['CoverSub']))
    story.append(HRFlowable(width="100%", thickness=1.5, color=C_AMBER, spaceBefore=2, spaceAfter=12))

    # Spotlight Box for Vinay
    vinay_spotlight_content = [
        [
            Paragraph("<b>DEDICATED CO-ADMIN BRIEFING FOR VINAY LEO</b>", styles['BadgeText'])
        ],
        [
            Paragraph(
                "Vinay, you have been one of the foundational intellectual pillars of Busy Bibliophiles Bangalore. "
                "Across our history, you have personally introduced and discussed <b>51 books</b> across <b>23 meetups</b>. "
                "As the club crosses the monumental threshold of <b>100 meetups</b> and thousands of shared literary hours, "
                "we have built a bespoke, living digital library to honor our community's memory. This document is your complete "
                "guide to the platform you are being invited to co-administer.",
                styles['CalloutText']
            )
        ]
    ]
    t_vinay = Table(vinay_spotlight_content, colWidths=[avail_w - 24])
    t_vinay.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), C_CARD_BG),
        ('BOX', (0,0), (-1,-1), 1.2, C_AMBER),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 9),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
        ('ALIGN', (0,0), (-1,0), 'CENTER'),
        ('BOTTOMPADDING', (0,0), (-1,0), 4),
    ]))
    story.append(t_vinay)
    story.append(Spacer(1, 14))

    # Core Stats Row
    stats_data = [
        [
            Paragraph("100+", styles['StatNumber']),
            Paragraph("1,200+", styles['StatNumber']),
            Paragraph("85+", styles['StatNumber']),
            Paragraph("51", styles['StatNumber']),
        ],
        [
            Paragraph("MEETUPS ARCHIVED", styles['StatLabel']),
            Paragraph("BOOKS DISCUSSED", styles['StatLabel']),
            Paragraph("ACTIVE READERS", styles['StatLabel']),
            Paragraph("VINAY'S BOOKS", styles['StatLabel']),
        ]
    ]
    t_stats = Table(stats_data, colWidths=[avail_w / 4.0] * 4)
    t_stats.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), C_CARD_ALT),
        ('BOX', (0,0), (-1,-1), 0.75, C_BORDER),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LINEAFTER', (0,0), (2,-1), 0.5, C_BORDER),
    ]))
    story.append(t_stats)
    story.append(Spacer(1, 14))

    # Executive Overview
    story.append(Paragraph("THE VISION: PRESERVING OUR LITERARY HERITAGE", styles['H2']))
    story.append(Paragraph(
        "Busy Bibliophiles Bangalore is not an ordinary weekend meetup; it is an enduring community of deep thinkers, "
        "critics, and passionate readers. Over the past three years, members have brought everything from obscure Soviet science fiction "
        "to post-colonial histories, classic plays, economics, and contemporary poetry. Yet for years, the club's intellectual legacy "
        "remained trapped in disjointed WhatsApp chats, scattered notes, or ephemeral Canva posters that vanished into group media feeds.",
        styles['Body']
    ))
    story.append(Paragraph(
        "<b>The BBB Platform solves this permanently.</b> It provides a living, interactive, 3D digital home that records not just <i>what</i> "
        "was read, but <i>who</i> brought it, what was argued, which edition sat on the table at Bookworm, and how reading tastes have evolved. "
        "Best of all, it turns the grueling weekly chore of admin logging into an effortless 60-second joy.",
        styles['Body']
    ))
    story.append(Spacer(1, 10))

    # 4 Core Pillars Grid
    pillars_data = [
        [
            Paragraph("<b>1. The 3D Book Closet</b><br/>A tactile virtual library room where every book has a physical leather spine and spine number.", styles['TableCell']),
            Paragraph("<b>2. Archival Reader Dossiers</b><br/>Every member gets an interactive career portfolio documenting their full reading bibliography.", styles['TableCell']),
        ],
        [
            Paragraph("<b>3. 1-Click Publishing</b><br/>Generates publication-quality, Criterion-style commemorative PDF magazines with one tap.", styles['TableCell']),
            Paragraph("<b>4. 60-Second Admin Cockpit</b><br/>Automatic Goodreads cover & synopsis fetching, fuzzy book search, and instant cloud sync.", styles['TableCell']),
        ]
    ]
    t_pillars = Table(pillars_data, colWidths=[avail_w / 2.0 - 4, avail_w / 2.0 - 4])
    t_pillars.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), C_CARD_BG),
        ('BOX', (0,0), (-1,-1), 0.75, C_BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.5, C_BORDER),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(t_pillars)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 2: WHY IT'S NOT A NORMAL ORDINARY LOGGING SITE
    # =========================================================================
    story.append(Paragraph("PHILOSOPHY & ARCHITECTURE", styles['SectionSuper']))
    story.append(Paragraph("Why BBB is Not a Normal Ordinary Logging Site", styles['SectionTitle']))
    story.append(HRFlowable(width="100%", thickness=1, color=C_BORDER, spaceBefore=2, spaceAfter=12))

    story.append(Paragraph(
        "When people hear 'book club logging site,' they instinctively picture sterile checklists: a Goodreads profile, "
        "a Notion table, a StoryGraph feed, or an Excel spreadsheet. These tools are fundamentally designed for individual consumption "
        "tracking. They fail completely when applied to the rich, interpersonal culture of a literary salon like BBB.",
        styles['BodyLarge']
    ))
    story.append(Spacer(1, 8))

    # 3 Distinct Philosophical Pillars
    p1 = [
        [Paragraph("<b>PILLAR I: RELATIONAL MEMORY VS. ISOLATED DATA ROWS</b>", styles['H3'])],
        [Paragraph(
            "On Goodreads or StoryGraph, a book is just an isolated ISBN number in a database. In BBB, a book is defined by its "
            "<b>social encounter</b>. The platform captures the human fabric of every session:<br/>"
            "• <b>Who introduced the book?</b> Vinay Leo introduced Stanislaw Lem's <i>Solaris</i> at Meetup #100, while Darshan brought Calvino.<br/>"
            "• <b>What was the room's reaction?</b> Notes record whether it was a fiery debate, an instant recommendation, or a provocative detour.<br/>"
            "• <b>Community Context:</b> What other titles were on the table at Bookworm on that same morning? How did they contrast?<br/>"
            "Every book in BBB links bidirectionally to its discussant, its meetup number, its physical spine, and its archival magazine.",
            styles['Body']
        )]
    ]
    t_p1 = Table(p1, colWidths=[avail_w])
    t_p1.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), C_CARD_BG),
        ('BOX', (0,0), (-1,-1), 0.75, C_BORDER),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_p1)
    story.append(Spacer(1, 12))

    p2 = [
        [Paragraph("<b>PILLAR II: TACTILE SPATIAL METAPHOR (THE 3D CRITERION CLOSET)</b>", styles['H3'])],
        [Paragraph(
            "Ordinary websites display boring vertical lists of text. BBB models a <b>living, physical library room</b> inspired "
            "by the iconic Criterion Collection closet. Books are physically bound in textured leather spines across Left, Main, and Right Wings. "
            "Each book receives a permanent spine number (e.g., #691 for <i>Solaris</i>). Readers can browse shelves in 3D, pull a volume off the shelf, "
            "rotate it in real-time, inspect high-res cover typography, read rich synopses, and jump straight to Amazon India or Goodreads.",
            styles['Body']
        )]
    ]
    t_p2 = Table(p2, colWidths=[avail_w])
    t_p2.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), C_CARD_BG),
        ('BOX', (0,0), (-1,-1), 0.75, C_BORDER),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_p2)
    story.append(Spacer(1, 12))

    p3 = [
        [Paragraph("<b>PILLAR III: AUTOMATED LIVING PUBLICATION ENGINE</b>", styles['H3'])],
        [Paragraph(
            "Ordinary websites store data passively. BBB is an active <b>publishing pipeline</b>. With a single click, the system "
            "typesets and compiles full-bleed, publication-grade commemorative zines and magazines. These are not basic data printouts; "
            "they are beautifully designed editorial artifacts featuring custom typefaces, book cover mosaics, attendee rosters, "
            "and meetup highlights that look like they came from a boutique art press.",
            styles['Body']
        )]
    ]
    t_p3 = Table(p3, colWidths=[avail_w])
    t_p3.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), C_CARD_BG),
        ('BOX', (0,0), (-1,-1), 0.75, C_BORDER),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_p3)
    story.append(Spacer(1, 16))

    # Quote Callout
    quote_data = [
        [Paragraph(
            "<i>“A book club is not a database. It is a long, multi-year conversation between curious minds. "
            "The platform exists to ensure that not a single word, debate, or beloved recommendation is ever lost to time.”</i>",
            styles['CalloutText']
        )]
    ]
    t_quote = Table(quote_data, colWidths=[avail_w])
    t_quote.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), C_CARD_ALT),
        ('LINELEFT', (0,0), (-1,-1), 3.5, C_AMBER_DEEP),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
        ('LEFTPADDING', (0,0), (-1,-1), 14),
        ('RIGHTPADDING', (0,0), (-1,-1), 14),
    ]))
    story.append(t_quote)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 3: THE LOGGING REVOLUTION (NOTEBOOK VS WORD VS CANVA VS BBB)
    # =========================================================================
    story.append(Paragraph("OPERATIONAL EFFICIENCY", styles['SectionSuper']))
    story.append(Paragraph("The Logging Revolution: Eliminating Administrative Friction", styles['SectionTitle']))
    story.append(HRFlowable(width="100%", thickness=1, color=C_BORDER, spaceBefore=2, spaceAfter=10))

    story.append(Paragraph(
        "Vinay, every club admin knows the dread of Sunday afternoon post-meetup chores. Over the years, clubs experiment with three "
        "manual methods—each bringing severe pain, wasted hours, and data decay. Here is how BBB completely transforms that workflow.",
        styles['Body']
    ))
    story.append(Spacer(1, 6))

    # Detailed Comparison Table
    col_w = [95, 100, 105, 105, 118]
    table_data = [
        [
            Paragraph("DIMENSION", styles['TableHeader']),
            Paragraph("PHYSICAL NOTEBOOK", styles['TableHeader']),
            Paragraph("WORD / GOOGLE DOC", styles['TableHeader']),
            Paragraph("CANVA MANUAL DESIGN", styles['TableHeader']),
            Paragraph("BBB PLATFORM", styles['TableHeader']),
        ],
        [
            Paragraph("<b>Logging Time</b>", styles['TableCellBold']),
            Paragraph("45–60 min scribbling during meetup", styles['TableCell']),
            Paragraph("60–90 min typing & reformatting", styles['TableCell']),
            Paragraph("<b>120–240 minutes!</b> Agonizing graphic alignment", styles['TableCell']),
            Paragraph("<font color='#059669'><b>Under 5 minutes!</b></font> Instant autocomplete", styles['TableCell']),
        ],
        [
            Paragraph("<b>Book Covers & Art</b>", styles['TableCellBold']),
            Paragraph("Zero. Impossible to attach.", styles['TableCell']),
            Paragraph("Manual copy-paste, ruins layout", styles['TableCell']),
            Paragraph("Google image search, crop, upload, align by hand", styles['TableCell']),
            Paragraph("<font color='#059669'><b>100% Automated.</b></font> Instant high-res fetch", styles['TableCell']),
        ],
        [
            Paragraph("<b>Search & Recall</b>", styles['TableCellBold']),
            Paragraph("Flipping through dog-eared paper pages", styles['TableCell']),
            Paragraph("Ctrl+F inside single document only", styles['TableCell']),
            Paragraph("Zero. Text trapped inside flat PNG/JPG images", styles['TableCell']),
            Paragraph("<font color='#059669'><b>Instant Fuzzy Search</b></font> by title, author, reader", styles['TableCell']),
        ],
        [
            Paragraph("<b>Reader Dossiers</b>", styles['TableCellBold']),
            Paragraph("None. Unindexed handwriting.", styles['TableCell']),
            Paragraph("None. Just disconnected bullet points.", styles['TableCell']),
            Paragraph("None. Only names printed on slides.", styles['TableCell']),
            Paragraph("<font color='#059669'><b>Automatic Portfolios</b></font> for every discussant", styles['TableCell']),
        ],
        [
            Paragraph("<b>Publishing Output</b>", styles['TableCellBold']),
            Paragraph("None. Stays on admin's shelf.", styles['TableCell']),
            Paragraph("Boring, sterile wall of black & white text", styles['TableCell']),
            Paragraph("Pretty, but takes hours of Sunday fatigue", styles['TableCell']),
            Paragraph("<font color='#059669'><b>1-Click Criterion Zine</b></font> ready in 2 seconds", styles['TableCell']),
        ],
        [
            Paragraph("<b>Durability & Backup</b>", styles['TableCellBold']),
            Paragraph("Coffee spills, fire, loss = lost forever", styles['TableCell']),
            Paragraph("Lost in disorganized Google Drive folders", styles['TableCell']),
            Paragraph("Scattered across Canva team accounts", styles['TableCell']),
            Paragraph("<font color='#059669'><b>Enterprise Supabase DB</b></font> cloud-backed forever", styles['TableCell']),
        ],
    ]
    t_comp = Table(table_data, colWidths=col_w)
    t_comp.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), C_DARK),
        ('BACKGROUND', (4,1), (4,-1), C_GREEN_BG),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.5, C_BORDER),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t_comp)
    story.append(Spacer(1, 10))

    # The Canva Trap Breakdown Box
    canva_trap = [
        [Paragraph("<b>THE CANVA TRAP: WHY WE HAD TO MOVE BEYOND MANUAL GRAPHICS</b>", styles['H3'])],
        [Paragraph(
            "Canva is wonderful for single social posts, but as a book club archivist's tool, it is an exhausting trap. "
            "For every 15-book meetup, an admin had to: (1) look up 15 high-res book covers on Google, (2) download each image, "
            "(3) upload 15 files to Canva, (4) manually drag and scale each book into a frame, (5) copy-paste authors and titles, "
            "(6) fix font sizes when titles ran long, and (7) export. If a typo occurred, the entire export cycle had to be redone.<br/>"
            "Most tragically, <b>Canva produces dead pixels</b>. You cannot search a Canva poster to find what Vinay recommended in 2024, "
            "nor can you calculate reading statistics. <b>The BBB platform automates all 7 steps into one single button press.</b>",
            styles['Body']
        )]
    ]
    t_canva = Table(canva_trap, colWidths=[avail_w])
    t_canva.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), C_CARD_BG),
        ('BOX', (0,0), (-1,-1), 0.75, C_BORDER),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('TOPPADDING', (0,0), (-1,-1), 7),
        ('BOTTOMPADDING', (0,0), (-1,-1), 7),
    ]))
    story.append(t_canva)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 4: THE MOBILE EXPERIENCE: 3D CLOSET & READERS ARCHIVE
    # =========================================================================
    story.append(Paragraph("THE READER EXPERIENCE ON MOBILE", styles['SectionSuper']))
    story.append(Paragraph("The 3D Criterion Book Closet & The Readers Archive", styles['SectionTitle']))
    story.append(HRFlowable(width="100%", thickness=1, color=C_BORDER, spaceBefore=2, spaceAfter=8))

    story.append(Paragraph(
        "Members experience BBB directly on their mobile phones while sitting in the circle at Bookworm. "
        "The interface is designed with a dark, cinematic Criterion palette that looks stunning on modern smartphone screens.",
        styles['Body']
    ))
    story.append(Spacer(1, 4))

    # Feature 1 Showcase: The 3D Closet
    closet_img_path = "assets/mockup_closet.png"
    closet_rl_img = RLImage(closet_img_path, width=130, height=275) if os.path.exists(closet_img_path) else Paragraph("[Closet Mockup]", styles['Body'])

    closet_text = [
        Paragraph("<b>FEATURE 1: THE 3D CRITERION CLOSET</b>", styles['H3']),
        Paragraph("<b>What it does:</b> A tactile virtual library room that holds BBB's entire history.", styles['BodySmall']),
        Paragraph("• <b>Physical Shelf Navigation:</b> Browse across Left Wing (1), Main Wing (2), and Right Wing (3) or filter by Shelves 1–3.", styles['BulletSmall']),
        Paragraph("• <b>Leather Spine Realism:</b> Each book is bound in rich leather textures with spine typography and permanent spine ID numbers (e.g. #691).", styles['BulletSmall']),
        Paragraph("• <b>Real-Time Search:</b> Instant client-side search by title, author, or spine number.", styles['BulletSmall']),
        Paragraph("• <b>3D Book Inspection:</b> Tapping any volume pulls it out into a 3D rotating display with full synopsis, page count, discussant badge, and 1-tap Amazon India & Goodreads links.", styles['BulletSmall']),
        Paragraph("• <b>Closet Picks:</b> Readers can bookmark favorite volumes to their personal closet picks.", styles['BulletSmall']),
        Paragraph("<b>How to use it:</b> Simply navigate to <i>bbb-library.vercel.app</i> on any phone. Use the wing buttons to switch shelves, or tap 'List' for high-speed linear browsing.", styles['BodySmall'])
    ]

    t_feat1 = Table([[closet_rl_img, closet_text]], colWidths=[140, avail_w - 140])
    t_feat1.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    story.append(t_feat1)
    story.append(Spacer(1, 10))

    # Feature 2 Showcase: The Readers Archive
    members_img_path = "assets/mockup_members.png"
    members_rl_img = RLImage(members_img_path, width=130, height=275) if os.path.exists(members_img_path) else Paragraph("[Members Mockup]", styles['Body'])

    members_text = [
        Paragraph("<b>FEATURE 2: THE READERS ARCHIVE</b>", styles['H3']),
        Paragraph("<b>What it does:</b> The living hall of fame of all BBB members, discussants, and regulars.", styles['BodySmall']),
        Paragraph("• <b>Comprehensive Directory:</b> Lists all active club members with their total books discussed and meetups attended.", styles['BulletSmall']),
        Paragraph("• <b>Real-Time Filter & Search:</b> Search any reader by name, or sort instantly by 'Most Books Discussed' or 'Most Meetups Attended'.", styles['BulletSmall']),
        Paragraph("• <b>Visual Cover Previews:</b> Every reader card displays a preview row of book covers they brought to recent sessions.", styles['BulletSmall']),
        Paragraph("• <b>Zero-Lag Performance:</b> Optimized with batch database queries and client sessionStorage caching for instantaneous navigation.", styles['BulletSmall']),
        Paragraph("<b>How to use it:</b> Tap 'Readers Archive' in the top navigation. Search any name to explore their reading trajectory over the club's history.", styles['BodySmall'])
    ]

    t_feat2 = Table([[members_text, members_rl_img]], colWidths=[avail_w - 140, 140])
    t_feat2.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    story.append(t_feat2)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 5: VINAY LEO'S ARCHIVAL DOSSIER & MEETUP ARCHIVING
    # =========================================================================
    story.append(Paragraph("COMMUNITY MEMORY & PUBLISHING", styles['SectionSuper']))
    story.append(Paragraph("Archival Reader Dossiers & 1-Click Publishing", styles['SectionTitle']))
    story.append(HRFlowable(width="100%", thickness=1, color=C_BORDER, spaceBefore=2, spaceAfter=8))

    story.append(Paragraph(
        "Two features represent the crown jewels of the BBB platform: personalized intellectual dossiers for members, "
        "and our 1-click magazine publishing pipeline. Here is how they appear live on mobile devices today.",
        styles['Body']
    ))
    story.append(Spacer(1, 4))

    # Showcase 3: Vinay's Dossier
    vinay_img_path = "assets/mockup_vinay.png"
    vinay_rl_img = RLImage(vinay_img_path, width=130, height=275) if os.path.exists(vinay_img_path) else Paragraph("[Vinay Dossier]", styles['Body'])

    vinay_text = [
        Paragraph("<b>FEATURE 3: VINAY LEO'S ARCHIVAL DOSSIER</b>", styles['H3']),
        Paragraph("<b>Live URL:</b> <i>bbb-library.vercel.app/members/Vinay%20Leo</i>", styles['BodySmall']),
        Paragraph("• <b>Permanent Recognition:</b> Displays your exact official club milestone: <b>51 books discussed across 23 meetups</b>.", styles['BulletSmall']),
        Paragraph("• <b>Activity Span:</b> Records your first documented session (October 1, 2023) through your latest discussions.", styles['BulletSmall']),
        Paragraph("• <b>Chronological Bibliography:</b> Every single book you brought is preserved with high-res cover art, author name, and the specific meetup number where it was presented.", styles['BulletSmall']),
        Paragraph("• <b>Spine Locator:</b> Allows members to locate where each of your books sits in the physical 3D closet.", styles['BulletSmall']),
        Paragraph("• <b>Club Legacy:</b> New members can study your profile to discover literary recommendations spanning fiction, philosophy, and history.", styles['BulletSmall']),
        Paragraph("<b>How it works:</b> As admin, whenever you assign a book to 'Vinay Leo', his dossier updates automatically in the cloud. No manual portfolio maintenance required!", styles['BodySmall'])
    ]

    t_feat3 = Table([[vinay_rl_img, vinay_text]], colWidths=[140, avail_w - 140])
    t_feat3.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    story.append(t_feat3)
    story.append(Spacer(1, 10))

    # Showcase 4: Meetup Archiving & 1-Click PDF
    m99_img_path = "assets/mockup_meetup99.png"
    m99_rl_img = RLImage(m99_img_path, width=130, height=275) if os.path.exists(m99_img_path) else Paragraph("[Meetup 99 Mockup]", styles['Body'])

    m99_text = [
        Paragraph("<b>FEATURE 4: MEETUP ARCHIVES & 1-CLICK ZINE GENERATION</b>", styles['H3']),
        Paragraph("<b>Live Showcase:</b> BBB Meetup #99 (Bookworm, August 23, 2026)", styles['BodySmall']),
        Paragraph("• <b>Granular Record:</b> Captures 16 Members, 62 Books (46 In-Depth Discussed, 16 Notable Mentions).", styles['BulletSmall']),
        Paragraph("• <b>1-Click Magazine Button:</b> Prominent action button: <b>[Download Publication PDF]</b>.", styles['BulletSmall']),
        Paragraph("• <b>Automated Typesetting:</b> Clicking this compiles an editorial PDF magazine directly on the user's phone in seconds.", styles['BulletSmall']),
        Paragraph("• <b>Print & Share Ready:</b> Sized for A4, featuring attendee rosters, book cover grids, quotes, and group photos.", styles['BulletSmall']),
        Paragraph("• <b>Admin Link:</b> Direct button <b>[Admin: Manage Meetup]</b> for authorized organizers to tweak notes on the fly.", styles['BulletSmall']),
        Paragraph("<b>Result:</b> The hours once spent in Canva manually assembling slides are replaced by an instant, automated download button.", styles['BodySmall'])
    ]

    t_feat4 = Table([[m99_text, m99_rl_img]], colWidths=[avail_w - 140, 140])
    t_feat4.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    story.append(t_feat4)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 6: THE ADMIN CONTROL CENTER: LOGGING A MEETUP IN 60 SECONDS
    # =========================================================================
    story.append(Paragraph("THE ADMIN CONTROL CENTER", styles['SectionSuper']))
    story.append(Paragraph("How Vinay Can Log a Complete Meetup in 60 Seconds", styles['SectionTitle']))
    story.append(HRFlowable(width="100%", thickness=1, color=C_BORDER, spaceBefore=2, spaceAfter=8))

    # Desktop Admin Screenshot
    admin_dash_path = "assets/mockup_admin_dashboard.png"
    if os.path.exists(admin_dash_path):
        dash_img = RLImage(admin_dash_path, width=avail_w, height=195)
        story.append(dash_img)
        story.append(Spacer(1, 6))

    story.append(Paragraph("<b>THE STEP-BY-STEP OPERATOR WALKTHROUGH FOR VINAY:</b>", styles['H2']))

    # Step-by-Step Operator Table
    steps_data = [
        [
            Paragraph("<b>STEP 1: INITIALIZE MEETUP</b>", styles['TableCellBold']),
            Paragraph("Log in to <i>bbb-library.vercel.app/admin</i>. Click <b>'+ New Meetup'</b>. Enter the number (e.g. <b>#100</b>), select the date, and choose the venue (<b>Bookworm</b>). The session record is created instantly.", styles['TableCell']),
        ],
        [
            Paragraph("<b>STEP 2: RAPID BOOK ENTRY</b>", styles['TableCellBold']),
            Paragraph("Click <b>'+ Add Book'</b>. Simply type the book title (e.g., <i>Solaris</i>) or author (<i>Stanislaw Lem</i>). The system's fuzzy autocomplete searches millions of titles and suggests the match with 1 click.", styles['TableCell']),
        ],
        [
            Paragraph("<b>STEP 3: ASSIGN DISCUSSANT</b>", styles['TableCellBold']),
            Paragraph("Select the member from the searchable dropdown (e.g., <i>Vinay Leo</i>). If it's a first-time newcomer, type their name—the platform automatically provisions a brand-new member dossier for them.", styles['TableCell']),
        ],
        [
            Paragraph("<b>STEP 4: ONE-CLICK ENRICH ALL</b>", styles['TableCellBold']),
            Paragraph("Click the orange <b>[Enrich All]</b> button. In the background, the server queries Goodreads, Amazon, and OpenLibrary to automatically download high-res book covers, star ratings (e.g., 4.15★), and synopses.", styles['TableCell']),
        ],
        [
            Paragraph("<b>STEP 5: ATTACH GROUP PHOTO</b>", styles['TableCellBold']),
            Paragraph("Tap <b>[Group Photo]</b> to upload the photo taken at Bookworm that morning. The image is compressed and stored securely in the cloud archive.", styles['TableCell']),
        ],
        [
            Paragraph("<b>STEP 6: GENERATE MAGAZINE</b>", styles['TableCellBold']),
            Paragraph("Click <b>[Re-gen PDF]</b>. The publishing engine renders the official commemorative magazine ready for distribution on WhatsApp and social channels. Meetup logging is 100% complete!", styles['TableCell']),
        ],
    ]
    t_steps = Table(steps_data, colWidths=[130, avail_w - 130])
    t_steps.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), C_CARD_BG),
        ('BOX', (0,0), (-1,-1), 0.75, C_BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.5, C_BORDER),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t_steps)
    story.append(Spacer(1, 6))

    # Admin Safeguards Box
    safeguards = [
        [Paragraph("<b>ADMINISTRATIVE INTEGRITY & SAFETY FEATURES</b>", styles['H3'])],
        [Paragraph(
            "• <b>Member Archival Safeguard:</b> Deleting a member never corrupts the database. They are safely moved to our cloud <code>removed_members_archive</code> table to preserve historical discussion audit trails.<br/>"
            "• <b>Instant Sync:</b> The <b>'Sync DB'</b> button immediately invalidates edge caches across all mobile devices worldwide.",
            styles['BodySmall']
        )]
    ]
    t_safe = Table(safeguards, colWidths=[avail_w])
    t_safe.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), C_CARD_ALT),
        ('BOX', (0,0), (-1,-1), 0.75, C_BORDER),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_safe)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 7: INFRASTRUCTURE, RELIABILITY & INVITATION TO VINAY
    # =========================================================================
    story.append(Paragraph("TECHNICAL FOUNDATIONS & WELCOME", styles['SectionSuper']))
    story.append(Paragraph("Cloud Reliability & Co-Admin Invitation to Vinay", styles['SectionTitle']))
    story.append(HRFlowable(width="100%", thickness=1, color=C_BORDER, spaceBefore=2, spaceAfter=8))

    # Desktop 3D Inspection Mockup
    inspect_path = "assets/mockup_admin_inspect.png"
    if os.path.exists(inspect_path):
        insp_img = RLImage(inspect_path, width=avail_w, height=185)
        story.append(insp_img)
        story.append(Spacer(1, 6))

    story.append(Paragraph("<b>ENTERPRISE ARCHITECTURE BEHIND THE SCENES:</b>", styles['H2']))

    tech_data = [
        [
            Paragraph("<b>Next.js 14 on Vercel Edge</b><br/>Global CDN edge delivery ensures instant sub-second mobile page loads across Bangalore mobile networks.", styles['TableCell']),
            Paragraph("<b>FastAPI Engine on Render</b><br/>High-performance Python backend handles metadata scraping, PDF typesetting, and image caching.", styles['TableCell']),
        ],
        [
            Paragraph("<b>Supabase PostgreSQL</b><br/>Enterprise relational cloud database with automated daily backups, ACID compliance, and 100% data durability.", styles['TableCell']),
            Paragraph("<b>Batch Query Engine</b><br/>Optimized batch joins reduced database roundtrips from 1,600+ individual queries down to 4 batch queries.", styles['TableCell']),
        ]
    ]
    t_tech = Table(tech_data, colWidths=[avail_w / 2.0 - 4, avail_w / 2.0 - 4])
    t_tech.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), C_CARD_BG),
        ('BOX', (0,0), (-1,-1), 0.75, C_BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.5, C_BORDER),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_tech)
    story.append(Spacer(1, 10))

    # Final Letter to Vinay
    letter_content = [
        [Paragraph("<b>AN OPEN INVITATION TO VINAY LEO: SHAPING THE FUTURE OF BBB</b>", styles['H3'])],
        [Paragraph(
            "Dear Vinay,<br/><br/>"
            "From your first recorded meetup in October 2023 through 51 memorable book discussions, your voice and discernment "
            "have helped build Busy Bibliophiles Bangalore into something truly special. The club is now at a historic turning point: "
            "we are crossing Meetup #100, our community is expanding, and our collective library contains over a thousand literary journeys.<br/><br/>"
            "We built this platform so that administering BBB is no longer a burdensome administrative obligation, but an inspiring, creative "
            "act that takes less than five minutes after a meetup. There is zero code to write, zero servers to manage, and zero Canva slides to format. "
            "Everything is automated, elegant, and permanently preserved.<br/><br/>"
            "We would be honored to have you join as <b>Co-Admin</b>. Together, we can ensure that every upcoming meetup, every passionate debate at Bookworm, "
            "and every brilliant recommendation is archived with the dignity and beauty it deserves.",
            styles['CalloutText']
        )],
        [Paragraph(
            "<b>With warm regards & deep respect,</b><br/>"
            "<b>Mishael & The Busy Bibliophiles Bangalore Organizing Team</b><br/>"
            "<i>https://bbb-library.vercel.app</i>",
            styles['BodySmall']
        )]
    ]
    t_letter = Table(letter_content, colWidths=[avail_w])
    t_letter.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), C_CARD_ALT),
        ('BOX', (0,0), (-1,-1), 1, C_AMBER_DEEP),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_letter)

    # Build Document
    print(f"Compiling document into {output_filename}...")
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated: {output_filename}")

if __name__ == "__main__":
    out_file = sys.argv[1] if len(sys.argv) > 1 else "BBB_Admin_Platform_Guide_Vinay.pdf"
    build_pdf(out_file)
