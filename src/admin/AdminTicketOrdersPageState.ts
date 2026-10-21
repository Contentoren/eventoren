import type { Accessor } from "solid-js"
import type { AdminEventItem } from "./AdminEventItem.ts"
import type { AdminTicketOrderDetails } from "./AdminTicketOrderDetails.ts"
import type { AdminTicketOrderSummary } from "./AdminTicketOrderSummary.ts"
import type { AdminTicketOrderStatusFilter } from "./adminTicketOrderStatusKey.ts"
import type { AdminTicketOrdersSortBy, AdminTicketOrdersSortOrder } from "./adminTicketOrdersSort.ts"

export type AdminTicketOrdersPageState = {
  readonly customerName: (order: AdminTicketOrderSummary) => string
  readonly dateFormat: (value: string) => string
  readonly errorMessage: Accessor<string>
  readonly isDone: Accessor<boolean>
  readonly isLoading: Accessor<boolean>
  readonly loadMore: () => Promise<void>
  readonly orders: Accessor<readonly AdminTicketOrderSummary[]>
  readonly totals: Accessor<{ readonly ticketCount: number; readonly totalCents: number }>
  readonly ticketCapacities: Accessor<
    readonly { readonly id: string; readonly title: string; readonly ticketCount: number }[]
  >
  readonly baseOrders: Accessor<readonly AdminTicketOrderSummary[]>
  readonly sortBy: Accessor<AdminTicketOrdersSortBy>
  readonly sortOrder: Accessor<AdminTicketOrdersSortOrder>
  readonly sortToggle: (sortBy: AdminTicketOrdersSortBy) => void
  readonly statusFilter: {
    readonly get: () => AdminTicketOrderStatusFilter
    readonly set: (status: AdminTicketOrderStatusFilter) => void
  }
  readonly statusCounts: Accessor<Record<AdminTicketOrderStatusFilter, number>>
  readonly eventSignal: { readonly get: () => string; readonly set: (event: string) => void }
  readonly searchInput: { readonly get: () => string; readonly set: (value: string) => void }
  readonly searchQuery: Accessor<string>
  readonly searchSubmit: (event?: Event) => void
  readonly bookingReference: (order: AdminTicketOrderSummary) => string | undefined
  readonly eventOptions: () => { readonly type: "item"; readonly value: string }[]
  readonly eventText: (event: string) => string
  readonly eventForOrder: (order: AdminTicketOrderSummary) => AdminEventItem | undefined
  readonly paymentLabel: (
    status: AdminTicketOrderSummary["paymentStatus"],
    order?: AdminTicketOrderSummary,
  ) => string | undefined
  readonly paymentTone: (
    status: AdminTicketOrderSummary["paymentStatus"],
    order?: AdminTicketOrderSummary,
  ) => "success" | "warning" | "danger" | "brand"
  readonly priceFormat: (cents: number) => string
  readonly reload: () => void
  readonly details: Accessor<AdminTicketOrderDetails | null>
  readonly selectedOrderId: Accessor<string | null>
  readonly detailsError: Accessor<string>
  readonly detailsLoading: Accessor<boolean>
  readonly orderOpen: (orderId: string) => Promise<void>
  readonly orderClose: () => void
  readonly availableTicketsCount: Accessor<number>
  readonly availableTicketsLabel: Accessor<string>
  readonly availableTicketsForOrder: (order: AdminTicketOrderSummary) => number | undefined
  readonly availableTicketsLabelForOrder: (order: AdminTicketOrderSummary) => string | undefined
  readonly ticketCountFormat: (count: number) => string
}
