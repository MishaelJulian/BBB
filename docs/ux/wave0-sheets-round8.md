# Round 8 sheets: admin tools behind placeholders (2026-10-19, draft)
Grounded in: admin routes that exist (`books/[id]` edit; `members/[id]` edit and remove; `invite` claim code; `make-member`; `toggle-hide`; `restore`; `removed-members`) and the live database (read-only, 2026-10-19): 140 members (113 member, 18 BYOB, 8 guest; 1 member hidden), 0 linked accounts, 0 claim codes issued, 0 removed; 2,739 books (156 with no author, 278 with no cover, none with an ISBN), 2,301 authors, 1 import job (full archive, completed, 3,954 items).
Same patterns as the approved admin and library screens: back link top-left, search, text tabs with counts, floating Filters bottom-right, rows 64 px, bottom sheets with the action at the foot, 7-day undo, every change goes to All changes. Shown to admins only.

## M1 Members
 < Admin
 Members
 [ Search name or code ]
 All 140 | Member 113 | BYOB 18 | Guest 8 | Hidden 1 | Removed 0
 Abhiram                         >
   065-01 . Member . Not linked
 ...infinite scroll        [Filters]   (status, linked, hidden)
## M2 One member
 < Members
 Abhiram    065-01
 Member . Account: not linked . 54 books . 28 meetups
 Actions (rows, one per line):
  Edit name
  Make a member (guests and BYOB only)
  Make a claim code            -> M3
  Issue a reset code           -> M4 (only if an account is linked)
  Hide from the public site / Show again
  Remove member                -> confirm sheet, 7 days to undo
## M3 Claim code (sheet)
 "Code for Abhiram" 065-01-XXXX   [Copy]
 Works once, expires in 14 days. Shown only now.
 [Done >]
## M4 Reset code (sheet)
 "Reset code for Abhiram" XXXXXXXX  [Copy]
 Works once, expires in 24 hours. Give it to them yourself. Shown only now. [Done >]
 Removed tab: removed members with [Restore].

## B1 Books
 < Admin
 Books
 [ Search title, author or number ]
 All 2,739 | No author 156 | No cover 278 | No ISBN 2,739
 Dungeon Crawler Carl
   Matt Dinniman . No ISBN              >
 ...infinite scroll        [Filters]
## B2 One book (edit)
 < Books
 Title, Author (type to pick, or add a new one), Translator (expandable), ISBN, Year, Cover
 [ Look up details ]  fills author, ISBN and cover from Open Library (same chain as Record a meetup); you check and keep what is right
 Synopsis
 [ Save changes > ]  foot
 More: Merge into another book . Delete book (blocked while it has discussions)

## C1 Codes (claim and reset together)
 < Admin
 Codes
 Active | Used | Expired
 Abhiram . Claim . issued 12 Oct by Dhilipan . expires 26 Oct
 Priya . Reset . issued today . expires tomorrow
 [ + New code >] floating -> pick member -> pick Claim or Reset -> shown once (M3 or M4)
 Row tap: [Revoke] (active only)

## I1 Import
 < Admin
 Import
 History: Full archive . completed . 3,954 items . 14 Sep   (read only)
 [ + New import ]
 I2 Choose what: Members | Books | Meetups with readers  (more later)
 I3 Choose a file (CSV or spreadsheet, the file picker already decided)
 I4 Match columns (each column to a field; suggested automatically)
 I5 Check first, always a dry run: "120 new, 14 changed, 3 problems" with the first 5 rows and the problems listed
 I6 [ Import 134 rows > ] -> result, problem rows downloadable, 7 days to undo the whole batch
 Phone note: works, but best on a bigger screen; no import without the dry run.

## Needs your call
1. Remove member: archive (the existing route keeps a copy and can restore), with a 7-day undo. Right, or hide only?
2. Books: include Merge and Delete in the mockup, or leave them out for now?
3. Codes: one combined list for claim and reset codes (my recommendation), or two tools?
4. Import: which sources first (Members, Books, Meetups with readers listed above)? Anything else, such as the Goodreads or Google Form files?
5. Bulk actions (select several rows to hide or remove) on the phone: later, as you said earlier?
