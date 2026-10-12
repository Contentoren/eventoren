import { expect } from "@rstest/playwright"
import { ConvexHttpClient } from "convex/browser"
import { catalogEventsAdminList } from "#src/catalog/client/catalogEventsAdminList.ts"
import { e2eTicketBackendResolve } from "../../config/e2eTicketBackendResolve.ts"
import { ticketE2eAdminSignIn } from "../ticketE2eAdminSignIn.ts"
import type { TicketPurchaseContext } from "./TicketPurchaseContext.ts"
import { ticketPurchaseStepRun } from "./ticketPurchaseStepRun.ts"

const postSaveAttempts = 12
const postSaveDelayMs = 200
const expectedPriceCents = 2400
const expectedFeeCents = 0

type TicketProductTier = {
  readonly id: string
  readonly name: string
  readonly priceCents: number
  readonly feeCents: number
}

type TicketProductFind =
  | { readonly state: "own"; readonly productId: string }
  | { readonly state: "absent" }
  | { readonly state: "foreign" }
  | { readonly state: "multiple" }

function ticketProductOwnFind(tiers: readonly TicketProductTier[], productName: string): TicketProductFind {
  const matches = tiers.filter((tier) => tier.name === productName)
  if (matches.length === 0) return { state: "absent" }
  if (matches.length > 1) return { state: "multiple" }
  const tier = matches[0]!
  if (tier.priceCents !== expectedPriceCents || tier.feeCents !== expectedFeeCents) return { state: "foreign" }
  return { state: "own", productId: tier.id }
}

async function ticketProductAuthorizedLookup(
  token: string,
  eventKey: string,
  productName: string,
  client: ConvexHttpClient,
): Promise<TicketProductFind> {
  let catalog: Awaited<ReturnType<typeof catalogEventsAdminList>>
  try {
    catalog = await catalogEventsAdminList(token, client)
  } catch {
    throw new Error("Authorized product read failed; reconcile manually")
  }
  if (!catalog.success) throw new Error(`Authorized product read failed: ${catalog.errorMessage}`)
  const matches = catalog.data.filter((event) => event.id === eventKey)
  if (matches.length > 1) throw new Error("Multiple matching events for the exact run marker; reconcile manually")
  const existing = matches[0]
  if (!existing) throw new Error("Authorized event for the exact run marker is missing; reconcile manually")
  return ticketProductOwnFind(existing.tiers, productName)
}

export async function ticketPurchaseProductStep(
  context: TicketPurchaseContext,
  input: { client?: ConvexHttpClient; environment?: Record<string, string | undefined> } = {},
): Promise<void> {
  const { page, baseUrl } = context
  const { eventKey } = context.checkpoint.ticket
  const runId = context.checkpoint.runId
  const productName = `Paid ticket ${runId}`
  await ticketPurchaseStepRun(context, "product", false, async (completed, record) => {
    await ticketE2eAdminSignIn(page, baseUrl)
    const ticket = context.checkpoint.ticket
    if (
      ticket.eventKey !== `ticket-e2e-${runId}` ||
      ticket.eventTitle !== `Ticket E2E ${runId}` ||
      ticket.participantName !== `E2E Participant ${runId}`
    )
      throw new Error("Ticket marker does not match the run; reconcile manually")
    // Reconcile through the canonical authorized admin query instead of DOM
    // attributes: the product list carries no stable run-marked key (the
    // editor auto-generates ticket-N keys) and its draggable markup differs
    // per renderer. The backend tier id is the only stable product identity.
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
    // Bind every reconciliation read to the explicit invocation canonical
    // backend pair. Ambient VITE_CONVEX_URL/localhost defaults are never
    // consulted: a missing or foreign E2E_CLEANUP_CONVEX_URL refuses before
    // any query or creation. The token stays in memory only.
    const backend = e2eTicketBackendResolve(input.environment ?? process.env)
    if (!backend.success) throw new Error(backend.errorMessage)
    const adminClient = input.client ?? new ConvexHttpClient(backend.data.convexUrl)
    const productsUrl = `${baseUrl}/admin/events/${encodeURIComponent(eventKey)}?tab=products`
    if (completed) {
      // Prove the recorded backend product is still the exact own product.
      const recorded = context.checkpoint.ticket.productId
      if (!recorded) throw new Error("Recorded ticket product is missing; reconcile manually")
      await page.goto(productsUrl)
      await expect(page.getByText(productName)).toBeVisible({ timeout: 30_000 })
      const found = await ticketProductAuthorizedLookup(memoryToken, eventKey, productName, adminClient)
      if (found.state !== "own") throw new Error("Recorded ticket product could not be proven; reconcile manually")
      if (found.productId !== recorded) throw new Error("Ticket product evidence changed; reconcile manually")
      return
    }
    // Uncertain first write: reconcile the exact run marker against the
    // authorized backend before creating a replacement. Adopt the proven own
    // product, never create a duplicate on top of it.
    const before = await ticketProductAuthorizedLookup(memoryToken, eventKey, productName, adminClient)
    if (before.state === "own") {
      await page.goto(productsUrl)
      await expect(page.getByText(productName)).toBeVisible({ timeout: 30_000 })
      await record({ productId: before.productId })
      return
    }
    if (before.state !== "absent")
      throw new Error("Existing ticket product with the same marker is foreign or ambiguous; reconcile manually")
    // Explicitly authorized absence: same admin session, same canonical
    // target, exact marker proven absent. Create once with the SAME run
    // product intent below.
    await page.goto(productsUrl)
    await expect(page.locator("form:has(#admin-tier-name)")).toHaveAttribute("data-hydrated", "true", {
      timeout: 30_000,
    })
    const start = new Date(context.checkpoint.ticket.mailSince + 14 * 24 * 60 * 60_000)
    const end = new Date(start.getTime() + 3 * 60 * 60_000)
    const localDateTime = (date: Date) =>
      new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
    await page.locator("#admin-tier-name").fill(productName)
    await page.locator("#admin-tier-capacity").fill("10")
    await page.locator("#admin-tier-price").fill("24.00")
    await page.locator("#admin-tier-fee").fill("0.00")
    await page.locator("#admin-tier-starts").fill(localDateTime(start))
    await page.locator("#admin-tier-ends").fill(localDateTime(end))
    // The submit click fulfilling is the only UI contract asserted here. The
    // success toast ("Ticketprodukt gespeichert", role=status) is not
    // authoritative: a DEV write submitted the same owned marker yet reported
    // zero status locators while the backend had persisted the row. Completion
    // below is proven by bounded polling of the same canonical authorized
    // catalog with the in-memory session token for the exact event key plus
    // the owned product name and expected price/fee fixture fields.
    await page.getByRole("button", { name: "Ticketprodukt speichern" }).click()
    if (await page.getByRole("alert").count()) throw new Error("Admin reported a ticket product creation error")
    for (let attempt = 1; attempt <= postSaveAttempts; attempt += 1) {
      const last = attempt === postSaveAttempts
      let after: TicketProductFind
      try {
        after = await ticketProductAuthorizedLookup(memoryToken, eventKey, productName, adminClient)
      } catch (error) {
        if (last) throw error instanceof Error ? error : new Error("Saved ticket product could not be proven")
        await new Promise((resolve) => setTimeout(resolve, postSaveDelayMs))
        continue
      }
      if (after.state !== "own") {
        if (last)
          throw new Error(
            after.state === "absent"
              ? "Saved ticket product could not be proven in the authorized catalog; reconcile manually"
              : "Saved ticket product with the same marker is foreign or ambiguous; reconcile manually",
          )
        await new Promise((resolve) => setTimeout(resolve, postSaveDelayMs))
        continue
      }
      // The admin catalog identifies the saved product by its backend tier id.
      await record({ productId: after.productId })
      return
    }
    throw new Error("Saved ticket product could not be proven in the authorized catalog; reconcile manually")
  })
}
