import type { AdminTicketOrderDetails } from "./AdminTicketOrderDetails.ts"

export type AdminTicketOrderBillingDetails = Pick<
  AdminTicketOrderDetails,
  "bookingNumber" | "bookingReference" | "stripeDetails" | "stripeError"
>
