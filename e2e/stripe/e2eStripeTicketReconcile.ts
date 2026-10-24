import { createResult, createResultError } from "#result"
import type { E2eCheckpoint } from "../checkpoint/e2eCheckpointSchema.ts"
import { e2eStripeTestClientCreate } from "./e2eStripeTestClientCreate.ts"

type Proof = { paymentReference: string; orderReference: string; status: string; paymentStatus: string }

/**
 * Reconcile only the saved order/session; never search by email or delete payment history.
 *
 * Billing reuses one Stripe customer per email, so a reused customer's creation
 * metadata keeps the FIRST run's event/payment/order refs. The linked customer
 * therefore requires only the stable triple (source/organization/test-mode)
 * plus the exact linked ID and TEST live-mode linkage. The saved session keeps
 * full six-field ownership and every other session must be provably historical.
 * Subscriptions/intents/invoices must be current-owned or provably historical
 * (stable triple plus nonempty event/payment/order refs with BOTH refs different
 * from current; no timestamp comparison because concurrent/later runs are valid).
 * Unknown/missing metadata or a partial ref collision fails before mutation.
 * Historical subscriptions are left untouched; charges map to validated intents
 * with the same customer and are never deleted.
 */
export async function e2eStripeTicketReconcile(input: {
  checkpoint: E2eCheckpoint
  organizationId: string
  accountId: string
  key: string
  orderProof: (
    orderId: string,
    eventKey: string,
    runId: string,
    runCreatedAt: number,
  ) => Promise<{ success: boolean; data?: Proof; errorMessage?: string }>
  /** Independently verify Billing's email/provider mapping was retired before customer deletion. */
  customerExclusive?: (customerId: string) => Promise<boolean>
  stripe?: ReturnType<typeof e2eStripeTestClientCreate>
}) {
  const op = "e2eStripeTicketReconcile"
  const { checkpoint, organizationId } = input
  const ticket = checkpoint.ticket
  if (
    checkpoint.target !== "development" ||
    checkpoint.baseUrl !== "https://eventoren.wonder1.de" ||
    !/^(sk|rk)_test_[A-Za-z0-9]+$/u.test(input.key) ||
    !/^acct_[A-Za-z0-9]+$/u.test(input.accountId) ||
    !organizationId ||
    !ticket ||
    checkpoint.phase !== "ticket-unreconciled" ||
    ticket.eventKey !== `ticket-e2e-${checkpoint.runId}` ||
    ticket.eventTitle !== `Ticket E2E ${checkpoint.runId}` ||
    ticket.participantName !== `E2E Participant ${checkpoint.runId}` ||
    (ticket.eventId && ticket.eventId !== ticket.eventKey) ||
    !ticket.orderId ||
    !/^cs_test_[A-Za-z0-9]+$/u.test(ticket.stripeSession ?? "")
  )
    return createResultError(op, "Exact test checkout, run, target or credentials missing; checkpoint retained")

  let proof: Awaited<ReturnType<typeof input.orderProof>>
  try {
    proof = await input.orderProof(ticket.orderId, ticket.eventKey, checkpoint.runId, checkpoint.createdAt)
  } catch {
    return createResultError(op, "App order proof unavailable; checkpoint retained")
  }
  if (!proof.success || !proof.data?.paymentReference || !proof.data.orderReference)
    return createResultError(op, "App order correlation could not be verified; checkpoint retained")
  const paymentReference = proof.data.paymentReference
  const orderReference = proof.data.orderReference
  const stripe = input.stripe ?? e2eStripeTestClientCreate(input.key)
  const account = await stripe.account()
  if (!account.success || account.data !== input.accountId)
    return createResultError(op, "Stripe TEST account identity mismatch; checkpoint retained")

  const owned = (metadata: Record<string, string>) =>
    metadata.source === "eventoren_ticket" &&
    metadata.event_key === ticket.eventKey &&
    metadata.organization_id === organizationId &&
    metadata.stripe_mode === "test" &&
    metadata.payment_reference === paymentReference &&
    metadata.order_reference === orderReference
  const stable = (metadata: Record<string, string>) =>
    metadata.source === "eventoren_ticket" &&
    metadata.organization_id === organizationId &&
    metadata.stripe_mode === "test"
  const historical = (metadata: Record<string, string>) =>
    stable(metadata) &&
    typeof metadata.event_key === "string" &&
    metadata.event_key.length > 0 &&
    typeof metadata.payment_reference === "string" &&
    metadata.payment_reference.length > 0 &&
    typeof metadata.order_reference === "string" &&
    metadata.order_reference.length > 0 &&
    metadata.payment_reference !== paymentReference &&
    metadata.order_reference !== orderReference
  const sessionId = ticket.stripeSession
  const session = await stripe.get("session", `checkout/sessions/${encodeURIComponent(sessionId)}`)
  if (!session.success || session.data.id !== sessionId || !owned(session.data.metadata) || !session.data.customer)
    return createResultError(op, "Saved session does not prove unique run/organization/order ownership")
  if (
    !(["payment", "subscription"] as string[]).includes(session.data.mode) ||
    !(["open", "expired", "complete"] as string[]).includes(session.data.status)
  )
    return createResultError(op, "Unexpected checkout mode or status")
  const customerId = session.data.customer
  const customer = await stripe.get("customer", `customers/${encodeURIComponent(customerId)}`)
  if (!customer.success || customer.data.id !== customerId || customer.data.deleted || !stable(customer.data.metadata))
    return createResultError(op, "Customer ownership cannot be proven")
  const sessions = await stripe.list("session", `checkout/sessions?customer=${encodeURIComponent(customerId)}`)
  if (!sessions.success)
    return createResultError(op, "Customer is shared or checkout discovery is incomplete; no mutation")
  const savedSessions = sessions.data.filter(
    (entry) => entry.id === sessionId && entry.customer === customerId && owned(entry.metadata),
  )
  if (savedSessions.length !== 1)
    return createResultError(op, "Customer is shared or checkout discovery is incomplete; no mutation")
  if (
    sessions.data.some((entry) => {
      if (entry.id === sessionId) return entry.customer !== customerId || !owned(entry.metadata)
      return entry.customer !== customerId || !historical(entry.metadata)
    })
  )
    return createResultError(op, "Customer is shared or checkout discovery is incomplete; no mutation")
  const subscriptions = await stripe.list(
    "subscription",
    `subscriptions?customer=${encodeURIComponent(customerId)}&status=all`,
  )
  const intents = await stripe.list("paymentIntent", `payment_intents?customer=${encodeURIComponent(customerId)}`)
  const invoices = await stripe.list("invoice", `invoices?customer=${encodeURIComponent(customerId)}`)
  const charges = await stripe.list("charge", `charges?customer=${encodeURIComponent(customerId)}`)
  if (!subscriptions.success || !intents.success || !invoices.success || !charges.success)
    return createResultError(op, "Provider history is not exclusively attributable to this checkout")
  if (
    subscriptions.data.some(
      (entry) => entry.customer !== customerId || (!owned(entry.metadata) && !historical(entry.metadata)),
    ) ||
    intents.data.some(
      (entry) => entry.customer !== customerId || (!owned(entry.metadata) && !historical(entry.metadata)),
    ) ||
    invoices.data.some(
      (entry) => entry.customer !== customerId || (!owned(entry.metadata) && !historical(entry.metadata)),
    )
  )
    return createResultError(op, "Provider history is not exclusively attributable to this checkout")
  const currentSubscriptions = subscriptions.data.filter((entry) => owned(entry.metadata))
  const currentIntents = intents.data.filter((entry) => owned(entry.metadata))
  const validatedIntentIds = new Set(intents.data.map((entry) => entry.id))
  if (
    charges.data.some(
      (entry) =>
        entry.customer !== customerId || !entry.payment_intent || !validatedIntentIds.has(entry.payment_intent),
    )
  )
    return createResultError(op, "Provider history is not exclusively attributable to this checkout")
  if (session.data.subscription) {
    if (currentSubscriptions.length !== 1 || currentSubscriptions[0]?.id !== session.data.subscription)
      return createResultError(op, "Provider history is not exclusively attributable to this checkout")
  } else if (currentSubscriptions.length > 0) {
    return createResultError(op, "Provider history is not exclusively attributable to this checkout")
  }
  if (session.data.status === "open" && session.data.payment_status !== "unpaid")
    return createResultError(op, "Open checkout has ambiguous payment state")
  if (
    session.data.status === "complete" &&
    (session.data.payment_status !== "paid" || proof.data.paymentStatus !== "paid")
  )
    return createResultError(op, "Paid checkout and app payment state disagree")
  if (session.data.status === "expired" && session.data.payment_status === "paid")
    return createResultError(op, "Expired checkout reports a paid payment")
  if (currentIntents.length > 1) return createResultError(op, "Multiple payment intents require manual reconciliation")

  // Preflight current-owned provider objects before any mutation. Historical
  // entries are never touched. A failed verification keeps the checkpoint.
  for (const entry of currentSubscriptions) {
    const current = await stripe.get("subscription", `subscriptions/${encodeURIComponent(entry.id)}`)
    if (
      !current.success ||
      current.data.id !== entry.id ||
      current.data.customer !== customerId ||
      !owned(current.data.metadata)
    )
      return createResultError(op, "Subscription changed before cancellation")
    if (current.data.status !== "canceled") {
      const cancelled = await stripe.cancel(entry.id)
      if (!cancelled.success) return createResultError(op, "Subscription cancellation unverified")
      const confirmed = await stripe.get("subscription", `subscriptions/${encodeURIComponent(entry.id)}`)
      if (
        !confirmed.success ||
        confirmed.data.status !== "canceled" ||
        confirmed.data.customer !== customerId ||
        !owned(confirmed.data.metadata)
      )
        return createResultError(op, "Subscription cancellation unverified")
    }
  }
  const refreshed = await stripe.get("session", `checkout/sessions/${encodeURIComponent(sessionId)}`)
  if (
    !refreshed.success ||
    refreshed.data.id !== sessionId ||
    refreshed.data.customer !== customerId ||
    !owned(refreshed.data.metadata)
  )
    return createResultError(op, "Checkout changed before expiration")
  if (
    refreshed.data.status === "complete" &&
    (refreshed.data.payment_status !== "paid" || proof.data.paymentStatus !== "paid")
  )
    return createResultError(op, "Checkout became paid during cleanup; app reconciliation required")
  if (refreshed.data.status === "open" && refreshed.data.payment_status === "unpaid") {
    const expired = await stripe.expire(sessionId)
    if (!expired.success) return createResultError(op, "Checkout expiration unverified")
  } else if (refreshed.data.status !== "expired" && refreshed.data.status !== "complete")
    return createResultError(op, "Checkout payment status changed; reconcile manually")
  const verified = await stripe.get("session", `checkout/sessions/${encodeURIComponent(sessionId)}`)
  if (
    !verified.success ||
    verified.data.id !== sessionId ||
    !owned(verified.data.metadata) ||
    verified.data.status === "open" ||
    verified.data.customer !== customerId ||
    (verified.data.status === "complete" &&
      (verified.data.payment_status !== "paid" || proof.data.paymentStatus !== "paid"))
  )
    return createResultError(op, "Checkout expiration could not be verified")

  // Provider invoices/charges remain immutable. A shared historical customer is
  // never deleted: deletion additionally requires full current customer metadata,
  // exactly one saved session, zero subscriptions/intents/invoices/charges of any
  // kind, and independent Billing exclusivity proof. The exclusivity callback is
  // only invoked when all of those hold.
  let customerDisposition = "retained"
  if (
    owned(customer.data.metadata) &&
    sessions.data.length === 1 &&
    invoices.data.length === 0 &&
    charges.data.length === 0 &&
    intents.data.length === 0 &&
    subscriptions.data.length === 0 &&
    input.customerExclusive
  ) {
    let exclusive: boolean
    try {
      exclusive = await input.customerExclusive(customerId)
    } catch {
      return createResultError(op, "Billing customer mapping proof unavailable; checkpoint retained")
    }
    if (exclusive) {
      const deleted = await stripe.deleteCustomer(customerId)
      if (!deleted.success) return createResultError(op, "Exclusive test customer deletion unverified")
      const confirmed = await stripe.customerDeleted(customerId)
      if (!confirmed.success) return createResultError(op, "Exclusive test customer deletion unverified")
      customerDisposition = "verified-deleted"
    }
  }
  return createResult({
    status: "stripe-reconciled-checkpoint-retained" as const,
    session: sessionId,
    customer: customerDisposition,
    subscriptionsCanceled: currentSubscriptions.length,
    chargesRetained: charges.data.length,
    invoicesRetained: invoices.data.length,
    paymentIntentsRetained: intents.data.length,
  })
}
