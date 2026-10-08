"""Render the README banner, social preview and framed screenshots.

Usage: python scripts/readme_images.py <Gelasio.ttf> <shots_dir> <out_dir>
Gelasio (OFL, a Georgia-metric serif): https://github.com/google/fonts/tree/main/ofl/gelasio
Shots are 1440x860 @2x captures: 1_wall_hover.png, 2_pulled_card.png, 3_list_view.png.
"""
import sys
from PIL import Image, ImageDraw, ImageFont

PAPER, PAPER_DARK, BORDER, INK, INK_LIGHT, ACCENT = '#FAF8F5', '#F0EDE8', '#D4CFC9', '#1A1A1A', '#4A4A4A', '#8B4513'
font_path, shots, out = sys.argv[1:4]


def font(size, weight='Regular'):
    f = ImageFont.truetype(font_path, size)
    f.set_variation_by_name(weight)
    return f


def centered(draw, y, text, f, fill):
    w = draw.textlength(text, font=f)
    draw.text(((draw.im.size[0] - w) / 2, y), text, font=f, fill=fill)


def card(w, h, lines, url=None):
    im = Image.new('RGB', (w, h), PAPER)
    d = ImageDraw.Draw(im)
    title = font(int(h * 0.26), 'Bold')
    y = h * 0.22
    centered(d, y, 'BBB Library', title, INK)
    y += title.size * 1.25
    d.rectangle([(w - 120) / 2, y, (w + 120) / 2, y + 4], fill=ACCENT)
    y += 34
    for text in lines:
        f = font(int(h * 0.058))
        centered(d, y, text, f, INK_LIGHT)
        y += f.size * 1.5
    if url:
        centered(d, h - 70, url, font(int(h * 0.045)), INK_LIGHT)
    return im


def frame(src, dst, label):
    shot = Image.open(src).convert('RGB').resize((1440, 860), Image.LANCZOS)
    pad, bar, r = 40, 40, 16
    w, h = shot.width + 2 * pad, shot.height + bar + 2 * pad
    im = Image.new('RGB', (w, h), PAPER)
    win = Image.new('RGB', (shot.width, shot.height + bar), PAPER_DARK)
    win.paste(shot, (0, bar))
    d = ImageDraw.Draw(win)
    for i in range(3):
        d.ellipse([18 + i * 22, 14, 30 + i * 22, 26], fill=BORDER)
    centered(d, 9, label, font(18), INK_LIGHT)
    mask = Image.new('L', win.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, win.width - 1, win.height - 1], r, fill=255)
    im.paste(win, (pad, pad), mask)
    ImageDraw.Draw(im).rounded_rectangle([pad, pad, pad + win.width - 1, pad + win.height - 1], r, outline=BORDER, width=2)
    im.save(dst, quality=88, optimize=True)


card(1600, 400, ['Broke Bibliophiles of Bangalore, since 2017']).save(f'{out}/banner.png', optimize=True)
card(1280, 640, ['Every book the club has discussed, on one shelf.'], 'github.com/MishaelJulian/BBB').save(f'{out}/social-preview.png', optimize=True)
frame(f'{shots}/1_wall_hover.png', f'{out}/closet-wall.jpg', 'localhost:3000/library-room')
frame(f'{shots}/2_pulled_card.png', f'{out}/closet-pulled-book.jpg', 'localhost:3000/library-room?select=…')
frame(f'{shots}/3_list_view.png', f'{out}/closet-list-view.jpg', 'localhost:3000/library-room · List View')
print('rendered')
