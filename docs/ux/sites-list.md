# Every site mentioned in the vercel_demo session (2026-10-13)

Method: two scripted passes over the full session transcript, one for explicit URLs (191 distinct domains, most of them tool output such as Vercel/Supabase docs) and one for bare domain and brand names, then curated by hand. "Source" says who raised it: **founder** (your messages), **founder's notes** (files you pointed me to or that I read: `UIUX/*.txt`, `THINGS_FROM_RTIH.txt`, RTIH memory), **me** (raised by me or found by my searches). "Status": **seen** = opened in a browser and looked at the screenshot; **snippet** = I only read search-result text or a fetched page; **not opened** = name only. A URL is given only where the transcript contains it; otherwise "(name only)".

## 1. UI/UX inspiration and reference sites
| Site | Source | Status |
|---|---|---|
| ui.shadcn.com (docs, blocks, dashboard example) | founder (skill text, pastes) | **seen**: cards and pill badges |
| brandur.org | founder (blog list) | **seen**: warm paper, type-led, no cards |
| refero.design | founder's notes (Fingerprint text-heavy sections) | **seen**: serif display + sans, row lists |
| mercury.com | founder's notes (Mercury dashboard/greeting) | **seen**: photo hero, translucent bars |
| 21st.dev | founder's notes | **seen**: dark/gradient; shadcn component source |
| linear.app | founder's notes + me | **seen, inconclusive** (mid-animation); blog read as snippet |
| fey.com (Fey) | founder's notes | **seen, stale**: closure notice |
| mobbin.com (Mobbin) | founder's notes | not opened (login) |
| saas-ui.dev | founder's notes (CRM components) | not opened |
| twenty.com | founder's notes ("good code to modify") | not opened |
| layers.to | founder's notes (RTIH memory) | not opened |
| awwwards (awwwards.com) | founder's notes (RTIH memory) | not opened (name only) |
| componentry.io | founder's notes (RTIH memory) | not opened |
| pynn.ai | founder's notes (content format only) | not opened |
| manus.im (AI QA agent) | founder's notes (RTIH memory) | not opened (name only) |
| skiper-ui | founder's notes | not opened (name only) |
| 10x.app | founder's notes | not opened |
| motion-primitives | founder's notes | not opened (name only) |
| Fleet Dispatch | founder's notes (restraint principle) | not opened (name only) |
| Fingerprint (fingerprint.com) | founder's notes via refero | snippet: search returned nothing useful |
| bklit.com | founder's notes (data viz research) | not opened |
| NotusNextJS | founder's notes ("What is NotusNextJS") | not opened (name only) |
| Framer Motion | founder's notes ("look into") | already a dependency; not researched |

## 2. Dashboard / data-viz inspirations named in the founder's UIUX file
Bloomberg, Stripe, Mercury, Linear, GitHub Insights, Amplitude, Mixpanel, Observable, TradingView, PitchBook, Carta, Crunchbase. Source: founder's notes (`how to really think about UIUX as well.txt`). Status: all **not opened** except Mercury and Linear (above). Purpose in the file: density, readability, colour use, uncertainty, visual weight.

## 3. Colour tools
| Site | Source | Status |
|---|---|---|
| realtimecolors.com | founder's notes (RTIH memory) | captured, not viewed |
| uicolors.app | founder's notes | not opened |
| shadergradient | founder's notes | not opened (name only; conflicts with the no-gradient rule) |
| haikei | founder's notes | not opened (name only) |

## 4. Motion and animation research (founder's UIUX file)
Motion.dev (motion.dev), Anime.js, GSAP (for concepts), Lottie, game UI, old CRT loading, pixel reconstruction, vector morphing, noise shaders, SVG drawing. Source: founder's notes. Status: not opened. Note: motion in the ADR is limited to intent-driven entrance/focus/reveal/exit; none of these are adopted.

## 5. Reading list (founder's pasted blogs)
brandur.org (**seen**), tomtunguz.com, blog.pragmaticengineer.com (Gergely), stripe.dev/blog (engineering). Source: founder. Status: only brandur seen.

## 6. "AI-made site" research sources (found by my earlier search, 2026-10-13; not opened)
Yuwen Lu "Signs of vibe coded UI"; superdesign.dev ("Why AI design looks generic"); Fountain Institute "7 tells"; hey.com/kostac "Spot the Slop"; GitHub repos sahilkargutkar/web-ai-slop (detecting-ai-slop.md), claudiusararu/unslop-ui-skill, funboy322/avoid-ai-design, Ferousco-dev/anti-slop-design, sboghossian/design-skill (anti-slop.md). Source: me. None opened, none installed.

## 7. Book-domain references
| Site | Source | Status |
|---|---|---|
| Criterion Collection virtual closet (80.lv article) | me | snippet |
| goodreads.com (Goodreads) | me / project | snippet |
| The StoryGraph (Pratt IxD critique, Book Riot) | me | snippet |
| Wikipedia, Progressive disclosure (en.wikipedia.org) | me | snippet |

## 8. Sources I read as snippets for the ADR and atlas
linear.app/blog (design refresh); 925studios.co (Mercury breakdown); artisan-apps.beehiiv.com (Fey overview); ixd.prattsi.org (StoryGraph critique); 80.lv (Criterion closet); en.wikipedia.org (progressive disclosure). Source: me (search results 2026-10-13).

## 9. Platform and service sites used or discussed
| Site | Role | Source |
|---|---|---|
| vercel.com, openapi.vercel.sh, mcp.vercel.com, telemetry.vercel.com, ai-gateway.vercel.sh, bbbdemo.vercel.app (live demo, Vercel project `bbb-vercel-frontend`), bbb-library.vercel.app (same site, Vercel project `bbb-library` on `MishaelJulian/BBB`) | hosting, API, MCP, the demo | founder / me |
| supabase.com, api.supabase.com, mcp.supabase.com, fdvjykrwckhovfocnnyy.supabase.co (current project) | database, auth, storage | founder / me |
| challenges.cloudflare.com, developers.cloudflare.com, dash.cloudflare.com, api.cloudflare.com | Turnstile captcha, docs | founder / me |
| hCaptcha, Friendly Captcha (global.frcapi.com), Resend (smtp.resend.com), Mailhog, PostHog, Render, unpkg | captcha options, SMTP, local mail, analytics, old host, CDN (rejected) | founder / me |
| github.com (dhilipa01/BBB-Vercel and the repos above), ghcr.io, sentry.io, v0.dev, elements.ai-sdk.dev, web.dev | source control; container registry; error tracking; shadcn skill text and registries; web vitals docs | founder (pastes) / tool output |
| code.claude.com | Claude Code auto-mode docs | me |
| mondaq.com, azbpartners.com | DPDP Rules 2025 timeline sources | me |
| aur.archlinux.org | JMeter package | me |

## 10. Engineering tools from the founder's RTIH notes (not UI sites; kept for completeness)
perspective-dev (data viz in the browser), glide/apps (canvas data grid), Unstructured-IO, ory/keto, trillian, Semgrep, OWASP CheatSheetSeries, gologin.com (account management), SFTP, PgBouncer/Redis/BullMQ notes. Source: `THINGS_FROM_RTIH.txt`. Status: not opened.

## Excluded as noise
`evil.com`/`evil.example` (security-test inputs), `acme.com`, `internal.company.com`, `your-domain.com` (documentation placeholders inside a tool's text), `example.com`, `3.org`, and a handful of regex false hits (`b.page`, `u.app`, `el.app`, `book.page`, shell script names ending in `.sh`).
