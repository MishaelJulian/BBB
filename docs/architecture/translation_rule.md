# Translation rule

Decided by the founder on 2026-10-12. This replaces the earlier unwritten idea "one work, translation recorded on the edition".

1. **A translation is its own book record.** It is separate from the original, so a mention of one is never counted as a mention of the other.
2. **The translator goes in the title string**, like this: `Ponniyin Selvan (tr. Varalotti Rengasamy)`. There is no translators table and no translator column.
3. **The link to the original** is one row in `book_relations`: `source_book_id` = the translation, `target_book_id` = the original, `relation_type` = `'translation_of'`.
4. **A mention that names no translator stays on the original record.** A translator is attached only when the source names one (for example "tr. Pavitra Srinivasan"). Where the source names none but Goodreads does for the matched edition, the Goodreads name may be used and the choice is noted in `docs/review/clarity_needed_books.md`.
5. **Volumes get no record of their own.** A "Vol. 1" record is merged into the work, unless a source literally says volume 2 or higher was also read.
6. **Audiobooks** carry the label in the title string: `Balakumaranin Udayar Part 1 (audiobook)`.

## In use today (2026-10-12)

| Translation | Original |
|---|---|
| Ponniyin Selvan (tr. Varalotti Rengasamy), mention at #83 | Ponniyin Selvan (mentions #54, #62, #98) |
| Ponniyin Selvan (tr. Pavitra Srinivasan), mention at #88 | Ponniyin Selvan |
| Sivagami's Vow (tr. Sumeetha Manikandan), mention at #97 | Sivagamiyin Sabatham, mention at #62 |

The Sivagami translator comes from Goodreads (id 199552323), not from the PDF for meetup 97, whose text I could not read.

Open Library already splits translations into separate works, so this matches the open-data sources.
