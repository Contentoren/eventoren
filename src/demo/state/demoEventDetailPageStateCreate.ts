import { useNavigate } from "@tanstack/solid-router"
import { createMemo } from "solid-js"
import type { EventItem } from "../../events/EventItem.ts"
import type { TicketCart } from "../../ticketing/TicketCart.ts"
import { demoCartStore } from "./demoCartStore.ts"

export function demoEventDetailPageStateCreate(inputs: { event: () => EventItem }) {
  const navigate = useNavigate()
  const event = createMemo(() => inputs.event())
  const cart = createMemo<TicketCart>(() => {
    const currentEvent = event()
    const existing = demoCartStore.draft().find((entry) => entry.eventId === currentEvent.id)
    if (existing) return existing
    const firstAvailableTier = currentEvent.tiers.find((tier) => tier.available > 0)
    return {
      eventId: currentEvent.id,
      lines: firstAvailableTier ? [{ tierId: firstAvailableTier.id, quantity: 1 }] : [],
    }
  })

  const applyCart = (nextCart: TicketCart) => demoCartStore.addOrUpdate(nextCart)
  const goToCart = () => {
    applyCart(cart())
    navigate({ to: "/demo/cart" })
  }
  const goToCheckout = () => {
    applyCart(cart())
    navigate({ to: "/demo/checkout" })
  }

  return { event, cart, applyCart, goToCart, goToCheckout }
}
