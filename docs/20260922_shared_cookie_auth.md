# Shared cookie authentication

## Goal
Eliminate authenticated-page failures caused by a valid `eventoren-session` cookie and missing or stale browser session storage. Load non-secret authentication identity once at the application root and reuse it across page navigation, including the admin shell.

## Decisions
- The existing HttpOnly application session cookie is authoritative. Preserve existing Convex token validation and role authorization.
- Authenticated browser operations use typed same-origin server functions that read the cookie and call existing backend operations. Never accept arbitrary backend operation names from the browser.
- Root authentication state exposes only allowlisted identity and readiness, not a token. No user-specific process-global SSR state or tokens in SSR loader data.
- Reuse installed libraries and existing `#ui` components. No visual redesign, new authentication scheme, or new dependencies.
- Preserve password/OTP/signup authentication and guest ticket flows. Adopt validated legacy browser sessions only when no valid cookie identity exists; stale browser state must not overwrite a current cookie identity.
- Retain backend authorization on every operation. Shared identity loading is not an authorization cache.

## Approach
Use the existing member-role server-function pattern across admin, organizer, ticketing, and account operations. Establish the cookie for login methods that currently only return a browser token. A root-owned browser context bootstraps safe identity once, supports explicit refresh after authentication changes, and clears on logout. Remove redundant page-level browser session restores and token dependencies as each area is migrated.

## Tasks
1. Implement shared cookie/session adoption and root identity lifecycle, including login/logout compatibility and focused tests. Status: completed.
2. Migrate all admin authenticated operations and shell identity to shared authentication; verify focused tests. Status: completed.
3. Migrate organizer authenticated queries/check-in operations; preserve backend authorization and verify tests. Status: completed.
4. Migrate ticketing/account consumers and remaining authentication-dependent UI; preserve guest access, remove remaining page-level token dependencies, verify tests. Status: completed.
5. Audit completeness and lifecycle/security correctness, run full checks, and browser-verify cookie-only login and navigation across representative areas. Status: completed.

## Verification requirements
- Cookie-authenticated operations work with `sessionStorage.userSession` absent.
- Root identity bootstrap is shared across child navigation; stale storage cannot replace a valid cookie session.
- Login variants establish the cookie; logout clears identity and invalidates authenticated access.
- No session token is serialized into HTML or root loader data; server-side identity remains request-scoped.
- Admin and organizer authorization remains enforced; guest checkout/status access remains unchanged.
- Browser role/check-in mutations may use only identified test data, restoring original state when possible.

## Current context
Root safe identity loading and session adoption are implemented. Shared auth context provides identity, ready, refresh, adoptSession, and clear; current-user server function returns safe identity only. Admin, organizer, ticketing, and account operations use cookie-backed server functions; shells and authentication-dependent UI consume root identity. Browser token storage remains only for legacy login adoption and cleanup, not authenticated page operations. Application Zitadel callbacks no longer include session tokens in redirect URLs. Legacy cross-origin social callback compatibility is retained. Browser API configuration exposes the existing PUBLIC-prefixed environment settings. Logout clears client identity only after server success; identity lookup errors are not treated as definitive anonymous sessions.
