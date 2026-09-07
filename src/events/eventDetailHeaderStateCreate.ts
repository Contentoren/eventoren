import { createMemo } from "solid-js"
import type { EventItem } from "./EventItem.ts"
import { eventCategoryLabels } from "./eventCategoryLabels.ts"
import { eventDateFormatLong } from "./eventDateFormatLong.ts"
import { eventPriceFormat } from "./eventPriceFormat.ts"
import { eventPriceFrom } from "./eventPriceFrom.ts"
import { eventTimeFormat } from "./eventTimeFormat.ts"

export function eventDetailHeaderStateCreate(inputs: { event: () => EventItem }) {
  const categoryLabel = createMemo(() => eventCategoryLabels[inputs.event().category])

  const totalAvailable = createMemo(() => inputs.event().tiers.reduce((sum, tier) => sum + tier.available, 0))
  const isSoldOut = createMemo(() => inputs.event().soldOut || totalAvailable() === 0)
  const isScarce = createMemo(() => !isSoldOut() && totalAvailable() > 0 && totalAvailable() <= 15)
  const scarcityLabel = createMemo(() => `Nur noch ${totalAvailable()} Tickets`)

  const dateFormatted = createMemo(() => eventDateFormatLong(inputs.event().startsAt))
  const timeFormatted = createMemo(() => {
    const event = inputs.event()
    if (event.doorsAt) {
      return `Einlass ${eventTimeFormat(event.doorsAt)} · Beginn ${eventTimeFormat(event.startsAt)}`
    }
    return `Beginn ${eventTimeFormat(event.startsAt)}`
  })
  const locationFormatted = createMemo(() => `${inputs.event().venue}, ${inputs.event().city}`)
  const priceLabel = createMemo(() => `ab ${eventPriceFormat(eventPriceFrom(inputs.event()))}`)
  const ticketAvailabilityFormatted = createMemo(() => {
    if (isSoldOut()) {
      return `${priceLabel()} · Ausverkauft`
    }
    return `${priceLabel()} · Sofortige Bestätigung`
  })

  return {
    categoryLabel,
    isSoldOut,
    isScarce,
    scarcityLabel,
    dateFormatted,
    timeFormatted,
    locationFormatted,
    ticketAvailabilityFormatted,
  }
}
