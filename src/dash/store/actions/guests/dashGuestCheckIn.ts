import { createResult, createResultError, type Result } from "#result"

import { dashTicketCheckIn } from "../dashTicketCheckIn.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"

/** Checkt einen Gast ein – mit Ticket über den Ticket-Check-in, sonst nur den Gast. */
export function dashGuestCheckIn(guestId: string, store: DashStore = dashStoreGet()): Result<void> {
  const op = "dashGuestCheckIn"
  const guest = store.state.guests.find((candidate) => candidate.id === guestId)
  if (!guest) return createResultError(op, "Gast nicht gefunden.")
  if (guest.checkedInAt !== null) return createResultError(op, "Der Gast ist bereits eingecheckt.")
  if (guest.ticketId !== null) return dashTicketCheckInApi(guestId, guest.ticketId, store)
  const nowIso = new Date().toISOString()
  const updated = store.update(op, (draft) => {
    const target = draft.guests.find((candidate) => candidate.id === guestId)
    if (!target) throw new Error("Gast nicht gefunden.")
    target.checkedInAt = nowIso
  })
  if (!updated.success) return createResultError(op, "Der Check-in konnte nicht gespeichert werden.")
  return createResult(undefined)
}

function dashTicketCheckInApi(guestId: string, ticketId: string, store: DashStore): Result<void> {
  const op = "dashGuestCheckIn"
  const checked = dashTicketCheckIn(ticketId, "Haupteingang", store)
  if (!checked.success) return createResultError(op, checked.errorMessage)
  const ticket = store.state.tickets.find((candidate) => candidate.id === ticketId)
  const at = ticket?.checkedInAt ?? new Date().toISOString()
  const updated = store.update(op, (draft) => {
    const target = draft.guests.find((candidate) => candidate.id === guestId)
    if (!target) throw new Error("Gast nicht gefunden.")
    target.checkedInAt = at
  })
  if (!updated.success) return createResultError(op, "Der Check-in konnte nicht gespeichert werden.")
  return createResult(undefined)
}
