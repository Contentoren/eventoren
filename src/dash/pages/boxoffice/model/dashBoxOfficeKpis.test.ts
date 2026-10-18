import { describe, expect, test } from "bun:test"

import type { DashBoxOfficeSale } from "#src/dash/model/dashBoxOfficeSaleSchema.ts"
import type { DashOrder } from "#src/dash/model/dashOrderSchema.ts"

import { dashBoxOfficeKpis } from "./dashBoxOfficeKpis.ts"

const fixedNow = new Date("2026-10-18T10:00:00.000Z")

function orderCreate(overrides: Partial<DashOrder> & { id: string }): DashOrder {
  return {
    number: "EV-1",
    orgId: "org-lindenhof",
    eventId: "ev-indie-night",
    channel: "abendkasse",
    createdAt: "2026-10-18T08:00:00.000Z",
    buyer: { firstName: "Alex", lastName: "Mustermann", email: "alex@example.de" },
    status: "bezahlt",
    payment: { method: "karte", costCents: 0 },
    lines: [],
    discount: null,
    voucher: null,
    serviceFeeCents: 0,
    totalCents: 0,
    refunds: [],
    chargeback: null,
    notes: [],
    emails: [],
    invoiceNumber: "",
    ...overrides,
  } as DashOrder
}

function saleCreate(overrides: Partial<DashBoxOfficeSale> & { id: string }): DashBoxOfficeSale {
  return {
    eventId: "ev-indie-night",
    lines: [],
    totalCents: 0,
    status: "wartet",
    createdAt: "2026-10-18T08:00:00.000Z",
    paidAt: null,
    orderId: null,
    buyerEmail: null,
    ...overrides,
  } as DashBoxOfficeSale
}

describe("dashBoxOfficeKpis", () => {
  test("zählt nur heutige Abendkassen-Bestellungen des Events (Europe/Berlin)", () => {
    const orders = [
      orderCreate({
        id: "order-heute",
        lines: [
          {
            ticketTypeId: "tt-indie-abendkasse",
            phaseId: "ph-indie-ak-regulaer",
            name: "Abendkasse",
            unitPriceCents: 2800,
            quantity: 2,
            taxRateBps: 700,
          },
        ],
        totalCents: 5600,
      }),
      // 22:30 UTC = 00:30 in Berlin, also noch heute
      orderCreate({
        id: "order-nacht",
        createdAt: "2026-10-17T22:30:00.000Z",
        lines: [
          {
            ticketTypeId: "tt-indie-abendkasse",
            phaseId: "ph-indie-ak-regulaer",
            name: "Abendkasse",
            unitPriceCents: 2800,
            quantity: 2,
            taxRateBps: 700,
          },
        ],
        totalCents: 5600,
      }),
      // 21:00 UTC = 23:00 in Berlin am Vortag, also nicht heute
      orderCreate({ id: "order-gestern", createdAt: "2026-10-17T21:00:00.000Z", totalCents: 2800 }),
      orderCreate({ id: "order-online", channel: "online", totalCents: 2400 }),
      orderCreate({ id: "order-anderes-event", eventId: "ev-jazz-wein", totalCents: 3400 }),
      orderCreate({ id: "order-storno", status: "storniert", totalCents: 2800 }),
    ]
    const kpis = dashBoxOfficeKpis({ orders, sales: [], eventId: "ev-indie-night", now: fixedNow })
    expect(kpis.todayTickets).toBe(4)
    expect(kpis.todayRevenueCents).toBe(11200)
  })

  test("zählt nur offene Vorgänge des Events", () => {
    const sales = [
      saleCreate({ id: "sale-offen", status: "wartet" }),
      saleCreate({ id: "sale-bezahlt", status: "bezahlt" }),
      saleCreate({ id: "sale-abgebrochen", status: "abgebrochen" }),
      saleCreate({ id: "sale-fremd", eventId: "ev-jazz-wein", status: "wartet" }),
    ]
    const kpis = dashBoxOfficeKpis({ orders: [], sales, eventId: "ev-indie-night", now: fixedNow })
    expect(kpis.openCount).toBe(1)
  })
})
