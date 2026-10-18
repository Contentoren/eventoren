import { createResult, createResultError, type Result } from "#result"

import { dashAuditAdd } from "../../dashAuditAdd.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"
import { dashGuestOrderBuild } from "./dashGuestOrderBuild.ts"

/** Sendet (erneut) das Gästeliste-Ticket per E-Mail; legt es bei Bedarf als 0-€-Order an. */
export function dashGuestTicketSend(guestId: string, store: DashStore = dashStoreGet()): Result<void> {
  const op = "dashGuestTicketSend"
  const guest = store.state.guests.find((candidate) => candidate.id === guestId)
  if (!guest) return createResultError(op, "Gast nicht gefunden.")
  const email = guest.email.trim()
  if (email === "") return createResultError(op, "Ohne E-Mail-Adresse kann kein Ticket gesendet werden.")
  const existingTicket =
    guest.ticketId === null ? null : store.state.tickets.find((candidate) => candidate.id === guest.ticketId)
  if (existingTicket && existingTicket.status === "storniert") return createResultError(op, "Das Ticket ist storniert.")
  const nowIso = new Date().toISOString()
  const built =
    existingTicket === null
      ? dashGuestOrderBuild({
          eventId: guest.eventId,
          name: guest.name,
          email,
          plusOnes: guest.plusOnes,
          nowIso,
          state: store.state,
        })
      : null
  if (built && !built.success) return createResultError(op, built.errorMessage)
  const updated = store.update(op, (draft) => {
    if (built?.success) {
      draft.orders.push(built.data.order)
      for (const ticket of built.data.tickets) draft.tickets.push(ticket)
      const target = draft.guests.find((candidate) => candidate.id === guestId)
      if (!target) throw new Error("Gast nicht gefunden.")
      const first = built.data.tickets[0]
      if (!first) throw new Error("Ticket fehlt.")
      target.ticketId = first.id
    }
    const linked = draft.guests.find((candidate) => candidate.id === guestId)
    if (!linked?.ticketId) throw new Error("Ticket fehlt.")
    const order = draft.orders.find((candidate) =>
      draft.tickets.some((ticket) => ticket.id === linked.ticketId && ticket.orderId === candidate.id),
    )
    if (!order) throw new Error("Bestellung nicht gefunden.")
    order.emails.push({ at: nowIso, to: email, kind: "tickets-gaesteliste" })
    const live = draft.events.find((candidate) => candidate.id === guest.eventId)
    if (!live) throw new Error("Event nicht gefunden.")
    dashAuditAdd(draft, {
      orgId: live.orgId,
      eventId: live.id,
      area: "gaesteliste",
      action: `Ticket an „${guest.name}“ gesendet`,
      before: null,
      after: email,
    })
  })
  if (!updated.success) return createResultError(op, "Das Ticket konnte nicht gesendet werden.")
  return createResult(undefined)
}
