import type { AdminTicketOrderSummary } from "./AdminTicketOrderSummary.ts"

export type AdminTicketOrderListPage = {
  readonly page: readonly AdminTicketOrderSummary[]
  readonly isDone: boolean
  readonly continueCursor: string
  readonly splitCursor?: string | null
  readonly pageStatus?: "SplitRecommended" | "SplitRequired" | null
}
