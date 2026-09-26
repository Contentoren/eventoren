export type TicketContact = {
  firstName: string
  lastName: string
  email: string
  billingKind: "person" | "company"
  companyName: string
  companyExtra: string
  taxId: string
  address: string
  addressLine2: string
  postalCode: string
  city: string
  country: string
  phone: string
}
