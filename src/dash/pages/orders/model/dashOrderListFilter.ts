import { dashDateFormat } from "../../../model/dashDateFormat.ts"
import type { DashEvent } from "../../../model/dashEventSchema.ts"
import type { DashOrder } from "../../../model/dashOrderSchema.ts"

export type DashOrdersStatusFilter = "alle" | "bezahlt" | "offen" | "storniert" | "erstattet"

export type DashOrdersChannelFilter = "alle" | "online" | "abendkasse" | "gaesteliste"

export interface DashOrderListFilterInput {
  orders: DashOrder[]
  events: DashEvent[]
  q: string
  status: DashOrdersStatusFilter
  kanal: DashOrdersChannelFilter
  scopeEventId: string | null
  eventId: string | null
}

export interface DashOrderListRow {
  order: DashOrder
  eventTitle: string
  ticketCount: number
  buyerName: string
}

export interface DashOrderListResult {
  rows: DashOrderListRow[]
  counts: Record<DashOrdersStatusFilter, number>
  exportRows: (string | number | null)[][]
}

const methodLabel: Record<string, string> = {
  karte: "Karte",
  paypal: "PayPal",
  sepa: "SEPA",
  applepay: "Apple Pay",
  googlepay: "Google Pay",
  gutschein: "Gutschein",
  kostenlos: "Kostenlos",
}

const statusLabel: Record<string, string> = {
  bezahlt: "Bezahlt",
  offen: "Offen",
  storniert: "Storniert",
  erstattet: "Erstattet",
  teilerstattet: "Teilerstattet",
}

function orderMatchesStatus(status: string, filter: DashOrdersStatusFilter): boolean {
  if (filter === "alle") return true
  if (filter === "erstattet") return status === "erstattet" || status === "teilerstattet"
  return status === filter
}

function orderBaseMatch(
  order: DashOrder,
  eventTitle: string,
  buyerName: string,
  input: DashOrderListFilterInput,
): boolean {
  if (input.scopeEventId !== null && order.eventId !== input.scopeEventId) return false
  if (input.eventId !== null && input.eventId !== "" && order.eventId !== input.eventId) return false
  if (input.kanal !== "alle" && order.channel !== input.kanal) return false
  const query = input.q.trim().toLowerCase()
  if (query.length === 0) return true
  void eventTitle
  return (
    order.number.toLowerCase().includes(query) ||
    buyerName.toLowerCase().includes(query) ||
    order.buyer.email.toLowerCase().includes(query)
  )
}

export function dashOrderListFilter(input: DashOrderListFilterInput): DashOrderListResult {
  const titleByEvent = new Map(input.events.map((event) => [event.id, event.title] as const))
  const enriched = input.orders.map((order) => {
    const eventTitle = titleByEvent.get(order.eventId) ?? "—"
    const buyerName = `${order.buyer.firstName} ${order.buyer.lastName}`.trim()
    const ticketCount = order.lines.reduce((sum, line) => sum + line.quantity, 0)
    return { order, eventTitle, buyerName, ticketCount }
  })
  const base = enriched.filter((entry) => orderBaseMatch(entry.order, entry.eventTitle, entry.buyerName, input))
  const countFor = (filter: DashOrdersStatusFilter): number =>
    filter === "alle" ? base.length : base.filter((entry) => orderMatchesStatus(entry.order.status, filter)).length
  const counts: Record<DashOrdersStatusFilter, number> = {
    alle: countFor("alle"),
    bezahlt: countFor("bezahlt"),
    offen: countFor("offen"),
    storniert: countFor("storniert"),
    erstattet: countFor("erstattet"),
  }
  const rows: DashOrderListRow[] = base
    .filter((entry) => orderMatchesStatus(entry.order.status, input.status))
    .sort((a, b) => Date.parse(b.order.createdAt) - Date.parse(a.order.createdAt))
    .map((entry) => ({
      order: entry.order,
      eventTitle: entry.eventTitle,
      ticketCount: entry.ticketCount,
      buyerName: entry.buyerName,
    }))
  const exportRows = rows.map((row) => [
    row.order.number,
    dashDateFormat(row.order.createdAt, "kurz"),
    row.buyerName,
    row.order.buyer.email,
    row.eventTitle,
    row.ticketCount,
    Math.round((row.order.totalCents / 100) * 100) / 100,
    methodLabel[row.order.payment.method] ?? row.order.payment.method,
    statusLabel[row.order.status] ?? row.order.status,
  ])
  return { rows, counts, exportRows }
}
