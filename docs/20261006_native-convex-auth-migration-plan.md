# Native Convex authentication and public catalogue architecture

## Protected application data

The browser obtains a validated application session from `GET /api/session`, which reads the HttpOnly `eventoren-session` cookie and returns the token/profile with `Cache-Control: no-store`. The cookie remains the server-side session authority; the browser keeps the bootstrapped token in memory only, never local storage. SSR reads authentication from the request cookie and does not pass the token into the client provider. Logout revokes the session when possible, clears the cookie, and causes in-memory identity to be cleared.

Protected browser reads and mutations use the native Convex client with the current session token explicitly included in arguments. A client-side identity/profile is not authorization. Backend wrappers verify the JWT and resolve its active session and user; each operation still enforces its required role, organization, ownership, or capability. Token expiry, session revocation, and logout must prevent further protected access.

Use native live queries/mutations for protected interactive application data, including admin, organizer, and signed-in order views. Keep purposeful HTTP/server-function paths for SSR, identity-provider administration, uploads, payment and webhook integrations, and other service boundaries. Pagination must not silently truncate authorized lists. Do not turn a ticket guest capability into an authenticated application session.

## Public catalogue and ticket capabilities

The public homepage catalogue remains an anonymous HTTP read, not a protected live query. Successful catalogue responses may be shared for 60 seconds (`public, max-age=60, s-maxage=60`); errors are `no-store`. Do not extend this policy to personalized HTML or unrelated endpoints.

Generated ticket access links are independent of login and browser session state. They are opaque, revocable, read-only capabilities; validate the capability server-side and preserve ownership/revocation checks. Guest ticket access must not grant administrative, refund, or transfer authority.
