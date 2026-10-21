export type OrganizerDashboardFinanceOrderAmounts = {
  readonly subtotalCents: number
  readonly feeCents: number
  readonly totalCents: number
  /** SEPA dispute / failed async payment: the full order value is lost. */
  readonly disputed: boolean
}

export type OrganizerDashboardFinanceTotals = {
  readonly paidOrders: number
  readonly grossCents: number
  readonly feeCents: number
  readonly disputeCents: number
  readonly payoutCents: number
}

/**
 * Pure settlement math over paid orders. All amounts are integers in cents;
 * no floats, no rounding. Payout = gross − fees − disputed order values.
 */
export function organizerDashboardFinanceTotalsCreate(
  orders: readonly OrganizerDashboardFinanceOrderAmounts[],
): OrganizerDashboardFinanceTotals {
  let paidOrders = 0
  let grossCents = 0
  let feeCents = 0
  let disputeCents = 0
  for (const order of orders) {
    if (!Number.isInteger(order.subtotalCents) || !Number.isInteger(order.feeCents)) continue
    paidOrders += 1
    grossCents += order.subtotalCents
    feeCents += order.feeCents
    if (order.disputed) disputeCents += order.totalCents
  }
  return { paidOrders, grossCents, feeCents, disputeCents, payoutCents: grossCents - feeCents - disputeCents }
}
