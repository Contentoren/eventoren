import { adminTicketOrderBookingReference } from "./adminTicketOrderBookingReference.ts"

export function adminTicketOrderSearchMatches(
  order: {
    readonly customerEmail: string
    readonly customerGivenName?: string | null
    readonly customerFamilyName?: string | null
    readonly bookingReference?: string | null
    readonly bookingNumber?: number | null
    readonly paymentStatus: string
    readonly stripeMode: "live" | "test"
  },
  search: string,
): boolean {
  const term = search.trim().toLocaleLowerCase("de-DE")
  if (!term) return true
  const reference = adminTicketOrderBookingReference(order)?.toLocaleLowerCase("de-DE") ?? ""
  const name = [order.customerGivenName, order.customerFamilyName].filter(Boolean).join(" ").toLocaleLowerCase("de-DE")
  return (
    reference.includes(term) ||
    (reference.startsWith("test-") && reference.slice(5).includes(term)) ||
    order.customerEmail.toLocaleLowerCase("de-DE").includes(term) ||
    name.includes(term)
  )
}
