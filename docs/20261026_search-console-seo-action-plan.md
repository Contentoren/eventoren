# Eventoren: Search Console SEO action plan

- Date: 26 October 2026.
- Status: The technical fixes, including reactive navigation metadata, are deployed. Production SSR, redirects, and the eight-URL sitemap pass live checks; Google has fetched the sitemap XML without reported errors, while event indexing remains pending. Preview URLs are noindexed; connecting public preview to its private development backend requires a separate networking decision. Unrelated working-tree edits remain untouched; larger features remain proposals for review.
- Goal: Make real public events discoverable and indexable, then grow relevant non-brand impressions, ticket visits, and organizer inquiries.
- Approach: Fix discovery and broken URLs before investing in keyword expansion. Current traffic is too small to justify CTR experiments or ranking conclusions.

## Items requiring user review

- A production Ratgeber section and the two proposed organizer guide briefs in task 7.
- A request-time sitemap instead of the existing build-time generator, if publication frequency justifies that architectural change.
- A real inquiry-delivery backend and consent-aware conversion analytics in task 8. The small honest email fallback does not implement either capability.
- Optional consolidation of the legacy `www` host onto Cloudflare Pages. Its existing permanent apex redirect works; changing DNS/hosting is not required for this frontend release.
- A public ingress or private-network interconnect for Cloudflare Pages preview. Development Convex is tailnet-only; do not expose it publicly or point preview at production data without an explicit decision. Tailnet-hosted development remains separate from production.

## Production baseline and current Search Console state

Collected with `@adaptive-ds/google-search-console-client` v0.5.0, using the configured default credentials and property `sc-domain:eventoren.de` (`siteOwner`), plus production HTTP/browser checks and repository inspection.

- **Available finalized performance, 19–24 October:** 1 click, 7 impressions, 14.29% CTR, average position 9.29. These are property-level web-search totals, not sums of page/query rows.
- Earlier requests return no performance rows. This does **not** establish a verification date or prove historical traffic was zero. There is no usable previous-period comparison.
- The only disclosed query is `toreins` with one impression. It is not evidence of a relevant keyword opportunity. Query rows do not account for property totals, so branded/non-branded shares cannot be calculated.
- The homepage is indexed. Google's stored event state immediately after submission is:
  - `https://eventoren.de/events/abiball-36a4910d`: **Discovered — currently not indexed**, with the sitemap and homepage listed as discovery sources.
  - `https://eventoren.de/events/pilates-christmas-event-2027-final`: **URL is unknown to Google**; its URL is included in the newly fetched sitemap.
- Current legal-page discovery needs follow-up. Indexed legacy `/datenschutzerklaerung/` and `/impressum/` now redirect permanently to their current 200/self-canonical equivalents. URL Inspection is a sample of Google's stored state, not a complete coverage report or a live test.
- The production sitemap is registered under `sc-domain:eventoren.de`; Google has fetched the XML containing **eight submitted URLs** without reported warnings/errors. This does not establish that Google has crawled or indexed each destination.
- Live `sitemap.xml` contains the homepage, contact, support, three legal pages, and both real public events. Every destination returns 200 without a redirect; the closed ticket shop and development inventory are excluded.
- Raw homepage HTML contains both event anchors and their titles, locations, dates, and prices before JavaScript runs. Hydration and filtering retain the correct card set. Public event pages return useful SSR content, self-canonicals, and `index, follow`.
- `/abiball-2027.html` permanently redirects once to the working `/abiball-2027` closed ticket shop. It is a password-gated, school/year-specific buyer experience, not an organizer acquisition page, and remains noindexed/outside the sitemap.
- There are **zero published production Ratgeber articles**. `/ratgeber` is a real 404; the two demo articles are intentionally noindexed. There is no existing article portfolio to optimize.
- The dev host, current Pages preview, and new noncanonical deployment URL send `X-Robots-Tag: noindex`; canonical production does not. Production canonicals alone are not exclusion directives.

## Prioritized implementation tasks

### 1. Initial catalog SSR — live in production

- **Current context:** Implemented with synchronous initial-page application in `src/events/indexPageStateCreate.ts`, retaining the existing effect for later client updates. Initial HTML now contains the event anchors and descriptive content; hydration and city filtering preserve the correct card set. No duplicate query path or catalog redesign was added.
- **Verification context:** Development and production have distinct inventories. Verify production against its explicit configuration or canonical public API, never a bare app-CLI `--env` flag with inherited development URLs. Static `vite preview` is not an SSR verification target; do not mutate catalog data merely to test rendering.
- **Change:** The source homepage route already has a server loader, so first confirm the deployed build and trace the loader-to-catalog-state handoff; do not add a second fetch path blindly. Make the first render use the loaded catalog rather than only the loading state. Render real `<a href="/events/…">` links, event names, locations, dates, and prices before hydration. Keep existing live updates and filters.
- **Cause addressed:** Catalog data already reaches the server loader. Since Solid's `createEffect` does not run during SSR, `src/events/indexPageStateCreate.ts` now initializes the displayed state synchronously instead of relying on that effect. The existing server query is reused.
- **Targets:** `src/routes/index.tsx`, the homepage/catalog state and view, `src/events/EventCatalogHero.tsx`, `EventGrid.tsx`, and `EventCardTicket.tsx`.
- **Acceptance:** An HTTP fetch with no JavaScript contains anchors to every event in the initial published catalog page, including the two current events. The hydrated view does not duplicate cards. Unknown/unpublished event IDs still return actual 404s. Displayed dates remain explicitly Europe/Berlin; stored instants remain UTC.
- **Outcome:** Discovery no longer depends entirely on Google's JavaScript-rendering stage.

### 2. Event-inclusive sitemap — live in production; registration complete

- **Current context:** Production now serves eight sitemap URLs: the six static pages and two real public events. Bootstrap the gitignored Convex bindings in a clean release checkout before bundling. Development inventory must not be mixed into the production sitemap.
- **Change now:** Extend the existing build-time sitemap generator, rather than introducing a new runtime route. Include all currently published, indexable production event canonical URLs using the existing catalog client, alongside the six static URLs. Enumerate the published catalog's pages, not just the homepage's first batch. Do not mix preview inventory into the production sitemap.
- **Targets:** `src/sitemapCompile.ts`, a small reusable/testable URL-list helper if needed, and the existing published-catalog API client. Preserve the current `build` → `sitemap:compile` integration.
- **Larger follow-up for review:** A request-time sitemap with short caching can remove the redeploy requirement if publication frequency warrants it. No new sitemap-serving architecture is required for this increment.
- Use genuine content modification dates where available. Otherwise omit optional `lastmod`; do not reset every URL to the build/request date.
- Keep private workspaces, checkout/cart/account routes, the gated Abiball ticket shop, demo pages, nonexistent articles, and unpublished events out. Do not expose new business-data endpoints solely for this task; reuse the existing catalog contract.
- **Registration complete:** `https://eventoren.de/sitemap.xml` is resubmitted under **`sc-domain:eventoren.de`**. Google has fetched the expanded eight-URL version with no reported warnings/errors; registration does not mean its URLs are indexed.
- **Acceptance:** XML returns 200, uses canonical absolute URLs, contains every current public event, and contains no redirecting/non-200 URL. The domain property subsequently lists the submitted sitemap; monitor processing and errors rather than treating submission as indexing.
- **Follow-up:** Reinspect both public event URLs on **2 and 9 November 2026** (7 and 14 days after release). Use Search Console's request-indexing UI for those two events; URL Inspection's API call itself does not request indexing.
- **User Google session required:** Request indexing for the two public events from an authenticated Search Console browser. The available browser session is signed out, so no manual indexing request has been made. A live Rich Results Test verdict also remains to be obtained; raw-markup checks do not establish Google's rich-result eligibility.

### 3. Legacy canonical redirects — live in production

- **Current context:** Implemented in the generated production worker. Vite dev does not run that worker; its existing app-level trailing-slash response is not the production redirect verification target.
- **Hosting boundary:** `www.eventoren.de` currently redirects from a separate legacy origin. The release fixes apex legacy paths; a `www` legacy URL may therefore take two permanent hops. The worker's combined one-hop handling applies only if `www` is subsequently routed to Pages; do not change DNS merely to remove this working redirect hop.
- **Mappings:** Both `/datenschutzerklaerung/` and `/datenschutzerklaerung` redirect directly with 301 to `/datenschutz`; `/impressum/` redirects with 301 to `/impressum`. Query strings are preserved, and destinations are self-canonical 200 pages.
- **Targets:** `scripts/ssrWorkerSourceCreate.ts` now defines the exact legacy mappings before SSR handling, alongside the existing www redirect; `scripts/buildSsrWorker.ts` generates that source. The production advanced-mode worker applies the redirects, not a static `_redirects` file alone.
- Legacy referring URL `/produkt/volleyball-turnier-2/` also ends at a 404, has no recorded impressions, and has no identified current equivalent. Leave it as an honest 404 unless an equivalent is established. Do not redirect unrelated expired products to the homepage.
- **Acceptance:** Each apex legacy URL reaches its intended canonical in one permanent hop; the destination is 200 and self-canonical. The existing separate `www` redirect must preserve path/query and reach that destination without a loop. The sitemap contains destination URLs only.
- **Outcome:** Consistent migration signals for URLs Google already knows. The available data does not quantify migration losses.

### 4. Search wording and metadata — live in production

- **Current context:** Event-specific WebPage identity, images, titles, and encoded canonicals are live in SSR. The router `HeadContent` is mounted in the reactive body tree, as required for full-document hydration. Its own portals update title/canonical/description/OG/JSON-LD during SPA navigation; no new provider, dependency, or forced reload is needed. Renaming event records requires organizer validation.
- **Organizer follow-up:** Confirm descriptive official names for public events rather than generic records such as `Abiball `. Use the real event identity and city; do not invent a school, venue, date, or business identity merely for search copy.
- Example to validate with the organizer: `Abiball „KABItalismus“ in Berlin | Eventoren`, using the existing event subtitle rather than inventing a school, date, or venue.
- Add each event's real public image to `Event.image`; preserve accurate dates, venue/address, prices, currency, and availability. Missing `image` is an improvement opportunity, not proof of rich-result ineligibility.
- The inherited homepage-valued `WebPage` JSON-LD on event routes is corrected; Event and Offer URLs share the encoded canonical.
- **Targets:** `src/seo/eventDetailHeadCreate.ts`, `src/seo/seoPages.ts`, `src/routes/index.tsx`, `src/lib/seo.ts`, and the `HeadContent` mount point in `src/routes/__root.tsx`.
- Clarify the homepage offer in `src/routes/index.tsx` / `src/seo/seoPages.ts`:
  - Title: `Veranstaltungen entdecken & Tickets kaufen | Eventoren`.
  - Description: `Entdecke veröffentlichte Veranstaltungen, prüfe Termine, Orte und Ticketpreise und kaufe deine Tickets direkt bei Eventoren.`
- **Acceptance:** The relevant metadata appears in raw HTML; one canonical/title/description/robots tag per public page; event-specific WebPage identity; truthful Event markup. After release, run Google's Rich Results Test against the production event URLs and resolve any required-field errors using real organizer data; recommended-field warnings depend on available data. No external rich-result eligibility claim is made by the local checks.
- Have each organizer link its canonical event page from its official event/school/venue website, with a descriptive event-name anchor. Do not rely only on links to the generic homepage or checkout.

### 5. Gated Abiball redirect loop — repaired in production

- **Current context:** The extensionless route now serves the existing HTML with canonical/noindex response headers. The static HTML also has its own canonical/noindex metadata, so directly serving it cannot bypass exclusion. The existing Cloudflare `.html` → extensionless normalization no longer loops; Vite dev serves both variants directly.
- **Change:** Serve the existing closed buyer experience at `https://eventoren.de/abiball-2027` instead of redirecting to the `.html` asset. Make the `.html` variant redirect permanently in one direction only; do not change its access or checkout behavior as part of the SEO task.
- **Targets:** `src/routes/abiball-2027.tsx`, `src/abiball/abiballShopHtmlResponseCreate.ts`, and the head metadata in `public/abiball-2027.html`. The buyer experience itself is unchanged.
- **Acceptance:** The extensionless URL returns 200, the `.html` URL reaches it without a loop, and the closed shop has one canonical and `noindex`. It stays out of the sitemap. Use real public `/events/…` pages as search destinations instead.
- The static shop describes a particular school/year; do not assume it is equivalent to `/events/abiball-36a4910d` or redirect between them. The loop is a real usability defect, but there is no measured search traffic to recover here.

### 6. Preview exclusion — dev and current Pages preview active

- **Current context:** The dev host, current Pages preview alias/deployment, and new production deployment's noncanonical URL send `noindex` while remaining crawlable. Historical immutable deployment URLs are not retroactively changed. Canonical production responses remain indexable. Preview data access is a separate hosting decision because the development backend is tailnet-only; do not mix in production data to bypass that boundary.
- **Change:** Keep the Vite dev-only `X-Robots-Tag: noindex` and add the same exclusion to the generated Pages worker for noncanonical deployment hosts, including `preview.eventoren.pages.dev` and per-deployment URLs. Production apex/www must remain unaffected; retain the production canonical.
- Allow crawlers to fetch the preview response so they can see `noindex`. **Do not simultaneously add `Disallow: /`**, which would prevent Google from reading the exclusion directive.
- **Acceptance:** Homepage/event/asset-fallback responses on dev and Pages preview hosts carry `noindex`; apex production URLs do not. Preserve response bodies, status, cache headers, and cookies. No claim is made that any preview is currently indexed.

### 7. Review required: new acquisition content — P2, content/web, weeks 3–4

- First ship tasks 1–6 and collect discovery/indexation results. With only two public events and no production articles, mass city/category pages would not provide useful inventory.
- Validate two product-relevant editorial hypotheses against actual organizer needs and search results before writing:
  - `/ratgeber/abiball-tickets-online-verkaufen`: an explicitly **organizer/Abikomitee** walkthrough covering setup, capacity/prices, invitations, entry, and the actual settlement process—not another buyer-facing “Abiball 2027 Ticketshop” page.
  - `/ratgeber/qr-code-einlass`: a practical organizer guide to QR-code entry, staff preparation, and the product's real scanning workflow.
- These are proposed experiments, **not keywords validated by the seven Search Console impressions**. Do not optimize for `toreins`, republish the thin demo fixtures, or invent search volumes.
- **Targets:** Add `src/routes/ratgeber.tsx` and `src/routes/ratgeber.$slug.tsx` using the existing content components/compiler; populate `public/ratgeber/`; reuse `src/lib/seo.ts` article-head support, publication gating, and sitemap integration. These production routes do not exist today.
- **Acceptance:** Each approved guide has substantive original instructions, a clear audience and CTA, one canonical/H1, Article markup, server-rendered text, crawlable links from a public page, and a sitemap entry. Future-dated articles and demo content remain excluded. Keep private `/veranstalter` application routes noindexed; a workspace is not a marketing landing page.
- Link guides to real public event examples where relevant and to `/kontakt` for genuine organizer inquiries, not to the gated ticket shop. Review at six weeks after publication: impressions and relevant queries first, then qualified visits/inquiries—not article count alone.

### 8. Review required: lead delivery and conversion measurement — before scaling acquisition

- **Small correction implemented:** The existing contact surface clearly says online delivery is unavailable and links to the published email address: `partner@eventoren.de` for organizers or `support@eventoren.de` for visitors. Tabs switch the helper correctly. It no longer simulates successful delivery; opening an email client is not evidence of a sent inquiry.
- Repository inspection finds no active application analytics integration. Existing consent-gated Google tracking helpers are available under `ui/composite/cookie/consent/`; unused helpers or commented environment keys do not establish a configured production account.
- Online form delivery/persistence is not implemented. The email fallback must not be counted as a delivered inquiry.
- Ensure the actual inquiry is delivered/persisted, then connect its real success event to an existing owned measurement account using the existing consent helpers. Do not introduce a new analytics vendor by default or send personal form contents to analytics.
- **Future capability acceptance:** A controlled inquiry is received by the organizer-facing team; conversion fires only on genuine success and with required consent. Organic landing pages can then be evaluated against real inquiries/ticket outcomes. This work does not itself improve rankings.

## Delivery and measurement

- **Current deployment:** Production is built from committed code, excluding unrelated working-tree edits. The existing checkout activation-hold and organizer-termination backend contracts are available. Client-only metadata corrections require a frontend release, not another backend push. Keep the fresh private data backup and prior Pages deployment available for rollback. The expanded sitemap is fetched; no repeated submission is needed without a meaningful change.
- **Week 1:** Obtain organizer-owned links to the canonical public events. Keep the direct contact-email path honest; a real lead backend/measurement pipeline remains a separate review item.
- **2 and 9 November:** Inspect both public event URLs. Target: Google discovers the pages, selects their intended canonicals, and indexes the useful public events. If not, investigate the specific fetch/indexing state rather than repeatedly submitting unchanged URLs.
- **From 23 November, using finalized data only:** Establish the first usable post-release 28-day baseline. Report property-level clicks/impressions, public-event landing pages, and disclosed relevant non-brand queries separately. Allow for Search Console's reporting lag; do not sum page impressions into a property total or classify hidden queries.
- **Weeks 3–4, if approved:** Publish only the validated guide briefs. At day 60, compare equivalent finalized 28-day periods and account for the event calendar/inventory. Primary growth signal: relevant non-brand impressions and clicks to real events/guides; business signal: completed ticket outcomes or delivered qualified organizer inquiries.
- Avoid CTR targets or “position 4–20” optimization from the present single-digit sample. Once a relevant query/page cohort has meaningful impressions, use its actual position and intent to decide whether to improve the snippet, content, or internal links.

## CLI runbook

Use the working configured default profile. No tokens or credential contents belong in this document.

```bash
# Reproduce the finalized baseline; property-level totals come from date rows.
npx -y @adaptive-ds/google-search-console-client search-analytics query \
  'sc-domain:eventoren.de' 2026-10-19 2026-10-24 \
  --dimensions date --data-state final --row-limit 1000

# Monitor sitemap registration/processing.
npx -y @adaptive-ds/google-search-console-client sitemaps list \
  'sc-domain:eventoren.de'

# Read the registered sitemap's current fetch/error status.
npx -y @adaptive-ds/google-search-console-client sitemaps get \
  'sc-domain:eventoren.de' 'https://eventoren.de/sitemap.xml'

# Repeat for each public event; this reads Google's stored state.
npx -y @adaptive-ds/google-search-console-client url-inspection inspect \
  'https://eventoren.de/events/abiball-36a4910d' 'sc-domain:eventoren.de'
```

For weekly performance checks, move the date window to the latest finalized reporting days and query `date`, `page`, and `query` separately. Retain aggregation distinctions; do not compare a partial day with a finalized one.

## Focused implementation verification

- Use existing dependencies, public catalog contracts, and `#ui/…` components. Preserve live Convex updates and the Europe/Berlin datetime contract.
- Scope exception for API surfaces: metadata, redirects, robots directives, sitemap XML, and static editorial pages are web-specific representations of existing data/content, not new business operations; do not add duplicate CLI/Hono/client/MCP operations for them. If contact delivery introduces a new business capability, plan that separately under the repository's shared-schema and multi-surface requirements.
- Keep focused route/SSR/sitemap regression tests. The release check is `bun run frontend:build:production`, followed by `bun run seo:check`, `bun run ssr:check`, and the existing TypeScript check. Use the production entrypoint: bare `bun run build` selects development configuration and intentionally omits production events. For approved new articles, include `content:check` / `content:compile` and publication-gating checks; adapt assertions to request-time SSR rather than assuming static HTML files exist.
- Browser-smoke only the homepage → event path, repaired campaign redirect, unknown-event 404, and preview headers after deployment. Do not run the entire test/e2e suite for each small SEO increment.
- The CLI does not provide a full coverage export, backlink inventory, manual-actions report, or Core Web Vitals report. This plan makes no claims about those and does not prioritize a performance rewrite without measurements.
