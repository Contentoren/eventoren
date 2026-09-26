import type { EventItem } from "./EventItem.ts"

export function eventAvailableTicketsCount(
  event: Pick<EventItem, "tiers"> & { readonly status?: "draft" | "published" | "archived" },
): number {
  if (event.status && event.status !== "published") return 0
  return event.tiers.reduce((sum, tier) => sum + Math.max(0, tier.available), 0)
}
