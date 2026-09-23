import type { TicketContact } from "./TicketContact.ts"

export function ticketContactEmpty(): TicketContact {
  return { firstName: "", lastName: "", email: "", address: "", phone: "" }
}
