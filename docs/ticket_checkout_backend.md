# Eventoren ticket backend

Task 3 exposes these Convex functions for the future checkout UI:

- `api.ticketing.ticketCheckoutCreateAction`: reserves the selected tiers in one Convex transaction, persists an immutable order/payment attempt, and calls Billing's authenticated Eventoren ticket-checkout route. The action accepts either the existing `token` or a high-entropy `guestAccessToken` (at least 32 alphanumeric/`_`/`-` characters). The guest token is hashed before persistence.
- `api.ticketing.ticketPaymentReconcileAction`: polls Billing's organization-scoped dynamic status endpoint and applies only `pending`, `paid`, `failed`, or release-safe `expired` states. Browser redirects never mark an order paid.
- `api.ticketing.ticketOrderGetQuery`: returns an order and issued tickets for its logged-in owner or guest capability.
- `api.ticketing.ticketOrderListMineQuery`: returns the logged-in user's wallet orders.

`ticketCheckoutCreateAction` uses `EVENTOREN_BILLING_STRIPE_MODE` rather than accepting a client-selected mode. It validates return URLs against `EVENTOREN_PUBLIC_BASE_URL`, and sends Billing only server-derived catalog pricing. Configure these private Convex environment values:

- `EVENTOREN_BILLING_BASE_URL`
- `EVENTOREN_BILLING_ORGANIZATION_ID`
- `EVENTOREN_BILLING_API_CREDENTIAL`
- `EVENTOREN_BILLING_STRIPE_MODE` (`test` or `live`)
- `EVENTOREN_PUBLIC_BASE_URL`
- `EVENTOREN_BILLING_FULFILLMENT_ORGANIZATION_ALLOWLIST` (optional comma-separated Billing organization IDs; unset or empty is disabled)

`ticketCheckoutCreateAction` returns the additive `fulfillmentEligible` boolean. It is evaluated only when a new
Eventoren checkout order is inserted from the allowlist above and is persisted on that order. Replays return the
persisted value, with missing legacy values normalized to `false`; changing the allowlist cannot change a replay. The
existing checkout request, Billing checkout call, payment provider flow, and ticket issuance are unchanged when the
allowlist is disabled.

The task-1 fulfillment wire contract is defined in Billing's client package as
`eventorenTicketFulfillmentPrepareRequestSchema` and `eventorenTicketFulfillmentPrepareResponseSchema`, with the
authenticated `eventorenTicketFulfillmentPrepare` client method targeting
`POST /api/checkout/organizations/eventoren/ticket-fulfillment`. The request carries the stable Billing
`orderReference` and `paymentReference`, Eventoren-issued admission codes and ticket IDs, event/tier labels,
`startsAt`/`endsAt`/`doorsAt`, venue/city/address, `onlineTicketUrl`, locale, and accepted legal Markdown snapshots.
Billing treats `onlineTicketUrl` as a customer-facing link and must not fetch it or any other request URL. No Billing
handler, route worker, invoice, email, PDF, or provider side effect is part of this task.

The legal snapshot revision is deterministic: remove the YAML front matter from `src/legal/agb.md` and
`src/legal/datenschutz.md`, trim each resulting Markdown body, serialize exactly
`JSON.stringify({ termsMarkdown, privacyMarkdown })` in that property order, hash its UTF-8 bytes with SHA-256, and
prefix the lowercase hex digest with `sha256:`. The current source revision is
`sha256:cde3b9ff38ba7e012154d8b642ff52b98d9d725d99e1a3d5704d52e1566db31f`; run
`bun run legal:checkout-revision` after either source changes. There is no arbitrary legal URL fetch. Enabled new
orders reject a legal revision or Markdown body other than the generated current snapshot; the exact accepted revision
and Markdown bodies are persisted on the order. Legacy replays are not revalidated and accept their legacy checkout
context shape.

Every event/tier admin mutation schedules a durable catalog push. Sync uses the monotonic catalog version, Billing's idempotent same-version digest contract, and exponential retries. Reservations increment Eventoren's authoritative `reserved` count atomically; payment reconciliation changes `reserved` to `sold` and issues tickets exactly once.

## Billing package and deployment routing

Eventoren imports the client and shared wire contracts from the vendored
standalone Billing artifact, pinned in `package.json` as an exact local file:

```json
"billing": "file:vendor/billing-0.1.1.tgz"
```

Refresh the artifact from Billing with `bun run package:check`, copy
`billing-<version>.tgz` from Billing's
`build/billing-package/artifacts/` to `vendor/`, update the exact `file:`
specifier if the Billing version changed, and run `bun install`. Do not replace
the bytes of a same-version tarball: Bun can reuse its lock/cache entry. Bump
the Billing package version for a normal refresh. If a local same-version
repair is unavoidable, remove `node_modules/billing`, the ignored `bun.lock`,
and the Bun cache (`bun pm cache rm`) before reinstalling. The tarball is
intentionally included by the `vendor/*.tgz` `.gitignore` exception so a
deployment archive does not need the Billing repository.

Preview Convex actions use the existing host-gateway route and test Stripe
mode:

```dotenv
EVENTOREN_BILLING_BASE_URL=http://169.254.1.2:3146
EVENTOREN_BILLING_STRIPE_MODE=test
```

This address reaches Billing's host-only `billing-preview.service` from the
Convex container. It is internally equivalent to the public preview URL
`https://preview.billing.contentoren.de`, but the public hostname is not used
inside the container because its reverse-proxy hairpin is unreliable.

Production uses the private Convex values
`EVENTOREN_BILLING_BASE_URL=https://billing.contentoren.de` and
`EVENTOREN_BILLING_STRIPE_MODE=live`. The existing routing is correct; no
additional bridge or public preview route is needed.

Inventory is released automatically when an unpaid pre-Billing reservation has no Billing payment context, when Billing reports `payment: "failed"`, or after the scheduled reservation expiry successfully calls Billing's authenticated `POST /api/checkout/organizations/eventoren/ticket-checkout/:paymentReference/expire` operation and receives `payment: "expired"`. The latter is projected locally as terminal `status: "expired", paymentStatus: "expired"` and released in one Convex mutation. Provider errors, invalid responses, and a still-`pending` response retain the reservation and schedule another expiry attempt; they are never inferred as abandonment. The mutation verifies payment correlation and rechecks paid state, so a concurrent paid reconciliation wins without releasing paid inventory. A missing Billing payment context keeps the pre-Billing `released` path for reservations whose Billing request never persisted.

Billing's implementation guards its expiration persistence with the exact organization, Stripe mode, Session ID, and pending payment state, and its webhook path never demotes paid truth. The remaining cross-service race is: Billing returns `expired`, Eventoren releases, then Stripe completes payment and Billing's late paid webhook upgrades Billing's local projection to `paid`. Eventoren cannot atomically coordinate that external transition; its paid reconciliation therefore records `paid_inventory_conflict` without issuing tickets or touching another order's inventory. This is payment-fulfilment fallout, not an oversell path, and is intentionally not treated as permission to release on `pending` or ambiguous provider errors.
