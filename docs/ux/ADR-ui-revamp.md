# ADR: BBB UI revamp (draft, 2026-10-13)

Status: **draft**. Nothing here is decided until the founder picks the look (Phase 0b) and approves. No repo ADR template exists (`docs/architecture/imperative_decisions.md` §6 holds the decision log); this follows the section list in the founder's `how to really think about UIUX as well.txt`, trimmed to what BBB needs. Companion docs: `inspiration-atlas.md`, `anti-patterns.md`. Labels: **fact** (code/source), **inference**, **rec**.

## 1. Context
BBB Library is a public archive of a book club's meetups, books and members; the demo (bbbdemo.vercel.app) lets members claim their record with an admin code and edit their own entries. Fact: the UI works but was grown page by page: tokens exist (one brown accent, paper/ink) but pages bypass them (see `anti-patterns.md` #3, #18, #20), emoji are used as icons, two header buttons are dead, and the Library Room (closet) is the heaviest screen (360 3D spines per section). This ADR sets the design rules for a revamp done in phases (A checklist gaps, B foundation, C closet Flow D).

## 2. Constraints
Fact: demo for about one week, no custom domain, Vercel Hobby, free Supabase, real member data, public site (no login to read). Founder rules: counts come from the live DB; no invented stats; do not add dependencies without need; accessibility is not optional. Fork is local until the founder pushes.

## 3. Users and what each needs (replaces "investor psychology")
- **Reader / visitor** (read-heavy): find a book or meetup fast, see who discussed it. Success = reaches a book page in 2 clicks or one palette search.
- **Member** (task-heavy, light): claim record, edit bio, add own entries. Success = finishes claim in one sitting, sees confirmation.
- **Admin** (task-heavy): manage meetups/books/members and invite codes. Success = no accidental edits; every action confirmed.
Page types: Archetype A editorial (read-heavy: home, meetups, books, authors, members, Terms/Privacy/FAQ) and Archetype B task (account, admin, login), from the founder's earlier two-archetype note.

## 4. Information architecture (rec)
Top level: Library Room, Meetups, Members, (Books list), plus Search (Ctrl/Cmd+K palette, now also reachable from the header buttons). Footer: Privacy, Terms, FAQ, Contact. Admin link shown only to signed-in admins. Hick/Miller: at most about 7 items per group; filters grouped. Breadcrumbs on detail pages (meetup, book, author, member).

## 5. Component philosophy and look (rec; decided only after Phase 0b)
Two candidate directions are tested side by side; the founder picks:
- **A, editorial:** no cards; hierarchy by type size, weight and tint; hairline dividers; status as coloured text; hard-offset shadow on buttons only; one accent. Matches the founder's RTIH notes and the colour reasoning (no gradients, no glass, no chip-per-card).
- **B, current look cleaned:** keep cards and rounding, but one token set, no emoji, no gradients outside the closet.
**Tension to settle:** RTIH `design.md` uses milk-glass cards, blur and pill status badges (a different product, violet palette), which contradicts RTIH's own no-cards/no-glass notes. BBB takes `design.md` as a format example for tokens only, not as a look.

## 6. Interaction language
Hover on rows: background tint and a small arrow nudge (from the RTIH task-12 note: "hover richness"), no full-page transitions. Primary action = one per view (open book / download PDF / save). Every write shows a text outcome (Feedback law). Affordances: links underlined or clearly coloured; buttons have a visible hard edge; icon-only buttons carry `aria-label`.

## 7. Motion philosophy and timing (rec)
Motion has intent: entrance, focus, reveal, exit, hierarchy, eye guidance; nothing animates because it can. Tokens proposed from the founder's `design.md` format: fast 150 ms, base 220 ms, slow 320 ms, ease-out `cubic-bezier(0.16, 1, 0.3, 1)`. `prefers-reduced-motion`: opacity crossfade only, 150 ms or less. Flow D closet: shelf and card appear within the Doherty threshold of 400 ms from cache; skeleton for the rest. Review lenses: Deakins (focus/composition), Villeneuve (restraint/materiality), Anderson (alignment/rhythm); lenses for review, never personas to imitate. Existing skills to consult when building: ecc motion-foundations/motion-ui, transitions-polish, emil-design-eng (read each SKILL.md first).

## 8. Typography (rec, pending look)
Self-host a display serif and one text face via next/font; set `--font-body` to the next/font variable. Body at least 16 px, reading measure about 36-42rem and line-height about 1.6 for long text (a general source, unverified; check against brandur.org and a couple of long-form sites). Italic headings not used (RTIH rule, kept for consistency).

## 9. Colour (rec)
Keep warm paper and warm near-black; shift semantic colours off Tailwind defaults (terracotta/gold/sage, per founder notes); one accent (brown) for actions and current state. Run AA contrast on every text/background pair before locking tokens.

## 10. Empty states and density
Empty states say what is missing and one next step in plain words (no illustrations for the sake of it). Density: lists as scannable rows (name + one-line signal), not tiles, for members and meetups. Keep the closet as the one deliberately rich screen.

## 11. Technical implementation and files to touch
Phase 0: this ADR + atlas + anti-patterns (docs only). Phase 0b: two throwaway versions of `/meetups/99`. Phase A: `Navigation.tsx`, `Footer.tsx`, `app/layout.tsx` (Speed Insights + Web Analytics), new `app/faq/page.tsx`, `sitemap.ts`, `next.config.ts` (CSP check), tap-target and overflow fixes. Phase B: `tailwind.config.ts`, `globals.css`, `app/layout.tsx` fonts, icon replacements (`meetups/[id]/page.tsx`, `members/page.tsx`), pill/card/gradient clean-ups. Phase C: `CriterionBookCloset.tsx` (prefetch, cached-detail card, flat spines, `content-visibility`, cache-write guard), `lib/api.ts` (reuse `fetchWithSWR`). No new UI library by default; shadcn is not in use and is not added unless the founder asks.

## 12. Research links
[Linear design refresh](https://linear.app/blog/behind-the-latest-design-refresh), [Mercury breakdown](https://www.925studios.co/blog/mercury-design-breakdown), [Fey overview](https://artisan-apps.beehiiv.com/p/fey-where-bloomberg-meets-apple-s-design), [Criterion closet](https://80.lv/articles/this-virtual-closet-lets-you-browse-1-000-criterion-collection-films), [StoryGraph critique](https://ixd.prattsi.org/2024/09/design-critique-storygraph-beats-goodreads-but-could-be-better/). Not yet opened: Mobbin, refero, 21st.dev, twenty.com, saas-ui.dev, brandur.org, Fingerprint.

## 13. UX laws mapped to BBB (from `Some_UI_UX_Thoughts.txt`)
Hick/Miller: nav and closet filters at most about 7 items. Fitts: primary action large, near the content edge, thumb-reachable on mobile. Doherty: under 400 ms from cache plus skeletons. Proximity: group with spacing and tint, not boxes. Von Restorff: one standout (the accent) only. Peak-End: confirmation after claim/save. Feedback: text outcome on every write. Postel: tolerant search/input. Zeigarnik/Parkinson: only the member claim flow gets a subtle step cue. Pareto: phases ordered by effect. Serial position: put key actions first/last in menus and flows. Whitespace and affordances as above.

## 14. Rollout and acceptance
One commit per phase, founder pushes. Each phase passes `tsc`, `next build`, route curl checks, Playwright screenshots (desktop and 390 px), repeated Lighthouse runs (single runs vary by about 7 points). Phase C reports before/after long-task and TBT numbers even if there is no gain. Open decisions: the look (Phase 0b), whether Phase C proceeds in this round, analytics cookie wording after reading Vercel's docs.
