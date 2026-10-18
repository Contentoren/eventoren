import { dashSettlementCompute } from "../../model/dashSettlementCompute.ts"
import type { DashPayout } from "../../model/dashPayoutSchema.ts"
import type { DashState } from "../../model/dashStateSchema.ts"

const payoutNumberSeed = ["4821", "5173", "6044"]

/**
 * Seedet Auszahlungen für beendete Events aus der Abrechnung.
 * Deterministisch: Referenz aus Event-Index und fester Nummernfolge.
 */
export function dashSeedPayoutsApply(state: DashState, now: Date): DashState {
  const nowMs = now.getTime()
  const payouts: DashPayout[] = [...state.payouts]
  const orgById = new Map(state.orgs.map((org) => [org.id, org]))

  const ended = state.events.filter((event) => Date.parse(event.endsAt) < nowMs)
  ended.forEach((event, eventIndex) => {
    const org = orgById.get(event.orgId)
    if (!org) return
    const settlement = dashSettlementCompute({
      event,
      ticketTypes: state.ticketTypes,
      orders: state.orders,
      tickets: state.tickets,
      org,
    })
    const dueAt = new Date(Date.parse(event.endsAt) + 3 * 86_400_000).toISOString()
    const readyAt = Date.parse(dueAt) + 86_400_000
    // ev-poetry-slam ist gerade 5 Tage her (dueAt+1d noch in der Zukunft): bewusst "bereit".
    const paid = readyAt < nowMs && event.id !== "ev-poetry-slam"
    payouts.push({
      id: `payout-${event.id}`,
      orgId: event.orgId,
      eventId: event.id,
      amountCents: settlement.payoutCents,
      status: paid ? "ausgezahlt" : "bereit",
      dueAt,
      paidAt: paid ? new Date(readyAt).toISOString() : null,
      reference: `AUS-2026-${payoutNumberSeed[eventIndex % payoutNumberSeed.length] ?? "4821"}`,
    })
  })

  return { ...state, payouts }
}
