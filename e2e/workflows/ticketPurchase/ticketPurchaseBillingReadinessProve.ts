import { ConvexHttpClient } from "convex/browser"
import { api } from "../../../convex/_generated/api.js"
import { catalogEventsAdminList } from "#src/catalog/client/catalogEventsAdminList.ts"
import { e2eTicketBackendResolve } from "../../config/e2eTicketBackendResolve.ts"
import { ticketE2eAdminSignIn } from "../ticketE2eAdminSignIn.ts"
import type { TicketPurchaseContext } from "./TicketPurchaseContext.ts"
import { ticketPurchaseBillingReadinessWait } from "./ticketPurchaseBillingReadinessWait.ts"

/**
 * Named Billing publication readiness barrier. Local `published` status only
 * proves the Eventoren row; checkout sends the published catalog version to
 * Billing, which 404s EVENT_NOT_FOUND until the scheduled catalog push marks
 * that version synced. This bounded read-only wait retains the checkpoint on
 * timeout so checkout never starts against an unregistered version.
 */
export async function ticketPurchaseBillingReadinessProve(
  context: TicketPurchaseContext,
  input: { client?: ConvexHttpClient; environment?: Record<string, string | undefined> },
): Promise<void> {
  const { page, baseUrl } = context
  const { eventKey } = context.checkpoint.ticket
  await ticketE2eAdminSignIn(page, baseUrl)
  let sessionToken: string | null = null
  try {
    const session = await page.evaluate(async () => {
      const response = await fetch("/api/session", { credentials: "same-origin", cache: "no-store" })
      if (!response.ok) throw new Error(`/api/session returned ${response.status}`)
      const body = (await response.json()) as { session: { token: string } | null }
      return body.session
    })
    sessionToken = session?.token ?? null
  } catch {
    throw new Error("Admin session proof unavailable; reconcile manually")
  }
  if (!sessionToken) throw new Error("Admin session proof unavailable; reconcile manually")
  const memoryToken = sessionToken
  const backend = e2eTicketBackendResolve(input.environment ?? process.env)
  if (!backend.success) throw new Error(backend.errorMessage)
  const adminClient = input.client ?? new ConvexHttpClient(backend.data.convexUrl)
  const catalog = await catalogEventsAdminList(memoryToken, adminClient).catch(() => null)
  if (!catalog?.success) throw new Error("Authorized publication read failed; reconcile manually")
  const published = catalog.data.find((event) => event.id === eventKey)
  if (!published || published.status !== "published")
    throw new Error("Published event could not be proven in the authorized catalog; reconcile manually")
  const publishedVersion = published.catalogVersion
  const ready = await ticketPurchaseBillingReadinessWait({
    publishedVersion,
    readSyncState: async () => {
      try {
        const state = await adminClient.query(api.catalog.catalogSyncStateGetQuery, { token: memoryToken })
        if (!state.success) return { success: false as const, errorMessage: state.errorMessage }
        return { success: true as const, data: state.data }
      } catch {
        return { success: false as const, errorMessage: "Billing readiness proof unavailable; checkpoint retained" }
      }
    },
  })
  if (!ready.success) throw new Error(ready.errorMessage)
}
