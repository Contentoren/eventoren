import type { DashEvent } from "../../../model/dashEventSchema.ts"
import type { DashFaqItem } from "../../../model/dashFaqItemSchema.ts"
import type { DashScheduleItem } from "../../../model/dashScheduleItemSchema.ts"
import type { DashState } from "../../../model/dashStateSchema.ts"
import type { EventFaqItem } from "#src/events/EventFaqItem.ts"
import type { EventItem } from "#src/events/EventItem.ts"
import type { EventScheduleItem } from "#src/events/EventScheduleItem.ts"
import type { EventTicketTier } from "#src/events/EventTicketTier.ts"
import { dashEventCategoryLabel } from "#src/dash/pages/events/model/dashEventListFilter.ts"
import { dashFeeCompute } from "../../../model/dashFeeCompute.ts"
import { dashPhaseResolve } from "../../../model/dashPhaseResolve.ts"
import { dashTicketTypeSales } from "../../../model/dashTicketTypeSales.ts"

/** Mapt ein Dashboard-Event auf ein EventItem der Produktions-Eventseite. */
export function dashEventToEventItem(
  state: Pick<DashState, "orgs" | "ticketTypes" | "orders" | "tickets">,
  event: DashEvent,
  now: Date,
  unlockedTypeIds: readonly string[] = [],
): EventItem {
  const org = state.orgs.find((candidate) => candidate.id === event.orgId) ?? null
  const unlocked = new Set(unlockedTypeIds)
  const fee = org?.fee ?? { percentBps: 500, fixedCents: 49, payer: "kaeufer" as const }
  const tiers = state.ticketTypes
    .filter(
      (type) =>
        type.eventId === event.id &&
        type.channel === "online" &&
        type.archivedAt === null &&
        (!type.hidden || unlocked.has(type.id)),
    )
    .toSorted((left, right) => left.sortOrder - right.sortOrder)
    .map((type): EventTicketTier | null => {
      const sales = dashTicketTypeSales({ ticketType: type, orders: state.orders, tickets: state.tickets })
      const resolved = dashPhaseResolve(type, sales.soldByPhase, now)
      if (!resolved.phase) return null
      const priceCents = resolved.phase.priceCents
      const computed = dashFeeCompute({ priceCents, fee })
      return {
        id: type.id,
        name: type.name,
        description: type.description,
        priceCents,
        feeCents: fee.payer === "kaeufer" ? computed.feeCents : 0,
        capacity: type.capacity,
        available: Math.min(sales.available, resolved.remainingInPhase ?? sales.available),
        maxPerOrder: type.maxPerOrder,
      }
    })
    .filter((tier) => tier !== null)
  const totalAvailable = tiers.reduce((sum, tier) => sum + tier.available, 0)
  const tags = [dashEventCategoryLabel(event.category), event.venue.city].filter(
    (tag, index, all) => tag.trim() !== "" && all.indexOf(tag) === index,
  )
  return {
    id: event.id,
    catalogVersion: 1,
    title: event.title,
    subtitle: event.subtitle,
    description: event.description,
    category: dashEventCategoryLabel(event.category),
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    doorsAt: event.doorsAt ?? event.startsAt,
    venue: event.venue.name,
    city: event.venue.city,
    address: `${event.venue.street}, ${event.venue.zip} ${event.venue.city}`,
    organizer: org?.name ?? "",
    imageUrl: event.imageUrl,
    imageAlt: event.imageAlt,
    tags,
    soldOut: totalAvailable === 0,
    tiers,
  }
}

/** Mapt Dashboard-FAQs auf die Antwortliste der Produktions-Eventseite. */
export function dashEventToFaqItems(faq: readonly DashFaqItem[]): readonly EventFaqItem[] {
  return faq.map((item) => ({ id: item.id, question: item.question, answer: item.answer }))
}

/** Mapt Dashboard-Ablaufpunkte auf die Zeitliste der Produktions-Eventseite. */
export function dashEventToScheduleItems(schedule: readonly DashScheduleItem[]): readonly EventScheduleItem[] {
  return schedule.map((item) => ({
    marker: `${item.time} Uhr`,
    title: item.title,
    detail: item.detail === "" ? undefined : item.detail,
  }))
}
