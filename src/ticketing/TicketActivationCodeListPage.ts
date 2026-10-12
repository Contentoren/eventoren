import type { TicketActivationCode } from "./TicketActivationCode.ts"

export type TicketActivationCodeListPage = {
  readonly page: readonly TicketActivationCode[]
  readonly continueCursor: string
  readonly isDone: boolean
  readonly pageStatus?: "SplitRecommended" | "SplitRequired" | null
  readonly splitCursor?: string | null
}
