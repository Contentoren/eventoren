import { createMemo } from "solid-js"
import { eventHeroPartners } from "./eventHeroPartners.ts"
import { eventHeroPartnersByKind } from "./eventHeroPartnersByKind.ts"
import { eventHeroPillars } from "./eventHeroPillars.ts"

export function eventHeroStateCreate(inputs: { eventCount: () => number }) {
  const eventCountLabel = createMemo(() =>
    inputs.eventCount() === 1 ? "1 Event verfügbar" : `${inputs.eventCount()} Events verfügbar`,
  )

  const organizers = createMemo(() => eventHeroPartnersByKind(eventHeroPartners, "veranstalter"))
  const transports = createMemo(() => eventHeroPartnersByKind(eventHeroPartners, "transport"))

  return {
    eventCountLabel,
    pillars: () => eventHeroPillars,
    organizers,
    transports,
  }
}
