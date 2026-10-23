export type OrganizerDashboardFinanceOrderAmounts = {
  readonly subtotalCents: number
  readonly feeCents: number
  readonly totalCents: number
  readonly feeSnapshot?: {
    readonly payer: "buyer" | "organizer"
    readonly platformFeeCents: number
    readonly organizerDeductionCents: number
  }
  /** Reverses only the organizer's net entitlement, not buyer-paid service fees. */
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
 * no floats, no rounding. Fees are organizer deductions only (normal PSP included).
 * Legacy feeCents was charged on top of subtotal: never infer a new organizer fee
 * from today's pricing. A dispute reverses the net entitlement exactly once.
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
    const deduction = order.feeSnapshot?.organizerDeductionCents ?? 0
    feeCents += deduction
    if (order.disputed) disputeCents += order.subtotalCents - deduction
  }
  return { paidOrders, grossCents, feeCents, disputeCents, payoutCents: grossCents - feeCents - disputeCents }
}
