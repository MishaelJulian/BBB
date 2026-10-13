# UI anti-pattern report (BBB, 2026-10-13)

The 20 anti-patterns come from the founder's file `how to really think about UIUX as well.txt`. Each is scored against the code audit of `frontend/src` done 2026-10-13. **Present** = evidence found; **Partial** = some evidence; **Not audited** = nobody has looked yet (do not read it as "fine"); **N/A** = BBB has no such feature. Counts are `grep` counts, not rendered-page measurements.

| # | Anti-pattern | Status | Evidence / next check |
|---|---|---|---|
| 1 | Random gradients without hierarchy | Present | ~93 gradient hits; `Shelf.tsx:66,77,146,166` (closet). Check which are intentional wood/shadow effects in the closet vs decoration elsewhere. |
| 2 | Excessive glassmorphism | Partial | `backdrop-blur` in `admin/page.tsx:733,1245,1377,1455` (modal scrims), `members/page.tsx:166`. Few uses. |
| 3 | Colour as decoration, not meaning | Partial | One accent in tokens (`tailwind.config.ts:11-36`) but pages use raw `amber-*` and hex (`admin/page.tsx:733`, `library-room/page.tsx:11`). Colour semantics not mapped yet. |
| 4 | Oversized cards that waste density | Not audited | Needs visual review of `/meetups`, `/members`. |
| 5 | Uniform card sizes despite different importance | Not audited | Same. |
| 6 | Animations that compete for attention | Partial (inference) | `framer-motion` in 12 files; closet 3D hover `translateZ(36px) scale(1.08)` at `CriterionBookCloset.tsx:183`. Not judged visually. |
| 7 | Inconsistent spacing scale | Not audited | No spacing tokens found in the audit summary. |
| 8 | Low-contrast secondary text | Not audited | Earlier Lighthouse accessibility scored 96 on the live site, which suggests most contrast passes; re-check `text-muted` on `bg-paper-dark` with an AA tool before locking tokens. |
| 9 | Charts without context | N/A / Not audited | No charts found; home/footer stats come from the live DB. |
| 10 | Overloaded pages, no primary action | Partial | `admin/page.tsx` is over 1,450 lines in one client component; closet file is 2,893 lines. Visual density not reviewed. |
| 11 | Generic AI illustrations as empty states | Not audited | 404 copy ("That page is not on our shelves") is on-brand. Empty states elsewhere unchecked. |
| 12 | Excessive shadows | Present | `shadow-*` x169 across `.tsx`. Named shadows `book`, `card`, `*-hover` exist in config. |
| 13 | Filters hidden behind interactions | Not audited | Closet filters are four labelled selects (a11y fix `f2d21aa`); discoverability not reviewed. |
| 14 | Tables that do not support scanning | Not audited | |
| 15 | Ambiguous icons without labels | Present | Desktop Search and Command-palette icon buttons in `Navigation.tsx:66-100` have no `onClick` (dead); emoji used as icons at `meetups/[id]/page.tsx:145,153`; `✕` at `members/page.tsx:182,338`. |
| 16 | Notifications by recency not importance | N/A | No notification system. |
| 17 | Decorative metrics | Not audited | Footer stats are real (`fetchStats`). Home hero counts not checked. |
| 18 | Overuse of rounded corners | Present | `rounded-full` x137, `rounded-xl` x102, `rounded-lg` x43, `rounded-2xl` x20, `rounded-3xl` x7 (the last two are outside the token scale `tailwind.config.ts:100-107`). |
| 19 | CTA placement interrupts workflow | Not audited | |
| 20 | Mixed component libraries, no design system | Partial | Radix dialog + custom components; tokens bypassed (see 3, 18). No shadcn in use. |

## Beyond the 20 (founder colour reasoning, `site insposlist.txt`)
- Default Tailwind stops used verbatim: **Partial/unknown**; `amber-*` utilities are Tailwind defaults used across pages. Shifting hues off defaults is the founder's single "highest-leverage" move.
- Coloured icon chip per stat card: not found in the audit; not checked in rendered pages.
- Typography: only Inter is loaded; the heading font Georgia is a system font and `--font-body` is the literal `'Inter'` (`layout.tsx:5`, `globals.css:36`), which may not use next/font's hashed family. **Unverified in a browser.**

## What is still unknown
9 of 20 are "Not audited" and 1 more is "N/A / Not audited" (#9). Phase 0b (side-by-side versions of the meetup page) is where most of them get seen and scored.
