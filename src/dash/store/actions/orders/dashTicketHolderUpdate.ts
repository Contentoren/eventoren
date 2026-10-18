import { createResult, createResultError, type Result } from "#result"

import { dashAuditAdd } from "../../dashAuditAdd.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"

const dashTicketEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function dashTicketHolderUpdate(
  args: { ticketId: string; holderName: string; holderEmail: string },
  store: DashStore = dashStoreGet(),
): Result<void> {
  const op = "dashTicketHolderUpdate"
  const ticket = store.state.tickets.find((candidate) => candidate.id === args.ticketId)
  if (!ticket) return createResultError(op, "Ticket nicht gefunden.")
  const holderName = args.holderName.trim()
  const holderEmail = args.holderEmail.trim()
  if (!holderName) return createResultError(op, "Bitte gib einen Namen an.")
  if (!dashTicketEmailPattern.test(holderEmail))
    return createResultError(op, "Bitte gib eine gültige E-Mail-Adresse an.")
  const nowIso = new Date().toISOString()
  const updated = store.update(op, (draft) => {
    const target = draft.tickets.find((candidate) => candidate.id === args.ticketId)
    if (!target) throw new Error("Ticket nicht gefunden.")
    const order = draft.orders.find((candidate) => candidate.id === target.orderId)
    if (!order) throw new Error("Bestellung nicht gefunden.")
    target.holderName = holderName
    target.holderEmail = holderEmail
    order.emails.push({ at: nowIso, to: holderEmail, kind: "ticket-umgeschrieben" })
    dashAuditAdd(draft, {
      orgId: order.orgId,
      eventId: order.eventId,
      area: "bestellungen",
      action: `Ticket ${target.code} auf ${holderName} umgeschrieben`,
      before: null,
      after: holderName,
    })
  })
  if (!updated.success) return createResultError(op, "Die Ticketdaten konnten nicht gespeichert werden.")
  return createResult(undefined)
}
