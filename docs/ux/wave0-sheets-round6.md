# Round 6 sheets: Library (2026-10-19, draft)
Rules applied: flat E-Ink paper, 2 px ink lines, accent #c93a14 underline for actions, no cards, 72 px top bar, 358 px content, 44 px targets, frequent actions floating bottom-right (thumb zone), text toggles with accent underline.

## L1 header options (closet view)
A1 Search stays in the header, tidied
 +------------------------------------+
 | < Library              Closet|List |  bar 72: toggle vertically centred, right
 | Search title, author, number   [x] |  44 px underline field, sticky with bar
 +------------------------------------+
 | results drop under the field:       |
 |  102  Dungeon Crawler Carl  Dinniman|
 | (shelves)                           |
 |             [Filters 2] [Picks 2]   |  floating bottom-right
A2 Search-first single row
 +------------------------------------+
 | [<] [ Search title, author...  ] C|L|  one row, toggle as two letters
 +------------------------------------+
A3 Search in the thumb zone (recommended)
 +------------------------------------+
 | < Library              Closet|List |  bar only; nothing else up top
 | (shelves, more room)                |
 |   [Search] [Filters 2] [Picks 2]    |  floating row, bottom-right
 +------------------------------------+
 Tap Search: bottom sheet, input above the keyboard, same fields
 (title, author, spine number), results list in the sheet.
Option B (two tiers) is the same as A3 in capability: its Search button opens that sheet, which accepts title, author and spine number like A's inline field.

## L2 List view (paper)
 +------------------------------------+
 | < Library              Closet|List |
 | Search title, author, number       |
 | All 2,739 | Picked | Translated    |  text tabs with counts from the DB
 | ---------------------------------- |
 | 102  Dungeon Crawler Carl          |  number Special Elite, title Georgia
 |      Matt Dinniman . 14 picks    > |
 | ... infinite scroll                 |
 |                      [Filters]      |  floating bottom-right
 | [Home][Directory][Library][Club][Me]|

## L3 Book page
 +------------------------------------+
 | < Library                          |
 | Dungeon Crawler Carl               |  Georgia 32
 | Matt Dinniman                      |
 | No. 102 . Discussed at #97 (link)  |
 | 14 others also picked this          |  shown straight away
 | About / synopsis (read more)       |
 |                 [Add to my picks]  |  floating bottom-right
 +------------------------------------+
 Add sheet: ( ) Favourite  ( ) Want to read   [Add pick]
 At four picks the sheet turns into "You have four. Replace one:"
  1 Jacked [Replace]  2 ... 3 ... 4 ...   (picks are always limited to four)

## L4 Picks metric (admin), reader-friendly
 +------------------------------------+
 | < Admin                            |
 | Closet Picks                       |
 | By book | By reader | History      |  text tabs
 | Search a book or a reader          |
 | ---------------------------------- |
 | By book:                           |
 | 1  Dungeon Crawler Carl        14  |
 |    ======== (thin ink bar)         |
 |    9 Favourite . 5 Want to read  > |
 | 2  Project Hail Mary           11  |
 | Tap a book: readers list, one row  |
 |  each: A  Abhiram  12 Oct  Fav     |
 | ---------------------------------- |
 | By reader:                         |
 |  A  Abhiram            4 of 4     >|
 |     Jacked, DCC, PHM, Seed Children|
 | History:                           |
 |  19 Oct  Abhiram added Jacked (Want)|
 |                      [Filters]     |  tag, date range
 +------------------------------------+

## Me > Closet Picks (rework after approval)
No Lock or Unlock. My four shown with tags; matches ("14 others also picked this") visible straight away. Swipe deck stays as the way to fill slots.

# Revision 2 (2026-10-19): header mix, grid list, flip preview
Founder: mix of A1 and A3; tapping Search opens a bottom sheet with the input above the keyboard; List view is a grid with covers like the live Vercel demo; keep the mini preview where the book flips.
Facts read from the live code and DB: list grid is 2 columns on phone, covers 2:3 (`cover_url` or `thumbnail_url`); preview modal (`HeroBookModal`) has Front, Spine, Back and a 3D turn, a Save to bag action and a "full record" link. In `public.canonical_books`: 2,739 books, 2,461 have a cover, 278 have none. Cover hosts: i.gr-assets.com (Goodreads) 2,225, is1-ssl.mzstatic.com (Apple) 195, m.media-amazon.com 38, duckduckgo.com 3.

## L1 header (final mix)
 +------------------------------------+
 | < Library             Closet | List|  bar 72 px, toggle centred vertically at the right
 | [ Search title, author, number  ]  |  field shows in the header but is a button
 +------------------------------------+
 | (shelves)                           |
 |             [Filters 2] [Picks 2]   |  floating bottom-right
 Tap the field: bottom sheet, real input above the keyboard, results as rows
 (number Special Elite, title Georgia, author), recent searches under it. [x] clears.

## L2 List view, grid with covers
 +------------------------------------+
 | < Library             Closet | List|
 | [ Search title, author, number  ]  |
 | All 2,739 | Picked | Translated    |
 | +-------+  +-------+               |
 | | cover |  | cover |               |  2 columns, 2:3, flat, 2 px ink outline
 | |  2:3  |  |  2:3  |               |
 | +-------+  +-------+               |
 | Dungeon...  Project Hail...        |  title 2 lines, Georgia 16
 | Dinniman    Andy Weir              |  author muted 14
 | 14 picks    11 picks               |
 | ... infinite scroll   [Filters]    |
 No cover (278 books): paper tile, 2 px ink outline, title in Georgia and the spine number, same 2:3 box.

## L2b Mini preview (flip), bottom sheet from a cover or a spine
 +------------------------------------+
 |                 (x)                |
 |          +-----------+             |
 |          |  front /  |             |  book turns in 3D: drag left or right,
 |          |  spine /  |             |  or tap the segments below
 |          |  back     |             |
 |          +-----------+             |
 |   Front | Spine | Back             |  text toggle, accent underline on the active one
 | Dungeon Crawler Carl               |
 | Matt Dinniman . No. 102            |
 | 14 others also picked this         |
 | Full record >                      |  link to L3
 |            [Add to my picks]       |  at the sheet foot
 +------------------------------------+
 Back shows the synopsis when we have one, else the title and author. Spine is the closet spine colour and title. Reduced motion: no turn, segments swap the face.
 Cover hosting: covers load from third-party hosts (mostly Goodreads CDN). Mockup hot-links them; the build should copy them to our own storage.


# Revision 3 (2026-10-19): the flipping book is the live code, untouched
Founder: "Just take the damn code from the vercel demo; don't mess it up one bit... I just need the accessibility and the thing apart from the flipping book actually be under our aesthetic."
So, in L2b:
- The book itself (3D hardcover, springs, mouse tilt, Front / Spine / Back / 3D Interactive angles, contact shadow) is the code from `frontend/src/components/library/HeroBookModal.tsx` (the book block and the state that drives it), lifted verbatim. No restyling, no changes to its behaviour. My earlier "drag to turn" is dropped: it was my invention; the live code turns with the pointer and the four angle buttons.
- Everything else is ours: the bottom sheet (flat paper, 2 px ink top edge, accent underline), the angle buttons (text toggle styled like our other toggles, same four angles), title, author, number, picks line, Full record link, [Add to my picks] at the sheet foot, close button.
- Accessibility added around the book without touching it: sheet is a dialog with a title, Escape and the close button work, angle buttons are real buttons with pressed state, a text description of the current face for screen readers, focus returns to the cover that opened it, reduced motion respected by the angle buttons.
Build route (mockup only): copy the book block into `mockup/tools/flipbook/` unchanged, bundle it with the fork's react, framer-motion and Tailwind into `site/assets/flipbook.js`, mount it in our sheet. The live file stays unedited. Needs your OK before I start.

# Revision 4: L4 redrawn (admin view of Closet Picks)
What it is: where an admin sees which books members picked (Favourite or Want to read), how many picked each, and exactly who. Reached from Admin console > Tools > Closet Picks. Four screens, one job each.

L4a Most picked (default)
 < Admin
 Closet Picks
 312 picks . 87 readers
 [ Search a book or reader        ]
 Most picked | By reader | History      text tabs, counts in the tabs
 1  Dungeon Crawler Carl            14   rank, title Georgia, total right
    9 Favourite . 5 Want to read      >
 2  Project Hail Mary               11
 ...infinite scroll        [Filters]    floating bottom-right: tag, date range

L4b One book (tap a row)
 < Most picked
 Dungeon Crawler Carl . 14 picks
 All 14 | Favourite 9 | Want to read 5
 (A) Abhiram        Favourite   12 Oct 2026
 (P) Priya          Want to read 3 Oct 2026
 ...                                    one reader per row, 56 px, initial circle

L4c By reader
 Most picked | By reader | History
 (A) Abhiram                 4 of 4   >
     Jacked . DCC . PHM . Seed Children
 (P) Priya                   2 of 4   >
 Tap a reader: their four slots as rows with tag and date.

L4d History
 19 Oct 2026  Abhiram added Jacked (Want to read)
 18 Oct 2026  Priya removed Dune
 Newest first, who, what, when.
