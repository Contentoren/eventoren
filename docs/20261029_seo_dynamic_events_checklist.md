# SEO Baseline Checklist: Dynamic Events (port of semesterkur SEO pass)

Ported from semesterkur (`7b3dbac9`, `4c760ddf`, `281a02a6`, `d7c6e81b`, `aac9559f`).
Adapted to eventoren: nothing is hardcoded per event. Dynamic catalog events are covered
by shared components, the shared legal layout, and generated route/sitemap data.

## Decisions

- **Canonical & host:** `https://eventoren.de` (`src/seo/seoSiteUrl.ts`). Dynamic event
  canonicals come from `eventDetailHeadCreate` and mirror the sitemap event URLs.
- **No per-event static entries:** sitemap event URLs are generated from the published
  catalog (`sitemapEventUrlListCreate`); request-time SSR routes (`/events/$eventId`)
  are derived from `src/routeTree.gen.ts`, so new routes never need checker updates.
- **Images:** `Img` (`ui/static/img/Img.tsx`) defaults to 1200x800 (32x32 for svg) with
  `loading`/`decoding` always set. Managed assets pass real metadata dimensions.
- **Legal pages:** `LegalPage` renders the single `<h1>` from its `title` prop;
  `legalPageStateCreate` strips a leading content `<h1>` (e.g. datenschutz.md).

## Checklist

- [x] Shared `Img` defaults (width/height/fetchPriority/ariaHidden) incl. unit-covered behavior
- [x] `LogoImageText` width/height props with defaults (170x32)
- [x] Public event surfaces use `Img`: detail banner, catalog hero, knockout/magnific
  heroes, booking countdown, site logo
- [x] Legal pages keep exactly one `<h1>` (`/datenschutz`, `/privacy` pass `title`)
- [x] `public/404.html`: German, `lang=de`, noindex, manifest link, single `<h1>`
- [x] `public/abiball-2027.html` (noindex gated shop): single `<h1>`, manifest link
- [x] Deterministic dist checker (`src/seoOutputCheck.ts` → `seoOutputVerify`):
  one `<h1>`, `lang=de`, charset, viewport, manifest, title/description/canonical
  cardinality, canonical match, og/twitter tags, JSON-LD validity, internal link
  and fragment resolution, image attributes, sitemap↔pages consistency with SSR
  exemptions derived from the route tree, robots, manifest
- [x] Unit tests (`src/seoOutputCheck.test.ts`): valid output plus malformed-output cases
- [x] `bun run src/seoOutputCheck.ts` green against `dist/client`

## Verify

- `bun test src/seoOutputCheck.test.ts test/legalPageStateCreate.test.ts --isolate`
- `bun run src/seoOutputCheck.ts` (runs as part of `bun run seo:check`)
- New dynamic event pages: no checker or sitemap change needed; covered by
  `eventDetailHeadCreate` + `sitemapEventUrlListCreate` + `seoSsrRouteMatches`.
