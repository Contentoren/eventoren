import type { DashEvent } from "../../../model/dashEventSchema.ts"
import type { DashPayout } from "../../../model/dashPayoutSchema.ts"
import type { DashPayoutStatus } from "../../../model/dashPayoutStatusSchema.ts"

export type DashFinancePayoutRow = {
  eventId: string
  title: string
  endsAt: string
  amountCents: number
  dueAt: string
  status: DashPayoutStatus
  reference: string
  projected: boolean
}

/** Auszahlungszeilen der Org: echte Auszahlungen plus projizierte für Events mit Umsatz, neueste zuerst. */
export function dashFinancePayoutRows(args: {
  events: DashEvent[]
  payouts: DashPayout[]
  settlementPayout: (eventId: string) => number
  hasSales: (eventId: string) => boolean
}): DashFinancePayoutRow[] {
  const { events, payouts, settlementPayout, hasSales } = args
  const payoutByEvent = new Map(payouts.map((payout) => [payout.eventId, payout]))
  return events
    .filter((event) => hasSales(event.id))
    .map((event) => {
      const payout = payoutByEvent.get(event.id) ?? null
      if (payout) {
        return {
          eventId: event.id,
          title: event.title,
          endsAt: event.endsAt,
          amountCents: payout.amountCents,
          dueAt: payout.dueAt,
          status: payout.status,
          reference: payout.reference,
          projected: false,
        }
      }
      const dueAt = new Date(Date.parse(event.endsAt) + 3 * 86_400_000).toISOString()
      return {
        eventId: event.id,
        title: event.title,
        endsAt: event.endsAt,
        amountCents: settlementPayout(event.id),
        dueAt,
        status: "geplant" as DashPayoutStatus,
        reference: "–",
        projected: true,
      }
    })
    .sort((left, right) => (left.endsAt < right.endsAt ? 1 : left.endsAt > right.endsAt ? -1 : 0))
}
