import type { Doc } from "#convex/_generated/dataModel.js"

export type OrganizerDashboardEventSummary = {
  eventId: Doc<"catalogEvents">["_id"]
  eventKey: string
  orgId: string
  title: string
  subtitle: string
  description: string
  category: string
  startsAt: string
  endsAt: string
  doorsAt: string
  bookingOpensAt?: string
  venue: string
  city: string
  address: string
  organizer: string
  imageUrl: string
  imageAlt: string
  tags: string[]
  status: "draft" | "published" | "archived"
  catalogVersion: number
  eventRevision: number
  createdAt: string
  updatedAt: string
}

export function organizerDashboardEventSummaryCreate(event: Doc<"catalogEvents">): OrganizerDashboardEventSummary {
  return {
    eventId: event._id,
    eventKey: event.eventKey,
    orgId: String(event.orgId),
    title: event.title,
    subtitle: event.subtitle,
    description: event.description,
    category: event.category,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    doorsAt: event.doorsAt,
    ...(event.bookingOpensAt === undefined ? {} : { bookingOpensAt: event.bookingOpensAt }),
    venue: event.venue,
    city: event.city,
    address: event.address,
    organizer: event.organizer,
    imageUrl: event.imageUrl,
    imageAlt: event.imageAlt,
    tags: event.tags,
    status: event.status,
    catalogVersion: event.catalogVersion,
    eventRevision: event.eventRevision ?? 1,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  }
}
