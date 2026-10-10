# Optional Zitadel OIDC organization role sync

Set server-only `OIDC_ZITADEL_ORG_ID` and `ZITADEL_PROJECT_ID` on the app runtime to enable role synchronization. Leaving the organization ID unset retains the existing provider role behavior. When enabled, authorization requests retain existing scopes and add the Zitadel project audience and project-roles scopes.

The callback requires a signed ID token with valid issuer, audience, expiry, and nonce. Only the verified ID-token role claim for the configured project is used; UserInfo supplies profile data, never roles. A role is recognized only when its organization map is an object with its own key for the configured organization ID. Missing, malformed, or wrong-organization roles synchronize as an empty role set (customer) rather than rejecting sign-in. Role precedence is admin, then organizer, then customer. Organization-local membership roles and other providers are unaffected.

Only the app callback may submit a Zitadel sign-in to the public Convex action. It signs the complete provider payload—including identity, email, roles, and sync mode—with `AUTH_SECRET`, shared by app and Convex runtimes. The proof expires after 60 seconds; unsigned direct calls are rejected.

The setting is optional and must be a server runtime secret, never a public or Vite variable. Example variable names are in `.env.development.example` and `.env.production.example`.
