import type { DashEvent } from "../../model/dashEventSchema.ts"
import type { DashOrder } from "../../model/dashOrderSchema.ts"

export function dashAccountOrders(input: {
  orders: readonly DashOrder[]
  events: readonly DashEvent[]
  email: string
}): { order: DashOrder; event: DashEvent | null; eventTitle: string }[] {
  const wanted = input.email.trim().toLowerCase()
  const titleByEvent = new Map(input.events.map((event) => [event.id, event] as const))
  return input.orders
    .filter((order) => order.buyer.email.trim().toLowerCase() === wanted)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .map((order) => {
      const event = titleByEvent.get(order.eventId) ?? null
      return { order, event, eventTitle: event?.title ?? "—" }
    })
}
