import { dashDateFormat } from "../../../model/dashDateFormat.ts"
import type { DashEvent } from "../../../model/dashEventSchema.ts"
import type { DashOrder } from "../../../model/dashOrderSchema.ts"
import type { DashScan } from "../../../model/dashScanSchema.ts"
import type { DashTicket } from "../../../model/dashTicketSchema.ts"
import type { DashAttendeeListRow } from "./dashAttendeeListFilter.ts"

export interface DashAttendeeExportInput {
  filtered: DashAttendeeListRow[]
  tickets: DashTicket[]
  orders: DashOrder[]
  scans: DashScan[]
  event: DashEvent | null
  ticketTypeName: (ticketTypeId: string) => string
}

export interface DashAttendeeExportPayloads {
  teilnehmerRows: (string | number | null)[][]
  orderRows: (string | number | null)[][]
  scanRows: (string | number | null)[][]
  eventFallback: { title: string; startsAt: string }
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

const orderStatusLabel: Record<string, string> = {
  bezahlt: "Bezahlt",
  offen: "Offen",
  storniert: "Storniert",
  erstattet: "Erstattet",
  teilerstattet: "Teilerstattet",
}

const scanResultLabel: Record<string, string> = {
  ok: "Akzeptiert",
  doppelt: "Doppelt",
  "falsches-event": "Falsches Event",
  unbekannt: "Unbekannt",
  storniert: "Storniert",
}

/** Baut die drei Export-Zeilenmengen: Teilnehmerliste (gefiltert), Bestellungen und Check-ins (jeweils alle). */
export function dashAttendeeExportRowsCreate(input: DashAttendeeExportInput): DashAttendeeExportPayloads {
  const eventId = input.event?.id ?? input.tickets[0]?.eventId ?? ""
  const teilnehmerRows = input.filtered.map((row) => [row.ticket.holderName, row.ticketTypeName, row.ticket.code])
  const eventOrders = input.orders
    .filter((order) => order.eventId === eventId)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
  const orderRows = eventOrders.map((order) => {
    const ticketCount = input.tickets.filter((ticket) => ticket.orderId === order.id).length
    return [
      order.number,
      dashDateFormat(order.createdAt, "datum"),
      `${order.buyer.firstName} ${order.buyer.lastName}`.trim(),
      order.buyer.email,
      ticketCount,
      Math.round((order.totalCents / 100) * 100) / 100,
      methodLabel[order.payment.method] ?? order.payment.method,
      orderStatusLabel[order.status] ?? order.status,
    ]
  })
  const holderByCode = new Map(input.tickets.map((ticket) => [ticket.code, ticket.holderName] as const))
  const eventScans = input.scans
    .filter((scan) => scan.eventId === eventId)
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
  const scanRows = eventScans.map((scan) => [
    dashDateFormat(scan.at, "kurz"),
    scan.entrance,
    scanResultLabel[scan.result] ?? scan.result,
    scan.device,
    scan.code,
    holderByCode.get(scan.code) ?? "",
  ])
  return {
    teilnehmerRows,
    orderRows,
    scanRows,
    eventFallback: {
      title: input.event?.title ?? "Event",
      startsAt: input.event?.startsAt ?? new Date().toISOString(),
    },
  }
}
