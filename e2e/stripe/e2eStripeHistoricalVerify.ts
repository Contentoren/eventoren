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
 * Read-only final verification that no disposable test-mode provider resources
 * remain for the inventoried candidates. Open test sessions and non-canceled
 * test subscriptions fail verification and retain the checkpoint; expired or
 * complete sessions, canceled subscriptions and immutable financial history
 * (charges, invoices, payment intents) are expected retained evidence and are
 * excluded, never mutated. Live-mode objects are excluded by design.
 */
export async function e2eStripeHistoricalVerify(input: {
  candidates: HistoricalCandidate[]
  organizationId: string
  accountId: string
  key: string
  stripe: StripeClient
}) {
  const op = "e2eStripeHistoricalVerify"
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
  if (provenKeys.size === 0 && !credentialsValid) return createResult({ status: "stripe-historical-absent" as const })
  if (provenKeys.size > 0 && !credentialsValid)
    return createResultError(op, "Exact Stripe TEST/organization credentials missing; checkpoint retained")
  const account = await input.stripe.account()
  if (!account.success || account.data !== input.accountId)
    return createResultError(op, "Stripe TEST account identity mismatch; checkpoint retained")
  const eventKeys = provenKeys
  const sessions = await input.stripe.list("session", "checkout/sessions")
  if (!sessions.success) return createResultError(op, "Historical Stripe verification unavailable; checkpoint retained")
  const residualOpen: string[] = []
  for (const session of sessions.data) {
    const metadata = session.metadata as Record<string, string>
    const inCandidates = eventKeys.has(metadata.event_key ?? "")
    const globallyOwned = e2eStripeHistoricalSessionOwnedGlobal(metadata, input.organizationId)
    if (!inCandidates && !globallyOwned) continue
    if (metadata.source !== "eventoren_ticket" || metadata.organization_id !== input.organizationId) continue
    if (session.livemode || metadata.stripe_mode !== "test") continue
    if (!metadata.payment_reference || !metadata.order_reference) continue
    if (session.status === "open") residualOpen.push(session.id)
  }
  if (residualOpen.length > 0)
    return createResultError(
      op,
      `Historical Stripe retains disposable open sessions; checkpoint retained: ${residualOpen.join("; ")}`,
    )
  const customerIds = new Set<string>()
  for (const session of sessions.data) {
    const metadata = session.metadata as Record<string, string>
    const inCandidates = eventKeys.has(metadata.event_key ?? "")
    const globallyOwned = e2eStripeHistoricalSessionOwnedGlobal(metadata, input.organizationId)
    if (!inCandidates && !globallyOwned) continue
    if (metadata.source !== "eventoren_ticket" || metadata.organization_id !== input.organizationId) continue
    if (session.livemode || metadata.stripe_mode !== "test") continue
    if (session.customer) customerIds.add(session.customer)
  }
  const residualActiveSubs: string[] = []
  for (const customerId of customerIds) {
    const subscriptions = await input.stripe.list(
      "subscription",
      `subscriptions?customer=${encodeURIComponent(customerId)}&status=all`,
    )
    if (!subscriptions.success)
      return createResultError(op, "Historical Stripe verification unavailable; checkpoint retained")
    for (const subscription of subscriptions.data) {
      const metadata = subscription.metadata as Record<string, string>
      if (subscription.customer !== customerId || metadata.source !== "eventoren_ticket") continue
      const inCandidates = eventKeys.has(metadata.event_key ?? "")
      const globallyOwnedSub = e2eStripeHistoricalSessionOwnedGlobal(metadata, input.organizationId)
      if (!inCandidates && !globallyOwnedSub) continue
      if (subscription.livemode || metadata.stripe_mode !== "test") continue
      if (metadata.organization_id !== input.organizationId) continue
      if (subscription.status !== "canceled") residualActiveSubs.push(subscription.id)
    }
  }
  if (residualActiveSubs.length > 0)
    return createResultError(
      op,
      `Historical Stripe retains disposable active subscriptions; checkpoint retained: ${residualActiveSubs.join("; ")}`,
    )
  return createResult({ status: "stripe-historical-absent" as const })
}
