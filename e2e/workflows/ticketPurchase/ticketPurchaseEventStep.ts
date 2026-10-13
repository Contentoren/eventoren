import { expect } from "@rstest/playwright"
import { ConvexHttpClient } from "convex/browser"
import { catalogEventsAdminList } from "#src/catalog/client/catalogEventsAdminList.ts"
import { e2eTicketBackendResolve } from "../../config/e2eTicketBackendResolve.ts"
import { ticketE2eAdminSignIn } from "../ticketE2eAdminSignIn.ts"
import type { TicketPurchaseContext } from "./TicketPurchaseContext.ts"
import { ticketPurchaseStepRun } from "./ticketPurchaseStepRun.ts"

const postSaveAttempts = 12
const postSaveDelayMs = 200

function ticketEventIsExpectedOwn(
  event: { readonly id: string; readonly title: string; readonly status?: unknown },
  eventKey: string,
  eventTitle: string,
): boolean {
  return event.id === eventKey && event.title === eventTitle && event.status === "draft"
}

export async function ticketPurchaseEventStep(
  context: TicketPurchaseContext,
  input: { client?: ConvexHttpClient; environment?: Record<string, string | undefined> } = {},
): Promise<void> {
  const { page, baseUrl } = context
  const { eventTitle, eventKey } = context.checkpoint.ticket
  await ticketPurchaseStepRun(context, "event", false, async (completed, record) => {
    await ticketE2eAdminSignIn(page, baseUrl)
    if (completed) {
      await page.goto(`${baseUrl}/admin/events/${encodeURIComponent(eventKey)}`)
      await expect(page.getByRole("heading", { name: eventTitle })).toBeVisible({ timeout: 30_000 })
      return
    }
    // Uncertain event-started: reconcile the exact run marker against the
    // authorized backend before creating a replacement. Same canonical target/run,
    // same run/event intent, no new namespace, no deletion, no historical sweep.
    const ticket = context.checkpoint.ticket
    const runId = context.checkpoint.runId
    if (
      ticket.eventKey !== `ticket-e2e-${runId}` ||
      ticket.eventTitle !== `Ticket E2E ${runId}` ||
      ticket.participantName !== `E2E Participant ${runId}`
    )
      throw new Error("Ticket marker does not match the run; reconcile manually")
    // Zero heading/form counts immediately after a goto are not proof of
    // absence: the detail route renders the same "Event nicht gefunden"
    // fallback (AdminEventDetailPage) while its authorized catalog is still
    // loading, and an API/auth failure leaves the same empty state. Reconcile
    // through the canonical authorized admin query instead, using the current
    // HttpOnly session bootstrap token from the sign-in above.
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
    let catalog: Awaited<ReturnType<typeof catalogEventsAdminList>>
    try {
      catalog = await catalogEventsAdminList(memoryToken, adminClient)
    } catch {
      throw new Error("Authorized catalog read failed; reconcile manually")
    }
    if (!catalog.success) throw new Error(`Authorized catalog read failed: ${catalog.errorMessage}`)
    const matches = catalog.data.filter((event) => event.id === eventKey)
    if (matches.length > 1) throw new Error("Multiple matching events for the exact run marker; reconcile manually")
    const existing = matches[0]
    if (existing) {
      // Same key but a foreign payload: never adopt it and never create a
      // duplicate key on top of it. The current fixture is always a draft with
      // the owned title, so a published/archived row or any other title proves
      // a foreign owner.
      if (!ticketEventIsExpectedOwn(existing, eventKey, eventTitle))
        throw new Error("Existing event with the same key but a foreign payload; reconcile manually")
      // Existing own event: adopt it, never create a duplicate.
      await page.goto(`${baseUrl}/admin/events/${encodeURIComponent(eventKey)}`)
      const heading = page.getByRole("heading", { name: eventTitle })
      await expect(heading).toBeVisible({ timeout: 30_000 })
      await record({ eventId: eventKey })
      return
    }
    // Explicitly authorized absence: same admin session, same canonical
    // target, exact marker proven absent. Create once with the SAME
    // run/event intent below.
    // InputDateTime's time select offers five-minute slots. Round only the
    // start, then derive doors/end so their intended offsets stay exact.
    const timeSlotMs = 5 * 60_000
    const start = new Date(
      Math.ceil((context.checkpoint.ticket.mailSince + 14 * 24 * 60 * 60_000) / timeSlotMs) * timeSlotMs,
    )
    const doors = new Date(start.getTime() - 30 * 60_000)
    const end = new Date(start.getTime() + 3 * 60 * 60_000)
    const localDateTime = (date: Date) =>
      new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
    await page.goto(`${baseUrl}/admin/events/new`)
    await expect(page.getByRole("heading", { name: "Neues Event" })).toBeVisible()
    await expect(page.locator("form:has(#admin-event-title)")).toHaveAttribute("data-hydrated", "true", {
      timeout: 30_000,
    })
    await page.locator("#admin-event-title").fill(eventTitle)
    await page.locator("#admin-event-subtitle").fill("Paid ticket purchase integration test")
    await page.locator("#admin-event-description").fill(`Paid ticket purchase E2E run ${runId}.`)
    await page.locator("#admin-event-organizer").fill(`Eventoren Ticket E2E ${runId}`)
    await page.locator("#admin-event-venue").fill(`Ticket E2E Test Hall ${runId}`)
    await page.locator("#admin-event-city").fill("Berlin")
    await page.locator("#admin-event-address").fill("Ticket E2E Teststraße 1, 10115 Berlin")
    await page.getByText("Erweitert", { exact: true }).click()
    await page.locator("#admin-event-key").fill(eventKey)
    for (const [id, date] of [
      ["admin-event-starts", start],
      ["admin-event-doors", doors],
      ["admin-event-ends", end],
    ] as const) {
      const value = localDateTime(date)
      await page.locator(`#${id}`).fill(value.slice(0, 10))
      await page.locator(`#${id}-time`).selectOption(value.slice(11, 16))
    }
    // The submit click fulfilling is the only UI contract asserted here. The
    // success toast ("Event gespeichert …", role=status) is not authoritative:
    // a DEV write submitted the same owned key yet reported zero status
    // locators while the backend had persisted the row. Completion below is
    // proven by bounded polling of the same canonical authorized paginated
    // catalog with the in-memory session token for the exact key plus the
    // owned title and expected draft fixture fields.
    await page.getByRole("button", { name: "Änderungen speichern" }).click()
    if (await page.getByRole("alert").count()) throw new Error("Admin reported an event creation error")
    for (let attempt = 1; attempt <= postSaveAttempts; attempt += 1) {
      const last = attempt === postSaveAttempts
      let after: Awaited<ReturnType<typeof catalogEventsAdminList>>
      try {
        after = await catalogEventsAdminList(memoryToken, adminClient)
      } catch {
        if (last) throw new Error("Authoritative event persistence could not be proven after save; reconcile manually")
        await new Promise((resolve) => setTimeout(resolve, postSaveDelayMs))
        continue
      }
      if (!after.success) {
        if (last)
          throw new Error(`Authoritative event persistence could not be proven after save: ${after.errorMessage}`)
        await new Promise((resolve) => setTimeout(resolve, postSaveDelayMs))
        continue
      }
      const persistedMatches = after.data.filter((event) => event.id === eventKey)
      if (persistedMatches.length > 1)
        throw new Error("Multiple matching events for the exact run marker; reconcile manually")
      const persisted = persistedMatches[0]
      if (!persisted) {
        if (last) throw new Error("Saved event could not be proven in the authorized catalog; reconcile manually")
        await new Promise((resolve) => setTimeout(resolve, postSaveDelayMs))
        continue
      }
      if (!ticketEventIsExpectedOwn(persisted, eventKey, eventTitle))
        throw new Error("Saved event with the same key but a foreign payload; reconcile manually")
      // The admin catalog identifies saved events by their exact event key.
      await record({ eventId: eventKey })
      return
    }
    throw new Error("Saved event could not be proven in the authorized catalog; reconcile manually")
  })
}
