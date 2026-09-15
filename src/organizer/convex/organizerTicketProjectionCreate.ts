import type { Doc } from "#convex/_generated/dataModel.js"

type ContactSnapshot = {
  givenName?: string
  familyName?: string
}

export function organizerTicketProjectionCreate(
  ticket: Doc<"ticketIssued">,
  order: Doc<"ticketOrders">,
  event: Doc<"catalogEvents">,
) {
  const snapshot = contactSnapshotRead(order.contactSnapshotJson)
  const buyerGivenName = order.customerGivenName ?? snapshot.givenName ?? ""
  const buyerFamilyName = order.customerFamilyName ?? snapshot.familyName ?? ""
  const buyerName = [buyerGivenName, buyerFamilyName].filter((name) => name.length > 0).join(" ")
  const hasParticipantName = ticket.participantName !== undefined && ticket.participantName.trim().length > 0
  const participantName = hasParticipantName ? (ticket.participantName ?? "") : buyerName

  return {
    id: ticket._id,
    ticketNumber: ticket.code,
    code: ticket.code,
    sequence: ticket.sequence,
    eventId: event._id,
    eventKey: event.eventKey,
    eventTitle: event.title,
    imageUrl: event.imageUrl,
    imageAlt: event.imageAlt,
    eventStartsAt: event.startsAt,
    eventEndsAt: event.endsAt,
    eventDoorsAt: event.doorsAt,
    tierKey: ticket.tierKey,
    tierName: ticket.tierName,
    priceCents: ticket.priceCents,
    priceEur: ticket.priceCents / 100,
    feeCents: ticket.feeCents,
    participantName,
    participantNameSource: hasParticipantName ? ("participant" as const) : ("buyer" as const),
    buyerName,
    buyerGivenName,
    buyerFamilyName,
    buyerEmail: order.customerEmail,
    paymentStatus: order.paymentStatus,
    orderStatus: order.status,
    cancelled: ticket.cancelled ?? false,
    checkedIn: ticket.checkedInAt !== undefined,
    checkedInAt: ticket.checkedInAt ?? null,
    checkedInBy: ticket.checkedInBy ?? null,
    checkedInByName: ticket.checkedInByName ?? null,
    checkIn: {
      status: ticket.checkedInAt !== undefined ? ("checked-in" as const) : ("not-checked-in" as const),
      at: ticket.checkedInAt ?? null,
      operatorId: ticket.checkedInBy ?? null,
      operatorName: ticket.checkedInByName ?? null,
    },
    issuedAt: ticket.issuedAt,
  }
}

function contactSnapshotRead(value: string): ContactSnapshot {
  try {
    const parsed: unknown = JSON.parse(value)
    if (!isRecord(parsed)) return {}
    return {
      ...(typeof parsed.givenName === "string" ? { givenName: parsed.givenName.trim() } : {}),
      ...(typeof parsed.familyName === "string" ? { familyName: parsed.familyName.trim() } : {}),
    }
  } catch {
    return {}
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
