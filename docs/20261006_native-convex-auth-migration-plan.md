# Eventoren — native Convex auth and public-cache plan

## Status
- Task 1 complete: protected entrypoints and credential boundaries inventoried.
- Task 2 complete: validated memory session and live backend session authorization implemented.
- Task 3 complete, including dynamically owned live-pagination subscriptions with cursor-boundary reconciliation.
- Task 4 complete: admin catalogue, scanner management, signed-in organizer, and authenticated orders use native live reads/mutations with dynamic pagination. Identity-provider member management remains HTTP.
- Task 5 implemented, including explicit Cloudflare Cache API reuse; production evidence pending deployment.
- Task 6 focused guest capability, authorization, native-client, and protected-state verification complete; typecheck and production build complete. Run mocked native-client tests in isolated processes to preserve module/context isolation.
- Initial implementation committed, pushed, and deployed to production.
- Task 6 complete: the complete production SSO, session/cache HTTP, and two-client native lifecycle suite passes. Live creation/edit, logout, revoked-token denial, and authorized owned-draft cleanup are asserted.
- Native pagination handles required/recommended splits. E2E uses explicit SSO entry, destination-form readiness, and per-attempt event identities with exact projected-ID ownership checks.
- Final harness refinements and regression coverage are ready for conventional commits/push and final production deployment.
- Anonymous deployed catalogue cache reuse and parameter isolation are confirmed with independent network requests; browser-local caching must be bypassed when inspecting runtime HIT/MISS headers.

## Goal and decisions
- Protected browser application data uses native live queries/native mutations with explicit validated session-token arguments.
- Use the implementation references below, preserving local Result and authorization contracts.
- Public homepage catalogue data stays anonymous, HTTP-fetched, and cached for approximately 60 seconds. Do not make it live.
- Generated ticket links remain usable by anyone holding a valid link, without user login or live Convex subscriptions. Preserve capability revocation and existing one-shot/status-refresh behavior.
- Retain purposeful upload, payment, webhook, SSR, and integration HTTP paths. Reuse `#ui/...` components and installed dependencies; no visual redesign.

## Current context
- Coverage includes admin catalogue, scanner links, ticket orders, members, organizer events/check-in, and signed-in ticket-order reads. Zitadel/billing operations, uploads, guest capabilities, and SSR retain intentional HTTP paths.
- `GET /api/session` now bootstraps a validated token/profile with `no-store`; the root auth provider keeps tokens in browser memory and clears them on expiry/logout. Existing SSR cookie access gates remain.
- Protected backend wrappers validate JWTs and active database session/user ownership. Existing tenant/capability checks remain. Native helpers add current in-memory tokens; the root wraps routed consumers in `ConvexClientProvider` beneath auth.
- `queryPaginatedCreate` supports complete live lists and load-more accumulated pages without fixed record ceilings; downstream subscriptions rebuild when cursors change. Admin billing enrichment remains authorized HTTP and no longer replaces native application-order snapshots.
- `src/admin/adminEventsRouteStateCreate.ts` uses native live event/category reads and mutations with dynamic pagination; authenticated loader data remains only an SSR/bootstrap fallback.
- Protected server reads obtain their token from the session cookie; explicit backend-token wrappers already exist in `src/utils/convex_backend/authQueryResult.ts` and related mutation helpers.
- Homepage browser catalogue reads use anonymous `GET /api/catalogue`; SSR uses a bounded 60-second result cache. Successful responses have the specified public cache policy; errors are `no-store`. Cloudflare runtime reuse is being integrated. Unrelated event-detail caching is unchanged.
- A separate `publicWebPageDataGet.ts` caches project information for 60 seconds; this does not cache homepage catalogue data. `public/_headers`'s HTML policy does not provide data-response caching.
- `src/ticketing/ticketOrderEmailAccessPageStateCreate.ts` consumes a link-fragment access token, performs a one-shot HTTP read, and later refreshes status using the guest capability. `ticketOrderByAccessTokenQuery.ts` checks the capability digest/revocation.

## Tasks
1. **Define protected entrypoint coverage.** Inventory admin/organizer browser reads and mutations, cookie-session bootstrap, and existing function-level token/organization checks. Classify ticket capabilities, public catalogue, upload credentials, and service integrations separately. Do not infer user-token requirements for those other credential classes.
2. **Expose a validated memory session.** Adapt existing cookie session GET bootstrap/logout to return a validated application token/profile with `no-store`; store application tokens in browser memory. Ensure protected query/mutation authorization checks signature, expiry, active session/revocation, user, organization, and required capability using query-compatible local verification and live database reads. Add missing checks without replacing the identity provider or role model.
3. **Introduce native protected helpers.** Adapt the Solid `queryCreate`/`mutationCreate` approach using the existing client and Result contracts. Handle token/argument changes, expiry, logout, reconnect, and cleanup. Retain one-shot SSR/action calls where appropriate.
4. **Migrate protected UI in bounded slices.** Start with the admin events list plus its mutations, then organizer/event-management consumers identified in task 1. Replace browser server-function reload/polling paths with live native reads. Preserve pagination, filtering, permission-denied states, and mutation results. Remove obsolete browser proxy routes only after confirming no SSR/integration consumer depends on them.
5. **Cache public homepage HTTP data.** Route homepage catalogue reads through public GET fetches backed by the existing published-only Convex read. Set successful data responses to `Cache-Control: public, max-age=60, s-maxage=60`; errors are `no-store`. Ensure SSR uses the same public data cache or a bounded 60-second result cache, not uncached Convex POSTs. Verify parameter-sensitive keys and actual deployment reuse. Do not change personalized HTML caching or automatically extend caching to unrelated endpoints.
6. **Verify guest links and lifecycle.** Preserve generated ticket links, capability revocation, polling/one-shot refresh, and uploads/payments without subscriptions or public data caching. Exercise protected login, live updates, tenant denial, expiry, revocation, and logout.

## Verification
- Focused existing tests: `bun test test/adminCookieTransport.test.ts` and `bun test test/publicWebPageDataCache.test.ts`; add exact affected session/native-helper/HTTP-cache tests.
- Run relevant ticket capability and protected authorization Convex files through the existing focused runner, not the whole suite.
- Run `bun run typecheck` and `bun run build` after integration.
- Delegate one final browser verification: homepage anonymous HTTP/cache behavior, admin two-client updates, logout/revocation, and opening a generated ticket link while signed out. Delay E2E until feature integration is complete.

## Acceptance
- Protected browser data no longer depends on server-function polling/reloads and always passes explicit validated credentials.
- Successful homepage catalogue GETs have deployed evidence of `public, max-age=60, s-maxage=60`, cache reuse, and parameter isolation; errors are `no-store`. HTML caching is not evidence of data-GET caching.
- Generated links remain capability-protected, login-free, and non-live; other intentional HTTP contracts remain intact.

## References
- Completed CRM migration (implementation reference, not a project needing remigration): `/home/leo/projects/crm/docs/20261006_native-convex-token-auth.md`
- CRM implementation: `/home/leo/projects/crm`
- Solid auth/query/mutation reference: `/home/leo/adaptive/convex-auth-solid`
