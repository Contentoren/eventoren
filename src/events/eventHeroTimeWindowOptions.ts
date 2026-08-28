import type { EventHeroTimeWindowOption } from "./EventHeroTimeWindowOption.ts"

export const eventHeroTimeWindowOptions: readonly EventHeroTimeWindowOption[] = [
  { value: "heute", label: "Heute" },
  { value: "wochenende", label: "Dieses Wochenende" },
  { value: "monat", label: "Diesen Monat" },
  { value: "alle", label: "Gesamter Zeitraum" },
]
