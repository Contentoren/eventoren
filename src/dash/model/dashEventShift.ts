import type { DashEvent } from "./dashEventSchema.ts"
import type { DashTicketType } from "./dashTicketTypeSchema.ts"

export type DashEventShiftResult = {
  event: DashEvent
  ticketTypes: DashTicketType[]
}

function dashEventShiftIso(iso: string | null, deltaMs: number): string | null {
  if (iso === null) return null
  return new Date(Date.parse(iso) + deltaMs).toISOString()
}

/** Verschiebt alle Event-, Ticketart- und Phasenzeiten um dieselbe Differenz (ms). */
export function dashEventShift(
  event: DashEvent,
  ticketTypes: DashTicketType[],
  newStartsAt: string,
): DashEventShiftResult {
  const deltaMs = Date.parse(newStartsAt) - Date.parse(event.startsAt)
  return {
    event: {
      ...event,
      startsAt: newStartsAt,
      endsAt: new Date(Date.parse(event.endsAt) + deltaMs).toISOString(),
      doorsAt: dashEventShiftIso(event.doorsAt, deltaMs),
      boxOffice: { ...event.boxOffice, opensAt: dashEventShiftIso(event.boxOffice.opensAt, deltaMs) },
      reminder: { ...event.reminder, sentAt: dashEventShiftIso(event.reminder.sentAt, deltaMs) },
    },
    ticketTypes: ticketTypes.map((type) => ({
      ...type,
      salesStartAt: dashEventShiftIso(type.salesStartAt, deltaMs),
      salesEndAt: dashEventShiftIso(type.salesEndAt, deltaMs),
      archivedAt: dashEventShiftIso(type.archivedAt, deltaMs),
      phases: type.phases.map((phase) => ({ ...phase, endsAt: dashEventShiftIso(phase.endsAt, deltaMs) })),
    })),
  }
}
