import type { OrganizerDashboardAdmissionScanResult } from "./organizerDashboardAdmissionScanResultSchema.ts"

export type OrganizerDashboardAdmissionTierRow = {
  readonly tierKey: string
  readonly tierName: string
  readonly capacity: number
  readonly sold: number
  readonly checkedIn: number
  readonly cancelled: number
}

export type OrganizerDashboardAdmissionEntranceRow = {
  readonly entrance: string
  readonly checkedIn: number
  readonly rejected: number
}

export type OrganizerDashboardAdmissionRejectedRow = {
  readonly result: Exclude<OrganizerDashboardAdmissionScanResult, "ok">
  readonly count: number
}

export type OrganizerDashboardAdmissionStats = {
  readonly eventKey: string
  readonly byTier: OrganizerDashboardAdmissionTierRow[]
  readonly byEntrance: OrganizerDashboardAdmissionEntranceRow[]
  readonly rejected: OrganizerDashboardAdmissionRejectedRow[]
  readonly totals: { readonly sold: number; readonly checkedIn: number; readonly rejected: number }
}

type TicketRow = {
  readonly tierKey: string
  readonly cancelled?: boolean
  readonly checkedInAt?: string
}

type ScanRow = {
  readonly entrance: string
  readonly result: OrganizerDashboardAdmissionScanResult
}

/**
 * Pure projection for live admission stats: per ticket type sold/checked-in
 * plus per entrance and rejected-scan reasons. Instants stay UTC; Berlin
 * formatting happens in the UI.
 */
export function organizerDashboardAdmissionStatsCreate(inputs: {
  readonly eventKey: string
  readonly tiers: readonly { readonly tierKey: string; readonly tierName: string; readonly capacity: number }[]
  readonly tickets: readonly TicketRow[]
  readonly scans: readonly ScanRow[]
}): OrganizerDashboardAdmissionStats {
  const tierNameOf = new Map(inputs.tiers.map((tier) => [tier.tierKey, tier.tierName] as const))
  const capacityOf = new Map(inputs.tiers.map((tier) => [tier.tierKey, tier.capacity] as const))
  const byTier = new Map<string, { sold: number; checkedIn: number; cancelled: number }>()
  let sold = 0
  let checkedIn = 0
  for (const ticket of inputs.tickets) {
    const row = byTier.get(ticket.tierKey) ?? { sold: 0, checkedIn: 0, cancelled: 0 }
    if (ticket.cancelled === true) {
      row.cancelled += 1
    } else {
      row.sold += 1
      sold += 1
      if (ticket.checkedInAt !== undefined) {
        row.checkedIn += 1
        checkedIn += 1
      }
    }
    byTier.set(ticket.tierKey, row)
  }
  const entrances = new Map<string, { checkedIn: number; rejected: number }>()
  const rejected = new Map<Exclude<OrganizerDashboardAdmissionScanResult, "ok">, number>()
  let rejectedTotal = 0
  for (const scan of inputs.scans) {
    const row = entrances.get(scan.entrance) ?? { checkedIn: 0, rejected: 0 }
    if (scan.result === "ok") row.checkedIn += 1
    else {
      row.rejected += 1
      rejected.set(scan.result, (rejected.get(scan.result) ?? 0) + 1)
      rejectedTotal += 1
    }
    entrances.set(scan.entrance, row)
  }
  return {
    eventKey: inputs.eventKey,
    byTier: [...byTier.entries()].map(([tierKey, row]) => ({
      tierKey,
      tierName: tierNameOf.get(tierKey) ?? tierKey,
      capacity: capacityOf.get(tierKey) ?? 0,
      ...row,
    })),
    byEntrance: [...entrances.entries()].map(([entrance, row]) => ({ entrance, ...row })),
    rejected: [...rejected.entries()].map(([result, count]) => ({ result, count })),
    totals: { sold, checkedIn, rejected: rejectedTotal },
  }
}
