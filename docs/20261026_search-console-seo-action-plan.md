# Eventoren: Search Console SEO action plan

- Date: 26 October 2026.
- Status: Release preflight is complete. Format and commit only the identified technical-fix files, leaving unrelated legal/e2e/docs edits untouched; build and deploy from the pushed commit in an isolated checkout. Verify production behavior before resubmitting the expanded sitemap. New editorial pages/features and larger architectural changes remain proposals for review.
- Goal: Make real public events discoverable and indexable, then grow relevant non-brand impressions, ticket visits, and organizer inquiries.
- Approach: Fix discovery and broken URLs before investing in keyword expansion. Current traffic is too small to justify CTR experiments or ranking conclusions.

## Items requiring user review

- A production Ratgeber section and the two proposed organizer guide briefs in task 7.
- A request-time sitemap instead of the existing build-time generator, if publication frequency justifies that architectural change.
- A real inquiry-delivery backend and consent-aware conversion analytics in task 8. The small honest email fallback does not implement either capability.
- Optional consolidation of the legacy `www` host onto Cloudflare Pages. Its existing permanent apex redirect works; changing DNS/hosting is not required for this frontend release.

## Production baseline and current Search Console state

Collected with `@adaptive-ds/google-search-console-client` v0.5.0, using the configured default credentials and property `sc-domain:eventoren.de` (`siteOwner`), plus production HTTP/browser checks and repository inspection.

- **Available finalized performance, 19–24 October:** 1 click, 7 impressions, 14.29% CTR, average position 9.29. These are property-level web-search totals, not sums of page/query rows.
- Earlier requests return no performance rows. This does **not** establish a verification date or prove historical traffic was zero. There is no usable previous-period comparison.
- The only disclosed query is `toreins` with one impression. It is not evidence of a relevant keyword opportunity. Query rows do not account for property totals, so branded/non-branded shares cannot be calculated.
- The homepage is indexed. Google reports both current public event URLs as **“URL is unknown to Google”**:
  - `https://eventoren.de/events/abiball-36a4910d`
  - `https://eventoren.de/events/pilates-christmas-event-2027-final`
- `/kontakt` and `/support` are also unknown in the inspection sample. Older `/impressum/` and `/datenschutzerklaerung/` URLs have indexed records, but the current no-slash legal URLs are unknown. Live `/datenschutzerklaerung/` temporarily redirects to a 404; `/impressum/` temporarily redirects to the current 200 page. URL Inspection is a sample of Google's stored state, not a complete coverage report or a live test.
- The production sitemap is now registered under `sc-domain:eventoren.de`; Google has fetched the current six-URL file without reported warnings/errors. Sitemap-level indexed counts are not a substitute for URL Inspection or a coverage report.
- The live `sitemap.xml` works, but contains only **six URLs**: homepage, contact, support, and three legal pages. Neither public event is included.
- Raw homepage HTML contains a loading placeholder and **no event anchors**. The browser displays two event cards after JavaScript runs. Event detail pages themselves return useful server-rendered content, HTTP 200, self-canonicals, and `index, follow`.
- `/abiball-2027` redirects to `/abiball-2027.html`, which redirects back: a reproducible **308 redirect loop**. Its underlying static page is a password-gated, school/year-specific buyer ticket shop, not an organizer marketing landing page. It should not be added to the SEO sitemap by default.
- There are **zero published production Ratgeber articles**. `/ratgeber` is a real 404; the two demo articles are intentionally noindexed. There is no existing article portfolio to optimize.
- The dev host `eventoren.wonder1.de` now sends `X-Robots-Tag: noindex`. Pages preview/alias host exclusion is implemented in the worker but requires deployment. Production canonicals alone are not exclusion directives.

## Prioritized implementation tasks

### 1. Initial catalog SSR — implemented; production rollout pending

- **Current context:** Implemented with synchronous initial-page application in `src/events/indexPageStateCreate.ts`, retaining the existing effect for later client updates. Initial HTML now contains the event anchors and descriptive content; hydration and city filtering preserve the correct card set. No duplicate query path or catalog redesign was added.
- **Verification context:** The development catalog is empty. Use the isolated local SSR process with production public-catalog configuration for raw HTML and hydration checks; static `vite preview` is not an SSR verification target. Do not mutate catalog data merely to test rendering.
- **Change:** The source homepage route already has a server loader, so first confirm the deployed build and trace the loader-to-catalog-state handoff; do not add a second fetch path blindly. Make the first render use the loaded catalog rather than only the loading state. Render real `<a href="/events/…">` links, event names, locations, dates, and prices before hydration. Keep existing live updates and filters.
- **Diagnosis:** Catalog data already reaches the serialized server loader result. `src/events/indexPageStateCreate.ts` populates the displayed signals only in `createEffect`, which does not execute during Solid SSR. Correct the initial state derivation; do not duplicate the server query.
- **Targets:** `src/routes/index.tsx`, the homepage/catalog state and view, `src/events/EventCatalogHero.tsx`, `EventGrid.tsx`, and `EventCardTicket.tsx`.
- **Acceptance:** An HTTP fetch with no JavaScript contains anchors to every event in the initial published catalog page, including the two current events. The hydrated view does not duplicate cards. Unknown/unpublished event IDs still return actual 404s. Displayed dates remain explicitly Europe/Berlin; stored instants remain UTC.
- **Outcome:** Discovery no longer depends entirely on Google's JavaScript-rendering stage.

### 2. Event-inclusive sitemap — implemented; registration complete, rollout pending

- **Current context:** Event-inclusive build-time generation is implemented, and the documented production build correctly selects production inventory. The registered live file remains the six-URL version until deployment; bare development builds intentionally omit production events.
- **Change now:** Extend the existing build-time sitemap generator, rather than introducing a new runtime route. Include all currently published, indexable production event canonical URLs using the existing catalog client, alongside the six static URLs. Enumerate the published catalog's pages, not just the homepage's first batch. Do not mix preview inventory into the production sitemap.
- **Targets:** `src/sitemapCompile.ts`, a small reusable/testable URL-list helper if needed, and the existing published-catalog API client. Preserve the current `build` → `sitemap:compile` integration.
- **Larger follow-up for review:** A request-time sitemap with short caching can remove the redeploy requirement if publication frequency warrants it. No new sitemap-serving architecture is required for this increment.
- Use genuine content modification dates where available. Otherwise omit optional `lastmod`; do not reset every URL to the build/request date.
- Keep private workspaces, checkout/cart/account routes, the gated Abiball ticket shop, demo pages, nonexistent articles, and unpublished events out. Do not expose new business-data endpoints solely for this task; reuse the existing catalog contract.
- **Registration complete:** The existing live `https://eventoren.de/sitemap.xml` is registered under **`sc-domain:eventoren.de`** and fetched. The expanded event-containing file becomes available after the code is deployed at the same URL; registration does not mean its URLs are indexed.
- **Acceptance:** XML returns 200, uses canonical absolute URLs, contains every current public event, and contains no redirecting/non-200 URL. The domain property subsequently lists the submitted sitemap; monitor processing and errors rather than treating submission as indexing.
- **Follow-up:** Reinspect both public event URLs at 7 and 14 days. Use Search Console's request-indexing UI for those two events after the fixes; URL Inspection's API call itself does not request indexing.

### 3. Legacy canonical redirects — implemented; production rollout pending

- **Current context:** Implemented in the generated production worker. Vite dev does not run that worker; its existing app-level trailing-slash response is not the production redirect verification target.
- **Hosting boundary:** `www.eventoren.de` currently redirects from a separate legacy origin. The release fixes apex legacy paths; a `www` legacy URL may therefore take two permanent hops. The worker's combined one-hop handling applies only if `www` is subsequently routed to Pages; do not change DNS merely to remove this working redirect hop.
- **Change:** Add direct 301 mappings from both `/datenschutzerklaerung/` and `/datenschutzerklaerung` to `/datenschutz`; the indexed old address currently ends at a hard 404. Change `/impressum/` → `/impressum` from a temporary 307 to a permanent redirect. Update any remaining internal old-address links.
- **Targets:** `scripts/ssrWorkerSourceCreate.ts` now defines the exact legacy mappings before SSR handling, alongside the existing www redirect; `scripts/buildSsrWorker.ts` generates that source. The production advanced-mode worker applies the redirects, not a static `_redirects` file alone.
- Legacy referring URL `/produkt/volleyball-turnier-2/` also ends at a 404, has no recorded impressions, and has no identified current equivalent. Leave it as an honest 404 unless an equivalent is established. Do not redirect unrelated expired products to the homepage.
- **Acceptance:** Each apex legacy URL reaches its intended canonical in one permanent hop; the destination is 200 and self-canonical. The existing separate `www` redirect must preserve path/query and reach that destination without a loop. The sitemap contains destination URLs only.
- **Outcome:** Consistent migration signals for URLs Google already knows. The available data does not quantify migration losses.

### 4. Search wording and event metadata — implemented; production rollout pending

- **Current context:** Event-specific WebPage identity, existing event images, trimmed/location-aware titles, homepage wording, and sitemap-aligned encoded event canonicals are implemented. Renaming event records or using the subtitle as the event's official identity requires organizer validation.
- **Organizer follow-up:** Confirm descriptive official names for public events rather than generic records such as `Abiball `. Use the real event identity and city; do not invent a school, venue, date, or business identity merely for search copy.
- Example to validate with the organizer: `Abiball „KABItalismus“ in Berlin | Eventoren`, using the existing event subtitle rather than inventing a school, date, or venue.
- Add each event's real public image to `Event.image`; preserve accurate dates, venue/address, prices, currency, and availability. Missing `image` is an improvement opportunity, not proof of rich-result ineligibility.
- The inherited homepage-valued `WebPage` JSON-LD on event routes is corrected; Event and Offer URLs share the encoded canonical.
- **Targets:** `src/seo/eventDetailHeadCreate.ts`, `src/seo/seoPages.ts`, `src/routes/index.tsx`, and `src/lib/seo.ts`.
- Clarify the homepage offer in `src/routes/index.tsx` / `src/seo/seoPages.ts`:
  - Title: `Veranstaltungen entdecken & Tickets kaufen | Eventoren`.
  - Description: `Entdecke veröffentlichte Veranstaltungen, prüfe Termine, Orte und Ticketpreise und kaufe deine Tickets direkt bei Eventoren.`
- **Acceptance:** The relevant metadata appears in raw HTML; one canonical/title/description/robots tag per public page; event-specific WebPage identity; truthful Event markup. After release, run Google's Rich Results Test against the production event URLs and resolve any required-field errors using real organizer data; recommended-field warnings depend on available data. No external rich-result eligibility claim is made by the local checks.
- Have each organizer link its canonical event page from its official event/school/venue website, with a descriptive event-name anchor. Do not rely only on links to the generic homepage or checkout.

### 5. Gated Abiball redirect loop — implemented; production rollout pending

- **Current context:** The extensionless route now serves the existing HTML with canonical/noindex response headers. The static HTML also has its own canonical/noindex metadata, so directly serving it cannot bypass exclusion. The existing Cloudflare `.html` → extensionless normalization no longer loops; Vite dev serves both variants directly.
- **Change:** Serve the existing closed buyer experience at `https://eventoren.de/abiball-2027` instead of redirecting to the `.html` asset. Make the `.html` variant redirect permanently in one direction only; do not change its access or checkout behavior as part of the SEO task.
- **Targets:** `src/routes/abiball-2027.tsx`, `src/abiball/abiballShopHtmlResponseCreate.ts`, and the head metadata in `public/abiball-2027.html`. The buyer experience itself is unchanged.
- **Acceptance:** The extensionless URL returns 200, the `.html` URL reaches it without a loop, and the closed shop has one canonical and `noindex`. It stays out of the sitemap. Use real public `/events/…` pages as search destinations instead.
- The static shop describes a particular school/year; do not assume it is equivalent to `/events/abiball-36a4910d` or redirect between them. The loop is a real usability defect, but there is no measured search traffic to recover here.

### 6. Preview exclusion — dev active; Pages rollout pending

- **Current context:** The local dev host `eventoren.wonder1.de` is covered by a Vite dev-only response middleware and sends `noindex`. The generated worker also covers noncanonical Pages hosts; that portion takes effect after deployment.
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

- **Next frontend release:** Deploy the completed technical patch using the existing production frontend release process, isolating it from unrelated pre-existing legal/e2e changes in this working tree. No new Convex schema/business operation needs deploying for these fixes. Check raw production HTML, sitemap coverage, redirects, and preview exclusion after release; the sitemap is already registered.
- **Week 1:** Obtain organizer-owned links to the canonical public events. Keep the direct contact-email path honest; a real lead backend/measurement pipeline remains a separate review item.
- **Days 7 and 14 after deployment:** Inspect both public event URLs. Target: Google discovers the pages, selects their intended canonicals, and indexes the useful public events. If not, investigate the specific fetch/indexing state rather than repeatedly submitting unchanged URLs.
- **After 28 finalized days:** Establish the first usable baseline. Report property-level clicks/impressions, public-event landing pages, and disclosed relevant non-brand queries separately. Do not sum by-page impressions into a property total or treat hidden queries as branded/non-branded.
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
