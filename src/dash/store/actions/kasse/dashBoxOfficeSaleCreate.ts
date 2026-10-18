import { createResult, createResultError, type Result } from "#result"

import { dashPhaseResolve } from "../../../model/dashPhaseResolve.ts"
import type { DashBoxOfficeSale } from "../../../model/dashBoxOfficeSaleSchema.ts"
import { dashTicketTypeSales } from "../../../model/dashTicketTypeSales.ts"
import { dashAuditAdd } from "../../dashAuditAdd.ts"
import { dashIdCreate } from "../../dashIdCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"
import type { DashStore } from "../../dashStoreCreate.ts"

export type DashBoxOfficeSaleCreateInput = {
  eventId: string
  lines: { ticketTypeId: string; quantity: number }[]
}

/** Legt einen Abendkassen-Vorgang mit Status "wartet" an. */
export function dashBoxOfficeSaleCreate(
  input: DashBoxOfficeSaleCreateInput,
  store: DashStore = dashStoreGet(),
): Result<DashBoxOfficeSale> {
  const op = "dashBoxOfficeSaleCreate"
  const event = store.state.events.find((candidate) => candidate.id === input.eventId)
  if (!event) return createResultError(op, "Event nicht gefunden.")
  if (input.lines.length === 0) return createResultError(op, "Wähle mindestens eine Ticketart.")
  const now = new Date()
  const nowIso = now.toISOString()
  const resolved: { ticketTypeId: string; quantity: number; unitPriceCents: number; name: string }[] = []
  for (const line of input.lines) {
    if (!Number.isInteger(line.quantity) || line.quantity < 1)
      return createResultError(op, "Die Menge muss mindestens 1 sein.")
    const ticketType = store.state.ticketTypes.find((candidate) => candidate.id === line.ticketTypeId)
    if (!ticketType || ticketType.eventId !== event.id)
      return createResultError(op, "Eine Ticketart gehört nicht zu diesem Event.")
    if (ticketType.channel !== "abendkasse")
      return createResultError(op, `„${ticketType.name}“ gibt es nicht an der Abendkasse.`)
    if (ticketType.archivedAt !== null) return createResultError(op, `„${ticketType.name}“ ist archiviert.`)
    const sales = dashTicketTypeSales({ ticketType, orders: store.state.orders, tickets: store.state.tickets })
    const phase = dashPhaseResolve(ticketType, sales.soldByPhase, now)
    if (phase.state === "ausverkauft") return createResultError(op, `„${ticketType.name}“ ist ausverkauft.`)
    if (!phase.phase) {
      if (phase.state === "geplant")
        return createResultError(op, `Der Verkauf für „${ticketType.name}“ hat noch nicht begonnen.`)
      return createResultError(op, `„${ticketType.name}“ ist nicht mehr verfügbar.`)
    }
    if (sales.available < line.quantity)
      return createResultError(op, `Für „${ticketType.name}“ sind nur noch ${sales.available} Tickets verfügbar.`)
    if (phase.remainingInPhase !== null && phase.remainingInPhase < line.quantity)
      return createResultError(
        op,
        `In Phase „${phase.phase.name}“ sind nur noch ${phase.remainingInPhase} Tickets verfügbar.`,
      )
    resolved.push({
      ticketTypeId: ticketType.id,
      quantity: line.quantity,
      unitPriceCents: phase.phase.priceCents,
      name: ticketType.name,
    })
  }
  const totalCents = resolved.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0)
  const sale: DashBoxOfficeSale = {
    id: dashIdCreate("sale"),
    eventId: event.id,
    lines: resolved.map((line) => ({
      ticketTypeId: line.ticketTypeId,
      quantity: line.quantity,
      unitPriceCents: line.unitPriceCents,
    })),
    totalCents,
    status: "wartet",
    createdAt: nowIso,
    paidAt: null,
    orderId: null,
    buyerEmail: null,
  }
  const linesSummary = resolved.map((line) => `${line.quantity} × ${line.name}`).join(", ")
  const updated = store.update(op, (draft) => {
    draft.boxOfficeSales.push(sale)
    dashAuditAdd(draft, {
      orgId: event.orgId,
      eventId: event.id,
      area: "abendkasse",
      action: `Abendkassen-Vorgang angelegt (${linesSummary})`,
      before: null,
      after: `${linesSummary}`,
    })
  })
  if (!updated.success) return createResultError(op, "Der Vorgang konnte nicht gespeichert werden.")
  return createResult(sale)
}
