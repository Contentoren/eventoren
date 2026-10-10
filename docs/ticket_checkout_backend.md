# Eventoren ticket backend

## Checkout and inventory

`api.ticketing.ticketCheckoutCreateAction` reserves selected tiers atomically, persists an immutable order/payment attempt, and calls Billing's authenticated Eventoren ticket-checkout route. It accepts either a signed-in `token` or a high-entropy `guestAccessToken`; guest tokens are hashed before persistence. Checkout pricing comes from the server catalog, Stripe mode is configured server-side, and return URLs are validated against `EVENTOREN_PUBLIC_BASE_URL`.

`api.ticketing.ticketPaymentReconcileAction` obtains payment state from Billing. Browser redirects never mark an order paid. Reconciliation applies only `pending`, `paid`, `failed`, or safely confirmed `expired` states. Reservations move from `reserved` to `sold` and tickets issue exactly once when payment is confirmed. A pending or ambiguous provider result does not release inventory; expiry retries until Billing confirms expiry. Concurrent paid state wins over a release attempt. A rare external race can still produce a late paid result after expiry; Eventoren records a `paid_inventory_conflict` without issuing tickets or touching another order's inventory.

`api.ticketing.ticketOrderGetQuery` returns an order and issued tickets to its owner or guest capability. `ticketOrderListMinePaginatedQuery` returns indexed wallet summaries in cursor pages of up to 50. The deprecated full-array order query supports at most 50 orders and otherwise returns a Result error rather than a partial array. Organizer check-in history is similarly available in newest-first pages of 20; its deprecated full-array query errors above 50 entries. These are Convex Result errors, not HTTP responses; adapters must translate `statusCode` when applicable.

Configure private Convex environment values `EVENTOREN_BILLING_BASE_URL`, `EVENTOREN_BILLING_ORGANIZATION_ID`, `EVENTOREN_BILLING_API_CREDENTIAL`, `EVENTOREN_BILLING_STRIPE_MODE` (`test` or `live`), and `EVENTOREN_PUBLIC_BASE_URL`. `EVENTOREN_BILLING_FULFILLMENT_ORGANIZATION_ALLOWLIST` is an optional comma-separated list of exact Billing organization IDs.

## Billing fulfillment

Fulfillment eligibility is evaluated only for a newly inserted checkout order when the optional organization allowlist is configured. The resulting `fulfillmentEligible` value is persisted and replayed unchanged; a missing legacy value is false. Changing the allowlist does not alter existing orders.

The authenticated fulfillment preparation contract carries stable Billing order/payment references, Eventoren-issued ticket IDs and admission codes, event/tier labels and times, venue details, customer-facing ticket URL, locale, and accepted legal Markdown snapshots. Billing validates and persists that request; invoice/PDF creation and email delivery run asynchronously. Billing must not fetch the supplied `onlineTicketUrl` or other request URLs.

Legal content is snapshotted on the order using a deterministic revision: remove YAML front matter from `src/legal/agb.md` and `src/legal/datenschutz.md`, trim each Markdown body, serialize `JSON.stringify({ termsMarkdown, privacyMarkdown })` in that property order, hash its UTF-8 bytes with SHA-256, and prefix the lowercase hex digest with `sha256:`. Generate the current revision with `bun run legal:checkout-revision`. Enabled new orders require the current revision and exact Markdown snapshot; legacy replays retain their original context.

Every event/tier admin mutation schedules a durable catalog push. Synchronization uses monotonic catalog versions, Billing's idempotent same-version digest contract, and exponential retry. Eventoren's reserved count is authoritative for inventory reservations.

Fulfillment is disabled by default. Eligible invoice creation requires the upstream commercial snapshot to contain an authoritative `taxBasis` and `taxRatePercent`; Billing does not infer or backfill missing tax policy. Orders without these values remain blocked from invoice creation. Do not enable fulfillment by setting the allowlist until the responsible operator has configured and confirmed that policy and the target Billing integration.
