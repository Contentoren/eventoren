import { createEffect, createMemo, createSignal } from "solid-js"
import { urlImage } from "../app/assets/urlImage.ts"
import type { EventFilter } from "./EventFilter.ts"
import type { EventTimeWindow } from "./EventTimeWindow.ts"
import { eventHeroKnockoutFrames } from "./eventHeroKnockoutFrames.ts"
import { eventHeroKnockoutTimingCreate } from "./eventHeroKnockoutTimingCreate.ts"
import { eventHeroQuickChips } from "./eventHeroQuickChips.ts"
import { eventHeroResultsAnchorId } from "./eventHeroResultsAnchorId.ts"
import { eventHeroTimeWindowOptions } from "./eventHeroTimeWindowOptions.ts"

export function eventHeroKnockoutStateCreate(inputs: {
  eventCount: () => number
  filter: () => EventFilter
  onFilterChange: (filter: EventFilter) => void
}) {
  const [term, setTerm] = createSignal(inputs.filter().query)
  const [city, setCity] = createSignal(inputs.filter().location)

  createEffect(() => {
    setTerm(inputs.filter().query)
  })

  createEffect(() => {
    setCity(inputs.filter().location)
  })

  const timing = eventHeroKnockoutTimingCreate(eventHeroKnockoutFrames.length)

  const layers = createMemo(() =>
    eventHeroKnockoutFrames.map((frame, index) => ({
      key: frame.image.path,
      imageUrl: urlImage(frame.image),
      origin: frame.origin,
      duration: timing.duration,
      delay: timing.delayAt(index),
    })),
  )

  /** Preloaded so the first cross-fade never shows an empty glyph. */
  const preloadUrls = createMemo(() => layers().map((layer) => layer.imageUrl))

  const eventCountLabel = createMemo(() =>
    inputs.eventCount() === 1 ? "1 Event verfügbar" : `${inputs.eventCount()} Events verfügbar`,
  )

  const activeTimeWindow = createMemo(() => inputs.filter().timeWindow)

  const chipActiveId = createMemo(() => {
    const { category, timeWindow } = inputs.filter()
    const match = eventHeroQuickChips.find((chip) => chip.category === category && chip.timeWindow === timeWindow)

    return match?.id ?? ""
  })

  const scrollToResults = () => {
    if (typeof document === "undefined") return

    const target = document.getElementById(eventHeroResultsAnchorId)
    if (!target) return

    target.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const changeTerm = (value: string) => setTerm(value)
  const changeCity = (value: string) => setCity(value)

  const selectTimeWindow = (timeWindow: EventTimeWindow) => {
    inputs.onFilterChange({ ...inputs.filter(), timeWindow })
  }

  const selectChip = (chipId: string) => {
    const chip = eventHeroQuickChips.find((candidate) => candidate.id === chipId)
    if (!chip) return

    const isActive = chipActiveId() === chip.id
    inputs.onFilterChange({
      ...inputs.filter(),
      category: isActive ? "alle" : chip.category,
      timeWindow: isActive ? "alle" : chip.timeWindow,
    })
    scrollToResults()
  }

  const submitSearch = () => {
    inputs.onFilterChange({
      ...inputs.filter(),
      query: term().trim(),
      location: city().trim(),
    })
    scrollToResults()
  }

  return {
    layers,
    preloadUrls,
    eventCountLabel,
    timeWindowOptions: () => eventHeroTimeWindowOptions,
    quickChips: () => eventHeroQuickChips,
    chipActiveId,
    activeTimeWindow,
    term,
    city,
    changeTerm,
    changeCity,
    selectTimeWindow,
    selectChip,
    submitSearch,
  }
}
