export type TicketRequiredFieldKey =
  | "firstName"
  | "lastName"
  | "email"
  | "address"
  | `participant:${string}:${string}:${number}`
