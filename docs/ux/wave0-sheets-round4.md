# Wave 0 sheets, round 4 (2026-10-18)

Changes from the founder's round-3 feedback. Mobile 390 px, 16 px gutters, 358 px content.

## ME-card: personalised library card on the Me page (new)

Data: name and `member_code` from the linked member record; "Member since" = first attended meetup;
stamp rows = real attendance (meetup number and date), newest first, like library due-date stamps.
No linked record: ghost card with "Link your record to get your card".
Style: paper `#faf8f5`, 1 px line `#d4cfc9`, one slanted minimal shadow (offset 3 px, 3 px, ink at 12%), no glass.

```
 Me page (linked)                         Me page (not linked, ghost)
 ┌────────────────────────────────┐       ┌────────────────────────────────┐
 │ Hi, Abhiram                    │       │ Hi                             │
 │                                │       │                                │
 │ ┌────────────────────────────┐ │       │ ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐ │
 │ │ BBB LIBRARY      [logo 28] │▒│       │   BBB LIBRARY                  │
 │ │ ────────────────────────── │▒│       │ │ ───────────────────────── │ │
 │ │ NAME   Abhiram             │▒│       │   NAME   ________________      │
 │ │ CODE   BBB-0042            │▒│       │ │ CODE   ________________   │ │
 │ │ SINCE  Mar 2019            │▒│       │   SINCE  ________________      │
 │ │ ────────────────────────── │▒│       │ │ ───────────────────────── │ │
 │ │ DUE-DATE STAMPS            │▒│       │   Link your record to get     │ │
 │ │  #99  26 SEP 26            │▒│       │ │ your card.                │ │
 │ │  #98  24 AUG 26            │▒│       │ └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘ │
 │ │  #97  27 JUL 26   + 6 more │▒│       │                                │
 │ └────────────────────────────┘▒│       │  Enter your invite code  ›     │
 │  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ │       └────────────────────────────────┘
 │                                │
 │ Did you read today?  Yes · No  │       Header chip (every page, signed in):
 │ Edit my details  ›             │         [BBB-0042]  small ink text, 44 px tap, opens Me
 │ Sign out                       │
 └────────────────────────────────┘
 Sizes: card 358 x ~300; label caps 12/16 muted; values 16/24; stamp rows 14/21 mono.
 Buttons (5-click rule): chip, Did you read Yes, No, Edit my details, Sign out, Enter invite code.
```

## C2 About: tagline changed

Tagline: **"A book club for the amateurs, nerds, geeks and enthusiasts of Bangalore"** (punctuation tidied from the founder's wording; confirm).
FAQ stays inside C2 as an expandable section.

## A2 Admin, after founder changes

```
 Step 1  Meetup           date | venue preset dropdown | (no presenter field: presenter = the admin for now)
 Step 2  Attendees        Member (list, unique id)  or  typed new person
 Step 3  Books            title + author + TRANSLATOR (new) + ISBN, published date, genre
                          Lookup order: Open Library -> Goodreads (retired, off) -> Google Books (needs key)
                                        -> Amazon (needs account) -> typed by hand
                          Every field stays editable. A small line shows the source used:
                          "Filled from Open Library" or "Typed by hand".
 Step 4  Review + save
 Motion: sections fade and rise in as they scroll into view (about 8 px, 200 ms),
         none under prefers-reduced-motion.
 Deferred: Google Forms sync. De-emphasised: audit trail (stays in the backend, no screen now).
```

Decided (founder, 2026-10-18): translator is stored as a `book_relations` row of type `translation_of`, for now. No new column.

## F1 Footer, GitHub

GitHub mark (logo only, 44 px tap target, aria-label "BBB source code on GitHub") sits before "To top".
Target in the mockup: `https://github.com/MishaelJulian/BBB`, copied from the old footer. Founder to confirm it.

## B0 Opening sequence (first visit, phones), for approval. Source: `do this too.txt` lines 71, 117 to 127

```
 t0 BLACK + MAP            t1 FULL SCREEN           t2 DARK, TYPING          t3 LIGHT SWEEP
 +----------------+        +----------------+       +----------------+       +----------------+
 |                |        |  . . . . . .   |       |                |       |   \  light     |
 |  ~ ~  out of   |        |  roads drawn   |       |   (nothing     |       |    \           |
 |  focus roads   |        |  outward from  |       |    visible,    |       |  B B B  B      |
 |  drawing from  |        |  Majestic      |       |    clack       |       |  ASCII logo    |
 |  Majestic      |        |                |       |    clack ...)  |       |  appears in    |
 |                |        |  button gone   |       |  sound only    |       |  the beam      |
 |  [ Full screen]|        |                |       |                |       |                |
 +----------------+        +----------------+       +----------------+       +----------------+
 tap = user gesture:       Fullscreen request       preload runs here:       the typing was
 fullscreen + sound        + audio unlocked         closet, fonts, photos,   already under way
 allowed                                            data, home page code

 t4 MORPH ONTO PAPER       t5 PAPER FLIP            t6 LANDING (Home, unchanged)
 +----------------+        +----------------+       +----------------+
 |  ASCII -> real |        |    \           |       |  Home page     |
 |  logo, masked, |        |     \  sheet   |       |                |
 |  onto a paper  |        |      \ turns   |       |                |
 |  sheet in the  |        |  Home shows    |       |                |
 |  phone's ratio |        |  underneath    |       |                |
 +----------------+        +----------------+       +----------------+
```

Rules from the spec: phones only, first visit only (no cache detected), no separate loading screen (the preload hides in t1 to t4), mouse tracker off on mobile.

Challenges and options, none taken as a default:
1. Who sees it: the spec says "first time registration users or first time admin only" in one line and "first time to the website" in another. Options: (a) any first visit, (b) first sign-up or first admin sign-in only.
2. iPhone: the Fullscreen API on iPhone Safari was long video-only; a fullscreen flag appeared in iOS 17.4 beta ([WebKit bug 240312](https://bugs.webkit.org/show_bug.cgi?id=240312), [Apple forums](https://developer.apple.com/forums/thread/133248)). Current iOS behaviour is not verified, so the founder's iPhone decides. Options: (a) try fullscreen; if refused, the button reads "Open" and a small line suggests Add to Home Screen; (b) show the button on Android only; (c) skip the sequence on iPhone.
3. Detecting a first visit: (a) a flag in localStorage (Safari clears script storage after 7 days without a visit, so the intro could replay); (b) a cookie set by the server. Either way, a "Replay intro" link in the footer.
4. Length: the sequence needs a budget and an always-visible Skip. Options: about 6 s, 9 s or 12 s. It is skipped under reduced motion and Save-Data.
5. Sound: options (a) synthesised in the browser, no file; (b) a recorded typewriter sample (needs a licence); and a mute control. On or off after the tap?
6. Map: the current extract starts at 77.585 E. Majestic is further west (about 77.57 E, from memory, unverified), so a new OpenStreetMap extract is needed. Options: (a) widen the extract west, a larger file for first visits only; (b) start the drawing a little east of Majestic.
7. "Vertical" lock: `screen.orientation.lock` only works in fullscreen on Android Chrome and not on iPhone. Options: lock where possible, or just design for portrait.
8. Paper flip style: (a) a sheet turned from the right edge like a book, (b) flipped over from the top like a calendar page, (c) a corner curl.

## L-Lists: reading lists from the original site (proposal, 2026-10-18)

Source: https://brokebibliophilesbangalore.com/listicles/ (10 lists, newest first). Titles and dates read from that page on 2026-10-18; item counts were not verified.

```
LISTS INDEX (club.html > Lists)       LIST DETAIL (e.g. Books on Bangalore)
+----------------------------------+  +----------------------------------+
| Club > Lists                (Q)  |  | Club > Lists > Books on Bangalore|
|----------------------------------|  |----------------------------------|
| Lists                            |  | Books on Bangalore               |
| Reading lists from the club      |  | 9 Oct 2021                       |
|----------------------------------|  |                                  |
| Bookstores in Bangalore        > |  | Recommendations about our city,  |
| 12 Nov 2022                      |  | collected from discussions on    |
|----------------------------------|  | social media.                    |
| Bookclubs in Bangalore         > |  |                                  |
| 6 Apr 2022                       |  | History, the present and places  |
|----------------------------------|  | in the city (non-fiction)        |
| Books on Bangalore             > |  |   The Promise of the Metropolis  |
| 9 Oct 2021                       |  |   Discovering Bengaluru          |
|----------------------------------|  |   Askew: A Short Biography ...   |
| Books on Mental Health         > |  |                                  |
| 9 Oct 2021                       |  | Fiction                          |
|----------------------------------|  |   Bangalored                     |
| Women Author Recommendations   > |  |   Bangalore: A Graphic Novel     |
| 8 Mar 2021                       |  |                                  |
|----------------------------------|  | Others                           |
| Books on Food                  > |  |   Bangalore: Scenes from an ...  |
| 10 Feb 2021                      |  |                                  |
|----------------------------------|  | Have a book to add? Email us.    |
| Books on Cricket               > |  |                                  |
| 31 Jan 2021                      |  | [ < All lists ]                  |
|----------------------------------|  |----------------------------------|
| Books on Indian Politics       > |  | Home Dir. [LIB] Club  Me         |
| 31 Jan 2021                      |  +----------------------------------+
|----------------------------------|
| Home Dir. [LIB] Club  Me         |
+----------------------------------+
Rows: the hairline rows of the Club hub (64 px, title 18/24, date 14/21 muted, orange arrow).
Detail: plain text, no cards; headings only where the original list has them.
Buttons per page (5-click rule): 8 list rows, breadcrumb links, tab bar, Email us, All lists.
```

## A1 Admin home and A2 Record a meetup (3 steps), 2026-10-19, for approval
```
A1 ADMIN HOME                          A2 STEP 1 OF 3: THE MEET
+----------------------------------+   +----------------------------------+
| [logo] BBB             Admin     |   | [logo] BBB             Admin     |  Admin = text link, shown to admins only
|----------------------------------|   |----------------------------------|
| Admin                            |   | Record a meetup                  |
| 68 meetups on record of 99 held  |   | 1 of 3 . The meet                |
| [ Record a meetup          > ]   |   |----------------------------------|
| Draft: #100, step 2. Resume .    |   | Date    ______________ (date)    |
|   Discard                        |   | Venue   Bookworm        v        |
|----------------------------------|   | Presenter: you                   |
| THIS YEAR AGAINST LAST           |   | Draft saved on this phone        |
| Meetups 8 (2025: 11)             |   |            [ Next          > ]   |
| Readers per meetup, last 12      |   |----------------------------------|
|  ~~~~/\~~/~\_/\~~ (area chart)   |   | Home Dir. [LIB] Club  Me         |
|----------------------------------|   +----------------------------------+
| RECENT CHANGES    Mine | Everyone|   A2 STEP 2 OF 3: WHO CAME
| Edited book "<title>"  2 h  Undo |   +----------------------------------+
| Hid member <name>      1 d  Undo |   | 2 of 3 . Who came     < Back     |
| ... (5 rows)                     |   | Name or member code ____________ |
| All changes >                    |   |  <name>  BBB-0042   (tap to add) |
|----------------------------------|   |  Add "<typed>" as a new person   |
| DO NEXT                          |   |----------------------------------|
| <n> guests attended twice: make  |   | Added (16)                       |
|   them members?               >  |   |  <name>                       x  |
| 34 meetups have no readers    >  |   |  <name> (2nd meetup: make them   |
|----------------------------------|   |   a member after saving?)     x  |
| TOOLS                            |   |            [ Next          > ]   |
| Members .. Books .. Claim codes  |   +----------------------------------+
| Notify .. Import .. Statistics   |   A2 STEP 3 OF 3: BOOKS, THEN REVIEW
|----------------------------------|   +----------------------------------+
| Home Dir. [LIB] Club  Me         |   | 3 of 3 . The books    < Back     |
+----------------------------------+   | Title  ___________  (lookup)     |
                                       | Author ___________               |
All changes: the Meetups/Readers       | Translator (if any) ________     |
filter engine (search, text tabs,      | Filled from Open Library .       |
Filters sheet, chips, load as you      |  ISBN <n> . <year> . <genre> Edit|
scroll). Undo shows for 7 days.        | + Add a book                     |
                                       |----------------------------------|
                                       | Review: <date>, <venue>,         |
                                       |  16 readers, 4 books             |
                                       |         [ Save meetup      > ]   |
                                       +----------------------------------+
```

## A1 revised order and A2 step 3 per reader (2026-10-19), for approval
```
A1 (new order)                         A2 STEP 3 OF 3: BOOKS, READER BY READER
Admin                                  3 of 3 . The books        < Back
68 meetups on record of 99 held        Tap a reader to add their books.
 (space)                               ----------------------------------
[ Record a meetup          > ]         <name>              3 books    >
 (space)                               <name>              none yet   >
[draft shape: see options]             <name>              1 book     >
This year against last + chart         ... (16 readers, any order)
Tools                                  ----------------------------------
Do next                                Nobody's book (general discussion)
Recent changes                         + add a mention            0   >
                                       ----------------------------------
A2 STEP 3b: ONE READER'S BOOKS         Review: <date>, <venue>, 16 readers,
<name>                  < Readers      4 books by 2 readers, 1 mention
Title  _________ (lookup)              [ Save meetup               > ]
Author _________
Translator (if any) ______
Filled from Open Library . Edit
+ Add another book
[ Done                       ]
```
Draft shape options: (a) a folded-corner page tab, (b) a dashed 2 px outline strip with a corner triangle, (c) a left bar of diagonal hatch.

## A2 step 3, one reader at a time (2026-10-19, replaces the reader-list version above)
```
3 of 3 . Books . <name>  (3 of 16)      Last pass:  Nobody's books (mentions)
Title  __________ (lookup)              Title  __________ (lookup)
Author __________                       Author __________
Translator (if any) _____               + Add another
Filled from Open Library . Edit         [ Review ]   < Back
+ Add another book
[ Next reader >]  Skip  < Back          Review: <date>, <venue>, 16 readers,
                                        4 books by 2 readers, 1 mention
                                        [ Save meetup > ]
```

## A2 final flow (2026-10-19, replaces the step 3 versions above)
```
STEP 1 THE MEET        STEP 2 ADD A READER (loop)     STEP 3 THAT READER'S BOOKS
Date   ______         Name or member code ________   <name>
Venue  Bookworm v      <name> BBB-0042  (tap)         Title  _________ (lookup)
Presenter: you         Add "<typed>" as new person    Author _________
[ Next > ]             Nobody's books (mentions)      Translator (if any) ____
                       ----------------------------   Filled from Open Library . Edit
                       So far (3 readers, 7 books)    + Add another book
                       <name>   3 books  >  (reopen)  [ Done with <name> ]
                       <name>   none     >                  |
                       ----------------------------         v  back to step 2
                       [ Register meetup ]  (any time)

REGISTER: all details in one screen (date, venue, each reader with their books,
mentions), Edit on any line, then [ Save meetup ].
```

## A2 flow options after the founder's corrections (2026-10-19)
```
OPTION A  loop of two screens, two exits               OPTION B  one screen per reader
STEP 1  The meet                                        STEP 1  The meet (same)
 Date ______   Venue Bookworm v
 Presented by ____________ (0/60)                       STEP 2  Reader 3
 [ Next > ]                                              Name or code ______  (or type new)
STEP 2  Add a reader                                     Books
 Name or member code ______                              Title ____ (lookup)  Author ____
  <name>  BBB-0042 (tap)                                 Translator (if any) ____
  Add "<typed>" as a new person                          + Add another book
 [ Next > ]                                              ---------------------------
STEP 3  <name>'s books                                   [ Register meetup > ]
 Title ____ (lookup)  Author ____                        Add another reader
 Translator (if any) ____                                < Previous reader
 + Add another book
 [ Register meetup > ]
 Add another reader  (back to step 2)
```

## A2 step 3 fields, final (2026-10-19)
```
<name>'s books
Title   ______________ (lookup on blur)
Author  ______________
+ Translator            (expands to: Translator ______________)
Filled from Open Library
ISBN 978... . 2017   [Edit]          (genre left out for now)
+ Add another book
[ Register meetup > ]   Add another reader
```

## A1 final layout (2026-10-19), for approval
```
+----------------------------------+
| [logo] BBB             Admin     |
|----------------------------------|
| Admin                            |
| 68 meetups on record of 99 held  |
|                                  |
| [ Record a meetup          > ]   |
|                                  |
| +--------------------\           |   static folded-corner page, in the flow
| | Draft               \          |
| | #100, step 2         |         |
| | Resume     Discard   |         |
| +----------------------+         |
|----------------------------------|
| THIS YEAR AGAINST LAST           |
| Meetups 8 (2025: 11)             |
| [RTIH area chart, readers per    |
|  meetup, last 12 meetups]        |
|----------------------------------|
| TOOLS                            |
| Members .. Books .. Claim codes  |
| Notify .. Import .. Statistics   |
|----------------------------------|
| DO NEXT                          |
| <n> guests attended twice:       |
|   make them members?          >  |
| 34 meetups have no readers    >  |
|----------------------------------|
| RECENT CHANGES   Mine | Everyone |
| <5 rows, each with Undo (7 days)>|
| All changes >                    |
|----------------------------------|
| Home Dir. [LIB] Club  Me         |
+----------------------------------+
```

## Me batch sheets (2026-10-19), for approval
```
T1 TOP BAR (72 px)                          M1 ME, linked member
signed out:      [logo] BBB                 +----------------------------------+
no record yet:   [logo] BBB                 | Hi, Abhiram                      |
member:          [logo] Hi, Abhiram [card]  | +------------------------------+ |
admin:           [logo] Hi, Abhiram [card]  | | BBB LIBRARY CARD    [logo]   | |  library card (style: open)
                               Admin        | | NAME  Abhiram                | |
(the greeting needs a linked record)        | | CODE  BBB-0042               | |
                                            | | SINCE Mar 2019               | |
M1 states                                   | | STAMPS  #99 23 AUG 26        | |
S0 signed out  -> sign in page (L1)         | |         #98  1 JUL 26  +6    | |
S1 signed in, no record:                    | +------------------------------+ |
  Hi (no name)                              |----------------------------------|
  Link your record                          | DID YOU READ TODAY?  (N1)        |
  Enter your code ______  [ Link > ]        | [ Yes ]   [ Not today ]          |
S2 record linked: as M1                     | once a day, never a pop-up       |
                                            |----------------------------------|
N1 after Yes:                               | Your entries                  >  |
  Thanks. Noted for today.                  | Wishlist                      >  |
  12 days this month.                       | Shortlist, top 4              >  |
                                            | Profile and account           >  |
N2 LETTER (shown once, after the first      | Sign out                         |
sign-in and after linking a record)         +----------------------------------+
  typewriter type on a paper sheet; ends "Dhilipan, System Architect"; [ Got it ]
```

## Me batch, second pass (2026-10-19): N1, N2, library card, Entries, Wishlist, Shortlist
(drawn in the message to the founder; summary) N1: Yes shows an encouraging note, Not today a gentle discouraging one. Card: flat paper, 2 px ink outline, slot, with a flash of colour (orange band or blue stamp ink). Entries = books I brought to meetups (from the database). Wishlist = long private list of books I want to read, imported from a Goodreads CSV or added by title. Shortlist = exactly 4 picks, chosen by swiping through the wishlist; matches with other members are shown only after I lock my four.

## Me batch, third pass (2026-10-19)
```
CARD (8 px orange band left)        N1 on Me, under the card (members with a linked record)
+#+-----------------------------+   DID YOU READ TODAY?   [ Yes ] [ No ]
|#| BBB LIBRARY CARD    [logo]  |   Yes: "Good. That is a few more pages."  (12 days this month)
|#| Abhiram                     |   No:  "Damn, that's crazy, Abhiram."
|#| CODE 065-01                 |   once a day; the question returns the next day
|#| FIRST MEETUP ON RECORD      |   N2: only the first sign-in of an account
|#| Oct 2023                    |
|#| #98  1 JUL 26   + 27 more   |
+#+-----------------------------+

ENTRIES (E1)                     WISHLIST (W1)                       CLOSET PICKS (C1)
Your entries   47 books          Wishlist                            Closet Picks     Open the closet >
#98 1 Jul 2026                   Who can see it: (o) Only me         1 [ ___ ] 2 [ ___ ]
 The Seed Children  Remove        ( ) Everyone   [ Save ]            3 [ ___ ] 4 [ ___ ]
#97 28 Jun 2026                  [ + Add a book ] title ___ [ Add ]  [ Pick by swiping > ]
 Jacked             Remove       Import from Goodreads                (cards from your wishlist;
ADD A BOOK                        [ Choose CSV file ] [ Import ]       right = keep, left = drop;
 Meetup ____v Title ___           How to export (desktop only) >       or search the archive)
 Author ___    [ Add entry ]     <title> <author>          Remove    [ Lock my four ]
Load as you scroll               (empty: "Import a CSV or add one")  locked: "2 others picked <book>"
                                                                      [ Unlock ]
```
