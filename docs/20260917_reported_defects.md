# Reported Defects Remediation

## Goal

Resolve the reported public-app defects so authentication, checkout redirects, public legal pages, route failures, and empty states behave correctly and the app can be validated end to end.

## Decisions

- Preserve the configured canonical public origin as the sole trusted origin for auth and payment return URLs.
- Derive browser-visible URLs from the canonical origin rather than an untrusted request origin.
- Keep legal content specific to the existing Eventoren setup; remove all placeholder wording.
- Reuse existing UI components from `#ui/...` and avoid unrelated dependencies.

## Tasks

1. Diagnose and fix SSO callback verification and canonical checkout return URL handling; add focused regression coverage.
2. Add a root route error component and eliminate server/client hydration divergence in language and cart initialization.
3. Replace privacy and terms placeholder content and placeholder document titles with complete German public copy; compile legal artifacts.
4. Make no-results search and direct empty-cart checkout states explicit and reliably visible.
5. Run focused and full static/build/test verification, addressing only regressions caused by these changes.
6. Commit the completed work using the `/commits` workflow, then deploy.

## Current Context

- Task 1 complete: SSO and checkout return URLs now require, validate, and canonicalize `PUBLIC_BASE_URL_APP`; focused auth/return URL tests, unit tests, and build pass.
- Existing unstaged fulfillment work has an inconsistent `fulfillmentEligible` contract that currently blocks typecheck and Convex ticketing tests; it is outside task 1 scope.
- Task 2 complete: root errors use an `ErrorPage` fallback; persisted language and checkout cart state now apply after hydration. Focused tests, build, SSR checks, and browser checks pass without hydration warnings.
- Existing unstaged fulfillment work continues to block typecheck and Convex ticketing tests.
- Task 3 complete: privacy and AGB pages, SEO titles, and footer links now use German Eventoren-specific content without placeholders; legal compilation and focused tests pass.
- External legal facts unavailable in the repository were not invented. Existing unstaged fulfillment work continues to block typecheck and Convex ticketing tests.
- Task 4 complete: search empty results now render an accessible visible status; invalid or empty direct checkout renders an alert and return action. Focused/full tests, typecheck, Biome, and browser checks pass.
- Task 5 complete: static checks, unit tests (58), Convex tests (60), production build, legal compilation/revision, and SSR checks pass. `seo:check` remains unavailable because its configured `src/seoOutputCheck.ts` script is absent from `HEAD` and unchanged here.
- Task 6 is next: create conventional commits and deploy.
