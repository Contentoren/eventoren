import type { EventHeroQuickChip } from "./EventHeroQuickChip.ts"

export const eventHeroQuickChips: readonly EventHeroQuickChip[] = [
  { id: "heute", label: "Heute Abend", category: "alle", timeWindow: "heute" },
  { id: "wochenende", label: "Dieses Wochenende", category: "alle", timeWindow: "wochenende" },
  { id: "konzerte", label: "Konzerte", category: "konzerte", timeWindow: "alle" },
  { id: "festivals", label: "Festivals", category: "festivals", timeWindow: "alle" },
  { id: "kultur", label: "Kultur", category: "kultur", timeWindow: "alle" },
  { id: "sport", label: "Sport", category: "sport", timeWindow: "alle" },
]
