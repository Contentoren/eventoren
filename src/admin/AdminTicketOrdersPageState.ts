import type { Accessor } from "solid-js"
import type { AdminTicketOrderSummary } from "./AdminTicketOrderSummary.ts"

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
}
