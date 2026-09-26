import { createResult, createResultError } from "#result"
import type { E2eCheckpoint } from "../checkpoint/e2eCheckpointSchema.ts"
import { e2eStripeTestClientCreate } from "./e2eStripeTestClientCreate.ts"

type Proof = { paymentReference: string; orderReference: string; status: string; paymentStatus: string }

/** Reconcile only the saved order/session; never search by email or delete payment history. */
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
    checkpoint.baseUrl !== "https://eventoren.leonardomora.de" ||
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
  const stripe = input.stripe ?? e2eStripeTestClientCreate(input.key)
  const account = await stripe.account()
  if (!account.success || account.data !== input.accountId)
    return createResultError(op, "Stripe TEST account identity mismatch; checkpoint retained")

  const owned = (metadata: Record<string, string>) =>
    metadata.source === "eventoren_ticket" &&
    metadata.event_key === ticket.eventKey &&
    metadata.organization_id === organizationId &&
    metadata.stripe_mode === "test" &&
    metadata.payment_reference === proof.data!.paymentReference &&
    metadata.order_reference === proof.data!.orderReference
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
  if (!customer.success || customer.data.id !== customerId || customer.data.deleted || !owned(customer.data.metadata))
    return createResultError(op, "Customer ownership cannot be proven")
  const sessions = await stripe.list("session", `checkout/sessions?customer=${encodeURIComponent(customerId)}`)
  if (
    !sessions.success ||
    sessions.data.length !== 1 ||
    sessions.data[0]?.id !== sessionId ||
    !owned(sessions.data[0].metadata)
  )
    return createResultError(op, "Customer is shared or checkout discovery is incomplete; no mutation")
  const subscriptions = await stripe.list(
    "subscription",
    `subscriptions?customer=${encodeURIComponent(customerId)}&status=all`,
  )
  const intents = await stripe.list("paymentIntent", `payment_intents?customer=${encodeURIComponent(customerId)}`)
  const invoices = await stripe.list("invoice", `invoices?customer=${encodeURIComponent(customerId)}`)
  const charges = await stripe.list("charge", `charges?customer=${encodeURIComponent(customerId)}`)
  if (
    !subscriptions.success ||
    !intents.success ||
    !invoices.success ||
    !charges.success ||
    subscriptions.data.some((entry) => entry.customer !== customerId || !owned(entry.metadata)) ||
    intents.data.some((entry) => entry.customer !== customerId || !owned(entry.metadata)) ||
    invoices.data.some((entry) => entry.customer !== customerId || !owned(entry.metadata)) ||
    charges.data.some(
      (entry) => entry.customer !== customerId || !intents.data.some((intent) => intent.id === entry.payment_intent),
    ) ||
    (session.data.subscription && !subscriptions.data.some((entry) => entry.id === session.data.subscription)) ||
    (!session.data.subscription && subscriptions.data.length > 0)
  )
    return createResultError(op, "Provider history is not exclusively attributable to this checkout")
  if (session.data.status === "open" && session.data.payment_status !== "unpaid")
    return createResultError(op, "Open checkout has ambiguous payment state")
  if (
    session.data.status === "complete" &&
    (session.data.payment_status !== "paid" || proof.data.paymentStatus !== "paid")
  )
    return createResultError(op, "Paid checkout and app payment state disagree")
  if (session.data.status === "expired" && session.data.payment_status === "paid")
    return createResultError(op, "Expired checkout reports a paid payment")
  if (intents.data.length > 1) return createResultError(op, "Multiple payment intents require manual reconciliation")

  // Preflight all provider objects before any mutation. A failed verification keeps the checkpoint.
  for (const entry of subscriptions.data) {
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

  // Provider invoices/charges remain immutable. Keep their customer attached; only an
  // invoice/charge-free exclusive test customer may be deleted only after Billing mapping proof.
  let customerDisposition = "retained"
  if (
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
    subscriptionsCanceled: subscriptions.data.length,
    chargesRetained: charges.data.length,
    invoicesRetained: invoices.data.length,
    paymentIntentsRetained: intents.data.length,
  })
}
