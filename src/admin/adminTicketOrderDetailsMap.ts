import type { EventorenTicketPaymentDetailsResponse } from "billing/contracts/eventorenTicketPaymentDetailsResponseSchema"
import type { AdminTicketOrderDetails } from "./AdminTicketOrderDetails.ts"

type AdminTicketOrderLocalDetails = Omit<AdminTicketOrderDetails, "stripeDetails" | "stripeError">

export function adminTicketOrderDetailsMap(
  local: AdminTicketOrderLocalDetails,
  billing:
    | { readonly success: true; readonly data: EventorenTicketPaymentDetailsResponse["data"] }
    | { readonly success: false; readonly errorMessage: string }
    | null,
): AdminTicketOrderDetails {
  if (!billing) return { ...local, stripeDetails: null, stripeError: null }
  if (!billing.success) return { ...local, stripeDetails: null, stripeError: billing.errorMessage }
  return {
    ...local,
    bookingNumber: local.bookingNumber ?? billing.data.bookingNumber ?? null,
    bookingReference: local.bookingReference ?? billing.data.bookingReference ?? null,
    stripeDetails: billing.data,
    stripeError: null,
  }
}
