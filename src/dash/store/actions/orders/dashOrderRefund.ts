import { createResult, createResultError, type Result } from "#result"

import { eventPriceFormat } from "../../../../events/eventPriceFormat.ts"
import type { DashOrderStatus } from "../../../model/dashOrderStatusSchema.ts"
import { dashAuditAdd } from "../../dashAuditAdd.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashIdCreate } from "../../dashIdCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"
import { dashOrderRefundableGet } from "./dashOrderRefundableGet.ts"

export type DashOrderRefundInput = {
  orderId: string
  mode: "tickets" | "betrag"
  ticketIds?: string[]
  amountCents?: number
  includeFee: boolean
  invalidateTickets: boolean
  reason: string
}

export function dashOrderRefund(
  input: DashOrderRefundInput,
  store: DashStore = dashStoreGet(),
): Result<{
  refundedCents: number
  status: DashOrderStatus
}> {
  const op = "dashOrderRefund"
  const order = store.state.orders.find((candidate) => candidate.id === input.orderId)
  if (!order) return createResultError(op, "Bestellung nicht gefunden.")
  if (order.status === "storniert") return createResultError(op, "Die Bestellung ist bereits storniert.")
  if (order.status === "offen") return createResultError(op, "Offene Bestellungen können nicht erstattet werden.")
  const reason = input.reason.trim()
  if (!reason) return createResultError(op, "Bitte gib einen Grund an.")
  const tickets = store.state.tickets.filter((ticket) => ticket.orderId === order.id)
  const refundable = dashOrderRefundableGet(order, tickets)
  if (refundable.maxCents <= 0) return createResultError(op, "Es gibt nichts mehr zu erstatten.")

  let ticketCents = 0
  let chosenIds: string[] = []
  if (input.mode === "tickets") {
    const ids = input.ticketIds ?? []
    if (ids.length === 0) return createResultError(op, "Bitte wähle mindestens ein Ticket aus.")
    const perById = new Map(refundable.perTicket.map((entry) => [entry.ticketId, entry]))
    for (const id of ids) {
      const entry = perById.get(id)
      if (!entry) return createResultError(op, "Ein Ticket gehört nicht zu dieser Bestellung.")
      if (!entry.refundable) return createResultError(op, "Ein Ticket ist bereits erstattet oder storniert.")
      ticketCents += entry.amountCents
      chosenIds.push(id)
    }
  } else {
    const amount = input.amountCents ?? 0
    if (!Number.isInteger(amount) || amount < 1)
      return createResultError(op, "Der Betrag muss mindestens 1 Cent betragen.")
    if (amount > refundable.maxCents)
      return createResultError(op, `Maximal ${eventPriceFormat(refundable.maxCents)} erstattbar.`)
    ticketCents = amount
  }

  const allRemaining =
    input.mode === "tickets" && chosenIds.length === refundable.perTicket.filter((entry) => entry.refundable).length
  const feeCents = input.includeFee ? (allRemaining ? refundable.feeRefundableCents : 0) : 0
  const amountCents = ticketCents + feeCents
  if (amountCents < 1 || amountCents > refundable.maxCents)
    return createResultError(op, `Maximal ${eventPriceFormat(refundable.maxCents)} erstattbar.`)
  const nowIso = new Date().toISOString()
  const refundId = dashIdCreate("refund")
  const ticketIds = input.mode === "tickets" ? [...chosenIds] : []
  const invalidate = input.invalidateTickets ? [...ticketIds] : []
  const updated = store.update(op, (draft) => {
    const target = draft.orders.find((candidate) => candidate.id === input.orderId)
    if (!target) throw new Error("Bestellung nicht gefunden.")
    target.refunds.push({ id: refundId, amountCents, feeCents, reason, at: nowIso, ticketIds })
    if (invalidate.length > 0)
      for (const ticket of draft.tickets) if (invalidate.includes(ticket.id)) ticket.status = "storniert"
    const remaining = dashOrderRefundableGet(
      target,
      draft.tickets.filter((ticket) => ticket.orderId === target.id),
    )
    target.status = remaining.maxCents <= 0 ? "erstattet" : "teilerstattet"
    target.emails.push({ at: nowIso, to: target.buyer.email, kind: "erstattung" })
    dashAuditAdd(draft, {
      orgId: target.orgId,
      eventId: target.eventId,
      area: "bestellungen",
      action: `Bestellung ${target.number} erstattet`,
      before: null,
      after: eventPriceFormat(amountCents),
    })
  })
  if (!updated.success) return createResultError(op, "Die Erstattung konnte nicht gespeichert werden.")
  const next = store.state.orders.find((candidate) => candidate.id === input.orderId)
  return createResult({ refundedCents: amountCents, status: next?.status ?? "teilerstattet" })
}
