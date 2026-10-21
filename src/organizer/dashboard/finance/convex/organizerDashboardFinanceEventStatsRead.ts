import type { DatabaseReader } from "#convex/_generated/server.js"
import type { Doc, Id } from "#convex/_generated/dataModel.js"
import { organizerDashboardBerlinDayOf } from "../organizerDashboardBerlinDay.ts"
import { organizerDashboardFinanceTotalsCreate } from "../organizerDashboardFinanceTotalsCreate.ts"

export type OrganizerDashboardFinanceEventStats = {
  event: Doc<"catalogEvents">
  paidOrders: number
  tickets: number
  checkedIn: number
  capacity: number
  grossCents: number
  feeCents: number
  disputeCents: number
  payoutCents: number
  recordedPayoutsCents: number
  remainingPayoutCents: number
  salesByDay: Map<string, { grossCents: number; tickets: number }>
  truncated: boolean
}

const MAX_ORDERS_PER_EVENT = 5000
const MAX_TICKETS_PER_EVENT = 20000

/** Paid-order and ticket aggregates for one org event. All money stays integer cents. */
export async function organizerDashboardFinanceEventStatsRead(
  ctx: { db: DatabaseReader },
  orgId: Id<"orgs">,
  event: Doc<"catalogEvents">,
): Promise<OrganizerDashboardFinanceEventStats> {
  const orders = await ctx.db
    .query("ticketOrders")
    .withIndex("orgIdAndEventKeyAndCreatedAt", (q) => q.eq("orgId", orgId).eq("eventKey", event.eventKey))
    .take(MAX_ORDERS_PER_EVENT)
  const truncated = orders.length >= MAX_ORDERS_PER_EVENT
  const paid = orders.filter((order) => order.status === "paid" && order.orgId === orgId)
  const totals = organizerDashboardFinanceTotalsCreate(
    paid.map((order) => ({
      subtotalCents: order.subtotalCents,
      feeCents: order.feeCents,
      totalCents: order.totalCents,
      disputed: order.cancellation !== undefined,
    })),
  )

  const issued = await ctx.db
    .query("ticketIssued")
    .withIndex("eventKeyAndSequenceAndCode", (q) => q.eq("eventKey", event.eventKey))
    .take(MAX_TICKETS_PER_EVENT)
  const live = issued.filter((ticket) => ticket.cancelled !== true)
  const checkedIn = live.filter((ticket) => ticket.checkedInAt !== undefined).length

  const tiers = await ctx.db
    .query("catalogTicketTiers")
    .withIndex("eventIdAndArchivedAt", (q) => q.eq("eventId", event._id))
    .collect()
  const capacity = tiers.filter((tier) => tier.archivedAt === undefined).reduce((sum, tier) => sum + tier.capacity, 0)

  const payouts = await ctx.db
    .query("organizerDashboardPayouts")
    .withIndex("orgIdAndEventKeyAndCreatedAt", (q) => q.eq("orgId", orgId).eq("eventKey", event.eventKey))
    .collect()
  const recordedPayoutsCents = payouts.reduce((sum, payout) => sum + payout.amountCents, 0)

  const salesByDay = new Map<string, { grossCents: number; tickets: number }>()
  for (const order of paid) {
    const day = organizerDashboardBerlinDayOf(order.paidAt ?? order.createdAt)
    if (!day) continue
    const bucket = salesByDay.get(day) ?? { grossCents: 0, tickets: 0 }
    bucket.grossCents += order.subtotalCents
    salesByDay.set(day, bucket)
  }
  // Ticket counts per day come from issued tickets keyed by their order's day.
  const paidDayByOrderId = new Map(
    paid.map((order) => [String(order._id), organizerDashboardBerlinDayOf(order.paidAt ?? order.createdAt)]),
  )
  for (const ticket of live) {
    const day = paidDayByOrderId.get(String(ticket.orderId))
    if (!day) continue
    const bucket = salesByDay.get(day) ?? { grossCents: 0, tickets: 0 }
    bucket.tickets += 1
    salesByDay.set(day, bucket)
  }

  return {
    event,
    paidOrders: totals.paidOrders,
    tickets: live.length,
    checkedIn,
    capacity,
    grossCents: totals.grossCents,
    feeCents: totals.feeCents,
    disputeCents: totals.disputeCents,
    payoutCents: totals.payoutCents,
    recordedPayoutsCents,
    remainingPayoutCents: totals.payoutCents - recordedPayoutsCents,
    salesByDay,
    truncated: truncated || issued.length >= MAX_TICKETS_PER_EVENT,
  }
}
