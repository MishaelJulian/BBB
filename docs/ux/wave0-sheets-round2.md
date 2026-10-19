# Next-round layout sheets (proposals, 2026-10-18)

Global: orange accent, 72 px top bar that scrolls away, static map behind on phones, no cards or grid, five-tab bar (Library larger), deep-blue footer. Decisions applied: 140 members shown, club Gmail listed first in N3, 'Did you read today' inside Me only.

```
D1 DIRECTORY                          D2 MEETUPS LIST
+---------------------------------+   +---------------------------------+
| [logo] BBB Library       (Q)    |   | Directory > Meetups     (Q)     |
|---------------------------------|   |---------------------------------|
| Directory                       |   | Meetups                         |
| The archive in two doors.       |   | 68 on record                    |
|---------------------------------|   | Find a number ________          |
| Meetups                 >       |   | Year  Month  Venue  Sort >      |
| 68 on record, 2017 to 2026      |   | 2026 x   Bookworm x             |
|   #99  23 Aug 2026  Bookworm    |   |---------------------------------|
|   #98  1 Jul 2026   Bookworm    |   | Meetup #99                      |
|---------------------------------|   | 23 Aug 2026 . Bookworm          |
| Readers                 >       |   | 16 readers                      |
| 140 members                     |   | <description line if any>       |
|   <name>   <name>               |   |---------------------------------|
|   (recently active)             |   | Meetup #98 ...                  |
|---------------------------------|   | [ Show 20 more ]                |
| Home Dir. [LIB] Club  Me        |   |---------------------------------|
+---------------------------------+   | Home Dir. [LIB] Club  Me        |
                                      +---------------------------------+

D3 READERS LIST                       C1 CLUB
+---------------------------------+   +---------------------------------+
| Directory > Readers     (Q)     |   | [logo] BBB Library       (Q)    |
|---------------------------------|   |---------------------------------|
| Readers                         |   | Club                            |
| 140 members                     |   |---------------------------------|
| Find a name _________           |   | About                   >       |
| Sort: Most books read   v       |   | Gallery                 >       |
|---------------------------------|   | Lists                   >       |
| <display name>                  |   | Special events          >       |
| 34 books . 21 meetups           |   | FAQ                     >       |
|---------------------------------|   | Contact                 >       |
| <display name> ...              |   |---------------------------------|
| [ Show 20 more ]                |   | Substack Instagram Twitter      |
|---------------------------------|   | Facebook group                  |
| Home Dir. [LIB] Club  Me        |   |---------------------------------|
+---------------------------------+   | Home Dir. [LIB] Club  Me        |
                                      +---------------------------------+

C2 ABOUT (old site, rebuilt)          C3 FAQ (accordion x5)
+---------------------------------+   +---------------------------------+
| Club > About            (Q)     |   | Club > FAQ              (Q)     |
|---------------------------------|   |---------------------------------|
| About                           |   | FAQ                             |
| A friendly neighbourhood        |   |---------------------------------|
| book club.                      |   | When and where do you meet?  +  |
|---------------------------------|   | How do I join?              +   |
| WHO  Since 2017, started        |   | What is this site?  (open)  -   |
| by Abhiram R and Radhika        |   | An archive of the club's        |
| Chauhan.                        |   | meetups, books and readers.     |
| WHEN Fourth or last Sunday,     |   | Version 0.1.0-beta.             |
| 2:30-4:30 pm.                   |   | How is my name removed?     +   |
| WHERE Bookworm, Church St.      |   | How do I link my record?   +    |
| JOIN Substack, Facebook         |   |---------------------------------|
| group, Twitter.                 |   | Still stuck? Email the club.    |
|---------------------------------|   |---------------------------------|
| [ Subscribe for the next one >] |   | Home Dir. [LIB] Club  Me        |
| Built by <developer card>       |   +---------------------------------+
| Home Dir. [LIB] Club  Me        |
+---------------------------------+

T1 TOP BAR STATES (72 px)             M1 ME (member)
+---------------------------------+   +---------------------------------+
| signed out:                     |   | Me                       (Q)    |
| [logo] BBB Library      (Q)     |   |---------------------------------|
|---------------------------------|   | Hi, Abhiram                     |
| signed in, no record linked:    |   | [ toy library card ]            |
| [logo] BBB Library      (Q)     |   |---------------------------------|
| (no greeting: the name must     |   | DID YOU READ TODAY?  (N1)       |
| come from a linked record)      |   |---------------------------------|
|---------------------------------|   | Your entries            >       |
| member:                         |   | Wishlist (Goodreads)    >       |
| [logo] Hi, Abhiram [card] (Q)   |   | Shortlist, top 4        >       |
|---------------------------------|   | Profile and account     >       |
| admin: same as member; the      |   | Admin (admins only)     >       |
| Admin door is inside Me         |   |---------------------------------|
|---------------------------------|   | Sign out                        |
| no 'BBB Bangalore' tag          |   |---------------------------------|
+---------------------------------+   | Home Dir. [LIB] Club  Me        |
                                      +---------------------------------+

A1 ADMIN HOME                         A3 STATISTICS (admin only)
+---------------------------------+   +---------------------------------+
| Admin                    (Q)    |   | Admin > Statistics    (Q)       |
|---------------------------------|   |---------------------------------|
| Record a meetup         >       |   | ~~~~~~~~~~~o~~~~~~~~~~~~~~      |
| Add books to a meetup   >       |   | elastic line: pull it, it       |
| Edit a book             >       |   | springs back (stats only)       |
| Members + invite codes  >       |   |---------------------------------|
| Statistics              >       |   | 68 meetups    140 members       |
| Notify members (N3)     >       |   | 2,741 books   8.2 readers/mtg   |
| Refresh the closet      >       |   |---------------------------------|
|---------------------------------|   | MEETUPS PER YEAR (real data)    |
| RECENT CHANGES                  |   | 2017 ## 2                       |
| meetup.create #100 ... (log)    |   | 2018 ######## 8                 |
| tap = before and after          |   | 2019 ######### 9                |
|---------------------------------|   | 2020 ### 3                      |
| Home Dir. [LIB] Club  Me        |   | 2021 ### 3                      |
+---------------------------------+   | 2022 ####### 7                  |
                                      | 2023 ##### 5                    |
                                      | 2024 ############ 12            |
                                      | 2025 ########### 11             |
                                      | 2026 ######## 8                 |
                                      |---------------------------------|
                                      | Bookworm 35 . Atta Galatta 19   |
                                      | Online 4 . Art Studio 1         |
                                      | Home Dir. [LIB] Club  Me        |
                                      +---------------------------------+

N1 DID YOU READ TODAY (Me tab)        N2 LETTER (after sign-up/claim)
+---------------------------------+   +---------------------------------+
| Me                       (Q)    |   | (paper sheet, typewriter type)  |
|---------------------------------|   |---------------------------------|
| DID YOU READ TODAY?             |   | Dear reader,                    |
| [ Yes ]    [ Not today ]        |   |                                 |
| asked once a day, never a       |   | This is BBB Library             |
| pop-up, no streak shame         |   | 0.1.0-beta, an early build.     |
|---------------------------------|   | Things will move and break.     |
| after Yes:                      |   | If it works for you, tell us,   |
| Thanks. Noted for today.        |   | and we will bring you into      |
| 12 days this month.             |   | the full version.               |
|---------------------------------|   |                                 |
| needs a new reading log:        |   | - Dhilipan, System Architect    |
| member, day, yes or no          |   |---------------------------------|
|---------------------------------|   | [ Got it ]      (pixel seal)    |
| push: later (installed app      |   |---------------------------------|
| plus HTTPS)                     |   | shown once: after your first    |
|---------------------------------|   | sign-in and after linking       |
+---------------------------------+   |---------------------------------|
                                      +---------------------------------+

N3 NOTIFY MEMBERS (wireframe)         A2 RECORD A MEETUP
+---------------------------------+   +---------------------------------+
| Admin > Notify         (Q)      |   | Record a meetup        (Q)      |
|---------------------------------|   |---------------------------------|
| AUDIENCE                        |   | Step 1 of 4 . Basics            |
| Accounts that can be reached:   |   |---------------------------------|
| 1 (0 linked to a member)        |   | Number  <next: 100>             |
|---------------------------------|   | Date    [ 11 / 10 / 2026  cal ] |
| SUBJECT  <meetup RSVP>          |   | Venue   [ Bookworm       v ]    |
| PREVIEW (typewriter type)       |   |---------------------------------|
| <the Substack RSVP text>        |   | flatpickr, Carbon look: arrow   |
| [ Send ]  (disabled)            |   | keys, Esc, error text under     |
|---------------------------------|   | the field                       |
| SENDING IS NOT CONNECTED        |   |---------------------------------|
| A  club Gmail over SMTP         |   | [ Back ]   [ Save step ]        |
| B  own domain + sender          |   |---------------------------------|
|---------------------------------|   | Home Dir. [LIB] Club  Me        |
| Home Dir. [LIB] Club  Me        |   +---------------------------------+
+---------------------------------+

```
