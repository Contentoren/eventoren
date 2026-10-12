import { createResult, createResultError } from "#result"
import type { e2eStripeTestClientCreate } from "./e2eStripeTestClientCreate.ts"

type StripeClient = ReturnType<typeof e2eStripeTestClientCreate>

type HistoricalCandidate = { eventKey: string; runId?: string; kind?: string }

const ticketE2eEventKeyPattern = /^ticket-e2e-[0-9a-z]+-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u
const approvedTechnicalCheckoutKey = "technischer-checkout-test-keine-veranstaltung-e879ab05"

function e2eStripeHistoricalEventKeyProven(eventKey: string, kind?: string): boolean {
  if (kind === "technical-checkout" || eventKey === approvedTechnicalCheckoutKey)
    return eventKey === approvedTechnicalCheckoutKey
  if (kind === "ticket-e2e" || !kind) return ticketE2eEventKeyPattern.test(eventKey)
  return false
}

function e2eStripeHistoricalSessionOwnedGlobal(metadata: Record<string, string>, organizationId: string): boolean {
  if (metadata["source"] !== "eventoren_ticket") return false
  if (metadata["organization_id"] !== organizationId) return false
  if (metadata["stripe_mode"] !== "test") return false
  if (!metadata["payment_reference"] || !metadata["order_reference"]) return false
  const eventKey = metadata["event_key"] ?? ""
  if (eventKey === approvedTechnicalCheckoutKey) return true
  return ticketE2eEventKeyPattern.test(eventKey)
}

/**
 * Reconcile historical test-mode Stripe artifacts discovered by owned run
 * marker. Only sessions whose Stripe metadata proves the exact historical
 * fixture (source, event key, organization, test mode, payment/order
 * references) are touched. Live-mode objects are retained and reported, never
 * mutated. Financial history (charges, invoices, payment intents) is never
 * refunded or deleted: open test checkouts are expired and active test
 * subscriptions canceled; proof-exclusive test customers with zero intents,
 * invoices, charges and subscriptions are deleted with exact delete/GET
 * absence verification, otherwise retained. The intended mutation plan
 * (including customer deletions) is persisted through ledgerAppend before any
 * Stripe mutation; a failure retains phase and identifier evidence.
 */
export async function e2eStripeHistoricalCleanupScan(input: {
  candidates: HistoricalCandidate[]
  organizationId: string
  accountId: string
  key: string
  stripe: StripeClient
  customerExclusive?: (customerId: string) => Promise<boolean>
  ledgerAppend?: (entry: unknown) => Promise<{ success: boolean; errorMessage?: string }>
}) {
  const op = "e2eStripeHistoricalCleanupScan"
  const actionable = input.candidates.filter(
    (candidate) => candidate.kind === "ticket-e2e" || candidate.kind === "technical-checkout" || !candidate.kind,
  )
  const provenKeys = new Set(
    actionable
      .filter((candidate) => e2eStripeHistoricalEventKeyProven(candidate.eventKey, candidate.kind))
      .map((candidate) => candidate.eventKey),
  )
  const credentialsValid =
    /^(sk|rk)_test_[A-Za-z0-9]+$/u.test(input.key) &&
    /^acct_[A-Za-z0-9]+$/u.test(input.accountId) &&
    Boolean(input.organizationId)
  if (provenKeys.size === 0 && !credentialsValid) return createResult({ status: "no-fixture" as const })
  if (provenKeys.size > 0 && !credentialsValid)
    return createResultError(op, "Exact Stripe TEST/organization credentials missing; checkpoint retained")

  const stripe = input.stripe
  const account = await stripe.account()
  if (!account.success || account.data !== input.accountId)
    return createResultError(op, "Stripe TEST account identity mismatch; checkpoint retained")

  const eventKeys = provenKeys
  const sessions = await stripe.list("session", "checkout/sessions")
  if (!sessions.success)
    return createResultError(op, "Historical Stripe session discovery unavailable; checkpoint retained")

  const ownedByKey = new Map<
    string,
    { id: string; customer: string | null; status: string; subscription: string | null }
  >()
  const retainedLive: string[] = []
  for (const session of sessions.data) {
    const metadata = session.metadata as Record<string, string>
    const inCandidates = eventKeys.has(metadata.event_key ?? "")
    const globalPattern =
      metadata["source"] === "eventoren_ticket" &&
      metadata["organization_id"] === input.organizationId &&
      (ticketE2eEventKeyPattern.test(metadata["event_key"] ?? "") ||
        (metadata["event_key"] ?? "") === approvedTechnicalCheckoutKey)
    if (!inCandidates && !globalPattern) continue
    if (metadata.source !== "eventoren_ticket" || metadata.organization_id !== input.organizationId) continue
    if (session.livemode || metadata.stripe_mode !== "test") {
      if (!inCandidates && !globalPattern) continue
      retainedLive.push(session.id)
      continue
    }
    if (!metadata.payment_reference || !metadata.order_reference) {
      retainedLive.push(session.id)
      continue
    }
    const globallyOwned = e2eStripeHistoricalSessionOwnedGlobal(metadata, input.organizationId)
    if (!inCandidates && !globallyOwned) continue
    ownedByKey.set(session.id, {
      id: session.id,
      customer: session.customer,
      status: session.status,
      subscription: session.subscription,
    })
  }
  if (ownedByKey.size === 0 && retainedLive.length === 0 && provenKeys.size === 0)
    return createResult({ status: "no-fixture" as const })

  const ownedSession = (metadata: Record<string, string>) =>
    (eventKeys.has(metadata.event_key ?? "") ||
      e2eStripeHistoricalSessionOwnedGlobal(metadata, input.organizationId)) &&
    metadata.source === "eventoren_ticket" &&
    metadata.organization_id === input.organizationId &&
    metadata.stripe_mode === "test" &&
    Boolean(metadata.payment_reference) &&
    Boolean(metadata.order_reference)

  const plan: { expireSessions: string[]; cancelSubscriptions: string[]; deleteCustomers: string[] } = {
    expireSessions: [],
    cancelSubscriptions: [],
    deleteCustomers: [],
  }
  const customerIds = new Set<string>()
  for (const session of ownedByKey.values()) {
    if (session.customer) customerIds.add(session.customer)
    if (session.status === "open") plan.expireSessions.push(session.id)
  }
  const retainedCustomersWithHistory: string[] = []
  for (const customerId of customerIds) {
    const subscriptions = await stripe.list(
      "subscription",
      `subscriptions?customer=${encodeURIComponent(customerId)}&status=all`,
    )
    if (!subscriptions.success)
      return createResultError(op, "Historical Stripe subscription discovery unavailable; checkpoint retained")
    for (const subscription of subscriptions.data) {
      const metadata = subscription.metadata as Record<string, string>
      if (subscription.customer !== customerId || metadata.source !== "eventoren_ticket") continue
      const inCandidates = eventKeys.has(metadata.event_key ?? "")
      const globallyOwnedSub =
        e2eStripeHistoricalSessionOwnedGlobal(metadata, input.organizationId) &&
        (metadata.event_key === approvedTechnicalCheckoutKey || ticketE2eEventKeyPattern.test(metadata.event_key ?? ""))
      if (!inCandidates && !globallyOwnedSub) continue
      if (subscription.livemode || metadata.stripe_mode !== "test" || metadata.organization_id !== input.organizationId)
        continue
      if (subscription.status !== "canceled") plan.cancelSubscriptions.push(subscription.id)
    }

    const exclusive = await e2eStripeHistoricalCustomerExclusiveProve({
      stripe,
      customerId,
      eventKeys,
      organizationId: input.organizationId,
      ownedSession,
      customerExclusive: input.customerExclusive,
    })
    if (!exclusive.success) return exclusive
    if (exclusive.data === "delete") plan.deleteCustomers.push(customerId)
    else retainedCustomersWithHistory.push(customerId)
  }

  if (input.ledgerAppend) {
    const persisted = await input.ledgerAppend({ historicalStripePlan: plan, retainedLive })
    if (!persisted.success)
      return createResultError(op, "Historical Stripe ledger unavailable; no provider mutation attempted")
  }

  let sessionsExpired = 0
  for (const sessionId of plan.expireSessions) {
    const current = await stripe.get("session", `checkout/sessions/${encodeURIComponent(sessionId)}`)
    if (!current.success || current.data.id !== sessionId)
      return createResultError(op, `Historical Stripe session ${sessionId} changed before expiration`)
    if (current.data.status !== "open") continue
    const expired = await stripe.expire(sessionId)
    if (!expired.success) return createResultError(op, `Historical Stripe session ${sessionId} expiration unverified`)
    sessionsExpired += 1
  }
  let subscriptionsCanceled = 0
  for (const subscriptionId of plan.cancelSubscriptions) {
    const cancelled = await stripe.cancel(subscriptionId)
    if (!cancelled.success)
      return createResultError(op, `Historical Stripe subscription ${subscriptionId} cancellation unverified`)
    subscriptionsCanceled += 1
  }
  let customersDeleted = 0
  for (const customerId of plan.deleteCustomers) {
    const deleted = await stripe.deleteCustomer(customerId)
    if (!deleted.success) return createResultError(op, `Historical Stripe customer ${customerId} deletion unverified`)
    const confirmed = await stripe.customerDeleted(customerId)
    if (!confirmed.success) return createResultError(op, `Historical Stripe customer ${customerId} deletion unverified`)
    customersDeleted += 1
  }

  return createResult({
    status: "stripe-historical-reconciled" as const,
    sessionsExpired,
    subscriptionsCanceled,
    customersDeleted,
    sessionsDiscovered: ownedByKey.size,
    customersRetained: retainedCustomersWithHistory.length,
    retainedCustomersWithHistory,
    chargesRetained: "untouched" as const,
    invoicesRetained: "untouched" as const,
    paymentIntentsRetained: "untouched" as const,
    retainedLive,
  })
}

async function e2eStripeHistoricalCustomerExclusiveProve(input: {
  stripe: StripeClient
  customerId: string
  eventKeys: Set<string>
  organizationId: string
  ownedSession: (metadata: Record<string, string>) => boolean
  customerExclusive?: (customerId: string) => Promise<boolean>
}) {
  const op = "e2eStripeHistoricalCleanupScan"
  if (!input.customerExclusive) return createResult("retain" as const)

  const customer = await input.stripe.get("customer", `customers/${encodeURIComponent(input.customerId)}`)
  if (!customer.success) return createResult("retain" as const)
  if (customer.data.id !== input.customerId || customer.data.deleted) return createResult("retain" as const)
  const customerMetadata = customer.data.metadata as Record<string, string>
  if (
    customerMetadata.source !== "eventoren_ticket" ||
    customerMetadata.organization_id !== input.organizationId ||
    customerMetadata.stripe_mode !== "test" ||
    !(input.eventKeys.has(customerMetadata.event_key ?? "") || input.ownedSession(customerMetadata))
  )
    return createResult("retain" as const)

  const customerSessions = await input.stripe.list(
    "session",
    `checkout/sessions?customer=${encodeURIComponent(input.customerId)}`,
  )
  if (!customerSessions.success)
    return createResultError(op, "Historical Stripe customer session discovery unavailable; checkpoint retained")
  if (customerSessions.data.length === 0) return createResult("retain" as const)
  for (const session of customerSessions.data) {
    if (session.customer !== input.customerId) return createResult("retain" as const)
    if (session.livemode) return createResult("retain" as const)
    if (!input.ownedSession(session.metadata as Record<string, string>)) return createResult("retain" as const)
  }

  const subscriptions = await input.stripe.list(
    "subscription",
    `subscriptions?customer=${encodeURIComponent(input.customerId)}&status=all`,
  )
  if (!subscriptions.success)
    return createResultError(op, "Historical Stripe subscription discovery unavailable; checkpoint retained")
  for (const subscription of subscriptions.data) {
    if (subscription.customer !== input.customerId) return createResult("retain" as const)
    if (subscription.livemode) return createResult("retain" as const)
    const metadata = subscription.metadata as Record<string, string>
    if (metadata.source === "eventoren_ticket" && input.ownedSession(metadata)) continue
    return createResult("retain" as const)
  }
  if (subscriptions.data.length > 0) return createResult("retain" as const)

  const intents = await input.stripe.list(
    "paymentIntent",
    `payment_intents?customer=${encodeURIComponent(input.customerId)}`,
  )
  if (!intents.success)
    return createResultError(op, "Historical Stripe payment-intent discovery unavailable; checkpoint retained")
  if (intents.data.length > 0) return createResult("retain" as const)

  const invoices = await input.stripe.list("invoice", `invoices?customer=${encodeURIComponent(input.customerId)}`)
  if (!invoices.success)
    return createResultError(op, "Historical Stripe invoice discovery unavailable; checkpoint retained")
  if (invoices.data.length > 0) return createResult("retain" as const)

  const charges = await input.stripe.list("charge", `charges?customer=${encodeURIComponent(input.customerId)}`)
  if (!charges.success)
    return createResultError(op, "Historical Stripe charge discovery unavailable; checkpoint retained")
  if (charges.data.length > 0) return createResult("retain" as const)

  let exclusive: boolean
  try {
    exclusive = await input.customerExclusive(input.customerId)
  } catch {
    return createResultError(op, "Billing customer mapping proof unavailable; checkpoint retained")
  }
  if (!exclusive) return createResult("retain" as const)
  return createResult("delete" as const)
}
