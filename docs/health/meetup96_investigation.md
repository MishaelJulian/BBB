# Meetup #96 Investigation Report

**Date**: 2026-07-22
**Investigator**: MiMoCode

---

## Finding

Meetup #96 actually contains **54 books**, not 4 as reported.

### PDF Content Analysis

The PDF "BBB #96 May 2026, Books Discussed.pdf" contains:
- **43 member books** (from 18 members)
- **11 general discussion books**
- **Total: 54 books**

### Why Only 4 Were Extracted

The parser only extracted the last 4 books from the "GENERAL DISCUSSION BOOKS" section because:

1. **ChatGPT Summary**: The PDF starts with a ChatGPT-generated summary that mentions book titles in prose form (e.g., "House of Leaves", "Harry Potter")
2. **Table Format**: The actual book list is in a table format with member names and numbered entries
3. **Parser Limitation**: The `_extract_books_flat()` function doesn't handle the numbered table format correctly
4. **Truncation**: The raw_text stored in the database is truncated at 2000 characters, cutting off most of the book list

### Books Actually in the PDF

| # | Member | Title | Author |
|---|--------|-------|--------|
| 1 | Anindita | HBR's 10 Must Reads for New Managers | Harvard Business Review |
| 2 | Anindita | Apples Never Fall | Liane Moriarty |
| 3 | Anindita | Resurrection | Danielle Steel |
| 4 | Dhilipan | Sacred Games | Vikram Chandra |
| 5 | Sameer | There is no Antimemetics Division | Qntm |
| 6 | Sameer | The Last Murder at the End of the World | Stuart Turton |
| 7 | Sameer | Audition | Ryu Murakami |
| 8 | Sameer | The Bucket | Arnab Ray |
| 9 | Sameer | Nammamma Andre Nangishta | Vasudhendra |
| 10 | Abhiram | The Correspondent | Virginia Evans |
| 11 | Pradeep | Enshittification | Cory Doctorow |
| 12 | Madhusudan | If on a Winter's Night, a Traveler | Italo Calvino |
| 13 | Madhusudan | Headshot | Rita Bullwinkel |
| 14 | John Raju | House of Leaves | Mark Z Danielewski |
| 15 | John Raju | Test Cricket: A History | Tim Wigmore |
| 16 | Padmini | The Liberation of Sita | Volga |
| 17 | Padmini | Stories of the True | Jeyamohan |
| 18 | Padmini | ISRO: A Personal History | Gita Aravamudan, R Aravamudan |
| 19 | Sreelakshmi | Days at the Morisaki Bookshop | Satoshi Yagisawa |
| 20 | Sreelakshmi | The Seven Deaths of Evelyn Hardcastle | Stuart Turton |
| 21 | Vinay Leo | Harry Potter & The Philosopher's Stone | JK Rowling |
| 22 | Vinay Leo | The Sign of the Four | Sir Arthur Conan Doyle |
| 23 | Vinay Leo | Journey to the Centre of the Earth | Jules Verne |
| 24 | Anjali | St Clare's Series | Enid Blyton |
| 25 | Anjali | The Covenant of Water | Abraham Verghese |
| 26 | Anjali | The Tree, The Well and The Drag Queen | Salini Vineeth |
| 27 | Dr Chaitanya | A Psalm for the Wild Built | Becky Chambers |
| 28 | Dr Chaitanya | A Prayer for the Crown Shy | Becky Chambers |
| 29 | Dr Chaitanya | Embroideries | Marjane Satrapi |
| 30 | Dr Chaitanya | The White Book | Han Kang |
| 31 | Bharath | The Many Lives of Syeda X | Neha Dixit |
| 32 | Bharath | A Passage to India | EM Forster |
| 33 | Darshan | Troy | Stephen Fry |
| 34 | Darshan | The Long Silence | Shashi Deshpande |
| 35 | Darshan | Butter | Asako Yuzuki |
| 36 | Smriti | Rudraprayagada Bhayanaka Narabhakshaka | Poornachandra Tejaswi |
| 37 | Smriti | Alone | Brett Archibald |
| 38 | Aravind S | Edible Economics | Ha-Joon Chang |
| 39 | Shivankar | Strange Pictures | Uketsu |
| 40 | Shivankar | Strange Houses | Uketsu |
| 41 | Shivankar | Strange Buildings | Uketsu |
| 42 | Sagar | The Restaurant of Lost Recipes | Hisashi Kashiwai |
| 43 | Sagar | The Mill House Murders | Yukito Ayatsuji |

**General Discussion Books:**
| # | Title | Author |
|---|-------|--------|
| 1 | One Minute Manager | Kenneth Blanchard |
| 2 | Dilbert (Comics) | Scott Adams |
| 3 | Zero to One | Peter Thiel |
| 4 | The Last Devil to Die | Richard Osman |
| 5 | Infinite Jest | David Foster Wallace |
| 6 | Son of Nobody | Yann Martel |
| 7 | Surely You're Joking, Mr Feynman! | Richard Feynman, Ralph Leighton |
| 8 | AI Snake Oil | Aravind Narayanan, Sayash Kapoor |
| 9 | Every Day I Read | Hwang Bo-Reum |
| 10 | Persepolis | Marjane Satrapi |
| 11 | One Life is Not Enough | Natwar Singh |

---

## Recommendation

The PDF parser needs to be improved to handle:
1. Numbered table formats (e.g., "1 HBR's 10 Must Reads...")
2. Member-grouped book lists
3. ChatGPT-generated summaries (skip prose, extract list)

This is a parser enhancement task, not a data quality issue.
