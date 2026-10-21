import type { OrganizerDashboardMessageAudience } from "./organizerDashboardMessageSchema.ts"

export type OrganizerDashboardMessageRecipientTicket = {
  readonly tierKey: string
  readonly cancelled: boolean
  readonly checkedInAt: string | null | undefined
}

/**
 * Counts message recipients over the ticket holders of one event.
 * Cancelled tickets never count. `ticketarten` needs at least one tier key;
 * an empty tier list matches nobody instead of everybody.
 */
export function organizerDashboardMessageAudienceCount(
  audience: OrganizerDashboardMessageAudience,
  tickets: readonly OrganizerDashboardMessageRecipientTicket[],
): number {
  const live = tickets.filter((ticket) => !ticket.cancelled)
  switch (audience.type) {
    case "alle":
      return live.length
    case "ticketarten": {
      if (audience.tierKeys.length === 0) return 0
      const tiers = new Set(audience.tierKeys)
      return live.filter((ticket) => tiers.has(ticket.tierKey)).length
    }
    case "eingecheckt":
      return live.filter((ticket) => ticket.checkedInAt != null).length
    case "nicht-eingecheckt":
      return live.filter((ticket) => ticket.checkedInAt == null).length
  }
}
