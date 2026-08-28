import { createMemo } from "solid-js"
import type { EventItem } from "./EventItem.ts"
import { eventDateFormat } from "./eventDateFormat.ts"
import { eventPriceFormat } from "./eventPriceFormat.ts"
import { eventTicketTierPriceTotal } from "./eventTicketTierPriceTotal.ts"
import { eventTimeFormat } from "./eventTimeFormat.ts"

export function eventDetailInfoStateCreate(inputs: { event: () => EventItem }) {
  const facts = createMemo(() => [
    { label: "Veranstaltungsort", value: inputs.event().venue },
    { label: "Adresse", value: inputs.event().address },
    { label: "Einlass", value: eventTimeFormat(inputs.event().doorsAt) },
    { label: "Ende", value: `${eventDateFormat(inputs.event().endsAt)}, ${eventTimeFormat(inputs.event().endsAt)}` },
    { label: "Veranstalter", value: inputs.event().organizer },
  ])

  const tierRows = createMemo(() =>
    inputs.event().tiers.map((tier) => ({
      id: tier.id,
      name: tier.name,
      description: tier.description,
      priceLabel: eventPriceFormat(tier.priceCents),
      feeLabel: `zzgl. ${eventPriceFormat(tier.feeCents)} Gebühren`,
      totalLabel: `${eventPriceFormat(eventTicketTierPriceTotal(tier))} gesamt`,
      availabilityLabel: tier.available === 0 ? "Ausverkauft" : `${tier.available} verfügbar`,
      soldOut: tier.available === 0,
    })),
  )

  return { facts, tierRows }
}
