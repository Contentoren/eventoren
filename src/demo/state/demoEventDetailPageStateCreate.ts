import { createMemo } from "solid-js"
import type { EventItem } from "../../events/EventItem.ts"
import type { TicketCart } from "../../ticketing/TicketCart.ts"
import { demoCartStore } from "./demoCartStore.ts"
import type { DemoFlowContextValue } from "./demoFlowContext.ts"
import { demoFlowContextUse } from "./demoFlowContextUse.ts"

export function demoEventDetailPageStateCreate(inputs: {
  event: () => EventItem
  isMissing?: () => boolean
  flow?: DemoFlowContextValue
  navigate?: (opts: { to: string }) => void
}) {
  const flow = inputs.flow ?? demoFlowContextUse()
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
    if (inputs.navigate) {
      inputs.navigate({ to: "/demo/customer/cart" })
      return
    }
    if (typeof window !== "undefined") {
      window.location.assign("/demo/customer/cart")
    }
  }
  const goToCheckout = () => {
    applyCart(cart())
    if (inputs.navigate) {
      inputs.navigate({ to: "/demo/customer/checkout" })
      return
    }
    if (typeof window !== "undefined") {
      window.location.assign("/demo/customer/checkout")
    }
  }

  const hasFlow = () => flow.hasFlowStates()
  const isLoading = () => (hasFlow() ? flow.isLoading() : false)
  const isError = () => (hasFlow() ? flow.isError() : false)
  const isEmpty = () => (hasFlow() ? flow.isEmpty() : Boolean(inputs.isMissing?.()))
  const isLoaded = () => (hasFlow() ? flow.isLoaded() : !inputs.isMissing?.())
  const retry = () => {
    flow.setState("loaded")
  }

  return { event, cart, applyCart, goToCart, goToCheckout, isLoading, isError, isEmpty, isLoaded, retry }
}
