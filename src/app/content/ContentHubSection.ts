import type { ContentCard } from "./ContentCard.ts"

/** One category section on a hub page; `id` is the anchor target of the jump-nav. */
export type ContentHubSection = {
  readonly id: string
  readonly label: string
  readonly cards: readonly ContentCard[]
}
