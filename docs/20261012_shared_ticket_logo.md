# Shared ticket logo

## Goal
Replace raster product-logo usages with a consistent SVG ticket and HTML/Tailwind wordmark. Provide both `public/logo.svg` (ticket only) and `public/logo-full.svg` (ticket, wordmark, subtitle fallback). Commit and deploy after verification using a Luna subagent.

## Decisions
- Use the exact installed `@adaptive-ds/mdi` `mdiTicket` geometry, yellow/gold matching the existing ticket, rotated to match its upright tilted appearance. Fit the SVG viewBox to prevent clipping.
- Preserve wording: `eventoren` and `eine Marke von Semesterkur`.
- Preferred rendering is a shared React component containing the ticket SVG image and HTML/Tailwind text. Full SVG is an independent fallback, not the default rendering.
- Maintain current header/admin logo sizing, navigation behavior, accessibility, and sidebar collapse behavior. Make HTML text readable in light and dark themes using existing theme tokens.
- Update product-logo references including the standalone public landing page, with equivalent HTML markup there. Do not refactor unrelated generic UI demos or delete legacy asset catalogs.
- Manage assets through the assets-service CLI. Retain the two explicitly requested SVG files in `public/`; do not use source-deleting upload flags. Reuse installed packages and existing `#ui/...` components.
- Deploy only the production frontend for this frontend-only change, using the existing deployment script.

## Tasks
1. Create and register both SVG variants using the assets workflow. Inspect the actual current ticket rotation before choosing the transform (MDI starts horizontal; do not assume a small negative angle alone makes it upright). Ensure both local public files and managed URLs are available. Refresh catalogs through CLI only.
2. Implement the shared logo component, integrate header/admin and static landing page, and update relevant logo paths/manifest references. Keep link and sizing behavior; no unrelated favicon or UI changes unless a logo path requires it. Add only focused tests if existing test structure supports them.
3. Independently verify asset geometry/paths and component integration, run narrowly relevant checks, and use a browser subagent to verify desktop/mobile plus light/dark rendering and direct SVG URLs. Correct scoped issues before release.
4. Task a fresh Luna subagent to load `/commits`, commit only this work, push, and deploy via `bun run frontend:deploy:production`. Verify the deployed logo URLs and header in a browser.

## Status
- Task 1: SVG sources and managed registration complete; managed public URLs currently return 404, so the application uses local public paths.
- Task 2: complete.
- Task 3: complete.
- Task 4: in progress.
