export type OrganizerDashboardOverviewDaySale = {
  readonly day: string
  readonly grossCents: number
  readonly tickets: number
  readonly orders: number
}

export type OrganizerDashboardOverviewStats = {
  readonly revenueCents: number
  readonly tickets: number
  readonly orders: number
  readonly avgOrderCents: number
  readonly occupancyBps: number
  readonly deltas: {
    readonly revenue: number | null
    readonly tickets: number | null
    readonly orders: number | null
    readonly avgOrder: number | null
  }
  readonly series: readonly {
    readonly day: string
    readonly revenueCents: number
    readonly tickets: number
    readonly orders: number
  }[]
}

/**
 * Pure overview KPI math over Europe/Berlin day buckets. Totals and the
 * series come from the current window; deltas compare against the previous
 * window of equal length (null when the previous window is empty).
 * Occupancy is sold / capacity in basis points (0 when capacity is 0).
 */
export function organizerDashboardOverviewStatsCreate(args: {
  readonly days: readonly string[]
  readonly sales: readonly OrganizerDashboardOverviewDaySale[]
  readonly previous: readonly OrganizerDashboardOverviewDaySale[]
  readonly capacity: number
  readonly soldTickets: number
}): OrganizerDashboardOverviewStats {
  const { days, sales, previous, capacity, soldTickets } = args
  const byDay = new Map(days.map((day) => [day, { revenueCents: 0, tickets: 0, orders: 0 }]))
  for (const sale of sales) {
    const bucket = byDay.get(sale.day)
    if (!bucket) continue
    bucket.revenueCents += sale.grossCents
    bucket.tickets += sale.tickets
    bucket.orders += sale.orders
  }
  const totals = { revenueCents: 0, tickets: 0, orders: 0 }
  for (const bucket of byDay.values()) {
    totals.revenueCents += bucket.revenueCents
    totals.tickets += bucket.tickets
    totals.orders += bucket.orders
  }
  const previousTotals = { revenueCents: 0, tickets: 0, orders: 0 }
  for (const sale of previous) {
    previousTotals.revenueCents += sale.grossCents
    previousTotals.tickets += sale.tickets
    previousTotals.orders += sale.orders
  }
  const avgOrderCents = totals.orders === 0 ? 0 : Math.round(totals.revenueCents / totals.orders)
  const previousAvg = previousTotals.orders === 0 ? 0 : Math.round(previousTotals.revenueCents / previousTotals.orders)
  const delta = (current: number, before: number): number | null => (before === 0 ? null : (current - before) / before)
  return {
    revenueCents: totals.revenueCents,
    tickets: totals.tickets,
    orders: totals.orders,
    avgOrderCents,
    occupancyBps: capacity === 0 ? 0 : Math.round((soldTickets / capacity) * 10000),
    deltas: {
      revenue: delta(totals.revenueCents, previousTotals.revenueCents),
      tickets: delta(totals.tickets, previousTotals.tickets),
      orders: delta(totals.orders, previousTotals.orders),
      avgOrder: delta(avgOrderCents, previousAvg),
    },
    series: days.map((day) => ({ day, ...byDay.get(day)! })),
  }
}
