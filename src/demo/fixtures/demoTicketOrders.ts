import type { EventItem } from "../../events/EventItem.ts"
import type { EventTicketTier } from "../../events/EventTicketTier.ts"
import type { TicketOrderProjection } from "../../ticketing/TicketOrderProjection.ts"
import type { TicketOrderSummary } from "../../ticketing/TicketOrderSummary.ts"
import { demoCatalogEvents } from "./demoCatalogEvents.ts"

const paidOrder = orderCreate({
  id: "demo-order-paid",
  event: demoCatalogEvents[0]!,
  tierId: "innenraum",
  quantity: 2,
  paymentStatus: "paid",
  status: "paid",
  createdAt: "2026-09-13T16:20:00.000Z",
  contact: { givenName: "Alex", familyName: "Demo", email: "alex@example.test", phone: "" },
})

const pendingOrder = orderCreate({
  id: "demo-order-pending",
  event: demoCatalogEvents[1]!,
  tierId: "museum-standard",
  quantity: 1,
  paymentStatus: "pending",
  status: "checkout_created",
  createdAt: "2026-09-14T09:10:00.000Z",
  contact: { givenName: "Nina", familyName: "Beispiel", email: "nina@example.test", phone: "" },
  tickets: [],
})

const failedOrder = orderCreate({
  id: "demo-order-failed",
  event: demoCatalogEvents[3]!,
  tierId: "marathon-startplatz",
  quantity: 1,
  paymentStatus: "failed",
  status: "failed",
  createdAt: "2026-09-14T11:45:00.000Z",
  contact: { givenName: "Chris", familyName: "Demo", email: "chris@example.test", phone: "" },
  tickets: [],
})

export const demoTicketOrders = {
  summaries: [
    summaryCreate(paidOrder),
    summaryCreate(pendingOrder),
    summaryCreate(failedOrder),
  ] satisfies readonly TicketOrderSummary[],
  details: {
    [paidOrder.id]: paidOrder,
    [pendingOrder.id]: pendingOrder,
    [failedOrder.id]: failedOrder,
  } satisfies Record<string, TicketOrderProjection>,
}

function orderCreate(input: {
  id: string
  event: EventItem
  tierId: string
  quantity: number
  paymentStatus: TicketOrderProjection["paymentStatus"]
  status: TicketOrderProjection["status"]
  createdAt: string
  contact: TicketOrderProjection["contact"]
  tickets?: TicketOrderProjection["tickets"]
}): TicketOrderProjection {
  const event = input.event
  const tier: EventTicketTier = event.tiers.find((candidate) => candidate.id === input.tierId) ?? event.tiers[0]!
  const subtotalCents = tier.priceCents * input.quantity
  const feeCents = tier.feeCents * input.quantity
  const issuedAt = input.createdAt
  const tickets =
    input.tickets ??
    Array.from({ length: input.quantity }, (_, index) => ({
      id: `${input.id}-ticket-${index + 1}`,
      sequence: index + 1,
      code: `DEMO-${input.id}-${index + 1}`,
      eventKey: event.id,
      eventTitle: event.title,
      eventStartsAt: event.startsAt,
      eventDoorsAt: event.doorsAt,
      venue: event.venue,
      city: event.city,
      address: event.address,
      tierKey: tier.id,
      tierName: tier.name,
      priceCents: tier.priceCents,
      feeCents: tier.feeCents,
      participantName: `${input.contact.givenName} ${input.contact.familyName}`,
      issuedAt,
    }))

  return {
    id: input.id,
    checkoutKey: `${input.id}-checkout`,
    eventKey: event.id,
    eventTitle: event.title,
    eventSubtitle: event.subtitle,
    eventDescription: event.description,
    eventStartsAt: event.startsAt,
    eventEndsAt: event.endsAt,
    eventDoorsAt: event.doorsAt,
    venue: event.venue,
    city: event.city,
    address: event.address,
    organizer: event.organizer,
    imageUrl: event.imageUrl,
    imageAlt: event.imageAlt,
    catalogVersion: event.catalogVersion,
    contact: input.contact,
    subtotalCents,
    feeCents,
    totalCents: subtotalCents + feeCents,
    paymentReference: `${input.id}-payment`,
    stripeMode: "test",
    status: input.status,
    paymentStatus: input.paymentStatus,
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
    lines: [
      {
        tierKey: tier.id,
        tierName: tier.name,
        tierDescription: tier.description,
        quantity: input.quantity,
        priceCents: tier.priceCents,
        feeCents: tier.feeCents,
      },
    ],
    tickets,
  }
}

function summaryCreate(order: TicketOrderProjection): TicketOrderSummary {
  return {
    id: order.id,
    checkoutKey: order.checkoutKey,
    eventKey: order.eventKey,
    eventTitle: order.eventTitle,
    eventSubtitle: order.eventSubtitle,
    eventStartsAt: order.eventStartsAt,
    eventEndsAt: order.eventEndsAt,
    eventDoorsAt: order.eventDoorsAt,
    venue: order.venue,
    city: order.city,
    address: order.address,
    organizer: order.organizer,
    imageUrl: order.imageUrl,
    imageAlt: order.imageAlt,
    catalogVersion: order.catalogVersion,
    subtotalCents: order.subtotalCents,
    feeCents: order.feeCents,
    totalCents: order.totalCents,
    status: order.status,
    paymentStatus: order.paymentStatus,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  }
}
