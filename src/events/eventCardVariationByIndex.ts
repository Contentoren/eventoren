import type { EventCardVariation } from "./EventCardVariation.ts"

const order: readonly EventCardVariation[] = ["glass", "ticket", "poster"]

/** The grid shows one design per position so all three can be compared side by side. */
export function eventCardVariationByIndex(index: number): EventCardVariation {
  return order[index % order.length] ?? "glass"
}
