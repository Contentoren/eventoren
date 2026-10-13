import { onCleanup, onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { eventBookingIsOpen } from "./eventBookingIsOpen.ts"
import type { EventItem } from "./EventItem.ts"

export function eventBookingReleaseStateCreate(inputs: { event: () => EventItem; observedAt: () => number }) {
  const now = createSignalObject(inputs.observedAt())
  const clientStartedAt = Date.now()
  const serverStartedAt = inputs.observedAt()

  onMount(() => {
    const tick = () => now.set(serverStartedAt + Date.now() - clientStartedAt)
    tick()
    const interval = setInterval(tick, 1000)
    onCleanup(() => clearInterval(interval))
  })

  return {
    now: now.get,
    isOpen: () => eventBookingIsOpen(inputs.event(), now.get()),
  }
}
