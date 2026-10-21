import type { CatalogEventFaqs } from "#src/catalog/catalogEventFaqsSchema.ts"
import type { CatalogEventSchedule } from "#src/catalog/catalogEventScheduleSchema.ts"
import type { Doc } from "#convex/_generated/dataModel.js"
import type { OrganizerDashboardEventSummary } from "#src/organizer/dashboard/events/model/organizerDashboardEventSummaryCreate.ts"
import { organizerDashboardEventSummaryCreate } from "#src/organizer/dashboard/events/model/organizerDashboardEventSummaryCreate.ts"

export type OrganizerDashboardEventTierSummary = {
  tierKey: string
  name: string
  description: string
  startsAt: string
  doorsAt: string
  endsAt: string
  priceCents?: number
  feeCents?: number
  capacity: number
  reserved: number
  sold: number
  available: number
  archivedAt?: string
  sortOrder: number
}

export type OrganizerDashboardEventDetail = OrganizerDashboardEventSummary & {
  faqs?: CatalogEventFaqs
  schedule?: CatalogEventSchedule
  tiers: readonly OrganizerDashboardEventTierSummary[]
  tierOverflow: boolean
}

const organizerDashboardTierOverflowLimit = 50

export function organizerDashboardEventDetailCreate(
  event: Doc<"catalogEvents">,
  tiers: readonly Doc<"catalogTicketTiers">[],
  includeFinancials: boolean,
): OrganizerDashboardEventDetail {
  // Retired products remain visible to organizers with their sold inventory;
  // public catalog projections independently exclude them from sale.
  const ordered = [...tiers].sort(
    (left, right) =>
      Number(left.archivedAt !== undefined) - Number(right.archivedAt !== undefined) ||
      left.sortOrder - right.sortOrder,
  )
  const overLimit = ordered.length > organizerDashboardTierOverflowLimit
  const visible = (overLimit ? ordered.slice(0, organizerDashboardTierOverflowLimit) : ordered).map(
    (tier): OrganizerDashboardEventTierSummary => ({
      tierKey: tier.tierKey,
      name: tier.name,
      description: tier.description,
      startsAt: tier.startsAt ?? event.startsAt,
      doorsAt: tier.doorsAt ?? event.doorsAt,
      endsAt: tier.endsAt ?? event.endsAt,
      ...(includeFinancials ? { priceCents: tier.priceCents, feeCents: tier.feeCents } : {}),
      capacity: tier.capacity,
      reserved: tier.reserved,
      sold: tier.sold,
      available: tier.archivedAt === undefined ? Math.max(0, tier.capacity - tier.sold) : 0,
      ...(tier.archivedAt === undefined ? {} : { archivedAt: tier.archivedAt }),
      sortOrder: tier.sortOrder,
    }),
  )
  return {
    ...organizerDashboardEventSummaryCreate(event),
    ...(event.faqs === undefined ? {} : { faqs: event.faqs }),
    ...(event.schedule === undefined ? {} : { schedule: event.schedule }),
    tiers: visible,
    tierOverflow: overLimit,
  }
}
