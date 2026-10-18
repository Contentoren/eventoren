import type { DashEvent } from "../../../model/dashEventSchema.ts"
import type { DashPayout } from "../../../model/dashPayoutSchema.ts"
import type { DashPayoutStatus } from "../../../model/dashPayoutStatusSchema.ts"

export type DashSettlementPayoutInfo = {
  status: DashPayoutStatus
  amountCents: number
  dueAt: string
  paidAt: string | null
  reference: string
  projected: boolean
}

/** Auszahlungsinfo eines Events: echte Auszahlung oder virtuelle Planung (fällig 3 Tage nach Eventende). */
export function dashSettlementPayoutInfo(args: {
  event: DashEvent
  payout: DashPayout | null
  payoutCents: number
}): DashSettlementPayoutInfo {
  const { event, payout, payoutCents } = args
  if (payout) {
    return {
      status: payout.status,
      amountCents: payout.amountCents,
      dueAt: payout.dueAt,
      paidAt: payout.paidAt,
      reference: payout.reference,
      projected: false,
    }
  }
  return {
    status: "geplant",
    amountCents: payoutCents,
    dueAt: new Date(Date.parse(event.endsAt) + 3 * 86_400_000).toISOString(),
    paidAt: null,
    reference: "–",
    projected: true,
  }
}
