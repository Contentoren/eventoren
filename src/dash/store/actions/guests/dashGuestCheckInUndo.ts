import { createResult, createResultError, type Result } from "#result"

import { dashTicketCheckInUndo } from "../dashTicketCheckInUndo.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"

/** Nimmt den Check-in eines Gasts zurück (Ticket-Check-in inklusive). */
export function dashGuestCheckInUndo(guestId: string, store: DashStore = dashStoreGet()): Result<void> {
  const op = "dashGuestCheckInUndo"
  const guest = store.state.guests.find((candidate) => candidate.id === guestId)
  if (!guest) return createResultError(op, "Gast nicht gefunden.")
  if (guest.checkedInAt === null) return createResultError(op, "Der Gast ist nicht eingecheckt.")
  if (guest.ticketId !== null) {
    const undone = dashTicketCheckInUndo(guest.ticketId, store)
    if (!undone.success) return createResultError(op, undone.errorMessage)
  }
  const updated = store.update(op, (draft) => {
    const target = draft.guests.find((candidate) => candidate.id === guestId)
    if (!target) throw new Error("Gast nicht gefunden.")
    target.checkedInAt = null
  })
  if (!updated.success) return createResultError(op, "Der Check-in konnte nicht zurückgenommen werden.")
  return createResult(undefined)
}
