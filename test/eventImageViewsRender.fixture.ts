import { renderToString } from "solid-js/web"
import { EventCardTicket } from "../src/events/EventCardTicket.tsx"
import { EventDetailPageView } from "../src/events/EventDetailPageView.tsx"
import type { EventItem } from "../src/events/EventItem.ts"
import { TicketBagItemCard } from "../src/ticketing/TicketBagItemCard.tsx"

export function eventImageViewsRender(event: EventItem) {
  const bagProps = {
    event,
    item: {
      tierId: "standard",
      tierName: "Standard",
      tierDescription: "",
      quantity: 1,
      unitPriceCents: 2000,
      unitPriceLabel: "20 €",
      totalPriceCents: 2000,
      totalPriceLabel: "20 €",
      maxQuantity: 10,
    },
    eventDateLabel: "1. Dezember 2027",
    eventLocationLabel: "Bonn",
    onQuantityChange: () => {},
    onRemove: () => {},
  }
  return {
    card: renderToString(() => EventCardTicket({ event })),
    detail: renderToString(() =>
      EventDetailPageView({
        event,
        state: {
          cart: () => ({ eventId: event.id, lines: [] }),
          applyCart: () => {},
          goToCart: () => {},
          goToCheckout: () => {},
        },
      }),
    ),
    bagHref: renderToString(() => TicketBagItemCard({ ...bagProps, eventHref: `/events/${event.id}` })),
    bagRoute: renderToString(() => TicketBagItemCard(bagProps)),
  }
}
