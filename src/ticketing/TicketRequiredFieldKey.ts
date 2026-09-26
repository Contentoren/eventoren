export type TicketRequiredFieldKey =
  | "firstName"
  | "lastName"
  | "email"
  | "address"
  | "postalCode"
  | "city"
  | "country"
  | "companyName"
  | "taxId"
  | `participant:${string}:${string}:${number}`
