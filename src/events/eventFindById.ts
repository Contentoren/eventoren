import { createResult } from "../ui/createResult.ts"
import { createResultError } from "../ui/createResultError.ts"
import type { Result } from "../ui/Result.ts"
import type { EventItem } from "./EventItem.ts"
import { eventListMock } from "./eventListMock.ts"

const op = "eventFindById"

export function eventFindById(eventId: string): Result<EventItem> {
  if (eventId.length === 0) return createResultError(op, "Es wurde keine Event-ID übergeben.", eventId)

  const event = eventListMock.find((candidate) => candidate.id === eventId)
  if (!event) return createResultError(op, `Es wurde kein Event mit der ID "${eventId}" gefunden.`, eventId)

  return createResult(event)
}
