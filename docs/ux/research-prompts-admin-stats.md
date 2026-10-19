# Research prompts for the Admin console (A1) and the Statistics / Scorecard (A3)

Feed each block into research-ops by hand. Both are written to be self-contained.

---
## PROMPT 1: Admin console home and the "Record a meetup" flow (A1, A2)

**Task.** Research how admin consoles for small community or archive products are laid out, what they do by default, and how they feel on a phone. Then recommend a layout and function set for ours. Output a table `Site | Borrow | Don't borrow | Implementation in BBB`, label every claim as sourced fact, inference or recommendation, and date anything time-sensitive.

**Context.** BBB (Broke Bibliophiles Bangalore) is a book club archive: 68 meetups on record of 99 held (2017 to 2026), 140 members, 2,741 books, 3,691 discussion rows, 4 venues. Two to three people run it. One person can be both an admin and a member who reads; there is a second such admin-member. Roles are independent flags: an account, an admin flag, and a link to a member record. Admin tasks today: record a meetup (date, venue, attendees, books), fix member and book data, issue one-time claim codes so members link their record, hide or restore members, delete a meetup (with a typed confirmation and a full snapshot first), and read a "Recent changes" audit list. The founder's own notes (PRESENTER - ADMIN MODULE IDEAS) want: setup with date, venue preset dropdown and presenter name; attendees chosen as Member (from a list, each with a unique code) or typed as a new person; a nudge after submit when someone has attended twice ("make them a member?"); books by name and author with ISBN, published date and genre autofilled and always editable; later, sync Google Form registrations to show who registered, new attendees and rejoiners. "No terminal, programs or in-app processing outside the app."

**Constraints (non-negotiable).** Real data only; no dead buttons; at least 5 working controls on every page; no cards, no glass, no pills; one accent (orange `#c93a14`) for actions and state; status as coloured text; type is Georgia for titles, Inter for body, 16 px minimum for inputs; tap targets 44 px; top bar 72 px scrolls away and returns on a fast scroll up; bottom tab bar 56 px always visible; underline-style inputs; wireframe stage has no error-recovery UI. Design laws to apply: Jakob, Fitts, Hick/Miller (5 to 9 items), Proximity, Peak-End (confirmation moments), Doherty (<400 ms), Postel, Feedback, Whitespace, Affordance.

**Priority order.** (1) Recording a meetup in four calm steps or fewer. (2) Seeing what changed (audit trail). (3) Fixing data safely. (4) Issuing claim codes. (5) Notifying members (sending not connected). (6) Everything else.

**Architecture facts to respect.** Next.js 15 App Router on Vercel Hobby, Supabase Postgres through route handlers (`adminRoute` checks a server-verified role from `app_metadata`; every write runs in one transaction with an `audit_log` row holding before and after); Supabase Auth email and password with Turnstile; Google and Apple sign-in not configured; sessions 24 h for admins and 30 days for members (enforced from `last_sign_in_at`); write rate limit 30 a minute per visitor; reads cached 60 s at the CDN, admin routes never cached; a nightly in-database backup but no off-site copy. The main project may later move to SQLite or Cloudflare D1, so propose nothing that depends on Postgres-only features. Goodreads' API is retired (no new keys since December 2020), so book autofill must use another source (for example Open Library or Google Books).

**Devices and layout.** Phone first at 390 px (360 to 430), iOS Safari and Android Chrome; desktop later (900 px and up, with a real mouse). PWA install later (needs HTTPS). Container 358 px content width, 16 px gutter.

**Questions to answer.** What do mature admin consoles put on the first screen? How do they present recent activity and undo? How do multi-step forms stay simple on a phone? How should an admin who is also a member switch context without a separate login? What should never be on a phone admin screen?

---
## PROMPT 2: Statistics page and public Scorecard (A3)

**Task.** Research what statistics and analytics pages for archives, reading clubs and small community products show by default, how they look and feel on a phone, and which charts, shapes and computed tables earn their place. Recommend a layout and a set of computations for ours. Output `Site | Borrow | Don't borrow | Implementation in BBB`, with every claim labelled (sourced fact, inference, recommendation) and dated. Use a data-visualisation method (form heuristics, a validated colour formula, mark specs, interaction rules); the Claude `dataviz` skill is available for the build.

**Context.** Two audiences. **Public Scorecard:** member with the most books read, most-read book, newly trending book, a timeline and archive statistics; empty states are fine at first; not in the header. **Admin Statistics (admin only):** the in-app version of the archive reports the founder used to read as files: archive summary, ingestion report, missing meetups (live: 31 of 99 numbers have no record: #1 to 3, 6 to 7, 10, 27 to 30, 32 to 33, 35 to 36, 38 to 39, 41 to 44, 51, 53, 55 to 61, 64, 81), duplicate review queue (0 flagged), manifest, statistics (books per meetup) and a timeline (new versus returning books per meetup). "Compute tables, not web analytics." No terminal or scripts needed to read them.
Real numbers available now: meetups per year 2017 to 2026 are 2, 8, 9, 3, 3, 7, 5, 12, 11, 8; venues Bookworm 35, Atta Galatta 19, Online 4, Art Studio Koramangala 1; 560 attendance rows (about 8.2 readers per meetup); member statuses member 114, BYOB 18, guest 8; 58 people attended twice or more and 82 attended once; 2,741 books of which 2,536 were discussed and 620 were discussed at least twice; the most-discussed book has 69 discussion rows; book ratings exist for 2,159 books (source unverified); 1 hidden member.
Also in scope: a stats page "elastic line" component (physics line you can pull), used on the stats page only.

**Constraints.** As in Prompt 1, plus: honest charts (zero baselines, no area encoding that hides small values, such as 2,741 books beside 68 meetups); colour only for meaning (orange accent for the thing being looked at, deep blue `#12295a` as the data ink, sage green and muted blue from the map for categories); text alternatives for every chart; reduced-motion respected; numbers come from the database, never typed.

**Priority order.** (1) A first screen that answers "how is the club doing?" in under five numbers. (2) Meetups over time. (3) Who reads what: readers and books leaderboards. (4) Data health for admins (missing meetups, duplicates, ingestion). (5) Exploration (filters, sort, export).

**Architecture.** As in Prompt 1; computed tables should be read-only aggregate queries behind admin-only routes, cacheable for 60 s; any new table must use portable SQL types. Public figures must not reveal hidden members.

**Devices and layout.** Phone first (390 px); charts must be legible at 358 px content width; tables become stacked rows, not horizontal scroll; a desktop layout (900 px and up) can use two columns later.

**Questions to answer.** Which five numbers belong on a small archive's first stats screen? Which chart forms suit counts per year, per venue and per meetup on a phone? What do good "data health" panels (missing records, duplicates, ingestion) look like? How do public scorecards avoid leaking private data? What is the minimum useful set of computed tables?
