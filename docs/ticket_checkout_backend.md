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
Billing treats `onlineTicketUrl` as a customer-facing link and must not fetch it or any other request URL. The
authenticated route itself only validates and persists the request; the downstream Billing worker, invoice/PDF
pipeline, and email delivery are separate asynchronous implementation stages described below.

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

## Temporary local/preview fallback

If Billing is unavailable during local/preview UI work, set
`PUBLIC_CHECKOUT_BILLING_BYPASS=true` in the frontend environment and restart
the existing preview service. It is effective only with
`PUBLIC_ENV_MODE=development` or `PUBLIC_ENV_MODE=preview` and routes `/checkout` to the existing fixture-only
`/demo/checkout` flow. No Convex order, reservation, payment, ticket, or Billing
request is created. Leave it `false` (or unset) for production.

For a temporary direct-purchase walkthrough that also skips the contact,
participant, and legal form fields, additionally set
`PUBLIC_CHECKOUT_FORM_BYPASS=true`:

```dotenv
PUBLIC_ENV_MODE=preview
PUBLIC_CHECKOUT_BILLING_BYPASS=true
PUBLIC_CHECKOUT_FORM_BYPASS=true
```

The second switch is effective only when the existing Billing bypass is
active. `/checkout` then reuses `DemoCheckout` and completes its fixture-only
paid confirmation locally as soon as the demo cart contains an available
fixture ticket. No form interaction, Convex call, or Billing request occurs.
Both switches are explicitly guarded against `PUBLIC_ENV_MODE=production`;
keep them `false` or unset in production. Restart the existing preview
service after changing frontend environment values.

Inventory is released automatically when an unpaid pre-Billing reservation has no Billing payment context, when Billing reports `payment: "failed"`, or after the scheduled reservation expiry successfully calls Billing's authenticated `POST /api/checkout/organizations/eventoren/ticket-checkout/:paymentReference/expire` operation and receives `payment: "expired"`. The latter is projected locally as terminal `status: "expired", paymentStatus: "expired"` and released in one Convex mutation. Provider errors, invalid responses, and a still-`pending` response retain the reservation and schedule another expiry attempt; they are never inferred as abandonment. The mutation verifies payment correlation and rechecks paid state, so a concurrent paid reconciliation wins without releasing paid inventory. A missing Billing payment context keeps the pre-Billing `released` path for reservations whose Billing request never persisted.

Billing's implementation guards its expiration persistence with the exact organization, Stripe mode, Session ID, and pending payment state, and its webhook path never demotes paid truth. The remaining cross-service race is: Billing returns `expired`, Eventoren releases, then Stripe completes payment and Billing's late paid webhook upgrades Billing's local projection to `paid`. Eventoren cannot atomically coordinate that external transition; its paid reconciliation therefore records `paid_inventory_conflict` without issuing tickets or touching another order's inventory. This is payment-fulfilment fallout, not an oversell path, and is intentionally not treated as permission to release on `pending` or ambiguous provider errors.

## Fulfillment activation runbook (disabled by default; prerequisites outstanding)

`EVENTOREN_BILLING_FULFILLMENT_ORGANIZATION_ALLOWLIST` is the one explicit activation switch. It is a comma-separated allowlist of exact Billing organization IDs; an unset or empty value disables fulfillment. The intended activation value is one authoritative Billing organization ID, not a guessed or generated default. Only a newly inserted Eventoren checkout evaluates the allowlist. The resulting `fulfillmentEligible` value is persisted on that order; replays use the stored value and legacy orders without it remain ineligible. Changing the environment cannot activate, deactivate, or retroactively change an existing order, and there is no backfill.

Before activation, the user/operator must populate the authoritative checkout commercial snapshot tax policy (`taxBasis` and `taxRatePercent`) for new orders. Billing does not infer, default, or backfill either value. If either field is missing, the Eventoren invoice is blocked with `INVOICE_TAX_POLICY_MISSING` until the user policy is configured upstream; no invoice provider call is made for that blocked attempt. Existing snapshots are not rewritten, so orders created before the policy is populated remain blocked rather than being backfilled.

### Deployment and migration order

This is an operational sequence, not an activation performed by this repository:

1. Keep the allowlist unset/empty and do not configure a fulfillment provider while preparing the rollout.
2. Deploy Eventoren's Convex schema and functions, including `ticketCheckoutCreateAction`, `ticketPaymentStatusApplyMutation`, `ticketPaymentReconcileScheduledAction`, `ticketFulfillmentWorkEnsure`, `ticketFulfillmentWorkScheduledAction`, `ticketFulfillmentWorkDueQuery`, `ticketFulfillmentPrepareAction`, `ticketFulfillmentWorkClaimMutation`, `ticketFulfillmentWorkContextQuery`, `ticketFulfillmentWorkOrderIdQuery`, `ticketFulfillmentWorkOnlineUrlEnsureMutation`, `ticketFulfillmentWorkPreparedMutation`, `ticketFulfillmentWorkRetryMutation`, and the access-capability functions used by the preparation action. Keep the existing five-minute payment-reconciliation and fulfillment-work cron entries deployed.
3. Deploy Billing with migrations `0048_eventoren_ticket_fulfillments.sql`, `0049_eventoren_ticket_invoice_state.sql`, and `0050_eventoren_ticket_confirmation_state.sql`. Billing applies SQLite migrations during startup before it starts the durable Eventoren confirmation worker.
4. Verify the Eventoren-to-Billing package compatibility and the empty-allowlist behavior in the target environments. Do not enable the allowlist until the authoritative tax policy is present in the snapshot-producing path.
5. Only after those checks may the operator deliberately set the single exact Billing organization ID in `EVENTOREN_BILLING_FULFILLMENT_ORGANIZATION_ALLOWLIST` and restart the existing services. This document does not authorize deployment, flag changes, provider setup, or claiming readiness to activate.

Billing's worker starts with the Billing application bootstrap, performs an initial bounded recovery, then wakes on new work and its interval. Live mode prepares one combined ticket PDF, one Lexware invoice PDF, and the two accepted legal PDFs; it sends exactly one email only after all four artifacts exist. Test mode is the explicit Lexware-driven exception: it prepares and sends exactly three PDFs (ticket, terms, privacy), makes no Lexware call, and does not replace the missing invoice with a local artifact. A `sending` or `unknown` confirmation state is reported as `manual_reconciliation_required`, not as a generic retryable `failed` result.
