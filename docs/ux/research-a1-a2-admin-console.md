# Research: admin console home and Record a meetup (A1, A2), 2026-10-19

Labels: [S] sourced fact, [U] founder-supplied, [I] inference, [R] recommendation.

## Sourced facts
- [S] Shopify mobile home shows totals first (sales, visitors for day, week, month against the prior period), then recent activity and suggested actions. https://betakit.com/shopify-goes-fully-mobile-with-new-android-and-ios-apps/ and https://firebearstudio.com/blog/shopify-admin.html
- [S] Ghost: a members activity feed on the dashboard, filterable by event type, also on each member's profile. https://ghost.org/changelog/activity-feed/
- [S] Wagtail dashboard: "Your most recent edits", the five latest. https://docs.wagtail.org/en/v4.0/editor_manual/finding_your_way_around/the_dashboard.html
- [S] Django admin: the index shows the signed-in user's 10 most recent actions; each object has a history page. https://news.e-scribe.com/post/django-logentry-to-the-rescue/
- [S] Directus: an Activity Log of every data-changing action; each activity has revisions; an item can be reverted from its Revisions sidebar; admins can reopen values. https://docs.directus.io/app/activity-log.html
- [S] Discourse: a staff action log (/admin/logs/staff_action_logs); admin functions sit behind a wrench in the same menu; impersonating a user exists and the user is not told (a requested change). https://meta.discourse.org/t/the-impersonated-user-should-be-notified-that-they-are-being-impersonated/116933
- [S] Luma host app: check in by QR or by searching a name or email; guest list updates itself. https://help.luma.com/p/check-in
- [S] GOV.UK: one thing per page; one or two questions per screen worked well on phones and felt simple despite more clicks; answers saved as you go; merge pages for internal staff who repeat tasks. https://design-system.service.gov.uk/patterns/question-pages and https://designnotes.blog.gov.uk/2015/07/03/one-thing-per-page/
- [S, weak, blog summaries] multi-step forms on a phone: collapse the stepper to "Step 2 of 5", auto-save between steps, keep a draft. https://www.saasui.design/blog/saas-multi-step-form-wizard-ux-patterns
- [S, secondary sources, not read at Nielsen Norman Group] undo is preferred to "are you sure" except for rare, irreversible actions. https://uxplanet.org/confirmation-dialogs-how-to-design-dialogues-without-irritation-7b4cf2599956
- [S] GitHub deletes a repository only after its full name is typed; the button stays disabled until it matches (tutorial summaries). https://www.datacamp.com/tutorial/how-to-delete-a-github-repository
- [S] Open Library: /search.json with a fields parameter, /isbn/{isbn}.json; identify your app in the User-Agent; about 1 request a second anonymous, 3 with an identifying User-Agent (third-party summary, not the official page). https://www.openlibrary.org/dev/docs/api/search
- [S] Google Books: keyless use gets a lower quota; 1,000 requests a day with a key. https://discuss.google.dev/t/requesting-higher-quota-for-google-books-api-bookquest-app/286093
- [S] Phone tables: few columns, vertical scroll, keep the ID column fixed, turn rows into stacked rows when comparing is not needed. https://uxdesign.cc/how-to-design-data-tables-for-phones-7ed6b04da10
- [S, own test 2026-10-18] Open Library found Pachinko (title, author, year, ISBN) and found nothing for The Dig; Google Books keyless hit a shared quota error.
- [S, code read 2026-10-19] The app has 12 admin write routes and `audit()` writes before and after in the same transaction (`frontend/src/lib/audit.ts`). There is no read route for the audit log yet.

## Table: Site | Borrow | Don't borrow | Implementation in BBB (all [R])
| Site | Borrow | Don't borrow | Implementation in BBB |
|---|---|---|---|
| Shopify mobile | Numbers first, one suggested next action | Sales charts, upsell cards | A1 top: "68 meetups on record of 99 held", last recorded "#99, 23 Aug 2026", one primary button "Record a meetup" |
| Ghost | One activity feed, filter by type, same feed on a person's page | Revenue widgets | "Recent changes": last 5 on A1, "All changes" page with text filters (Meetups, Members, Books, Codes); the same list under a member |
| Wagtail | A short "your recent edits" list | The page tree | A1 toggle: Mine, Everyone |
| Django | History page per record, 10 most recent by default | Table-first index | "History" link on every member and book edit screen |
| Directus | Before and after plus Revert | Revert on everything | Undo on a Recent changes row for field edits (writes `before` back as a new audited change); a deleted meetup is restored from its snapshot |
| Discourse | Admin inside the same account's menu | Impersonation with no notice | An "Admin" link in Me for admin accounts only, no second login; "View as member" is read-only with a banner |
| Luma | Find an attendee by typing a name | QR tickets, paid team roles | A2 step 2: type a name or code; new person typed; "Same readers as last meetup" fills the list in one tap |
| GOV.UK | One idea per screen, saved as you go | Twelve pages | A2 in four steps, each 3 to 5 fields, "2 of 4: Who came", Back always, draft kept |
| GitHub | Typed confirmation, disabled button | Using it for every action | Only "Delete meetup": type the number, snapshot saved first, shown in Recent changes. Everything else is undoable |
| Open Library, Google Books | Autofill on a typed title or ISBN, show the source | Overwriting what the admin typed; keyless Google | Fill empty fields only, label "Filled from Open Library", every field editable, typed entry as the last backup |

## Answers
1. First screen: a status line, recent activity, one primary action. [S+I]
2. Recent activity and undo: a short list on the home page, a full filterable list one tap away, revert per row from stored before and after. [S+R]
3. Multi-step on a phone: one idea per step, a "n of 4" label, auto-saved draft, a review step. [S+R]
4. Admin who is also a member: one account, two flags; an Admin entry inside Me, never a second login; no impersonation. [I+R]
5. Never on a phone admin screen: wide data tables, bulk import or CSV mapping, schema or permission editing, bulk delete, Google Form sync mapping (do on desktop later). [S for tables, I for the rest]

## Gaps (code)
No read route for audit rows; no presenter column (the admin is the presenter for now); translator via a `book_relations` translation_of row; no Google Form sync yet.

## Decisions for the founder
Undo window; keep "Same readers as last meetup"; four steps or three; where the Admin entry sits; draft kept on the phone or the server.
