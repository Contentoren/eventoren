import { v } from "convex/values"
import * as a from "valibot"
import { query } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import {
  organizerDashboardPublicEventFilterSchema,
  organizerDashboardPublicProfileFilterSchema,
} from "#src/organizer/dashboard/public/organizerDashboardPublicFilterSchema.ts"

export type OrganizerDashboardPublicProfile = {
  name: string
  slug: string
  kind: string
  contact: { email?: string; phone?: string }
  imprint?: string
  events: {
    eventKey: string
    title: string
    subtitle: string
    startsAt: string
    endsAt: string
    city: string
    venue: string
    imageUrl: string
    imageAlt: string
  }[]
}

export type OrganizerDashboardPublicEvent = {
  eventKey: string
  title: string
  subtitle: string
  description: string
  startsAt: string
  endsAt: string
  doorsAt: string
  venue: string
  city: string
  address: string
  organizer: string
  imageUrl: string
  imageAlt: string
  org: { name: string; slug: string }
  tiers: { tierKey: string; name: string; priceCents: number; capacity: number; sold: number }[]
}

/**
 * Public organizer profile from live data: no token, no demo store. Only
 * organizations with status aktiv; contact and imprint are the public fields.
 */
export const organizerDashboardPublicProfileQuery = query({
  args: { orgSlug: v.string() },
  handler: async (ctx, args): PromiseResult<OrganizerDashboardPublicProfile> => {
    const op = "organizerDashboardPublicProfileQuery"
    const filters = a.safeParse(organizerDashboardPublicProfileFilterSchema, args)
    if (!filters.success) return createResultError(op, a.summarize(filters.issues))
    const organization = await ctx.db
      .query("organizerDashboardOrganizations")
      .withIndex("slug", (q) => q.eq("profile.slug", filters.output.orgSlug))
      .unique()
    if (!organization || organization.status !== "aktiv") {
      return createResultError(op, "Veranstalter nicht gefunden")
    }
    const events = await ctx.db
      .query("catalogEvents")
      .withIndex("orgIdAndStatusAndStartsAt", (q) => q.eq("orgId", organization.orgId).eq("status", "published"))
      .collect()
    const upcoming = events
      .filter((event) => !event.deletedAt && event.endsAt >= new Date().toISOString())
      .sort((a, b) => (a.startsAt < b.startsAt ? -1 : 1))
      .slice(0, 50)
    return createResult({
      name: organization.profile.name,
      slug: organization.profile.slug,
      kind: organization.profile.kind,
      contact: {
        ...(organization.profile.contact?.email ? { email: organization.profile.contact.email } : {}),
        ...(organization.profile.contact?.phone ? { phone: organization.profile.contact.phone } : {}),
      },
      ...(organization.profile.imprint ? { imprint: organization.profile.imprint } : {}),
      events: upcoming.map((event) => ({
        eventKey: event.eventKey,
        title: event.title,
        subtitle: event.subtitle,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        city: event.city,
        venue: event.venue,
        imageUrl: event.imageUrl,
        imageAlt: event.imageAlt,
      })),
    })
  },
})

/**
 * Public event page from live data: no token, no demo store. Only published
 * events of active organizations, with live tier availability.
 */
export const organizerDashboardPublicEventQuery = query({
  args: { orgSlug: v.string(), eventKey: v.string() },
  handler: async (ctx, args): PromiseResult<OrganizerDashboardPublicEvent> => {
    const op = "organizerDashboardPublicEventQuery"
    const filters = a.safeParse(organizerDashboardPublicEventFilterSchema, args)
    if (!filters.success) return createResultError(op, a.summarize(filters.issues))
    const organization = await ctx.db
      .query("organizerDashboardOrganizations")
      .withIndex("slug", (q) => q.eq("profile.slug", filters.output.orgSlug))
      .unique()
    if (!organization || organization.status !== "aktiv") {
      return createResultError(op, "Veranstaltung nicht gefunden")
    }
    const event = await ctx.db
      .query("catalogEvents")
      .withIndex("eventKey", (q) => q.eq("eventKey", filters.output.eventKey))
      .unique()
    if (!event || event.deletedAt || event.orgId !== organization.orgId || event.status !== "published") {
      return createResultError(op, "Veranstaltung nicht gefunden")
    }
    const tiers = await ctx.db
      .query("catalogTicketTiers")
      .withIndex("eventIdAndArchivedAt", (q) => q.eq("eventId", event._id))
      .collect()
    const issued = await ctx.db
      .query("ticketIssued")
      .withIndex("eventKeyAndSequenceAndCode", (q) => q.eq("eventKey", event.eventKey))
      .take(20000)
    const live = issued.filter((ticket) => ticket.cancelled !== true)
    return createResult({
      eventKey: event.eventKey,
      title: event.title,
      subtitle: event.subtitle,
      description: event.description,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      doorsAt: event.doorsAt,
      venue: event.venue,
      city: event.city,
      address: event.address,
      organizer: event.organizer,
      imageUrl: event.imageUrl,
      imageAlt: event.imageAlt,
      org: { name: organization.profile.name, slug: organization.profile.slug },
      tiers: tiers
        .filter((tier) => tier.archivedAt === undefined)
        .map((tier) => ({
          tierKey: tier.tierKey,
          name: tier.name,
          priceCents: tier.priceCents,
          capacity: tier.capacity,
          sold: live.filter((ticket) => ticket.tierKey === tier.tierKey).length,
        })),
    })
  },
})
