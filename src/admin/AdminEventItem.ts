import type { EventItem } from "../events/EventItem.ts"

export type AdminEventItem = EventItem & {
  readonly status: "draft" | "published" | "archived"
}
