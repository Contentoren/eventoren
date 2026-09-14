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

Every event/tier admin mutation schedules a durable catalog push. Sync uses the monotonic catalog version, Billing's idempotent same-version digest contract, and exponential retries. Reservations increment Eventoren's authoritative `reserved` count atomically; payment reconciliation changes `reserved` to `sold` and issues tickets exactly once.

Inventory is released automatically when an unpaid pre-Billing reservation has no Billing payment context, when Billing reports `payment: "failed"`, or after the scheduled reservation expiry successfully calls Billing's authenticated `POST /api/checkout/organizations/eventoren/ticket-checkout/:paymentReference/expire` operation and receives `payment: "expired"`. The latter is projected locally as terminal `status: "expired", paymentStatus: "expired"` and released in one Convex mutation. Provider errors, invalid responses, and a still-`pending` response retain the reservation and schedule another expiry attempt; they are never inferred as abandonment. The mutation verifies payment correlation and rechecks paid state, so a concurrent paid reconciliation wins without releasing paid inventory. A missing Billing payment context keeps the pre-Billing `released` path for reservations whose Billing request never persisted.

Billing's implementation guards its expiration persistence with the exact organization, Stripe mode, Session ID, and pending payment state, and its webhook path never demotes paid truth. The remaining cross-service race is: Billing returns `expired`, Eventoren releases, then Stripe completes payment and Billing's late paid webhook upgrades Billing's local projection to `paid`. Eventoren cannot atomically coordinate that external transition; its paid reconciliation therefore records `paid_inventory_conflict` without issuing tickets or touching another order's inventory. This is payment-fulfilment fallout, not an oversell path, and is intentionally not treated as permission to release on `pending` or ambiguous provider errors.
