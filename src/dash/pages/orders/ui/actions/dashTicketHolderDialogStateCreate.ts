import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { DashTicket } from "../../../../model/dashTicketSchema.ts"

/** Zustand für das Ticket-Umschreiben: Name/E-Mail mit Validierungsfehler, pro Ticket zurückgesetzt. */
export function dashTicketHolderDialogStateCreate(inputs: { ticket: () => DashTicket | null }) {
  const holderName = createSignalObject("")
  const holderEmail = createSignalObject("")
  const error = createSignalObject<string | null>(null)
  const pending = createSignalObject(false)

  const openReset = (ticketId: string | null) => {
    const ticket = inputs.ticket()
    if (ticketId === null || ticket === null || ticket.id !== ticketId) return
    holderName.set(ticket.holderName)
    holderEmail.set(ticket.holderEmail)
    error.set(null)
    pending.set(false)
  }

  return { holderName, holderEmail, error, pending, openReset }
}

export type DashTicketHolderDialogState = ReturnType<typeof dashTicketHolderDialogStateCreate>
