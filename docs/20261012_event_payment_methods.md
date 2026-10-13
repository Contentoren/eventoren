# Per-event Stripe payment methods and SEPA ticket lifecycle

## Goal

Let an event restrict the payment methods offered by Stripe Checkout. Preserve Billing's existing organization/instance fallback when the event has no override. Issue a valid ticket when a SEPA debit has been initiated through completed Stripe Checkout, without waiting for bank confirmation; cancel that ticket if the debit subsequently fails or is returned/disputed.

Repositories:
- Eventoren: current repository.
- Billing: `../billing`.

## Status and current context

- Implementation in progress; tasks are completed and marked below as their bounded increments are integrated.
- User approved preview verification followed by production deployment in a coordinated, staged window: Billing first, Eventoren second, enable new behavior only after both are ready.
- E2E purchases are restricted to preview/Stripe test mode. Delayed SEPA outcomes use controlled fixtures rather than live charges or waiting for settlement.
- Preserve existing uncommitted E2E ownership-proof changes and the unrelated Billing documentation change.
- Shared contract changes must be packaged through Billing's existing vendored-client workflow and consumed by both repositories.
- Billing contracts, trusted Checkout policy enforcement, additive lifecycle persistence/status and verified completion processing are implemented. Eventoren catalog persistence and the admin selector are implemented. Client/sync integration, issuance/cancellation, delivery, and rollout remain in progress.
- Verified configured test/live method choices: card, Klarna, SEPA debit, Bancontact. PayPal, iDEAL, bank transfer, and standalone Wero remain unavailable; bank transfer also has no existing usable rail configuration. Do not expose these as selectable custom methods.
- Shared status evidence uses optional `checkoutCompletedAt`, `paymentMethodType`, `stripePaymentIntentStatus`, and a strictly correlated `cancellation` object. Early issuance requires the joint completed/SEPA/processing evidence, not any field alone.

## Agreed behavior

### Event selection and fallback

- Use the existing `CheckMultiple` component through `#ui/input/check/CheckMultiple.jsx`; do not create a replacement selector.
- Put payment methods in a collapsible section of the shared admin event create/edit form.
- New events and events without an override start with the section collapsed and the virtual **Allow all** choice selected.
- Open the section when editing an event with an existing custom selection, so the override is visible.
- Allow all is mutually exclusive with specific methods:
  - Selecting a specific method removes Allow all.
  - Selecting Allow all clears the specific methods.
  - Clearing the last specific method returns to Allow all.
- Allow all is UI-only. It means **no event override**, not an exhaustive list of Stripe methods. Do not persist or send its sentinel to Billing or Stripe.
- No override preserves the existing Billing organization/instance resolution, account settings, and Checkout behavior unchanged. Do not add or modify organization/instance settings for this feature.
- A custom list replaces the fallback for that event; it is not merged with the fallback. Do not silently broaden an invalid or unavailable custom list.
- Existing events need no backfill: an absent field keeps current behavior.
- Both create and edit support the setting. A policy change participates in the existing event revision/catalog synchronization rules.

### Method choices

Use an optional, non-empty, deduplicated allowlist named `allowedStripePaymentMethods`. Canonicalize ordering for comparisons and synchronization. UI empty/default selections normalize to an absent override; malformed explicit empty lists at the Billing contract boundary are rejected.

Initial method mappings, subject to the Stripe account and transaction supporting them:
- Credit/debit cards: `card`. Apple Pay and Google Pay are eligible card-wallet presentations, not separate allowlist entries.
- PayPal: `paypal`.
- Klarna: `klarna`.
- SEPA Direct Debit: `sepa_debit`.
- Bank transfer: `customer_balance`, with the required bank-transfer options and Customer supplied by Billing.
- iDEAL / iDEAL | Wero: `ideal`, labelled according to Stripe's supported integration.
- Bancontact: `bancontact`.
- Standalone Wero: include only after confirming an officially supported per-session restriction mechanism and account access. Do not invent a `wero` API value or represent Wero-only as `ideal`.

Stripe currently documents standalone Wero as access-gated/private preview. Verify the configured test/live accounts, pinned Stripe SDK/API version, currency, Checkout mode, and necessary method-specific options before enabling a choice. If standalone Wero cannot be enforced, keep it unavailable as a custom choice with a clear explanation; do not change the fallback to work around it.

SEPA, iDEAL, Bancontact, and EU bank-transfer currency/region requirements must be validated where applicable. Bank-transfer Checkout requires a Stripe Customer and `payment_method_options.customer_balance` funding/rail configuration; merely allowing `customer_balance` is insufficient. Reuse existing Billing configuration for those options rather than creating another organization configuration layer.

### Ticket and payment lifecycle

- A newly created or merely open Checkout Session does not issue a ticket.
- For SEPA, verified completion of Checkout plus evidence that the selected debit is processing allows ticket issuance immediately. This is not bank settlement.
- Use server-verified Stripe evidence, never the browser success URL. Persist `checkoutCompletedAt` and the resolved `paymentMethodType`; a retrieved completed Stripe Session can establish completion even if webhooks arrive out of order.
- Keep the financial payment state pending until Stripe confirms success. Do not translate unpaid Checkout completion into `paid`.
- Cards and other immediately confirmed methods retain their existing paid flow. A bank-transfer Checkout completion that merely displays funding instructions does not authorize early ticket issuance; issue only after payment is confirmed.
- `checkout.session.async_payment_succeeded` settles the payment. Do not issue duplicate tickets, consume inventory twice, or resend an already-delivered ticket.
- `checkout.session.async_payment_failed` cancels tickets issued for the failed debit. Before issuance, retain the existing failed-payment reservation release behavior.
- Handle verified post-success SEPA returns/disputes through `charge.dispute.created`, correlated to the original SEPA payment and order, even when the original payment was recorded as paid. Do not expand this into a generic card-dispute policy.
- Record cancellation separately from the original Stripe payment outcome, using a bounded reason such as `payment_failed` or `sepa_disputed`. Preserve the charge/payment/dispute evidence; do not label a completed-but-unpaid debit as paid or confuse a dispute with a refund.
- A cancelled ticket remains recorded but cannot be admitted. Preserve ticket identifiers, check-in history, and already-issued inventory counters. This feature does not introduce resale/restocking of cancelled issued tickets. Reservations for payments that failed before issuance are released as today.
- Cancellation is idempotent and terminal for ticket validity: delayed completion/success must not revive tickets. Later financial truth may still be recorded.
- No custom "missing payment after N days" timer. Rely on Stripe's debit outcome events. Stripe does not document a generic pending-too-long event.
- Keep `checkout.session.expired` and existing unfinished-checkout expiry separate from a debit already processing. Do not release or expire processing SEPA solely because the local reservation retry interval elapsed.

### Ticket delivery and cancellation visibility

- Tickets issued at SEPA Checkout completion must be available to the customer immediately, including ticket delivery through the existing email service.
- Separate ticket-only delivery from paid invoice/receipt/booking work. Existing paid-only financial fulfillment must not run early just to deliver the ticket.
- Track ticket delivery independently so later settlement does not duplicate it. Normal paid checkout keeps its existing delivery behavior.
- Customer and admin projections distinguish pending payment with valid issued tickets from cancelled tickets. Existing payment-option hints must not advertise methods excluded by a custom event policy.
- Include cancellation in the organizer view and ensure scanner/check-in validation rejects it. Do not delete tickets or erase their history.

## Architecture and boundaries

- The policy belongs to the trusted synchronized **event catalog**, not a buyer-controlled checkout request.
- Billing reads the event policy from its persisted catalog, validates it, and passes an internal option to Stripe session creation.
- Snapshot the original override, including its absence, in the existing checkout commercial/source snapshot. Retry/replay uses that snapshot, not a subsequently edited event policy. No separate database column is needed for the policy itself.
- Add completion/method/cancellation evidence as additive fields in the dynamic checkout context and shared status response. Retain the existing payment enum; processing is represented by pending payment plus verified completion evidence, not a false paid value.
- Eventoren has its own ticket issuance/cancellation markers. Pending issued orders remain eligible for existing reconciliation until settlement or cancellation.
- Existing polling can discover pending-payment outcomes, but historical paid orders are not polled indefinitely. Add a narrow authenticated Billing-to-Eventoren cancellation notification for async SEPA failure and post-paid SEPA dispute.
- There is currently no Eventoren inbound payment callback to reuse. Use a dedicated fixed receiver URL and server-only authentication/signature configuration; do not reuse an outbound Billing API credential as inbound authentication.
- Reuse persisted Stripe event processing/redelivery: await cancellation acceptance before marking the Stripe event processed; a delivery error leaves it retryable. Redelivery must attempt the notification even if Billing's local state transition already happened. Do not build a generic notification/outbox platform for this feature.
- Cancellation is persisted in Billing's status projection as well as delivered to Eventoren, so direct status reconciliation can recover the same outcome. Correlate organization, test/live mode, payment reference, checkout/order identity, and Stripe identifiers.

## Implementation tasks

Use the existing libraries from each repository's `package.json` and existing `#ui/...` components. Read the applicable repository instructions and code-style skill before TS/TSX changes. Make one bounded increment at a time; do not combine all tasks into one implementation delegation.

### 1. Billing: method capability mapping and shared contracts

- [x] Confirm the enforceable method mappings and account-specific availability, including Wero and bank-transfer options, without changing global Stripe configuration or upgrading the API speculatively.
- [x] Extend `src/billing-client/contracts/eventorenCatalogEventSchema.ts` with the optional allowlist; retain compatibility with older catalog data.
- [x] Extend `src/billing-client/contracts/eventorenTicketCheckoutStatusResponseSchema.ts` with optional completion, resolved-method, and cancellation evidence. Apply the same projection to any relevant checkout response schema.
- [x] Keep the buyer-facing `eventorenTicketCheckoutCreateRequestSchema` free of a method override.
- [x] Add focused contract tests in `src/billing-client/contracts/eventorenBillingContracts.test.ts`.

Acceptance: old payloads still parse; no override is distinguishable from a custom list; virtual Allow all never crosses the API; standalone Wero is not fabricated.

### 2. Billing: enforce the event policy at Stripe Checkout creation

- [x] Carry the catalog field through catalog upsert serialization in `src/checkout/server/eventorenCatalogUpsertHandlerCreate.ts`.
- [x] In `src/checkout/server/eventorenTicketCheckoutHandlerCreate.ts`, resolve the policy from the persisted event and include it in the commercial/source snapshot.
- [x] Thread a trusted internal option through `src/checkout/server/organizationDynamicCheckoutCreate.ts` to `src/payments/stripeCheckoutSessionCreate.ts`. Do not unnecessarily expose it through the generic public dynamic-checkout input.
- [x] Set `payment_method_types` only for an explicit event override, with any required method-specific options. Preserve current request construction when absent.
- [x] Reuse the saved policy and options on checkout replay, preserving existing identity/revision checks.
- [x] Test explicit restriction, absent override/fallback, invalid methods/currency, bank-transfer options, and retry after an event policy edit.

Acceptance: SEPA-only checkout cannot offer an unrelated method; default checkout is unchanged; replay does not adopt a newer custom policy.

### 3. Billing: persist completion and adverse payment outcomes

- [x] Add the necessary nullable lifecycle fields in `src/platform/database/schema.ts` and a migration through the existing Drizzle workflow. Store completion time, resolved method, and cancellation evidence; do not add redundant policy storage.
- [x] Update `src/checkout/server/organizationDynamicCheckoutStatusGet.ts` to expose the additive lifecycle evidence.
- [x] Extend `src/payments/stripeEventProcess.ts` and the appropriate session processor to persist verified completed/processing SEPA without entering paid booking/invoice work.
- [ ] Keep `src/payments/stripeCheckoutSessionPaidProcess.ts` genuinely paid-only. On later success, update payment truth and existing paid financial work without reissuing tickets.
- [ ] Reuse pending async-failure handling and persist the cancellation reason needed by Eventoren.
- [ ] Add SEPA-only dispute correlation using verified charge/PaymentIntent/context records and existing correlation helpers. Persist cancellation despite an originally paid context.
- [ ] Test duplicate and reordered completion/success/failure/dispute events, wrong organization/mode/session correlation, and expiry versus processing.

Acceptance: unpaid completion never becomes paid; unrelated/card disputes are untouched; cancellation remains terminal even if later positive events arrive.

### 4. Shared client packaging and Eventoren consumption

- [ ] Build the Billing client with `scripts/billingPackageBuild.ts` / `bun run package:build`.
- [ ] Update Eventoren's existing vendored Billing dependency and lockfile using its established packaging workflow.
- [ ] Update `src/ticketing/convex/billingEventorenClient.ts` and status/checkout consumers to carry the additive fields. Old responses without them keep their current behavior.
- [ ] Regenerate existing generated API/client artifacts only where required by the repository workflow.

Acceptance: both repositories agree on catalog/status contracts without a breaking payment enum change.

### 5. Eventoren: persist and synchronize the event override

- [x] Update `src/catalog/convex/catalogTables.ts`, `src/catalog/client/CatalogEventUpsertInput.ts`, `src/catalog/client/catalogEventUpsert.ts`, and `src/catalog/convex/catalogEventUpsertMutation.ts`.
- [ ] Carry the policy through `src/events/EventItem.ts`, `src/catalog/convex/catalogEventToEventItem.ts`, and the catalog snapshot/push paths, including `catalogSyncSnapshotBuildMutation.ts`, `catalogSyncSnapshotQuery.ts`, and `catalogSyncPushAction.ts` where applicable.
- [x] Include normalized policy changes in revision/change comparisons; preserve omission for existing events.
- [ ] Keep checkout identity/context handling aligned with event revision and snapshot semantics. Do not pass a browser-selected whitelist to Billing.
- [ ] Add focused upsert and sync tests.

Acceptance: create/edit and sync round-trip custom selections; absent/default settings remain absent; ordering-only changes do not cause false revisions.

### 6. Eventoren: collapsed admin selector

- [x] Extend `src/admin/AdminEventDraft.ts` and `src/admin/adminEventDetailsFormStateCreate.ts`.
- [x] Add the section to shared `src/admin/AdminEventDetailsForm.tsx`, using existing collapsed `<details>` conventions and `CheckMultiple`.
- [x] Implement Allow all exclusivity and normalization outside the generic component. Do not change `CheckMultiple` behavior for other consumers.
- [x] Provide accurate labels, group card wallets under cards, and make unsupported choices unavailable rather than claiming they can be enforced.
- [x] Keep the existing create/edit routes and buyer payment hints aligned with the event setting; no unrelated checkout redesign.
- [x] Add state/adapter tests. Defer live-browser verification to task 11.

Acceptance: collapsed default, Allow all selected, correct mutual exclusion, empty selection returns to default, and saved custom selections are visible on edit.

### 7. Eventoren: issue valid tickets before SEPA settlement

- [ ] Add minimal issuance/completion/cancellation markers in `src/ticketing/convex/ticketTables.ts` as needed; do not globally reinterpret the order/payment enums.
- [ ] Refactor the issuance portion of `src/ticketing/convex/ticketPaymentStatusApplyMutation.ts` so verified processing SEPA completion can issue tickets while financial payment remains pending.
- [ ] Reuse the existing allocation and reservation-to-sold accounting exactly once. Pending without eligible completion evidence must not issue.
- [ ] On later paid application, update settlement/booking details without duplicate issued rows, inventory changes, or ticket delivery.
- [ ] Update `ticketPaymentReconcileAction.ts`, `ticketPaymentReconcileScheduledAction.ts`, and `ticketPaymentReconcileScheduledContextQuery.ts` so pending issued orders stay reconciled. Pass completion/method/cancellation evidence through all apply callers.
- [ ] Preserve unfinished-checkout expiry, late-paid inventory-conflict handling, and bank-transfer paid-only issuance.
- [ ] Test both completion/settlement orders and duplicate reconciliation.

Acceptance: the customer receives a valid SEPA ticket before settlement; ordinary pending checkout cannot obtain a ticket; settlement is idempotent.

### 8. Cross-repository: cancel issued tickets on SEPA failure/return

- [ ] Add a narrow authenticated outcome receiver in Eventoren's existing `convex/http.ts` routing and a transactional internal cancellation mutation exported through `convex/ticketing.ts`.
- [ ] Validate full payment/order correlation and stable Stripe event identity. Duplicate delivery succeeds without repeated side effects; mismatched orders are not silently accepted.
- [ ] Mark the order's tickets cancelled, preserve history and issued counters, release only any remaining reservations, and prevent later issuance/delivery/reactivation.
- [ ] In Billing, deliver async-failure/dispute cancellation from the relevant Stripe processing path, using a fixed configured destination and server-only authentication. Use existing Stripe event retry semantics rather than an unrelated receipt worker or generic outbox.
- [ ] Persist the same cancellation evidence in Billing status responses. Make Eventoren's direct reconciliation honor it even for already-paid orders; do not add an endless scan of historical paid orders.
- [ ] Ensure `src/organizer/convex/organizerTicketCheckInApply.ts` rejects cancelled tickets and preserves previous check-in history.
- [ ] Test cancellation before/after issuance, after settlement, duplicate delivery, lost callback response/retry, authentication/correlation failure, and positive events after cancellation.

Acceptance: later failed/returned SEPA invalidates admission automatically, including an already-paid order; no cancelled ticket can be revived by a delayed event.

### 9. Cross-repository: delivery and customer/admin projections

- [ ] Separate early ticket delivery from paid financial fulfillment. Reuse existing mail transport/templates and durable delivery conventions; add only the bounded ticket-only work needed for eligible pending SEPA.
- [ ] Update the Eventoren fulfillment snapshot/scheduling paths, including `ticketFulfillmentWorkSnapshotCreate.ts`, so valid early-issued tickets are accessible and delivered once.
- [ ] Extend Billing's authenticated fulfillment/confirmation integration as needed for ticket-only delivery, explicitly checking verified SEPA completion. Keep invoice/receipt and booking assignment paid-only in `eventorenTicketFulfillmentPrepare.ts`, `eventorenTicketConfirmationProcess.ts`, and related workers.
- [ ] On later settlement, send only financial artifacts still due; do not duplicate ticket delivery. Stop undelivered ticket work after cancellation.
- [ ] Include cancellation/issuance evidence in `ticketOrderProjectionCreate.ts`, customer order/status/history views, admin order views, and organizer display where currently missing.

Acceptance: valid pending tickets are available and delivered; no early paid receipt; cancelled tickets are clearly invalid; normal paid checkout stays unchanged.

### 10. Focused automated verification

- [ ] Each implementation increment runs only its relevant tests; add new focused test files if a behavior has no suitable existing home.
- [ ] Run shared package/type checks after contract integration, not after every small UI edit.
- [ ] Use webhook fixtures for delayed Stripe outcomes; do not wait business days or run the full E2E suite for individual changes.

Existing targeted commands, selected by the task rather than all run on every increment:

Billing, from `../billing`:
```sh
bun test src/billing-client/contracts/eventorenBillingContracts.test.ts src/billing-client/billingClientCreate.test.ts
bun test src/checkout/server/eventorenTicketCheckout.test.ts
bun test src/payments/stripeWebhook.test.ts src/payments/stripeEventCorrelationResolve.test.ts
bun test src/checkout/server/eventorenTicketConfirmationProcess.test.ts
bunx tsc --noEmit
bun run package:build
```

Eventoren, from this repository:
```sh
bun test test/adminEventFormAdapters.test.ts test/adminEventDetailsFormStateCreate.test.ts test/catalogEventUpsert.test.ts
bun test test/billingEventorenClient.test.ts
bunx vitest run --config vitest.convex.config.ts convex-tests/catalogSync.test.ts convex-tests/catalogSyncStateGet.test.ts
bunx vitest run --config vitest.convex.config.ts convex-tests/ticketPaymentLifecycle.test.ts convex-tests/ticketPurchaseCheckIn.test.ts convex-tests/organizerTicketCheckIn.test.ts
bun run typecheck
```

Run `bun run convex:codegen` when the schema/API changes require it. Use adjacent existing tests for projection/delivery changes and add narrowly scoped receiver/cancellation tests. Do not substitute a full test-suite run for targeted coverage.

### 11. Final browser verification and rollout

- [ ] Delegate live UI verification to a browser subagent once the integrated changes are ready.
- [ ] Verify new/edit event defaults, collapse behavior, mutual exclusion, persistence after reload, and a custom SEPA-only selection.
- [ ] In Stripe test mode, verify default Checkout remains unchanged and restricted Checkout offers only the permitted methods. Verify pending-SEPA ticket visibility and cancelled-ticket admission rejection using controlled outcome fixtures where needed.
- [ ] Use the configured test administrator credentials through `zitadel-cli`; never store credentials in this document or fixtures.
- [ ] Apply Billing's additive migration/API changes and distribute the client package, then deploy Eventoren's receiver/consumer and configure authenticated outcome delivery before enabling the feature for events.
- [ ] Ensure both sides are ready before creating restricted events or issuing pending-SEPA tickets. Leave existing event defaults and organization/instance settings untouched.
- [ ] Keep early SEPA issuance disabled during mixed-version deployment; use a minimal server-side readiness gate if existing controls cannot prevent it. Enable only after authenticated cancellation delivery and the receiver are configured and verified.
- [ ] Before production deployment, obtain a consistent Billing database backup, confirm additive migration/rollback constraints, and verify each service's health after its staged update. Do not change production Stripe mode or create live E2E purchases.

## Out of scope

- A new payment provider or global organization/instance configuration redesign.
- Separate wallet allowlist entries, a fabricated Wero mapping, or speculative Stripe API upgrades.
- Automated refunds, generic card-dispute handling, automatic ticket reinstatement, or resale of cancelled issued inventory.
- An arbitrary pending-SEPA timeout, replacement reservation system, generic notification platform, or polling every historical paid order.

## Stripe references

- [Checkout payment methods](https://docs.stripe.com/payments/checkout/payment-methods)
- [Checkout Session creation](https://docs.stripe.com/api/checkout/sessions/create)
- [Delayed payment event flow](https://docs.stripe.com/payments/dashboard-payment-methods)
- [SEPA failures and disputes](https://docs.stripe.com/payments/sepa-debit)
- [Wero availability](https://docs.stripe.com/payments/wero)
- [iDEAL / Wero migration](https://docs.stripe.com/payments/ideal)
- [Bank transfer requirements](https://docs.stripe.com/payments/bank-transfers)
