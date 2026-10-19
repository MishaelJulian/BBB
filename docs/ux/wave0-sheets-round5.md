# Round 5 sheets (2026-10-19)

SUPERSEDED by founder correction: K1 to K4 below assumed rounds and a club-decided four. Founder: no club four, no rounds; Closet Picks is a calculation metric (favourite, or want to read because it was discussed); admins see a named list plus counts; it has a name and date with history. Focus moves to the Library page (L sheets, below the K sheets).

# K sheets (superseded)

Entry: Admin console (A1) Tools row, "Closet Picks round". 390 px, thumb zone at the bottom, 44 px targets.
Rule from founder: members pick up to four and lock; admins see locked sets; the club decides the four; members see matches only after that.

## K1 Round overview and decide (admin)
+--------------------------------------+
| (logo) Hi, Abhiram              ( A )|  top bar, Admin link
| < Admin                              |
| Closet Picks round                   |
| Open. 31 members locked, 9 still     |
| choosing, 12 have no picks.          |
|                                      |
| Most picked        [Locked only: on] |
| ------------------------------------ |
| [ ] Dungeon Crawler Carl      14 picks|
|     Matt Dinniman                    |
| [x] Project Hail Mary         11     |
| [x] The Seed Children          9     |
| [ ] Jacked                     7     |
| [x] ... (infinite scroll)            |
|                                      |
| 3 of 4 chosen                        |
|            [ Decide the four  > ]    |  floating, thumb zone
| [Home][Directory][Library][Club][Me] |
+--------------------------------------+
- Tick up to four. Count line above the button. Button disabled until 4 ticked.
- "Locked only" on by default: tally counts only locked sets. Off: counts every pick, locked or not.
- Row tap opens who picked it (names, locked or not) in a bottom sheet.

## K2 Confirm (bottom sheet)
+--------------------------------------+
| Decide the four?                     |
| 1 Project Hail Mary                  |
| 2 The Seed Children                  |
| 3 Dungeon Crawler Carl               |
| 4 Jacked                             |
| Members will then see which books    |
| others also picked. Undo for 7 days. |
| [ Cancel ]        [ Decide  > ]      |
+--------------------------------------+

## K3 Decided state (admin)
+--------------------------------------+
| < Admin                              |
| Closet Picks round                   |
| Decided 19 Oct 2026. The four:       |
| 1 Project Hail Mary      11 picked   |
| 2 The Seed Children       9          |
| 3 Dungeon Crawler Carl   14          |
| 4 Jacked                  7          |
| Matches are visible to members.      |
|              [ Undo (7 days) ]       |
|            [ Start a new round  > ]  |
+--------------------------------------+
Undo hides matches again and reopens the round. New round clears picks and locks.

## K4 Member view after decision (existing Closet Picks page)
Each of my four gets a line: "9 others also picked The Seed Children". A book the club chose is marked "In the closet". Before the decision no such line shows anywhere.

## Needs your call (no silent defaults)
1. Is "the club's four" the books shown in the closet for the round, or separate from the closet?
2. When a new round starts, are members' old picks cleared, or kept as a starting list?
3. Can an admin pick fewer than four, or must it be exactly four?
4. May admins see who picked what before deciding (named list), or counts only?
5. Round has a name/date, or one round at a time with no history? (Mockup default if unanswered: one round, history in All changes.)
6. Notify members when decided (N3 notify path), or silent?


# L sheets: Library (where the real closet lives)
Current deployment (read from `CriterionBookCloset.tsx`, route `/library-room`): two views, Closet (dark, 3D shelves) and List (paper); sticky header with "BBB Library", Meetups, Readers, Admin, search (closet only), Filters, Picks (n), Polaroid, Refresh (admin), view toggle; a Library Bag tray of 4 slots; Surprise Me.

## L1 Library, closet view (phone, flat shelves)
Header option A, one row, icons plus text:
+--------------------------------------+
| < Library              [Closet|List] |
| (search: title, author, spine no.)   |
+--------------------------------------+
|  SHELF 1 . Fiction                   |
|  |_|||_|_||__|||_|__|  (spines)      |
|  |_|||_|_||__|||_|__|                |
|  < Shelf 1 of 24 >                   |
|        [Filters] [Picks 2] [Surprise]|  floating, right, thumb zone
| [Home][Directory][Library][Club][Me] |
+--------------------------------------+
Header option B, two tiers (title tier then tool tier):
+--------------------------------------+
| < Library                       (A)  |
| [Closet | List]   [Search]           |
+--------------------------------------+
Refresh moves to Admin console. Meetups and Readers links go (they live in the Directory tab). Back goes to previous page.

## L2 Library, regular (List) view
Same filter engine as Meetups: search, text tabs with counts, floating Filters, list/grid, infinite scroll. Row: title, author, spine number, picks count; row tap opens book detail.
Toggle [Closet | List] stays in the header so a member can switch any time.

## L3 Book detail: the pick action
+--------------------------------------+
| < Library                            |
| Dungeon Crawler Carl   Matt Dinniman |
| Discussed at #97 . 14 picks          |
| [ Add to my picks ]  floating bottom |
+--------------------------------------+
Picks are tagged: Favourite, or Want to read.

## L4 Picks metric (admin)
+--------------------------------------+
| < Admin                              |
| Closet Picks                         |
| Most picked          [All | Favourite | Want to read] |
| Dungeon Crawler Carl            14   |
|   Abhiram, 12 Oct . Priya, 3 Oct ... |
| History                              |
| 19 Oct  Abhiram added Jacked (Want)  |
+--------------------------------------+
Every pick stores who and when; history lists adds and removals.
