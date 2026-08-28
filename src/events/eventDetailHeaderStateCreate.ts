import { createMemo } from "solid-js"
import type { EventItem } from "./EventItem.ts"
import { eventCategoryLabels } from "./eventCategoryLabels.ts"
import { eventDateFormat } from "./eventDateFormat.ts"
import { eventPriceFormat } from "./eventPriceFormat.ts"
import { eventPriceFrom } from "./eventPriceFrom.ts"
import { eventTimeFormat } from "./eventTimeFormat.ts"

export function eventDetailHeaderStateCreate(inputs: { event: () => EventItem }) {
  const categoryLabel = createMemo(() => eventCategoryLabels[inputs.event().category])
  const dateLabel = createMemo(() => eventDateFormat(inputs.event().startsAt))
  const timeLabel = createMemo(() => eventTimeFormat(inputs.event().startsAt))
  const doorsLabel = createMemo(() => `Einlass ${eventTimeFormat(inputs.event().doorsAt)}`)
  const locationLabel = createMemo(() => `${inputs.event().venue}, ${inputs.event().city}`)
  const priceLabel = createMemo(() => `ab ${eventPriceFormat(eventPriceFrom(inputs.event()))}`)

  return { categoryLabel, dateLabel, timeLabel, doorsLabel, locationLabel, priceLabel }
}
