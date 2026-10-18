import { createResult, createResultError, type Result } from "#result"
import type { DashPaymentMethod } from "../../../model/dashPaymentMethodSchema.ts"
import { dashPhaseResolve } from "../../../model/dashPhaseResolve.ts"
import { dashTicketTypeSales } from "../../../model/dashTicketTypeSales.ts"
import type { DashTicketType } from "../../../model/dashTicketTypeSchema.ts"
import { dashOrderCreate } from "../../../store/actions/dashOrderCreate.ts"
import type { DashStore } from "../../../store/dashStoreCreate.ts"
import { dashStoreGet } from "../../../store/dashStoreGet.ts"

const dashDemoFirstNames = [
  "Anna",
  "Jonas",
  "Marie",
  "Felix",
  "Lena",
  "Paul",
  "Sofia",
  "Leon",
  "Mia",
  "Finn",
  "Clara",
  "Moritz",
]

const dashDemoLastNames = [
  "Müller",
  "Schmidt",
  "Schneider",
  "Fischer",
  "Weber",
  "Meyer",
  "Wagner",
  "Becker",
  "Schäfer",
  "Koch",
  "Bauer",
  "Klein",
]

const dashDemoMethods: DashPaymentMethod[] = ["karte", "paypal", "applepay"]

function dashDemoEmailCreate(firstName: string, lastName: string): string {
  const ascii = (value: string): string =>
    value
      .toLowerCase()
      .replaceAll("ä", "ae")
      .replaceAll("ö", "oe")
      .replaceAll("ü", "ue")
      .replaceAll("ß", "ss")
      .normalize("NFD")
      .replaceAll(/[\u0300-\u036f]/gu, "")
      .replaceAll(/[^a-z]/gu, "")
  return `${ascii(firstName)}.${ascii(lastName)}@example.de`
}

export function dashDemoOrdersGenerate(args: {
  count: number
  random: () => number
  store?: DashStore
}): Result<{ created: number }> {
  const op = "dashDemoOrdersGenerate"
  const store = args.store ?? dashStoreGet()
  const orgId = store.state.session.activeOrgId
  if (orgId === null) return createResultError(op, "Keine verfügbaren Tickets.")

  let created = 0
  let guard = 0
  while (created < args.count && guard < args.count * 10 + 20) {
    guard += 1
    const now = new Date()
    const candidates: { eventId: string; type: DashTicketType; quantity: number }[] = []
    for (const event of store.state.events) {
      if (event.orgId !== orgId || event.status !== "veroeffentlicht" || event.salesPaused) continue
      if (Date.parse(event.startsAt) <= now.getTime()) continue
      for (const type of store.state.ticketTypes) {
        if (type.eventId !== event.id || type.channel !== "online" || type.hidden || type.archivedAt !== null) {
          continue
        }
        const sales = dashTicketTypeSales({
          ticketType: type,
          orders: store.state.orders,
          tickets: store.state.tickets,
        })
        if (sales.available < 1) continue
        const resolved = dashPhaseResolve(type, sales.soldByPhase, now)
        if (resolved.state !== "aktiv" || !resolved.phase) continue
        const phaseCap = resolved.remainingInPhase ?? sales.available
        const quantity = Math.min(1 + Math.floor(args.random() * 3), type.maxPerOrder, sales.available, phaseCap)
        if (quantity < 1) continue
        candidates.push({ eventId: event.id, type, quantity })
      }
    }
    if (candidates.length === 0) break
    const picked = candidates[Math.floor(args.random() * candidates.length)]
    if (!picked) break
    const firstName = dashDemoFirstNames[Math.floor(args.random() * dashDemoFirstNames.length)] ?? "Alex"
    const lastName = dashDemoLastNames[Math.floor(args.random() * dashDemoLastNames.length)] ?? "Mustermann"
    const method = dashDemoMethods[Math.floor(args.random() * dashDemoMethods.length)] ?? "karte"
    const result = dashOrderCreate(
      {
        eventId: picked.eventId,
        lines: [{ ticketTypeId: picked.type.id, quantity: picked.quantity }],
        buyer: { firstName, lastName, email: dashDemoEmailCreate(firstName, lastName) },
        channel: "online",
        method,
      },
      store,
    )
    if (result.success) created += 1
  }

  if (created === 0) return createResultError(op, "Keine verfügbaren Tickets.")
  return createResult({ created })
}
