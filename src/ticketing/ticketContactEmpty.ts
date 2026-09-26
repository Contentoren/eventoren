import type { TicketContact } from "./TicketContact.ts"

export function ticketContactEmpty(): TicketContact {
  return {
    firstName: "",
    lastName: "",
    email: "",
    billingKind: "person",
    companyName: "",
    companyExtra: "",
    taxId: "",
    address: "",
    addressLine2: "",
    postalCode: "",
    city: "",
    country: "",
    phone: "",
  }
}
