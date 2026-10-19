# Round 10 sheets: meetup detail page and reader profile (2026-10-19, draft)
Founder: take content from the main website and the live demo; only the template layout and style need agreeing. Tested the mockups on Android so far.
Read from the live demo: `app/meetups/[id]/page.tsx` (breadcrumb, "Meetup #N", date, venue, format, PDF link, admin link, group photo with caption, "Attendees and discussants", "Books discussed (N)", "General discussion (N)"), `app/members/[id]/page.tsx` (breadcrumb, name, "N books discussed . N meetups attended . first recorded . latest", bio, books sorted by latest meetup with meetup links, "Meetup participation history (N)"), and the live API fields: meetup number, date, venue, format, title, photo, PDF, books (title, author, who brought it, cover, discussion-mention flag), members; reader name, bio, counts, first and last active date, books with their meetups, meetups.
Rules applied: crumb top bar, flat paper, Georgia titles, deep-red underlined links (#8a1c1c), rows not cards, 44 px targets, real data only, nothing shown when the data is empty.

## P1 Meetup detail (phone)
 Directory > Meetups > #99                     (crumb bar)
 Meetup #99                                    Georgia 32
 23 Aug 2026 . Bookworm . In person
 61 books . 16 readers        Books | Readers | General discussion   (text jump links)
 [ group photo, full width, 3:2 ]              only when a photo exists
 The group at meetup #99, Bookworm.            caption, small
 [ Download the books PDF  > ]                 only when a PDF exists
 (admin only) Open in admin                    text link
 Books discussed (61)
   Option B rows (recommended)                 Option A cover grid, 2 columns
   [thumb] 1929                                [cover]  [cover]
           Andrew Ross Sorkin                  1929     Dune
           Brought by Srihari                  ...
   tap a row -> the book view (full screen, the turning book)
 Who was there (16)
   Srihari . Abhiram . Priya ...               names as red links -> reader profile
   (no attendance recorded: "Readers not recorded for this meetup")
 General discussion (n)                        mentions as a plain list, only if any
 < Meetup #98                  Meetup #100 >   foot, 44 px, labelled with the numbers

## P2 Reader profile (phone)
 Directory > Readers > Abhiram
 Abhiram                                        Georgia 32
 47 books . 28 meetups
 First recorded 1 Oct 2023 . Latest 1 Jul 2026
 Bio paragraph (only if they wrote one)
 You: "This is your profile. Edit your bio"     only when you are this reader
 (admin only) Open in admin                     text link
 Wishlist (n)                                   only when they made it public
 Books they brought (47)                        newest meetup first
   [thumb] The Seed Children
           Bontekanye Botumile
           #98
   (a book at several meetups lists them: #98, #77)  red links -> meetup page
   Show more (infinite scroll after 20)
 Meetups attended (28)
   #98 . 1 Jul 2026 . Bookworm                  rows -> meetup page
 Hidden or removed readers: the profile is not found (same as the live site).

## Needs your call
1. Books on the meetup page: B rows (title, author, who brought it, a small cover) or A cover grid? I recommend B because "who brought what" is the point of the page.
2. Prev/next meetup links at the foot: keep?
3. Reader profile privacy: show name, counts, dates, bio, books and meetups only. The member code and the Member/BYOB/Guest status stay admin-only. Right?
4. Meetup page "Who was there": 32 meetups have no attendance rows, so they show "Readers not recorded for this meetup". Fine?
5. A book row opens the full-screen book view from the Library (needs a link that opens a book directly). OK to add?
