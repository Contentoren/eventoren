import { expect, test } from "bun:test"

import { dashTicketTypeSales } from "./dashTicketTypeSales.ts"
import type { DashOrder } from "./dashOrderSchema.ts"
import type { DashTicket } from "./dashTicketSchema.ts"
import type { DashTicketType } from "./dashTicketTypeSchema.ts"

const ticketType: DashTicketType = {
  id: "tt-stehplatz",
  eventId: "ev-jazz-wein",
  name: "Stehplatz",
  description: "Stehplatz im Hof",
  channel: "online",
  hidden: false,
  capacity: 100,
  maxPerOrder: 10,
  taxRateBps: 700,
  sortOrder: 0,
  archivedAt: null,
  salesStartAt: null,
  salesEndAt: null,
  phases: [
    { id: "ph-early", name: "Early Bird", priceCents: 1800, endsAt: null, quota: 30 },
    { id: "ph-regulaer", name: "Regulär", priceCents: 2200, endsAt: null, quota: null },
  ],
}

function orderCreate(args: { id: string; status: DashOrder["status"]; phaseId: string; quantity: number }): DashOrder {
  return {
    id: args.id,
    number: "EV-260100",
    orgId: "org-lindenhof",
    eventId: "ev-jazz-wein",
    channel: "online",
    createdAt: "2026-10-01T10:00:00.000Z",
    buyer: { firstName: "Lea", lastName: "Schneider", email: "lea.schneider@example.de" },
    status: args.status,
    payment: { method: "karte", costCents: 0 },
    lines: [
      {
        ticketTypeId: "tt-stehplatz",
        phaseId: args.phaseId,
        name: "Stehplatz",
        unitPriceCents: args.phaseId === "ph-early" ? 1800 : 2200,
        quantity: args.quantity,
        taxRateBps: 700,
      },
    ],
    discount: null,
    voucher: null,
    serviceFeeCents: 0,
    totalCents: 0,
    refunds: [],
    chargeback: null,
    notes: [],
    emails: [],
    invoiceNumber: "",
  }
}

function ticketCreate(args: { id: string; orderId: string; status: DashTicket["status"] }): DashTicket {
  return {
    id: args.id,
    orderId: args.orderId,
    eventId: "ev-jazz-wein",
    ticketTypeId: "tt-stehplatz",
    code: "T-ABCD-1234",
    holderName: "Lea Schneider",
    holderEmail: "lea.schneider@example.de",
    status: args.status,
    checkedInAt: null,
    entrance: null,
  }
}

test("zählt gültige Tickets je Phase und summiert Umsatz", () => {
  const orders = [
    orderCreate({ id: "o-1", status: "bezahlt", phaseId: "ph-early", quantity: 2 }),
    orderCreate({ id: "o-2", status: "offen", phaseId: "ph-regulaer", quantity: 3 }),
    orderCreate({ id: "o-3", status: "teilerstattet", phaseId: "ph-early", quantity: 1 }),
  ]
  const tickets = [
    ticketCreate({ id: "t-1", orderId: "o-1", status: "gueltig" }),
    ticketCreate({ id: "t-2", orderId: "o-1", status: "gueltig" }),
    ticketCreate({ id: "t-3", orderId: "o-2", status: "gueltig" }),
    ticketCreate({ id: "t-4", orderId: "o-2", status: "gueltig" }),
    ticketCreate({ id: "t-5", orderId: "o-2", status: "gueltig" }),
    ticketCreate({ id: "t-6", orderId: "o-3", status: "gueltig" }),
  ]
  expect(dashTicketTypeSales({ ticketType, orders, tickets })).toEqual({
    sold: 6,
    soldByPhase: { "ph-early": 3, "ph-regulaer": 3 },
    available: 94,
    capacity: 100,
    revenueCents: 3 * 1800 + 3 * 2200,
  })
})

test("ignoriert stornierte Tickets und stornierte oder erstattete Bestellungen", () => {
  const orders = [
    orderCreate({ id: "o-1", status: "bezahlt", phaseId: "ph-early", quantity: 2 }),
    orderCreate({ id: "o-2", status: "storniert", phaseId: "ph-early", quantity: 2 }),
    orderCreate({ id: "o-3", status: "erstattet", phaseId: "ph-regulaer", quantity: 1 }),
  ]
  const tickets = [
    ticketCreate({ id: "t-1", orderId: "o-1", status: "gueltig" }),
    ticketCreate({ id: "t-2", orderId: "o-1", status: "storniert" }),
    ticketCreate({ id: "t-3", orderId: "o-2", status: "gueltig" }),
    ticketCreate({ id: "t-4", orderId: "o-2", status: "gueltig" }),
    ticketCreate({ id: "t-5", orderId: "o-3", status: "gueltig" }),
  ]
  const result = dashTicketTypeSales({ ticketType, orders, tickets })
  expect(result.sold).toBe(1)
  expect(result.soldByPhase).toEqual({ "ph-early": 1 })
  expect(result.revenueCents).toBe(1800)
  expect(result.available).toBe(99)
})

test("ignoriert Tickets anderer Ticketarten und Bestellungen ohne Zeile", () => {
  const orders = [orderCreate({ id: "o-1", status: "bezahlt", phaseId: "ph-early", quantity: 5 })]
  const other = {
    ...ticketCreate({ id: "t-x", orderId: "o-1", status: "gueltig" }),
    ticketTypeId: "tt-andere",
  }
  const result = dashTicketTypeSales({ ticketType, orders, tickets: [other] })
  expect(result.sold).toBe(0)
  expect(result.soldByPhase).toEqual({})
  expect(result.revenueCents).toBe(0)
  expect(result.available).toBe(100)
})

test("begrenzt verfügbare Tickets auf null bei Überverkauf", () => {
  const orders = [orderCreate({ id: "o-1", status: "bezahlt", phaseId: "ph-early", quantity: 2 })]
  const tickets = [
    ticketCreate({ id: "t-1", orderId: "o-1", status: "gueltig" }),
    ticketCreate({ id: "t-2", orderId: "o-1", status: "gueltig" }),
  ]
  const small = { ...ticketType, capacity: 1 }
  const result = dashTicketTypeSales({ ticketType: small, orders, tickets })
  expect(result.sold).toBe(2)
  expect(result.available).toBe(0)
})
