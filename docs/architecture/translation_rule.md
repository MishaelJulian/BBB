# Translation rule

Decided by the founder on 2026-10-12. This replaces the earlier unwritten idea "one work, translation recorded on the edition".

1. **A translation is its own book record.** It is separate from the original, so a mention of one is never counted as a mention of the other.
2. **The translator goes in the title string**, like this: `Ponniyin Selvan (tr. Varalotti Rengasamy)`. There is no translators table and no translator column.
3. **The link to the original** is one row in `book_relations`: `source_book_id` = the translation, `target_book_id` = the original, `relation_type` = `'translation_of'`.
4. **A mention that names no translator stays on the original record.** A translator is attached only when the source names one (for example "tr. Pavitra Srinivasan"). A translator is never taken from Goodreads or another outside source: if the source names none, the record is the English version "as is".
5. **Volumes get no record of their own.** A "Vol. 1" record is merged into the work, unless a source literally says volume 2 or higher was also read.
6. **Audiobooks** carry the label in the title string: `Balakumaranin Udayar Part 1 (audiobook)`.
7. **One English edition in the club's data: one row, no link** (founder, 2026-10-12). The translator goes in that row's title. A `translation_of` link is used only when the club has both an original-language or as-is record and a separately named translation of the same work (Ponniyin Selvan).
8. **Several authors** go in one string in `authors.full_name`, joined as the source joins them: `Mary Ann Shaffer & Annie Barrows`. There is no co-author table and no translator column (founder, 2026-10-12).

## In use today (2026-10-12)

| Translation | Original |
|---|---|
| Ponniyin Selvan (tr. Varalotti Rengasamy), mention at #83 | Ponniyin Selvan (mentions #54, #62, #98) |
| Ponniyin Selvan (tr. Pavitra Srinivasan), mention at #88 | Ponniyin Selvan |
| Sivagami's Vow (no translator named; the English version as is), mention at #97 | Sivagamiyin Sabatham, mention at #62 |
| Heart Lamp (tr. Deepa Bhasthi), one row, mentions #83 to #92 | none (the Kannada original is not in the DB) |
| Bhima: Lone Warrior (tr. Gita Krishnankutty), one row, mentions #80, #92 | none (the Malayalam original is not in the DB) |
| The Secret Garland (tr. Archana Venkatesan), one row, mention #92 | none (the Tamil original is not in the DB) |

The meetup 97 PDF names no translator for Sivagami's Vow (founder, 2026-10-12), so none is recorded.

Open Library already splits translations into separate works, so this matches the open-data sources.
