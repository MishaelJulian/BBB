# UX thinking for the BBB revamp (components, flows, heat/cold/pain, devices, type, colour)

2026-10-13. Companion to `ADR-ui-revamp.md` (rules), `inspiration-atlas.md` (references), `anti-patterns.md` (audit). Labels: **seen** = I opened the page in a browser and looked at the screenshot; **measured** = computed or counted; **hypothesis** = reasoned, no usage data behind it; **rec** = recommendation. There is no usage analytics on the site yet, so every heat/cold/pain point marked *hypothesis* has to be checked once Speed Insights/Web Analytics and the Playwright click-paths exist.

## 1. What I actually looked at (screenshots, desktop 1440 and phone 390, 13 Oct 2026)
| Site | What is visible | Take for BBB | Do not take |
|---|---|---|---|
| ui.shadcn.com (dashboard example, blocks) **seen** | Neutral black/white UI, left sidebar with icon nav, text tabs, one black primary button. **But** the demo is built from bordered rounded **cards** and **pill badges** ("+12.5%"). On a phone the hero shows a tiny non-interactive screenshot of the dashboard. | Sidebar/nav structure, text-style tabs, one dark primary button, tight spacing. | Card grid, pill badges, the whole dashboard-block look: it breaks the no-cards rule. |
| brandur.org **seen** | Warm off-white paper, humanist sans body, small uppercase nav, one thin rule under the intro, a full-width photo, no cards. Desktop intro line is about 90 characters wide (counted from the screenshot); on a 390 px phone it is about 30. Links are bold with a thin underline. | Closest match to BBB's paper and ink: type-led hierarchy, hairline divider, underlined links, quiet nav. | The ~90-character measure (too long; target 60-75). |
| refero.design **seen** | Left sidebar, serif display heading over a light sans body, text tabs (Popular, Inspiration...), example prompts as plain rows with a small arrow glyph (no boxes). The search box is a bordered box, and a promo popup covers most of a phone screen. | Serif-display plus sans-body pairing; list rows with an arrow glyph instead of tiles. | Popup that blocks the page on mobile (anti-pattern: popups covering the screen, from the founder's checklist). |
| mercury.com **seen** | Full-bleed landscape photo, translucent nav and a translucent bottom bar, periwinkle button, light grotesque type. | Light type weights; one confident accent used on the primary action only. | Glass bars and photo-led hero: the no-glass rule. |
| 21st.dev **seen** | Dark, gradients, animated heroes; sells 12,000+ components and "shadcn themes". | Only as a source of shadcn-compatible parts; nothing visual. | Gradients, dark glow, animated backdrops. |
| linear.app **seen, inconclusive** | The screenshot caught the hero mid-fade, so I can see only a dark page with a minimal top nav. | None from the capture. The earlier atlas row for Linear rests on Linear's blog text only. | |
| fey.com **seen, stale** | Now a closure notice ("Fey joined Wealthsimple... sign-ups are closed"): plain text column, no product UI. | The calm text column. | **Correction:** the earlier atlas used Fey's product (daily recap, ticker). The live site no longer shows it; only the founder's saved screenshots can, and I do not have them. |
| realtimecolors.com **captured, not viewed** | | Use it interactively when locking colours (Phase 0b). | |
Not captured: Mobbin (login), 21st.dev component pages, Criterion closet. Screenshots live in the session scratchpad (`.../scratchpad/refs/`), not in the repo.

## 2. shadcn/ui: primitives only
The `vercel:shadcn` guidance recommends `Card`, `Badge`, dark mode and glass-friendly defaults; the live shadcn demos confirm that look. That contradicts the founder's rule, so:
- **Adopt (rec):** Button, Input, Select, Dialog, AlertDialog (destructive actions), Command (palette), Sheet (mobile nav and filters), Tabs, Table (admin), Breadcrumb, Skeleton, Separator, ScrollArea, Tooltip, Popover, Toggle/Switch, Label, Form helpers.
- **Ban unless the founder approves each use:** Card, Badge (pill), Alert as a boxed panel (use coloured text), anything with backdrop blur or gradients, the dark-mode default, `bg-card` surfaces.
- **How:** components are copied into the repo (own the source), themed through CSS variables mapped to BBB tokens. Run `npx shadcn@latest info` and `view` before adding anything.
- **Compatibility test (2026-10-13, throwaway clone, real fork untouched).** The fork is on Tailwind 3.4.19, React 19.2, Next 15.5.
  - **Tailwind 4.3.3 works** after the official codemod (`npx @tailwindcss/upgrade`, 43 files, config becomes `@theme` in `globals.css`): `tsc` and `next build` pass, shared JS unchanged at 103 kB.
  - **One bug, one-word fix:** the codemod left the whole token/reset block (including `* { margin: 0; padding: 0 }`) inside `@layer utilities`, which beat v4's zero-specificity `space-y-*` and collapsed vertical spacing (up to 21% of pixels changed). Changing that block to `@layer base` gave **0.00% pixel difference** on `/terms`, `/privacy`, `/login` and the 404 at 1280 and 390 px.
  - **Cost:** CSS 86.6 kB to 125.6 kB raw (gzip 14.5 kB to 21.3 kB with the primitives added, about +6.7 kB).
  - **Not tested:** pages that need the database (meetups, books, members, admin, the Library Room closet); the dependabot Tailwind 4 failure seen earlier came bundled with Next 16, not Tailwind alone.
  - **`shadcn init -d` is unsafe here:** it overwrote `src/lib/utils.ts` (deleting `formatDate`, `formatDateShort`, `formatNumber`, `formatMeetupNumber`, `truncate`, `getBookColor`, `getInitials`), added a lowercase `button.tsx` beside the existing `Button.tsx` (breaks on case-insensitive filesystems, and the founder also works on Windows), installed Base UI instead of Radix, and swapped the Inter font setup for Geist with the circular `--font-sans` gotcha. Do not run it in the repo.
  - **Safe route that worked:** write `components.json` by hand (aliases.ui = `@/components/primitives`, so no filename clashes) and run `shadcn add` only. It touched just `package.json`/lockfile and created `components.json` and `src/components/primitives/` (Radix via the unified `radix-ui` package, `cmdk`, `class-variance-authority`). Two manual fixes: install `lucide-react` (imported but not installed by the CLI) and point the components' `cn` import at `@/lib/utils` (the CLI otherwise adds the `cn` package from the shadcn maintainer).
  - **Token bridge needed:** the primitives expect `background`, `foreground`, `popover`, `muted-foreground`, `input`, `ring`, `destructive`, `primary`, `secondary`. BBB's `muted` and `accent` mean text grey and brand brown, so `bg-muted`/`bg-accent` were remapped to `paper-dark` in the primitives. A 14-line `@theme inline` block in `globals.css` maps the rest; result renders in BBB colours (screenshots in the scratchpad).
  - **Still breaks the founder's rules until restyled:** the tab list renders as a grey pill-like box, buttons and inputs carry small shadows, corners are rounded, the dialog is a bordered shadowed box over a dim scrim (the scrim exception is still pending approval in the ADR).
- This changes ADR §11 ("shadcn not added unless asked"): the founder has now asked. Record it there.

## 3. Component inventory (what the UI is made of)
| Layer | Components | Where used | Current state |
|---|---|---|---|
| Shell | Header/nav, Footer, Command palette, mobile menu | all pages except `/` and `/library-room` | Search and Command icon buttons are dead (`Navigation.tsx:66-100`); footer has public Admin link |
| Content atoms | Heading, body text, link, button (primary/secondary/text), input, select, divider | everywhere | Buttons use raw `amber-800`, not the accent token; 3 radius sizes outside the scale |
| Collection items | Book row, Meetup row, Member row, Author line | `/meetups`, `/members`, `/books`, `/authors` | Currently `BookCard`/`MeetupCard`: card style |
| Detail blocks | Fact line, status line, discussion list, PDF/photo, breadcrumb | `/meetups/[id]`, `/books/[id]`, `/authors/[id]`, `/members/[id]` | No breadcrumbs; pills for tags |
| Library Room | Spine, shelf, detail card, filter bar, list view toggle | `/`, `/library-room` | 360 3D spines per section; no prefetch (Flow D) |
| Forms and flows | Login/sign-up (Turnstile), claim-code entry, entry editor, admin forms | `/login`, `/account`, `/admin` | Admin page is one 1,450+ line client component |
| States | Loading skeleton, empty, error, success message | all | Loading and error pages exist; empty/success states not reviewed |

## 4. User flows (text maps; friction noted)
**Reader (public, read-heavy).**
1. Land on `/` (Library Room) or a deep link from search/sitemap.
2. Choose a path: browse the closet, open Meetups, or search (Ctrl/Cmd+K, or the header button once it works).
3. Open a book or meetup page; read who discussed it and when.
4. Optional exits: download the meetup PDF, follow to author or member page.
Friction to watch: step 1 lands on the heaviest screen (closet, 4.5-6 s main-thread block, measured in an earlier profile); step 2's header buttons do nothing; touch users have no hover (Flow D uses `pointerdown`).

**Member (signed up, task-light).**
1. `/login`: create account (Turnstile, no email confirmation).
2. `/account`: see "link your member record".
3. Enter the one-time admin code (10 characters, 14 days); success message.
4. Edit bio and own book entries; see the saved confirmation.
Friction: the signed-in path has never been run end to end (measured: untested); the generic failure message on a bad code is intentional but gives no recovery hint ("ask an admin for a new code").

**Admin (task-heavy).**
1. Sign in, open `/admin`, find a meetup/book/member.
2. Edit or create; every write is audited.
3. Invite: create a code from a member page and hand it over off-site.
Friction: one very large page, destructive actions must use AlertDialog (shadcn rule above), the banner text says photo upload/PDF generation/Goodreads lookup are unavailable.

## 5. Heat, cold and pain points (hypothesis unless marked)
No analytics exists, so "heat" is expected attention, not measured clicks.
| Type | Point | Basis |
|---|---|---|
| **Heat** (expected high use) | Search/palette; Library Room entry; meetup page title and facts; book titles; the PDF download button | hypothesis (primary tasks of the Reader flow) |
| **Heat** (founders) | Admin edit + invite on member page | hypothesis |
| **Cold** (expected low use) | Footer links, Terms, Privacy, FAQ (not built); author pages; the meetups list beyond the newest few | hypothesis |
| **Pain**, confirmed | Dead Search/Command buttons (`Navigation.tsx:66-100`) | seen in code |
| **Pain**, confirmed | `text-muted-light #9A9A9A` on paper = **2.65:1**, used 21 times (meetup subtitle `meetups/[id]/page.tsx:103`, book page, empty states, input placeholders; some at 11px) | measured |
| **Pain**, confirmed | Closet main-thread block 4.5-6 s; spines 24 px wide on mobile (`CriterionBookCloset.tsx:106`), under a 44 px tap target | measured earlier / seen in code |
| **Pain**, confirmed | PDF links were 404 until `ca0c000`; fixed | seen |
| **Pain**, likely | Turnstile on every sign-in; generic claim-code failure message; large unlabelled admin page | hypothesis |
**How to check:** install Speed Insights + Web Analytics (Phase A); log three events later (palette opened, book opened, PDF clicked); run 3-5 short sessions with club members on their phones; add Playwright click-path tests for the three flows.

## 6. Cross-device behaviour (the prototype must show all of these)
- **Test widths:** 360/390 (phone), 768 (tablet), 1024 (laptop), 1440 (desktop); portrait and landscape on phone.
- **Input model:** hover exists only on pointer devices. Hover-only effects get a `pointerdown`/focus equivalent; every hover-revealed control is reachable by tap and keyboard.
- **Navigation:** desktop = top bar with palette trigger; phone = Sheet menu plus a visible search button (thumb reach, bottom third for primary actions where it does not fight the browser bar).
- **Layout:** one column on phone; reading column about 60-75 characters on desktop; lists as rows at every size (no tile grid reflow games).
- **Library Room:** phone defaults to the list view (Criterion offers both views; the 24 px spines fail tap targets); the 3D room is a desktop enhancement.
- **Slow networks / Data Saver:** skip idle prefetch, show skeletons, no autoplaying motion (PRD D18; founder "lite mode" idea from RTIH notes).
- **Targets and text:** 44 px minimum tap targets, 16 px minimum body, no horizontal scroll at 360 px (fix `w-screen`).
- **Popups:** none that cover the screen on mobile (refero's promo popup is the counter-example).

## 7. Typography (rec; not decided)
Observed: brandur = humanist sans on warm paper; refero = serif display + light sans. BBB direction: **a serif for headings and titles, a clean sans for text**, one weight step for emphasis, links underlined. Today: Inter via next/font, headings fall back to Georgia (system), and `--font-body` is the literal 'Inter' (`layout.tsx:5`, `globals.css:36`), which may not use the loaded font; **unverified in a browser**. Candidate open-licence families to try in Phase 0b (check licences and weights before choosing): Source Serif 4, Newsreader, Fraunces for display; Inter, Source Sans 3, Noto Sans for text. Scale starting point: 16 px base, ratio 1.25, line-height about 1.6 for reading text. I did not identify the exact fonts on the reference sites, so none of this claims to match them.

## 8. Colour (measured)
Current tokens: paper #FAF8F5, ink #1A1A1A, accent #8B4513. WCAG contrast ratios computed 2026-10-13:
| Pair | Ratio | Result |
|---|---|---|
| ink on paper | 16.42 | AA |
| ink-light #4A4A4A on paper | 8.36 | AA |
| muted #6B6B6B on paper | 5.03 | AA |
| muted on paper-dark #F0EDE8 (footer) | 4.56 | AA, barely |
| **muted-light #9A9A9A on paper** | **2.65** | **FAIL** |
| accent #8B4513 on paper | 6.70 | AA |
| white on accent | 7.10 | AA |
| white on accent-light #A65D2E (hover) | 4.97 | AA |
| amber-800 #92400E on paper (default Tailwind, used in pages) | 6.69 | AA but off-token |
Candidate semantic text colours (shifted off Tailwind defaults, per the founder's notes), all on paper: terracotta #A8442A 5.62 (danger), gold #7A5C0A 5.89 (warning), sage #3F6B45 5.83 (success), slate-blue #3B5B7A 6.68 (info). **rec:** retire `muted-light` for text (use `muted`), keep one accent, map every raw `amber-*` to the accent token, and express status as coloured text from these four. Closet dark surfaces (`text-neutral-400/500`, 14+ uses) were not measured.

## 9. What this changes in the plan
- Phase 0b mockup must show phone, tablet and desktop, the three flows' key screens (meetup page, account claim, search palette), loading/empty/error states, and a shadcn-primitive-only build.
- Phase A adds: fix the 2.65:1 text colour (quick win), dead buttons, breadcrumbs, tap targets.
- ADR §11 updated for shadcn primitives. Atlas corrected for Fey and Linear.
- Still unseen: Mobbin, 21st.dev component pages, the Criterion closet, the founder's saved Fey/Mercury screenshots.
