import { createMemo, onCleanup, onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { EventItem } from "./EventItem.ts"
import { eventImageUrlGet } from "./eventImageUrlGet.ts"
import { eventBookingCountdownPartsGet } from "./eventBookingCountdownPartsGet.ts"

export function eventBookingCountdownPageStateCreate(inputs: {
  event: () => EventItem
  now: () => (() => number) | undefined
}) {
  // Parents can supply a shared server/client clock seed to make hydration deterministic.
  const clock = createSignalObject(inputs.now()?.() ?? Date.now())
  onMount(() => {
    if (inputs.now()) return
    const tick = () => clock.set(inputs.now()?.() ?? Date.now())
    tick()
    const timer = setInterval(tick, 1000)
    onCleanup(() => clearInterval(timer))
  })
  const image = createMemo(() => {
    const event = inputs.event()
    const source = event.imageVariants?.detail ?? event.imageUrl
    if (!source?.trim()) return undefined
    const failed = createSignalObject(false)
    return { src: eventImageUrlGet(source), failed: failed.get, onError: () => failed.set(true) }
  })
  const openingDate = createMemo(() => {
    const date = new Date(inputs.event().bookingOpensAt ?? "")
    if (!Number.isFinite(date.getTime())) return "Der Buchungsstart wird bald bekannt gegeben."
    return `${new Intl.DateTimeFormat("de-DE", { dateStyle: "full", timeStyle: "long", timeZone: "Europe/Berlin" }).format(date)} · Europe/Berlin`
  })
  return {
    event: inputs.event,
    image,
    openingDate,
    parts: () => eventBookingCountdownPartsGet(inputs.event().bookingOpensAt, inputs.now()?.() ?? clock.get()),
  }
}
