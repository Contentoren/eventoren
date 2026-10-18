import { dashOrderTicketValue } from "./dashOrderTicketValue.ts"
import type { DashOrder } from "./dashOrderSchema.ts"

export function dashOrderTicketRefunds(order: DashOrder): number {
  const raw = order.refunds.reduce((sum, refund) => sum + refund.amountCents - (refund.feeCents ?? 0), 0)
  return Math.min(Math.max(0, raw), dashOrderTicketValue(order))
}
