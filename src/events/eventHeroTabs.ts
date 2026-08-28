import type { EventHeroTab } from "./EventHeroTab.ts"

export const eventHeroTabs: readonly EventHeroTab[] = [
  { id: "einzelevent", label: "Einzelevent", category: "konzerte" },
  { id: "festivalpass", label: "Festivalpass", category: "festivals" },
  { id: "alle", label: "Alle Kategorien", category: "alle" },
]
