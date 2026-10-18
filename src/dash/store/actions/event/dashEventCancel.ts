import { createResult, createResultError, type Result } from "#result"

import type { DashTicket } from "../../../model/dashTicketSchema.ts"
import { dashOrderTicketValue } from "../../../model/dashOrderTicketValue.ts"
import { dashAuditAdd } from "../../dashAuditAdd.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashIdCreate } from "../../dashIdCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"

export type DashEventCancelInput = {
  eventId: string
  reason: string
  refundAll: boolean
}

export type DashEventCancelResult = {
  refundedOrders: number
  refundedCents: number
}

/** Sagt ein Event ab: stoppt den Verkauf, erstattet optional alle Bestellungen, informiert per Absage-Nachricht. */
export function dashEventCancel(
  input: DashEventCancelInput,
  store: DashStore = dashStoreGet(),
): Result<DashEventCancelResult> {
  const op = "dashEventCancel"
  const event = store.state.events.find((candidate) => candidate.id === input.eventId)
  if (!event) return createResultError(op, "Event nicht gefunden.")
  if (event.status === "abgesagt") return createResultError(op, "Das Event ist schon abgesagt.")
  const reason = input.reason.trim()
  if (!reason) return createResultError(op, "Bitte gib einen Grund für die Absage an.")
  if (input.refundAll && event.status === "entwurf")
    return createResultError(op, "Für Entwürfe gibt es keine Bestellungen zum Erstatten.")
  const nowIso = new Date().toISOString()
  const eventOrders = store.state.orders.filter(
    (order) =>
      order.eventId === event.id &&
      (order.status === "bezahlt" || order.status === "offen" || order.status === "teilerstattet"),
  )
  const refundable = input.refundAll
    ? eventOrders.filter((order) => order.status === "bezahlt" || order.status === "teilerstattet")
    : []
  const refundTotal = refundable.reduce((sum, order) => {
    const remaining = dashOrderTicketValue(order) - order.refunds.reduce((part, refund) => part + refund.amountCents, 0)
    return sum + Math.max(0, remaining)
  }, 0)
  const refundTicketIds = new Map<string, string[]>()
  if (input.refundAll) {
    const ticketsByOrder = new Map<string, DashTicket[]>()
    for (const ticket of store.state.tickets) {
      if (ticket.eventId !== event.id || ticket.status !== "gueltig") continue
      const list = ticketsByOrder.get(ticket.orderId) ?? []
      list.push(ticket)
      ticketsByOrder.set(ticket.orderId, list)
    }
    for (const order of refundable) {
      const openTickets = (ticketsByOrder.get(order.id) ?? []).map((ticket) => ticket.id)
      refundTicketIds.set(order.id, openTickets)
    }
  }
  const holderEmails = new Set<string>()
  for (const ticket of store.state.tickets) {
    if (ticket.eventId !== event.id || ticket.status !== "gueltig" || !ticket.holderEmail.includes("@")) continue
    holderEmails.add(ticket.holderEmail.toLowerCase())
  }
  const messageId = dashIdCreate("msg")
  const saved = store.update(op, (draft) => {
    const target = draft.events.find((candidate) => candidate.id === input.eventId)
    if (!target) throw new Error("Event nicht gefunden.")
    target.status = "abgesagt"
    target.salesPaused = true
    target.cancelReason = reason
    target.updatedAt = nowIso
    if (input.refundAll) {
      for (const order of refundable) {
        const savedOrder = draft.orders.find((candidate) => candidate.id === order.id)
        if (!savedOrder || (savedOrder.status !== "bezahlt" && savedOrder.status !== "teilerstattet")) continue
        const remaining =
          dashOrderTicketValue(savedOrder) - savedOrder.refunds.reduce((sum, refund) => sum + refund.amountCents, 0)
        if (remaining <= 0) continue
        savedOrder.refunds.push({
          id: dashIdCreate("refund"),
          amountCents: remaining,
          feeCents: savedOrder.serviceFeeCents,
          reason: `Absage: ${reason}`,
          at: nowIso,
          ticketIds: refundTicketIds.get(savedOrder.id) ?? [],
        })
        savedOrder.status = "erstattet"
        savedOrder.emails.push({ at: nowIso, to: savedOrder.buyer.email, kind: "absage" })
        for (const ticketId of refundTicketIds.get(savedOrder.id) ?? []) {
          const savedTicket = draft.tickets.find((candidate) => candidate.id === ticketId)
          if (savedTicket) savedTicket.status = "storniert"
        }
      }
    }
    draft.messages.push({
      id: messageId,
      eventId: target.id,
      kind: "absage",
      audience: { type: "alle", ticketTypeIds: [] },
      subject: `Absage: ${target.title}`,
      body: `Hallo {vorname},\n\nleider müssen wir **${target.title}** am {datum} absagen. ${reason}\n\nAlle Infos zur Erstattung bekommst du in einer separaten E-Mail.`,
      status: "gesendet",
      scheduledAt: null,
      sentAt: nowIso,
      recipientCount: holderEmails.size,
      openRateBps: null,
    })
    dashAuditAdd(draft, {
      orgId: target.orgId,
      eventId: target.id,
      area: "event",
      action: `Event „${target.title}“ abgesagt${input.refundAll ? ` · ${refundable.length} Bestellungen erstattet` : ""}`,
      before: null,
      after: reason,
    })
  })
  if (!saved.success) return createResultError(op, "Das Event konnte nicht abgesagt werden.")
  return createResult({ refundedOrders: refundable.length, refundedCents: refundTotal })
}
