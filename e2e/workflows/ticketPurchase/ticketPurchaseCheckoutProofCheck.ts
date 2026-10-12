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

type OrderDiscoveryRow = {
  orderId: string
  status: string
  paymentStatus: string
  billingOrderReference: string | null
  checkoutUrl: string | null
  stripeSessionId: string | null
  reservationExpiresAt: number
}

type OrderDiscovery = (cursor: string | null | undefined) => Promise<{
  success: boolean
  data?: { page: OrderDiscoveryRow[]; isDone: boolean; continueCursor: string | null }
  errorMessage?: string
}>

export type TicketPurchaseCheckoutProofDisposition =
  | { state: "own"; orderId: string; stripeSession: string }
  | { state: "absent" }

/**
 * Read-only checkout proof for an uncertain started checkout. It never
 * creates, expires, cancels, refunds or deletes anything: only the saved
 * order/session retrieve, the global TEST session list and the paginated
 * exact-run app order discovery are read. A proven own session is adopted,
 * a proven global absence (no Stripe session AND no owned app order, or N
 * terminal expired/released/failed rows with payment expired/failed whose
 * graphs stay until success) permits a single create with the same run intent, and every
 * partial/multiple/foreign/unknown, pending-reservation or
 * credential/error case retains without effect. The existing
 * e2eStripeTicketReconcile stays success-cleanup only and is never called
 * here.
 */
export async function ticketPurchaseCheckoutProofCheck(input: {
  checkpoint: E2eCheckpoint
  organizationId: string
  accountId: string
  key: string
  orderProof: OrderProof
  orderDiscovery: OrderDiscovery
  stripe: StripeClient
}) {
  const op = "ticketPurchaseCheckoutProofCheck"
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
    ticket.step !== "checkout" ||
    ticket.status !== "started" ||
    ticket.eventKey !== `ticket-e2e-${checkpoint.runId}` ||
    ticket.eventTitle !== `Ticket E2E ${checkpoint.runId}` ||
    ticket.participantName !== `E2E Participant ${checkpoint.runId}` ||
    (ticket.eventId && ticket.eventId !== ticket.eventKey)
  )
    return createResultError(op, "Exact test checkout, run, target or credentials missing; checkpoint retained")

  const orderId = ticket.orderId
  const sessionId = ticket.stripeSession
  if ((orderId && !sessionId) || (!orderId && sessionId))
    return createResultError(op, "Partial checkout evidence cannot prove ownership; checkpoint retained")
  if (orderId && sessionId) {
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
    const owned = (metadata: Record<string, string>) =>
      metadata["source"] === "eventoren_ticket" &&
      metadata["event_key"] === ticket.eventKey &&
      metadata["organization_id"] === organizationId &&
      metadata["stripe_mode"] === "test" &&
      metadata["payment_reference"] === proof.data!.paymentReference &&
      metadata["order_reference"] === proof.data!.orderReference
    const session = await input.stripe.get("session", `checkout/sessions/${encodeURIComponent(sessionId)}`)
    if (!session.success || session.data.id !== sessionId || !owned(session.data.metadata as Record<string, string>))
      return createResultError(op, "Saved session does not prove unique run/organization/order ownership")
    if (!session.data.customer)
      return createResultError(op, "Saved session does not prove unique run/organization/order ownership")
    if (
      !(["payment", "subscription"] as string[]).includes(session.data.mode) ||
      !(["open", "expired", "complete"] as string[]).includes(session.data.status)
    )
      return createResultError(op, "Unexpected checkout mode or status")
    if (session.data.status === "open" && session.data.payment_status !== "unpaid")
      return createResultError(op, "Open checkout has ambiguous payment state")
    if (
      session.data.status === "complete" &&
      (session.data.payment_status !== "paid" || proof.data.paymentStatus !== "paid")
    )
      return createResultError(op, "Paid checkout and app payment state disagree")
    if (session.data.status === "expired" && session.data.payment_status === "paid")
      return createResultError(op, "Expired checkout reports a paid payment")
    return createResult({ state: "own", orderId, stripeSession: sessionId } as TicketPurchaseCheckoutProofDisposition)
  }

  const account = await input.stripe.account()
  if (!account.success || account.data !== accountId)
    return createResultError(op, "Stripe TEST account identity mismatch; checkpoint retained")
  const sessions = await input.stripe.list("session", "checkout/sessions")
  if (!sessions.success) return createResultError(op, "Stripe TEST session discovery unavailable; checkpoint retained")
  const ownedMatches = sessions.data.filter((entry) => {
    const metadata = entry.metadata as Record<string, string>
    return (
      metadata["source"] === "eventoren_ticket" &&
      metadata["event_key"] === ticket.eventKey &&
      metadata["organization_id"] === organizationId &&
      metadata["stripe_mode"] === "test"
    )
  })
  if (ownedMatches.length > 0)
    return createResultError(op, "Stripe retains a run checkout; reconcile it manually before creating")
  // A Stripe global absence alone must not permit a duplicate app order when
  // a reservation exists without a Stripe session (e.g. Billing
  // EVENT_NOT_FOUND left a reserved/pending row with no checkout URL):
  // prove absence through the full exact-run ticketOrders discovery page.
  const ownedOrders: OrderDiscoveryRow[] = []
  let cursor: string | null | undefined = null
  let provenDone = false
  for (let pages = 0; pages < 10; pages += 1) {
    let discovered: Awaited<ReturnType<OrderDiscovery>>
    try {
      discovered = await input.orderDiscovery(cursor)
    } catch {
      return createResultError(op, "App order discovery unavailable; checkpoint retained")
    }
    if (!discovered.success || !discovered.data)
      return createResultError(op, "App order discovery unavailable; checkpoint retained")
    ownedOrders.push(...discovered.data.page)
    if (discovered.data.isDone) {
      provenDone = true
      break
    }
    cursor = discovered.data.continueCursor ?? null
  }
  if (!provenDone) return createResultError(op, "App order discovery incomplete; checkpoint retained")
  if (ownedOrders.length === 0) return createResult({ state: "absent" } as TicketPurchaseCheckoutProofDisposition)
  if (ownedOrders.some((row) => row.status === "paid" || row.paymentStatus === "paid"))
    return createResultError(op, "Owned paid order exists; reconcile it manually before creating")
  if (ownedOrders.some((row) => row.status === "paid_inventory_conflict"))
    return createResultError(op, "Owned conflicted order requires manual reconciliation")
  const active = ownedOrders.filter(
    (row) => row.status === "reserved" || row.status === "checkout_created" || row.paymentStatus === "pending",
  )
  if (active.length > 0) {
    const first = active[0]!
    return createResultError(
      op,
      `Owned pending order ${first.orderId} (${first.status}/${first.paymentStatus}) without a Stripe session; save/adopt its proof before creating`,
    )
  }
  // Every owned row is terminal without payment. Retained history can hold
  // N exact same-run terminal rows: when complete paginated discovery plus
  // zero Stripe contexts prove every owned row is terminal expired/released/
  // failed with payment expired/failed, the same unfinished checkout may
  // attempt once more with the same run intent while the old graphs stay
  // until success cleanup. Any pending/paid/conflicting/unknown row, any
  // unavailable/incomplete discovery, or any Stripe context retains.
  if (
    ownedOrders.length >= 1 &&
    ownedOrders.every(
      (row) =>
        ["expired", "released", "failed"].includes(row.status) && ["expired", "failed"].includes(row.paymentStatus),
    )
  )
    return createResult({ state: "absent" } as TicketPurchaseCheckoutProofDisposition)
  return createResultError(op, "Owned app orders exist; reconcile them manually before creating")
}
