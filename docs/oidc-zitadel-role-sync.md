# Optional Zitadel OIDC organization role sync

Set the server-only `OIDC_ZITADEL_ORG_ID` on the app runtime to enable role synchronization. Leave it unset to retain the existing UserInfo/provider role behavior. With it set, authorization requests keep the existing scopes and add `urn:zitadel:iam:org:project:roles`; the callback requires a signed ID token whose issuer, audience, expiry, and nonce validate. Only the verified ID-token role claim is considered. A recognized role is eligible when its organization map is an object (not an array) with its own key for the configured organization ID; the organization-name value need not be a nonempty string. UserInfo remains a profile source, never a role source. Missing or malformed/wrong-organization roles synchronize as an empty role set (customer) on every enabled sign-in; they do not reject sign-in. Role precedence is admin > organizer > customer. Organization-local membership roles and other providers are not changed.

In both modes, only the app callback may submit a Zitadel sign-in to the public Convex action: it signs the complete provider payload, including identity, email, roles, and sync mode, with `AUTH_SECRET` shared by the app and Convex runtimes. The proof expires after 60 seconds. Direct unsigned calls to the public action are rejected.

The setting is optional and should be configured as a server secret/runtime variable, never a public or Vite variable. Examples are in `.env.development.example` and `.env.production.example`.

## Legacy dev-role migration history

Live development and production scans found **zero `dev`-role users** (7 development / 3 production users total). The active role schema and Convex storage validator now exclude `dev`; neither sign-in nor authorization accepts it. The development login provider and development-environment tools are unrelated and remain available. No migration or deployment is needed for these verified environments; none was performed for this change.

The bounded internal migration remains only for historical recovery. It changes exact stored `dev` roles to `admin`, scans at most 100 users per invocation, and returns `cursor`, `isDone`, `scanned`, and `migrated`. It can inspect historical values without adding `dev` back to the active schema. If legacy records are found in another environment, separately review and approve a migration **before** deploying the narrowed schema there. The existing narrowed-schema deployment is not a migration runbook for such an environment.
