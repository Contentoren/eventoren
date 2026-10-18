import type { DashBoxOfficeSale } from "../../../model/dashBoxOfficeSaleSchema.ts"
import type { DashOrder } from "../../../model/dashOrderSchema.ts"

export type DashBoxOfficeKpis = {
  todayTickets: number
  todayRevenueCents: number
  openCount: number
}

const berlinDayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Berlin",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

/** Kennzahlen der Abendkasse: heutige Tickets und Umsatz aus Abendkassen-Bestellungen plus offene Vorgänge. */
export function dashBoxOfficeKpis(args: {
  orders: DashOrder[]
  sales: DashBoxOfficeSale[]
  eventId: string
  now: Date
}): DashBoxOfficeKpis {
  const today = berlinDayFormat.format(args.now)
  let todayTickets = 0
  let todayRevenueCents = 0
  for (const order of args.orders) {
    if (order.eventId !== args.eventId || order.channel !== "abendkasse") continue
    if (order.status === "storniert") continue
    if (berlinDayFormat.format(new Date(order.createdAt)) !== today) continue
    todayTickets += order.lines.reduce((sum, line) => sum + line.quantity, 0)
    todayRevenueCents += order.totalCents
  }
  const openCount = args.sales.filter((sale) => sale.eventId === args.eventId && sale.status === "wartet").length
  return { todayTickets, todayRevenueCents, openCount }
}
