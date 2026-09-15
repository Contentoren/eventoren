import type { Accessor } from "solid-js"
import type { TicketCart } from "../ticketing/TicketCart.ts"
import { TicketCartSummary } from "../ticketing/TicketCartSummary.tsx"
import { TicketStickyCta } from "../ticketing/TicketStickyCta.tsx"
import { TicketTierSelector } from "../ticketing/TicketTierSelector.tsx"
import { UiContainer } from "../ui/UiContainer.tsx"
import { EventDetailBanner } from "./EventDetailBanner.tsx"
import { EventDetailHeader } from "./EventDetailHeader.tsx"
import { EventDetailInfo } from "./EventDetailInfo.tsx"
import type { EventItem } from "./EventItem.ts"

export function EventDetailPageView(props: {
  event: EventItem
  state: {
    cart: Accessor<TicketCart>
    applyCart: (cart: TicketCart) => void
    goToCart: () => void
    goToCheckout: () => void
  }
}) {
  return (
    <main id="content" tabindex="-1">
      <EventDetailBanner imageUrl={props.event.imageUrl} imageAlt={props.event.imageAlt} />

      <UiContainer class="flex flex-col gap-space-7 pt-space-3 pb-28 sm:py-space-7 lg:pb-space-7">
        <EventDetailHeader event={props.event} />

        <div class="grid gap-space-7 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div class="flex flex-col gap-space-7">
            <TicketTierSelector event={props.event} cart={props.state.cart()} onCartChange={props.state.applyCart} />
            <EventDetailInfo event={props.event} />
          </div>

          <div class="lg:sticky lg:top-24 lg:self-start">
            <TicketCartSummary
              event={props.event}
              cart={props.state.cart()}
              checkoutLabel="In den Warenkorb"
              onCartChange={props.state.applyCart}
              onCheckout={props.state.goToCart}
              onDirectCheckout={props.state.goToCheckout}
            />
          </div>
        </div>
      </UiContainer>

      <TicketStickyCta
        event={props.event}
        cart={props.state.cart()}
        label="In den Warenkorb"
        onContinue={props.state.goToCart}
      />
    </main>
  )
}
