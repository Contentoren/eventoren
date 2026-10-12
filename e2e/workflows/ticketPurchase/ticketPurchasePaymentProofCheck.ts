import { createResult, createResultError } from "#result"
import type { E2eCheckpoint } from "../../checkpoint/e2eCheckpointSchema.ts"
import type { e2eStripeTestClientCreate } from "../../stripe/e2eStripeTestClientCreate.ts"

type StripeClient = ReturnType<typeof e2eStripeTestClientCreate>

type OrderProofData = {
  paymentReference: string
  orderReference: string
  status: string
  paymentStatus: string
}

type OrderProof = (
  orderId: string,
  eventKey: string,
  runId: string,
  runCreatedAt: number,
) => Promise<{ success: boolean; data?: OrderProofData; errorMessage?: string }>

export type TicketPurchasePaymentProofDisposition =
  | { state: "retry"; orderId: string; stripeSession: string; hostedUrl: string }
  | { state: "paid"; orderId: string; stripeSession: string }

/**
 * Read-only started-payment proof for the exact saved TEST order/session. It
 * never creates, pays, expires, cancels, refunds or deletes anything: only the
 * saved app order proof, the Stripe TEST account lookup, the authoritative
 * Stripe session GET (TEST metadata/origin/current status/authoritative hosted
 * URL/direct payment intent), the linked customer GET (stable source/
 * organization/test-mode only: Billing reuses one customer per email so a
 * reused customer's creation metadata keeps the FIRST run's event/payment/
 * order refs and is never refreshed) and its payment-intent/charge lists are
 * read. An open/unpaid session whose app order is still in a known active
 * checkout state (checkout_created/reserved with pending payment), whose
 * direct session payment intent is NULL and which created no CURRENT
 * payment intent/charge (unrelated proven historical effects on the reused
 * customer are preserved) permits retrying the SAME authoritative hosted session URL
 * (exact Stripe GET url including its fragment), never a new order/checkout
 * or a constructed URL. A complete/paid session with matching paid app proof
 * adopts the known success. Terminal app states (released/expired/failed/
 * cancelled or any non-active/non-paid state), a direct payment intent, any
 * queried intent/charge/incomplete flag, a missing/non-HTTPS/non-checkout/
 * foreign/fragment-less authoritative URL, pending/processing/foreign/
 * expired/unknown/unavailable retains without effect.
 */
export async function ticketPurchasePaymentProofCheck(input: {
  checkpoint: E2eCheckpoint
  organizationId: string
  accountId: string
  key: string
  orderProof: OrderProof
  stripe: StripeClient
}) {
  const op = "ticketPurchasePaymentProofCheck"
  const { checkpoint, organizationId, accountId, key } = input
  const ticket = checkpoint.ticket
  if (
    checkpoint.target !== "development" ||
    checkpoint.baseUrl !== "https://eventoren.leonardomora.de" ||
    checkpoint.phase !== "ticket-unreconciled" ||
    !/^(sk|rk)_test_[A-Za-z0-9]+$/u.test(key) ||
    !/^acct_[A-Za-z0-9]+$/u.test(accountId) ||
    !organizationId ||
    !ticket ||
    ticket.step !== "payment" ||
    ticket.status !== "started" ||
    ticket.eventKey !== `ticket-e2e-${checkpoint.runId}` ||
    ticket.eventTitle !== `Ticket E2E ${checkpoint.runId}` ||
    ticket.participantName !== `E2E Participant ${checkpoint.runId}` ||
    (ticket.eventId && ticket.eventId !== ticket.eventKey)
  )
    return createResultError(op, "Exact test payment, run, target or credentials missing; checkpoint retained")
  const orderId = ticket.orderId
  const sessionId = ticket.stripeSession
  if (!orderId || !sessionId)
    return createResultError(op, "Saved payment order and session are both required; checkpoint retained")
  if (!/^cs_test_[A-Za-z0-9]+$/u.test(sessionId))
    return createResultError(op, "Saved session does not prove unique run/organization/order ownership")
  let proof: Awaited<ReturnType<OrderProof>>
  try {
    proof = await input.orderProof(orderId, ticket.eventKey, checkpoint.runId, checkpoint.createdAt)
  } catch {
    return createResultError(op, "App order proof unavailable; checkpoint retained")
  }
  if (!proof.success || !proof.data?.paymentReference || !proof.data.orderReference)
    return createResultError(op, "App order correlation could not be verified; checkpoint retained")
  const account = await input.stripe.account()
  if (!account.success || account.data !== accountId)
    return createResultError(op, "Stripe TEST account identity mismatch; checkpoint retained")
  const sessionOwned = (metadata: Record<string, string>) =>
    metadata["source"] === "eventoren_ticket" &&
    metadata["event_key"] === ticket.eventKey &&
    metadata["organization_id"] === organizationId &&
    metadata["stripe_mode"] === "test" &&
    metadata["payment_reference"] === proof.data!.paymentReference &&
    metadata["order_reference"] === proof.data!.orderReference
  // Billing reuses one Stripe customer per email (stripeCustomerEnsure): a
  // reused customer's creation metadata keeps the FIRST run's event/payment/
  // order refs and is never refreshed, so current refs are required ONLY on
  // the saved session above. The linked customer requires the stable triple
  // plus the exact ID (session.customer), TEST account (verified above) and
  // test live-mode (adapter schema) linkage.
  const customerStable = (metadata: Record<string, string>) =>
    metadata["source"] === "eventoren_ticket" &&
    metadata["organization_id"] === organizationId &&
    metadata["stripe_mode"] === "test"
  const session = await input.stripe.get("session", `checkout/sessions/${encodeURIComponent(sessionId)}`)
  if (
    !session.success ||
    session.data.id !== sessionId ||
    !sessionOwned(session.data.metadata as Record<string, string>)
  )
    return createResultError(op, "Saved session does not prove unique run/organization/order ownership")
  if (!session.data.customer)
    return createResultError(op, "Saved session does not prove unique run/organization/order ownership")
  const customerId = session.data.customer
  const customer = await input.stripe.get("customer", `customers/${encodeURIComponent(customerId)}`)
  if (
    !customer.success ||
    customer.data.id !== customerId ||
    customer.data.deleted === true ||
    !customerStable(customer.data.metadata)
  )
    return createResultError(op, "Saved session customer ownership unavailable or foreign; checkpoint retained")
  if (
    !(["payment", "subscription"] as string[]).includes(session.data.mode) ||
    !(["open", "expired", "complete"] as string[]).includes(session.data.status)
  )
    return createResultError(op, "Unexpected checkout mode or status")
  if (session.data.status === "complete") {
    // ticketPaymentStatusApplyMutation distinguishes fulfilled paid orders from
    // paid_inventory_conflict. Only the legal fulfilled state may advance E2E.
    if (session.data.payment_status === "paid" && proof.data.paymentStatus === "paid" && proof.data.status === "paid")
      return createResult({ state: "paid", orderId, stripeSession: sessionId } as TicketPurchasePaymentProofDisposition)
    return createResultError(op, "Paid checkout and app payment state disagree; checkpoint retained")
  }
  if (session.data.status === "expired")
    return createResultError(op, "Saved hosted session is expired; reconcile it manually before retrying")
  if (session.data.status !== "open")
    return createResultError(op, "Saved hosted session is not open; checkpoint retained")
  if (session.data.payment_status !== "unpaid")
    return createResultError(op, "Open checkout has ambiguous payment state")
  if (proof.data.paymentStatus === "paid")
    return createResultError(op, "Paid checkout and app payment state disagree; checkpoint retained")
  // An app-terminal order (released/expired/failed/cancelled or any other
  // non-active state) must never retry even when Stripe still reports
  // open/unpaid: only a known active checkout (checkout_created/reserved)
  // with pending payment is the expected legal retry state.
  if (!["checkout_created", "reserved"].includes(proof.data.status) || proof.data.paymentStatus !== "pending")
    return createResultError(
      op,
      "App order is not in retryable checkout/reserved state with pending payment; checkpoint retained",
    )
  // Optional adapter compatibility is not proof of absence: retry requires
  // an explicitly null direct payment intent in the actual session GET.
  const directPaymentIntent = (session.data as { payment_intent?: unknown }).payment_intent
  if (typeof directPaymentIntent === "string" && directPaymentIntent.length > 0)
    return createResultError(op, "Saved session already created a payment effect; reconcile it manually")
  if (directPaymentIntent !== null)
    return createResultError(op, "Saved session payment intent is ambiguous; checkpoint retained")
  // The retry URL is the exact authoritative Stripe session URL including its
  // required fragment: never a constructed /c/pay/<id> URL which drops it.
  const authoritativeRawUrl = (session.data as { url?: unknown }).url
  if (typeof authoritativeRawUrl !== "string" || !authoritativeRawUrl)
    return createResultError(op, "Authoritative hosted session URL unavailable; checkpoint retained")
  let authoritativeUrl: URL
  try {
    authoritativeUrl = new URL(authoritativeRawUrl)
  } catch {
    return createResultError(op, "Authoritative hosted session URL unavailable; checkpoint retained")
  }
  if (authoritativeUrl.protocol !== "https:" || authoritativeUrl.host !== "checkout.stripe.com")
    return createResultError(
      op,
      "Authoritative hosted session URL is not a Stripe TEST checkout origin; checkpoint retained",
    )
  if (!authoritativeUrl.pathname.split("/").includes(sessionId))
    return createResultError(
      op,
      "Authoritative hosted session URL does not prove the saved session; checkpoint retained",
    )
  if (!authoritativeUrl.hash || authoritativeUrl.hash.length < 2)
    return createResultError(
      op,
      "Authoritative hosted session URL is missing the required Stripe fragment; checkpoint retained",
    )
  let intents: Awaited<ReturnType<StripeClient["list"]>>
  let charges: Awaited<ReturnType<StripeClient["list"]>>
  try {
    intents = await input.stripe.list("paymentIntent", `payment_intents?customer=${encodeURIComponent(customerId)}`)
    charges = await input.stripe.list("charge", `charges?customer=${encodeURIComponent(customerId)}`)
  } catch {
    return createResultError(op, "Payment effect proof unavailable; checkpoint retained")
  }
  if (!intents.success || !charges.success)
    return createResultError(op, "Payment effect proof unavailable; checkpoint retained")
  // A reused customer carries proven historical effects from earlier runs:
  // only intents provably bound to other payment/order refs are preserved,
  // and only charges bound to those preserved intents. Any current-bound or
  // ambiguous (unknown refs, foreign customer, orphan charge) effect refuses
  // retry; the explicit saved-session payment_intent===null check above stays
  // mandatory.
  const intentProvenHistorical = (entry: unknown): boolean => {
    const candidate = entry as { customer?: unknown; metadata?: unknown }
    if (candidate.customer !== customerId) return false
    const metadata = (candidate.metadata ?? {}) as Record<string, string>
    return (
      metadata["source"] === "eventoren_ticket" &&
      typeof metadata["payment_reference"] === "string" &&
      metadata["payment_reference"].length > 0 &&
      typeof metadata["order_reference"] === "string" &&
      metadata["order_reference"].length > 0 &&
      metadata["payment_reference"] !== proof.data!.paymentReference &&
      metadata["order_reference"] !== proof.data!.orderReference
    )
  }
  const historicalIntentIds = new Set(intents.data.filter(intentProvenHistorical).map((entry) => entry.id))
  const chargeProvenHistorical = (entry: unknown): boolean => {
    const candidate = entry as { customer?: unknown; payment_intent?: unknown }
    return (
      candidate.customer === customerId &&
      typeof candidate.payment_intent === "string" &&
      candidate.payment_intent.length > 0 &&
      historicalIntentIds.has(candidate.payment_intent)
    )
  }
  if (
    intents.data.some((entry) => !intentProvenHistorical(entry)) ||
    charges.data.some((entry) => !chargeProvenHistorical(entry))
  )
    return createResultError(op, "Saved session already created a payment effect; reconcile it manually")
  return createResult({
    state: "retry",
    orderId,
    stripeSession: sessionId,
    hostedUrl: authoritativeRawUrl,
  } as TicketPurchasePaymentProofDisposition)
}
