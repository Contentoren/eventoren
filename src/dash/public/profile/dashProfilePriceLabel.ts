import { dashCentsFormat } from "../../model/dashCentsFormat.ts"
import { dashEventStats } from "../../model/dashEventStats.ts"
import type { DashEvent } from "../../model/dashEventSchema.ts"
import { dashPhaseResolve } from "../../model/dashPhaseResolve.ts"
import type { DashState } from "../../model/dashStateSchema.ts"
import { dashTicketTypeSales } from "../../model/dashTicketTypeSales.ts"

/** Niedrigster aktiver Online-Preis sichtbarer Ticketarten ("ab 24,00 €"), "Ausverkauft" oder null. */
export function dashProfilePriceLabel(args: { state: DashState; event: DashEvent; now: Date }): string | null {
  const { state, event, now } = args
  if (event.status === "abgesagt") return "Abgesagt"
  const stats = dashEventStats({ state, eventId: event.id, now })
  if (stats.capacity > 0 && stats.sold >= stats.capacity) return "Ausverkauft"
  const online = state.ticketTypes.filter(
    (type) => type.eventId === event.id && type.channel === "online" && !type.hidden && type.archivedAt === null,
  )
  let lowest: number | null = null
  for (const type of online) {
    const sales = dashTicketTypeSales({ ticketType: type, orders: state.orders, tickets: state.tickets })
    const resolved = dashPhaseResolve(type, sales.soldByPhase, now)
    if (resolved.state !== "aktiv" || resolved.phase === null) continue
    if (resolved.phase.priceCents < 0) continue
    if (lowest === null || resolved.phase.priceCents < lowest) lowest = resolved.phase.priceCents
  }
  if (lowest === null) return null
  return `ab ${dashCentsFormat(lowest)}`
}
