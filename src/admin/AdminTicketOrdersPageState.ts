import type { Accessor } from "solid-js"
import type { AdminTicketOrderSummary } from "./AdminTicketOrderSummary.ts"
import type { AdminTicketOrderDetails } from "./AdminTicketOrderDetails.ts"

export type AdminTicketOrdersPageState = {
  readonly customerName: (order: AdminTicketOrderSummary) => string
  readonly dateFormat: (value: string) => string
  readonly errorMessage: Accessor<string>
  readonly isDone: Accessor<boolean>
  readonly isLoading: Accessor<boolean>
  readonly loadMore: () => Promise<void>
  readonly orders: Accessor<readonly AdminTicketOrderSummary[]>
  readonly paymentLabel: (status: AdminTicketOrderSummary["paymentStatus"]) => string | undefined
  readonly paymentTone: (status: AdminTicketOrderSummary["paymentStatus"]) => "success" | "warning" | "danger"
  readonly priceFormat: (cents: number) => string
  readonly reload: () => void
  readonly details: Accessor<AdminTicketOrderDetails | null>
  readonly selectedOrderId: Accessor<string | null>
  readonly detailsError: Accessor<string>
  readonly detailsLoading: Accessor<boolean>
  readonly orderOpen: (orderId: string) => Promise<void>
  readonly orderClose: () => void
}
