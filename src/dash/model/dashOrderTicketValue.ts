import type { DashOrder } from "./dashOrderSchema.ts"

export function dashOrderTicketValue(order: DashOrder): number {
  const lines = order.lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0)
  return Math.max(0, lines - (order.discount?.amountCents ?? 0))
}
