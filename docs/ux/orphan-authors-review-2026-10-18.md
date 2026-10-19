# Orphan authors: cross-reference review (2026-10-18, read-only; nothing deleted)

Evidence used, in order: `imported_books.raw_author` (which book each orphan was imported for), then the 41 PDFs and notes in `sources/` (text layer only; PDF #97 has none), then Open Library for ISBNs.

Per-author proposals: `orphan-authors-dispositions-2026-10-18.csv` (396 rows).

| Proposal | Rows |
|---|---|
| DELETE (safe: twin or corrected-author book exists) | 284 |
| HOLD (title clash, DB book has a different author) | 8 |
| REVIEW (no safe evidence) | 90 |
| KEEP (used by a series) | 14 |

## ISBN and clash check

The DB holds no ISBN at all (isbn10 and isbn13 are empty on all 2,739 books), so an ISBN cannot clash with an existing ISBN. Clashes below are by title and author, and by Goodreads id (2,300 books have one). ISBNs are the first edition Open Library lists, so they are edition-specific.

| Wanted (PDF) | Open Library | First year | ISBN | In DB under same title |
|---|---|---|---|---|
| Chemmeen (Thakazhi Sivasankara Pillai) | Chemmeen / Thakazhi Sivasankara Pillai | 1962 | 9788171305506 | Chemmeen by തകഴി |Thakazhi Sivasankara Pillai |
| The Faithful and the Fallen (John Gwynne) | Wrath (The Faithful and the Fallen) / John Gwynne | 2016 | 9781447259688 | not in DB |
| Magician (Raymond E. Feist) | Magician / Raymond E. Feist | 1982 | 9789029055505 | not in DB |
| ISRO: A Personal History (Gita Aravamudan) | not found /  |  |  | not in DB |
| The Rise of Islam and the Bengal Frontier (Richard Eaton) | The rise of Islam and the Bengal frontier, 1204-1760 / Richard Maxwell Eaton | 1993 | 9780520080775 | not in DB |
| Factfulness (Hans Rosling) | Factfulness / Hans Rosling | 2018 | 9783548060415 | Factfulness by Hans Rosling; Factfulness: Ten Reasons We're Wrong Abo by Hans Rosling |
| 2666 (Roberto Bolaño) | 2666 / Roberto Bolaño | 2004 | 9789934039829 | 2666 by Roberto Bolaño |
| The Forty Rules of Love (Elif Shafak) | The Forty Rules of Love / Elif Şafak | 2010 | 9780143118527 | The forty rules of love by Elif Shafak |
| Showa: A History of Japan (Shigeru Mizuki) | not found /  |  |  | Showa - A History of Japan by (no author) |
| Palestine (Joe Sacco) | Palestine / Joe Sacco | 1994 | 9780613509817 | not in DB |
| Em and the Big Hoom (Jerry Pinto) | Em and the Big Hoom / Jerry Pinto | 2014 | 9780670923595 | Em and The Big Hoom by Jerry Pinto |
| Motherland (Leah Franke) | not found /  |  |  | not in DB |
| The Story of a Brief Marriage (Anuk Arudpragasam) | The story of a brief marriage / Anuk Arudpragasam | 2016 | 9781250072405 | not in DB |
| Did Six Million Really Die (Richard Harwood) | Did six million really die? / Richard Verrall | 1974 | 9780950347103 | not in DB |
| I'm Thinking of Ending Things (Iain Reid) | I'm Thinking of Ending Things / Iain Reid | 2016 | 9786051920092 | I'm Thinking of Ending Things by Iain Reid |
| Ideology and Identity (Pradeep Chhibber) | Ideology and Identity / Pradeep K. Chhibber | 2018 | 9780190623876 | Ideology and Identity: The Changing Part by Pradeep K. Chhibber |
| Butter (Asako Yuzuki) | Butter / Asako Yuzuki | 2017 | 9784103355328 | Butter by Erin Jade Lange |
| Mossad (Michael Bar-Zohar) | Mossad / Michael Bar-Zohar | 2012 | 9781742756264 | Mossad by Michael Bar-Zohar |
| Aapka Bunty (Namrata Bhandari) | not found /  |  |  | not in DB |
| Mountain Tasting (Santoka) | Mountain Tasting / Santōka Taneda | 2009 | 9781935210993 | not in DB |
| The Impending Blindness of Ellie Scott (?) | not found /  |  |  | not in DB |
| Ship of Magic (Robin Hobb) | Ship of Magic / Robin Hobb | 1998 | 9780007383467 | Ship of Magic by Robin Hobb |
| The Adventures of Amina Al Sirafi (Shannon Chakraborty) | The Adventures of Amina Al-Sirafi / Shannon A. Chakraborty | 2023 | 9780062963529 | The Adventures of Amina al-Sirafi by S.A. Chakraborty |
| Underland (Robert Macfarlane) | Underland / Robert Macfarlane | 2019 | 9780241146422 | Underland by Suzanne Collins |
| Caste (M. Subramaniam) | not found /  |  |  | Caste: The Origins of Our Discontents by Isabel Wilkerson |
| Sabrina (Nick Drnaso) | Sabrina / Nick Drnaso | 2018 | 9781783784905 | Sabrina by Kali Fajardo-Anstine |
| A People's Constitution (Rohit De) | A People's Constitution / Rohit De | 2018 | 9780691210384 | A People’s constitution by Jesse Wegman |

Open Library found nothing for: ISRO: A Personal History, Motherland (Leah Franke), Aapka Bunty, The Impending Blindness of Ellie Scott (the DB has 'Billie Scott' by Zoe Thorogood, probably the same book with a typo in the PDF), Caste (M. Subramaniam), Showa (the DB has it with no author).

True title clashes (same title, DB author differs from the PDF author): Butter (Yuzuki vs Erin Jade Lange), Underland (Macfarlane vs Suzanne Collins), Sabrina (Drnaso vs Kali Fajardo-Anstine), A People's Constitution (De vs Jesse Wegman), Caste, Motherland (Leah Franke vs Y: The Last Man Vol. 9), Kindred (R W Sykes vs Octavia Butler), Dogs of War (Tchaikovsky vs Forsyth), Did Six Million Really Die (Harwood vs Kulaszka). Kindred, Dogs of War, Motherland and Did Six Million rest on my own knowledge of the books, not on a lookup.

## Other findings
- 156 books have no author at all (61 of them have discussions).
- Extra junk book rows: 'Mentions ⟩⟩⟩' (by 'AManCalledOve FrederikBackman'), 'Genre Specific' (by 'Creative Editor Shin Hashiba', 1 discussion) and 13 '<member> <number>' rows with 0 discussions.
- PDF #97 (BBB 97, June 2026) has no text layer and was not read.
