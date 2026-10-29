import type { AdminEventOverviewPanelProps } from "./AdminEventOverviewPanelProps.ts"

export function adminEventOverviewSummaryCreate(
  tickets: readonly { readonly soldTicketCount: 0 | 1; readonly buyerKey: string | null }[],
  tiers: readonly { readonly capacity: number }[],
): NonNullable<AdminEventOverviewPanelProps["summary"]> {
  const buyers = new Set<string>()
  let paidValidTicketCount = 0
  for (const ticket of tickets) {
    if (ticket.soldTicketCount !== 1) continue
    paidValidTicketCount += 1
    if (ticket.buyerKey !== null) buyers.add(ticket.buyerKey)
  }
  // Treat the query's tier limit conservatively: a capped list may be incomplete.
  const capacity =
    tiers.length > 0 &&
    tiers.length < 100 &&
    tiers.every((tier) => Number.isSafeInteger(tier.capacity) && tier.capacity > 0)
      ? tiers.reduce((total, tier) => total + tier.capacity, 0)
      : undefined
  return {
    paidValidTicketCount,
    distinctBuyerCount: buyers.size,
    capacity: capacity !== undefined && Number.isSafeInteger(capacity) ? capacity : undefined,
  }
}
