import { createMemo } from "solid-js"
import type { EventItem } from "./EventItem.ts"
import { eventCategoryLabels } from "./eventCategoryLabels.ts"
import { eventDateFormat } from "./eventDateFormat.ts"
import { eventDateParts } from "./eventDateParts.ts"
import { eventPriceFormat } from "./eventPriceFormat.ts"
import { eventPriceFrom } from "./eventPriceFrom.ts"
import { eventTimeFormat } from "./eventTimeFormat.ts"

export function eventCardStateCreate(inputs: { event: () => EventItem }) {
  const categoryLabel = createMemo(() => eventCategoryLabels[inputs.event().category] ?? inputs.event().category)
  const dateLabel = createMemo(() => eventDateFormat(inputs.event().startsAt))
  const dateParts = createMemo(() => eventDateParts(inputs.event().startsAt))
  const timeLabel = createMemo(() => eventTimeFormat(inputs.event().startsAt))
  const locationLabel = createMemo(() => `${inputs.event().venue}, ${inputs.event().city}`)
  const priceLabel = createMemo(() => `ab ${eventPriceFormat(eventPriceFrom(inputs.event()))}`)
  const priceValueLabel = createMemo(() => eventPriceFormat(eventPriceFrom(inputs.event())))
  const availableCount = createMemo(() => inputs.event().tiers.reduce((sum, tier) => sum + tier.available, 0))
  const isScarce = createMemo(() => !inputs.event().soldOut && availableCount() > 0 && availableCount() <= 30)
  const topTags = createMemo(() => inputs.event().tags.slice(0, 3))

  return {
    categoryLabel,
    dateLabel,
    dateParts,
    timeLabel,
    locationLabel,
    priceLabel,
    priceValueLabel,
    availableCount,
    isScarce,
    topTags,
  }
}
