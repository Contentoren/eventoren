import type { AdminTicketOrderDetails } from "./AdminTicketOrderDetails.ts"
import type { AdminTicketOrderSummary } from "./AdminTicketOrderSummary.ts"
import type { AdminTicketOrdersPageState } from "./AdminTicketOrdersPageState.ts"
import { adminTicketOrderBookingReference } from "./adminTicketOrderBookingReference.ts"

export function adminTicketOrderDrawerStateCreate(inputs: {
  readonly details: () => AdminTicketOrderDetails | null
  readonly summary: () => AdminTicketOrderSummary | null
  readonly paymentLabel: AdminTicketOrdersPageState["paymentLabel"]
  readonly paymentTone: AdminTicketOrdersPageState["paymentTone"]
}) {
  const source = () => inputs.details() ?? inputs.summary()

  return {
    title: () => {
      const order = source()
      if (!order) return "Bestellung"
      return `Bestellung ${adminTicketOrderBookingReference(order) ?? order.paymentReference}`
    },
    description: () => source()?.eventTitle,
    badge: () => {
      const summary = inputs.summary()
      const status = summary?.paymentStatus ?? inputs.details()?.paymentStatus
      if (status !== "pending" && status !== "paid" && status !== "failed" && status !== "expired") return null
      const label = inputs.paymentLabel(status, summary ?? undefined)
      if (!label) return null
      return { label, tone: inputs.paymentTone(status, summary ?? undefined) }
    },
  }
}
