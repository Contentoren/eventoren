import type { Doc } from "#convex/_generated/dataModel.js"
import type { OrganizerEvent } from "../OrganizerEvent.ts"

export function organizerEventProjectionCreate(event: Doc<"catalogEvents">): OrganizerEvent {
  return {
    id: event._id,
    eventKey: event.eventKey,
    title: event.title,
    imageUrl: event.imageUrl,
    imageVariants: event.imageVariants,
    imageAlt: event.imageAlt,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    doorsAt: event.doorsAt,
    status: event.status,
  }
}
