import type { TicketOrderSummary } from "./TicketOrderSummary.ts"

export type TicketOrderListPage = {
  readonly page: readonly TicketOrderSummary[]
  readonly isDone: boolean
  readonly continueCursor: string
  readonly splitCursor?: string | null
  readonly pageStatus?: "SplitRecommended" | "SplitRequired" | null
}
