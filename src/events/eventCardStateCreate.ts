import { createMemo } from "solid-js"
import type { EventItem } from "./EventItem.ts"
import { eventCategoryLabels } from "./eventCategoryLabels.ts"
import { eventDateFormat } from "./eventDateFormat.ts"
import { eventPriceFormat } from "./eventPriceFormat.ts"
import { eventPriceFrom } from "./eventPriceFrom.ts"
import { eventTimeFormat } from "./eventTimeFormat.ts"

export function eventCardStateCreate(inputs: { event: () => EventItem }) {
  const categoryLabel = createMemo(() => eventCategoryLabels[inputs.event().category])
  const dateLabel = createMemo(() => eventDateFormat(inputs.event().startsAt))
  const timeLabel = createMemo(() => eventTimeFormat(inputs.event().startsAt))
  const locationLabel = createMemo(() => `${inputs.event().venue}, ${inputs.event().city}`)
  const priceLabel = createMemo(() => `ab ${eventPriceFormat(eventPriceFrom(inputs.event()))}`)
  const availableCount = createMemo(() => inputs.event().tiers.reduce((sum, tier) => sum + tier.available, 0))
  const isScarce = createMemo(() => !inputs.event().soldOut && availableCount() > 0 && availableCount() <= 30)

  return { categoryLabel, dateLabel, timeLabel, locationLabel, priceLabel, availableCount, isScarce }
}
