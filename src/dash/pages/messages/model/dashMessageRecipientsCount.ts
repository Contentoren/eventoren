import type { DashMessageAudience } from "../../../model/dashMessageAudienceSchema.ts"
import type { DashState } from "../../../model/dashStateSchema.ts"

/** Zählt eindeutige Ticketinhaber-E-Mails für eine Zielgruppe (du sprichst). */
export function dashMessageRecipientsCount(state: DashState, eventId: string, audience: DashMessageAudience): number {
  const liveOrderIds = new Set(
    state.orders.filter((order) => order.eventId === eventId && order.status !== "storniert").map((order) => order.id),
  )
  const emails = new Set<string>()
  for (const ticket of state.tickets) {
    if (ticket.eventId !== eventId) continue
    if (ticket.status !== "gueltig") continue
    if (!liveOrderIds.has(ticket.orderId)) continue
    if (audience.type === "ticketarten" && !audience.ticketTypeIds.includes(ticket.ticketTypeId)) continue
    if (audience.type === "eingecheckt" && ticket.checkedInAt === null) continue
    if (audience.type === "nicht-eingecheckt" && ticket.checkedInAt !== null) continue
    const normalized = ticket.holderEmail.trim().toLowerCase()
    if (!normalized.includes("@")) continue
    emails.add(normalized)
  }
  return emails.size
}
