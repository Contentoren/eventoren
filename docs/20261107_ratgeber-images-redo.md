# Ratgeber images redo: positive heroes + in-article images

## Goal

Replace all 66 Ratgeber/Guides hero images with positive, engaging, interesting event
photography (the current set reads as dull documentary paperwork scenes), and add
2 in-article images to every German article (English guides reuse the same images
with English alt text). Ship through commits, merge to `main`, deploy preview +
production frontend, validate live.

## Current context

- 91 articles: 66 DE in `content/ratgeber/`, 25 EN in `content/guides/` (all EN have a DE pair via `translationKey`).
- Heroes: frontmatter `image: "ratgeber-<slug>"`, resolved via `src/app/assets/imageList.ts` basename (`src/app/content/contentImages.ts`).
- Prompts: `src/app/content/image-prompts/<imageKey>.md` (frontmatter `imageKey`, `articles`, `alt`; body = scene). Style: `_style.md` (`## Prompt prefix` + `## Negative / constraints` fenced blocks are the only parts sent).
- Generate: `bun run content:images` (`scripts/contentImageGenerate.ts`, `@adaptive-ds/codex-imagen` 0.3.0, model `gpt-image-2`, key from `CODEX_LB_API_TOKEN`). Output `images/1920x1080_webp/<key>.png` + `<key>.md` sidecar; `--force` regenerates; skips keys already present locally/catalog otherwise.
- Upload: `bun run assets:upload` (upload-all, `--wait`), then `bun run assets:lists` + `bun run assets:lists:check`. Regenerated heroes become new asset versions; basename stays stable.
- Body images are currently rejected: `src/app/content/contentBodyCheck.ts` errors on `image` tokens. Markdown renders via marked + `contentMarkedRendererCreate.ts` (no image override yet). Compile: `bun run content:compile`; checks: `bun run content:check`. Article CSS: `src/markdown.css`.
- Worktree: `/tmp/eventoren-images-kBQxVF`, branch `feat/ratgeber-images-redo`.

## Decisions

- **New visual direction** (rewrite `_style.md` fenced blocks): vibrant, joyful, high-energy event photography — golden-hour festival glow, colorful stage light, laughing and celebrating guests, dancing, confetti in the air where it fits, dynamic diagonal composition, rich but tasteful color, bokeh string lights. People mid-celebration, not mid-paperwork. Keep hard constraints: no text/logos/readable screens, correct anatomy, single photograph, European setting, teal/amber brand accents woven in naturally. Composition no longer forces calm negative space on one side; heroes sit above the fold without overlay text.
- **Scenes**: every hero scene is rewritten to a specific, lively event moment that still fits the article topic (legal topics get a confident, positive organiser moment, never gavels/desks of paper). Vary settings, times of day, crowd sizes, and people across articles; avoid repeating the same "woman in teal at a table" motif.
- **Body images**: keys `ratgeber-<slug>-szene-1` and `ratgeber-<slug>-szene-2`, one prompt file each (adds 132 prompt files). Generated through the same script/folder. Each scene tied to a concrete section of its article.
- **Body image syntax**: markdown `![<alt in article language>](<imageKey>)` as its own paragraph, placed right after the intro section and mid-article (not inside FAQ/sources/takeaways, not directly under a heading). Renderer resolves the key via the assets catalog and emits lazy, dimensioned `<img>`; unresolved/external images are a check error (no raw URLs allowed).
- **Alts**: when a hero scene changes, update the alt in the prompt file, the DE article `imageAlt`, and the EN pair `imageAlt` (English). Body-image alts in markdown are per-language; prompt-file `alt` is the German one.
- **EN guides** keep sharing the DE image keys (hero and body), with English alt text.
- AGENTS.md multi-surface rule: not applicable (static editorial content, no new domain data/APIs), same deviation as the original Ratgeber plan.

## Tasks

- **T1 Renderer support**: allow catalog-key body images.
  - `contentMarkedRendererCreate.ts`: `renderer.image` resolves `href` as image key through the catalog (reuse/export the lookup from `contentImages.ts`), outputs `<img>` with catalog URL, markdown alt text, width/height, `loading="lazy"`, `decoding="async"`. Unresolved key: throw/fail loudly at compile time.
  - `contentBodyCheck.ts`: replace the blanket image error — allow images whose `href` is a kebab key that resolves in the catalog and whose alt text is non-empty; error otherwise (external URLs, empty alt, unknown key).
  - `src/markdown.css`: article `img` styling (full-width, rounded, spacing) if not already covered.
  - Extend existing unit tests next to the touched files. Verify: `bun run content:check` still passes on current content; render a fixture article body with a body image via a unit test (use an existing catalog key, e.g. a current hero key).
- **T2 Style**: rewrite the two fenced blocks in `_style.md` per the new direction; update the doc text around them if it contradicts. No prompt files touched.
- **T3 Article batches** (4 parallel batches of 16–17 DE slugs; each batch also handles the EN pairs of its slugs): for each slug —
  - Rewrite `image-prompts/ratgeber-<slug>.md`: new lively scene (2–5 sentences, scene only, no style words — style comes from `_style.md`), new German `alt`.
  - Create `image-prompts/ratgeber-<slug>-szene-1.md` and `-szene-2.md`: frontmatter `imageKey`, `articles` (DE path, plus EN path when paired), German `alt`; body = scene tied to a named section.
  - DE article: update `imageAlt`; insert the two body images (German alts) at the chosen spots, each as its own paragraph.
  - EN pair (if any): update `imageAlt` (English); insert the same two images with English alts at corresponding sections.
  - Do not change anything else in the articles (no text rewrites, no heading changes).
  - Batch 1: abendkasse-organisieren, abiball-planen-checkliste, barrierefreiheit-bfsg, dynamic-pricing-tickets, einlasskontrolle-qr-code, event-sichtbar-google-ki, eventlocation-finden, freischaltcodes-presale, jugendschutz-party, kostenlose-events-anmeldung, personalisierte-tickets, sponsoren-finden, ticketgebuehren, ticketpreis-kalkulieren, umsatzsteuer-eintrittskarten, veranstaltung-planen-checkliste, widerrufsrecht-tickets
  - Batch 2: abiball-finanzieren-sponsoren, abiball-tickets-online-verkaufen, benefizveranstaltung, e-rechnung-veranstalter, einlassmanagement-warteschlangen, eventbrite-alternative, fake-tickets-erkennen, gaesteliste-vorlage, karneval-2027, kuenstlersozialabgabe, schulveranstaltung-tickets, sportveranstaltung-turnier, ticketing-anbieter-vergleich, tickets-online-verkaufen, veranstalterhaftpflicht, vereinsfest-organisieren, zahlungsarten-ticketshop
  - Batch 3: abiball-kosten, abiball-veranstalter-haftung, clubnacht-veranstalten, e-ticket-hilfe, eintrittskarten-erstellen, eventbudget-planen, festival-organisieren, gema-veranstaltung, kleinunternehmerregelung-veranstalter, lesung-comedy-kleinkunst, sicherheitskonzept-veranstaltung, ticketarten, ticketing-glossar, tickets-weiterverkaufen, veranstaltung-absagen, vorverkauf-steigern
  - Batch 4: abiball-location-catering, agb-ticketverkauf, dsgvo-veranstalter, early-bird-tickets, event-marketing, eventim-light-pretix-ticket-io-alternativen, firmenevent-konferenz-tickets, helfer-minijob-ehrenamt, konzert-veranstalten, party-veranstalten, silvesterparty-2026, ticketbetrug-verhindern, ticketing-verein, ticketshop-erstellen, veranstaltung-anmelden-genehmigung, weihnachtsfeier-adventsveranstaltung
- **T4 Generation + upload** (after T1–T3): smoke-test one key first (`bun run content:images -- --only=<a hero key> --force`), inspect the PNG visually. Then full run `bun run content:images -- --force --concurrency=6` (198 images; rerun to mop up failures). Then `bun run assets:upload`, `bun run assets:lists`, `bun run assets:lists:check`. Confirm 198 keys in catalog, spot-check thumbnails (contact sheet) for blanks/dupes/garbled text; regenerate obvious failures `--only=... --force` + re-upload.
- **T8 Hub/article structure from allgroups.chat** (added 2026-11-07 by user request; comparison done in browser): eventoren already has category sections and structured articles; adopt the remaining deltas —
  - Hub (DE + EN): hero visual next to the intro (new prompt file `ratgeber-hub-hero`, articles `["/ratgeber", "/en/guides"]`; render only when the catalog resolves the key, so nothing breaks before upload).
  - Hub: first card of each category section renders as a wide featured card (image left, text right on desktop; stacked on mobile), remaining cards keep the existing grid. Reuse existing card data/components and `#ui` primitives per AGENTS.md.
  - Article breadcrumb gains the category level (linking to the hub section anchor when section ids exist, else the hub), keeping BreadcrumbList JSON-LD in sync.
  - Extend adjacent unit tests; e2e content suite expectations updated only where they assert the changed structure.
  - Not adopted: hub FAQ and "popular cities"-style link sections (no equivalent editorial basis yet; possible follow-up).
- **T5 Validate in worktree**: `bun run content:compile`, `bun run content:check`, unit tests for touched files, `bun run typecheck` on touched scope, production frontend build (`bun run frontend:build:production` or the build it wraps — read package.json) must pass and leave no unexpected tracked diffs beyond the intended generated files.
- **T6 Commits + merge**: fresh subagent runs the commits skill (multiple conventional commits, `bun run format` first), then merge branch into `main` in the main checkout and push.
- **T7 Deploy + live validation**: `bun run frontend:deploy:preview`; browser-validate preview + dev (hub, several DE/EN articles: new hero shown, 2 body images render, navigation header/footer links, no broken images across all 91 pages via scripted check). Then `bun run frontend:deploy:production`, validate eventoren.de the same way. Run `bun run test:e2e:content` (production target) if runtime allows, else the scripted page sweep. Clean up worktree + branch at the very end.

## Status

- T1 renderer support: done (catalog-key images in renderer + check, CSS, tests 15/15, content:check green)
- T2 style rewrite: done (vibrant/joyful direction, parser contract intact)
- T3 batches 1–4: done (198 prompt files, 91 articles × 2 body images, alts consistent; audited)
- T4 generation + upload: in progress (full run started; new-style samples verified visually)
- T8 hub/article structure: in progress (subagent)
- T5 worktree validation: pending
- T6 commits + merge: pending
- T7 deploy + live validation: pending
