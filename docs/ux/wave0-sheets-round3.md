# Layout sheets, round 3 (2026-10-18, proposals)

Revised after founder feedback: D1 is now envelope tiles (see the live concept at directory.html); D2 and D3 follow the DealPipeline filtering engine and add a grid view; FAQ moves inside About (C2); A2 is rebuilt from PRESENTER - ADMIN MODULE IDEAS.txt.

```
D2 MEETUPS: list view                 D2 MEETUPS: grid view (2 cols)
+---------------------------------+   +---------------------------------+
| Directory > Meetups     (Q)     |   | Directory > Meetups     (Q)     |
|---------------------------------|   |---------------------------------|
| Meetups  . 68                   |   | Meetups  . 68                   |
| By the number ________  [x]     |   | By the number ________  [x]     |
| All 68  Bookworm 35  Atta 19    |   | All 68  Bookworm 35  Atta 19    |
| Online 4  Art Studio 1          |   | List | Grid                     |
| Year  Month  Sort  Filters >    |   |---------------------------------|
| List | Grid                     |   | #99           #98               |
| 2026 x  Bookworm x  Reset all   |   | 23 Aug 2026   1 Jul 2026        |
|---------------------------------|   | Bookworm       Bookworm         |
| Showing 8 meetups               |   | 16 readers     21 readers       |
| Meetup #99                      |   |                                 |
| 23 Aug 2026 . Bookworm          |   | #97           #96               |
| 16 readers                      |   | 28 Jun 2026   1 May 2026        |
|---------------------------------|   | Bookworm       Bookworm         |
| Meetup #98 ...                  |   | 18 readers     18 readers       |
| [ Show 20 more ]                |   |---------------------------------|
|---------------------------------|   | [ Show 20 more ]                |
| Home Dir. [LIB] Club  Me        |   |---------------------------------|
+---------------------------------+   | Home Dir. [LIB] Club  Me        |
                                      +---------------------------------+

D3 READERS: list view                 D3 READERS: grid view (2 cols)
+---------------------------------+   +---------------------------------+
| Directory > Readers     (Q)     |   | Directory > Readers     (Q)     |
|---------------------------------|   |---------------------------------|
| Readers  . 140                  |   | Readers  . 140                  |
| By name ____________  [x]       |   | By name ____________  [x]       |
| All 140  Member 114             |   | All 140  Member 114             |
| BYOB 18  Guest 8                |   | List | Grid                     |
| Sort  Filters >                 |   |---------------------------------|
| List | Grid                     |   |  [ AR ]        [ DT ]           |
|---------------------------------|   |  <name>        <name>           |
| [AR] <display name>             |   |  34 books      12 books         |
|      34 books . 21 meetups      |   |                                 |
|---------------------------------|   |  [ JM ]        [ SK ]           |
| [DT] <display name>             |   |  <name>        <name>           |
|      12 books . 9 meetups       |   |  9 books       7 books          |
|---------------------------------|   |---------------------------------|
| [ Show 20 more ]                |   | [ Show 20 more ]                |
|---------------------------------|   |---------------------------------|
| Home Dir. [LIB] Club  Me        |   | Home Dir. [LIB] Club  Me        |
+---------------------------------+   +---------------------------------+

C2 ABOUT with FAQ inside              C2 (continued): FAQ section
+---------------------------------+   +---------------------------------+
| Club > About            (Q)     |   | FAQ                             |
|---------------------------------|   |---------------------------------|
| About                           |   | When and where do you meet?  +  |
| A friendly neighbourhood        |   | How do I join?              +   |
| book club.                      |   | What is this site?  (open)  -   |
|---------------------------------|   | An archive of the club's        |
| WHO  Since 2017, started        |   | meetups, books and readers.     |
| by Abhiram R and Radhika        |   | Version 0.1.0-beta.             |
| Chauhan.                        |   | How is my name removed?     +   |
| WHEN Fourth or last Sunday,     |   | How do I link my record?   +    |
| 2:30-4:30 pm.                   |   |---------------------------------|
| WHERE Bookworm, Church St.      |   | Still stuck? Email the club.    |
| JOIN Substack, Facebook,        |   | Built by <developer card>       |
| Twitter.                        |   |---------------------------------|
|---------------------------------|   | Home Dir. [LIB] Club  Me        |
| [ Subscribe for the next one >] |   +---------------------------------+
+---------------------------------+

A2 RECORD A MEETUP, step 1 and 2      A2 step 2: who came
+---------------------------------+   +---------------------------------+
| Record a meetup        (Q)      |   | Record a meetup        (Q)      |
|---------------------------------|   |---------------------------------|
| 1 of 4 . The meet               |   | 2 of 4 . Who came               |
|---------------------------------|   |---------------------------------|
| Date     [ 11 / 10 / 2026 cal ] |   | Add a person:                   |
| Venue    [ Bookworm       v ]   |   | ( ) Member  -> pick by name     |
| (presets: Bookworm, Atta        |   | or member code                  |
| Galatta, Online, Art Studio,    |   | ( ) New person -> type a name   |
| Other)                          |   | A member is someone who has     |
| Presenter [ name           ]    |   | attended twice and is in the    |
|---------------------------------|   | WhatsApp group.                 |
| [ Next ]                        |   |---------------------------------|
|---------------------------------|   | <member name>  member   [x]     |
| Home Dir. [LIB] Club  Me        |   | <name>     new      [x]         |
+---------------------------------+   |---------------------------------|
                                      | [ Back ]   [ Next ]             |
                                      +---------------------------------+

A2 step 3: the books                  A2 step 4: review and submit
+---------------------------------+   +---------------------------------+
| Record a meetup        (Q)      |   | Record a meetup        (Q)      |
|---------------------------------|   |---------------------------------|
| 3 of 4 . The books              |   | 4 of 4 . Check and send         |
|---------------------------------|   |---------------------------------|
| Book     [ title          ]     |   | e.g. Meetup #100, 11 Oct 2026   |
| Author   [ name           ]     |   | Samagata Foundation             |
| [ Look it up ]                  |   | 22 people (3 new) . 4 books     |
| Fills ISBN, published date,     |   |---------------------------------|
| genre. Every field stays        |   | This will change:               |
| editable.                       |   | meetups +1, attendance +22,     |
|---------------------------------|   | books +4, one log entry         |
| Added: <title>, <author>        |   |---------------------------------|
|---------------------------------|   | [ Back ]   [ Submit ]           |
| [ Back ]   [ Next ]             |   |---------------------------------|
+---------------------------------+   | after Submit: counts update,    |
                                      | and 'Recent changes' shows it   |
                                      +---------------------------------+

```
