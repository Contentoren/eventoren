import type { EventItem } from "./EventItem.ts"
import { eventAvailableTicketsCount } from "./eventAvailableTicketsCount.ts"

export function eventListAvailableTicketsCount(
  events: readonly (Pick<EventItem, "tiers"> & { readonly status?: "draft" | "published" | "archived" })[],
): number {
  return events.reduce((sum, event) => sum + eventAvailableTicketsCount(event), 0)
}
