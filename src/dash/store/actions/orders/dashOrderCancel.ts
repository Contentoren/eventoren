import { createResult, createResultError, type Result } from "#result"

import { eventPriceFormat } from "../../../../events/eventPriceFormat.ts"
import { dashAuditAdd } from "../../dashAuditAdd.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashIdCreate } from "../../dashIdCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"
import { dashOrderRefundableGet } from "./dashOrderRefundableGet.ts"

export function dashOrderCancel(
  args: { orderId: string; reason: string },
  store: DashStore = dashStoreGet(),
): Result<{ refundedCents: number }> {
  const op = "dashOrderCancel"
  const order = store.state.orders.find((candidate) => candidate.id === args.orderId)
  if (!order) return createResultError(op, "Bestellung nicht gefunden.")
  if (order.status === "storniert") return createResultError(op, "Die Bestellung ist bereits storniert.")
  const reason = args.reason.trim()
  if (!reason) return createResultError(op, "Bitte gib einen Grund an.")
  if (order.status === "offen") {
    // Offene (unbezahlte) Bestellung: keine Erstattung, nur stornieren —
    // die SEPA-Zahlung wird nicht mehr eingezogen.
    const nowIso = new Date().toISOString()
    const updated = store.update(op, (draft) => {
      const target = draft.orders.find((candidate) => candidate.id === args.orderId)
      if (!target) throw new Error("Bestellung nicht gefunden.")
      target.status = "storniert"
      for (const ticket of draft.tickets) if (ticket.orderId === target.id) ticket.status = "storniert"
      target.emails.push({ at: nowIso, to: target.buyer.email, kind: "storno" })
      dashAuditAdd(draft, {
        orgId: target.orgId,
        eventId: target.eventId,
        area: "bestellungen",
        action: `Bestellung ${target.number} storniert (offene Zahlung)`,
        before: null,
        after: eventPriceFormat(0),
      })
    })
    if (!updated.success) return createResultError(op, "Die Stornierung konnte nicht gespeichert werden.")
    return createResult({ refundedCents: 0 })
  }
  const tickets = store.state.tickets.filter((ticket) => ticket.orderId === order.id)
  const refundable = dashOrderRefundableGet(order, tickets)
  if (refundable.maxCents <= 0) return createResultError(op, "Es gibt nichts mehr zu erstatten.")
  const nowIso = new Date().toISOString()
  const refundId = dashIdCreate("refund")
  const ticketIds = refundable.perTicket.filter((entry) => entry.refundable).map((entry) => entry.ticketId)
  const amountCents = refundable.ticketMaxCents + refundable.feeRefundableCents
  const updated = store.update(op, (draft) => {
    const target = draft.orders.find((candidate) => candidate.id === args.orderId)
    if (!target) throw new Error("Bestellung nicht gefunden.")
    target.refunds.push({
      id: refundId,
      amountCents,
      feeCents: refundable.feeRefundableCents,
      reason,
      at: nowIso,
      ticketIds,
    })
    target.status = "storniert"
    for (const ticket of draft.tickets) if (ticket.orderId === target.id) ticket.status = "storniert"
    target.emails.push({ at: nowIso, to: target.buyer.email, kind: "storno" })
    dashAuditAdd(draft, {
      orgId: target.orgId,
      eventId: target.eventId,
      area: "bestellungen",
      action: `Bestellung ${target.number} storniert`,
      before: null,
      after: eventPriceFormat(amountCents),
    })
  })
  if (!updated.success) return createResultError(op, "Die Stornierung konnte nicht gespeichert werden.")
  return createResult({ refundedCents: amountCents })
}
