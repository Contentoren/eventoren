import { describe, expect, test } from "bun:test"

import { dashOrderTicketRefunds } from "./dashOrderTicketRefunds.ts"
import { dashOrderTicketValue } from "./dashOrderTicketValue.ts"
import { dashSettlementCompute } from "./dashSettlementCompute.ts"
import type { DashEvent } from "./dashEventSchema.ts"
import type { DashOrder } from "./dashOrderSchema.ts"
import type { DashOrg } from "./dashOrgSchema.ts"
import type { DashTicket } from "./dashTicketSchema.ts"
import type { DashTicketType } from "./dashTicketTypeSchema.ts"

const orgBase: DashOrg = {
  id: "org-lindenhof",
  slug: "kulturhaus-lindenhof",
  name: "Kulturhaus Lindenhof e.V.",
  kind: "verein",
  subtitle: "",
  description: "",
  logoDataUrl: null,
  website: "",
  email: "",
  phone: "",
  socials: { instagram: "", facebook: "", tiktok: "", youtube: "", x: "", linkedin: "" },
  imprint: {
    legalName: "",
    street: "",
    zip: "",
    city: "",
    representative: "",
    register: "",
    vatId: "",
  },
  bank: { holder: "", iban: "" },
  tax: { status: "regel", defaultRateBps: 700 },
  fee: { percentBps: 500, fixedCents: 49, payer: "kaeufer" },
  status: "aktiv",
  statusReason: "",
  termsAcceptedAt: null,
  dpaAcceptedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  voucherDefaultValidity: "3-jahre-jahresende",
}

const event: DashEvent = {
  id: "ev-jazz-wein",
  orgId: "org-lindenhof",
  slug: "jazz-und-wein",
  title: "Jazz & Wein",
  subtitle: "",
  category: "konzert",
  startsAt: "2026-11-08T19:00:00.000Z",
  endsAt: "2026-11-08T23:00:00.000Z",
  doorsAt: "2026-11-08T18:00:00.000Z",
  venue: { name: "Lindenhof", street: "", zip: "", city: "" },
  imageUrl: "",
  imageAlt: "Bühne",
  description: "",
  faq: [],
  schedule: [],
  status: "veroeffentlicht",
  visibility: "oeffentlich",
  salesPaused: false,
  cancelReason: "",
  boxOffice: { enabled: false, opensAt: null },
  reminder: { enabled: false, hoursBefore: 24, directions: "", calendar: "", sentAt: null },
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  publishedAt: null,
}

const ticketTypes: DashTicketType[] = [
  {
    id: "tt-stehplatz",
    eventId: "ev-jazz-wein",
    name: "Stehplatz",
    description: "",
    channel: "online",
    hidden: false,
    capacity: 100,
    maxPerOrder: 8,
    taxRateBps: 700,
    sortOrder: 0,
    archivedAt: null,
    salesStartAt: null,
    salesEndAt: null,
    phases: [{ id: "ph-1", name: "Regulär", priceCents: 2000, endsAt: null, quota: null }],
  },
  {
    id: "tt-sitzplatz",
    eventId: "ev-jazz-wein",
    name: "Sitzplatz",
    description: "",
    channel: "online",
    hidden: false,
    capacity: 50,
    maxPerOrder: 8,
    taxRateBps: 1900,
    sortOrder: 1,
    archivedAt: null,
    salesStartAt: null,
    salesEndAt: null,
    phases: [{ id: "ph-2", name: "Regulär", priceCents: 3000, endsAt: null, quota: null }],
  },
]

function orderCreate(overrides: Partial<DashOrder> & { id: string }): DashOrder {
  return {
    number: "EV-260100",
    orgId: "org-lindenhof",
    eventId: "ev-jazz-wein",
    channel: "online",
    createdAt: "2026-10-01T10:00:00.000Z",
    buyer: { firstName: "Lea", lastName: "Schneider", email: "lea.schneider@example.de" },
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
  }
}

function ticketCreate(overrides: Partial<DashTicket> & { id: string; orderId: string }): DashTicket {
  return {
    eventId: "ev-jazz-wein",
    ticketTypeId: "tt-stehplatz",
    code: "T-ABCD-1234",
    holderName: "Lea Schneider",
    holderEmail: "lea.schneider@example.de",
    status: "gueltig",
    checkedInAt: null,
    entrance: null,
    ...overrides,
  }
}

describe("dashOrderTicketValue", () => {
  test("summiert Positionen minus Rabatt, mindestens 0", () => {
    const order = orderCreate({
      id: "o-1",
      lines: [
        {
          ticketTypeId: "tt-stehplatz",
          phaseId: "ph-1",
          name: "Stehplatz",
          unitPriceCents: 2000,
          quantity: 2,
          taxRateBps: 700,
        },
        {
          ticketTypeId: "tt-sitzplatz",
          phaseId: "ph-2",
          name: "Sitzplatz",
          unitPriceCents: 3000,
          quantity: 1,
          taxRateBps: 1900,
        },
      ],
      discount: { codeId: "c-1", code: "JAZZ10", amountCents: 1000 },
    })
    expect(dashOrderTicketValue(order)).toBe(6000)
  })

  test("Rabatt über der Summe wird auf 0 begrenzt", () => {
    const order = orderCreate({
      id: "o-1",
      lines: [
        {
          ticketTypeId: "tt-stehplatz",
          phaseId: "ph-1",
          name: "Stehplatz",
          unitPriceCents: 2000,
          quantity: 1,
          taxRateBps: 700,
        },
      ],
      discount: { codeId: "c-1", code: "FREI", amountCents: 9999 },
    })
    expect(dashOrderTicketValue(order)).toBe(0)
  })
})

describe("dashOrderTicketRefunds", () => {
  test("zieht erstattete Servicegebühr ab und begrenzt auf den Ticketwert", () => {
    const order = orderCreate({
      id: "o-1",
      lines: [
        {
          ticketTypeId: "tt-stehplatz",
          phaseId: "ph-1",
          name: "Stehplatz",
          unitPriceCents: 2000,
          quantity: 1,
          taxRateBps: 700,
        },
      ],
      refunds: [
        {
          id: "r-1",
          amountCents: 2200,
          feeCents: 200,
          reason: "Storno",
          at: "2026-10-02T10:00:00.000Z",
          ticketIds: ["t-1"],
        },
      ],
    })
    expect(dashOrderTicketRefunds(order)).toBe(2000)
  })

  test("ohne Erstattungen ist das Ergebnis 0", () => {
    expect(dashOrderTicketRefunds(orderCreate({ id: "o-1" }))).toBe(0)
  })
})

describe("dashSettlementCompute", () => {
  test("berechnet Abrechnung bei Käufer-Gebühr ohne Plattformgebühr", () => {
    const orders = [
      orderCreate({
        id: "o-1",
        lines: [
          {
            ticketTypeId: "tt-stehplatz",
            phaseId: "ph-1",
            name: "Stehplatz",
            unitPriceCents: 2000,
            quantity: 2,
            taxRateBps: 700,
          },
        ],
        payment: { method: "karte", costCents: 80 },
        serviceFeeCents: 298,
        totalCents: 4298,
      }),
    ]
    const tickets = [
      ticketCreate({ id: "t-1", orderId: "o-1" }),
      ticketCreate({ id: "t-2", orderId: "o-1", code: "T-ABCD-5678" }),
    ]
    const result = dashSettlementCompute({ event, ticketTypes, orders, tickets, org: orgBase })
    expect(result.includedOrders).toBe(1)
    expect(result.ticketRevenueCents).toBe(4000)
    expect(result.refundsCents).toBe(0)
    expect(result.platformFeeCents).toBe(0)
    expect(result.paymentCostsCents).toBe(80)
    expect(result.buyerFeesCents).toBe(298)
    expect(result.payoutCents).toBe(3920)
    expect(result.openOrders).toEqual({ count: 0, amountCents: 0 })
  })

  test("berechnet Plattformgebühr je Ticket bei Veranstalter-Gebühr", () => {
    const org = { ...orgBase, fee: { percentBps: 500, fixedCents: 49, payer: "veranstalter" as const } }
    const orders = [
      orderCreate({
        id: "o-1",
        lines: [
          {
            ticketTypeId: "tt-stehplatz",
            phaseId: "ph-1",
            name: "Stehplatz",
            unitPriceCents: 2000,
            quantity: 2,
            taxRateBps: 700,
          },
        ],
        serviceFeeCents: 0,
        totalCents: 4000,
      }),
    ]
    const tickets = [ticketCreate({ id: "t-1", orderId: "o-1" })]
    const result = dashSettlementCompute({ event, ticketTypes, orders, tickets, org })
    // 5 % von 2000 €-Cent = 100 + 49 fix = 149 je Ticket
    expect(result.platformFeeCents).toBe(298)
    expect(result.buyerFeesCents).toBe(0)
    expect(result.payoutCents).toBe(4000 - 298)
  })

  test("Erstattungen mit Servicegebühr-Anteil, Rückbuchung und Kleinunternehmer-Steuer 0", () => {
    const org = { ...orgBase, tax: { status: "klein" as const, defaultRateBps: 700 as const } }
    const orders = [
      orderCreate({
        id: "o-1",
        status: "teilerstattet",
        lines: [
          {
            ticketTypeId: "tt-stehplatz",
            phaseId: "ph-1",
            name: "Stehplatz",
            unitPriceCents: 2000,
            quantity: 2,
            taxRateBps: 700,
          },
        ],
        discount: { codeId: "c-1", code: "JAZZ10", amountCents: 400 },
        refunds: [
          {
            id: "r-1",
            amountCents: 2200,
            feeCents: 200,
            reason: "Storno",
            at: "2026-10-02T10:00:00.000Z",
            ticketIds: ["t-1"],
          },
        ],
        chargeback: { amountCents: 1000, feeCents: 200, at: "2026-10-03T10:00:00.000Z" },
        payment: { method: "paypal", costCents: 60 },
        totalCents: 3800,
      }),
    ]
    const tickets = [
      ticketCreate({ id: "t-1", orderId: "o-1" }),
      ticketCreate({ id: "t-2", orderId: "o-1", code: "T-ABCD-5678" }),
    ]
    const result = dashSettlementCompute({ event, ticketTypes, orders, tickets, org })
    expect(result.ticketRevenueCents).toBe(3600)
    expect(result.refundsCents).toBe(2000)
    expect(result.refundedFeesCents).toBe(200)
    expect(result.chargebacksCents).toBe(1200)
    for (const row of result.taxByRate) expect(row.taxCents).toBe(0)
    // 3600 − 2000 − 1200 − 60 = 340
    expect(result.payoutCents).toBe(340)
  })

  test("Aufteilung ist exakt und fremde Events sowie offene Bestellungen bleiben draußen", () => {
    const orders = [
      orderCreate({
        id: "o-1",
        lines: [
          {
            ticketTypeId: "tt-stehplatz",
            phaseId: "ph-1",
            name: "Stehplatz",
            unitPriceCents: 1999,
            quantity: 1,
            taxRateBps: 700,
          },
          {
            ticketTypeId: "tt-sitzplatz",
            phaseId: "ph-2",
            name: "Sitzplatz",
            unitPriceCents: 3000,
            quantity: 2,
            taxRateBps: 1900,
          },
        ],
        discount: { codeId: "c-1", code: "RABATT", amountCents: 100 },
        refunds: [
          {
            id: "r-1",
            amountCents: 500,
            feeCents: 0,
            reason: "Teil",
            at: "2026-10-02T10:00:00.000Z",
            ticketIds: ["t-1"],
          },
        ],
        payment: { method: "sepa", costCents: 30 },
        totalCents: 8000,
      }),
      orderCreate({ id: "o-anderes-event", eventId: "ev-fremd", totalCents: 9999 }),
      orderCreate({ id: "o-offen", status: "offen", totalCents: 1234 }),
    ]
    const tickets = [
      ticketCreate({ id: "t-1", orderId: "o-1" }),
      ticketCreate({ id: "t-2", orderId: "o-1", ticketTypeId: "tt-sitzplatz", code: "T-ABCD-5678" }),
      ticketCreate({ id: "t-3", orderId: "o-1", ticketTypeId: "tt-sitzplatz", code: "T-ABCD-9012" }),
    ]
    const result = dashSettlementCompute({ event, ticketTypes, orders, tickets, org: orgBase })
    expect(result.includedOrders).toBe(1)
    expect(result.openOrders).toEqual({ count: 1, amountCents: 1234 })
    const gross = result.byTicketType.reduce((sum, row) => sum + row.grossCents, 0)
    expect(gross).toBe(result.ticketRevenueCents - result.refundsCents)
    const taxGross = result.taxByRate.reduce((sum, row) => sum + row.grossCents, 0)
    expect(taxGross).toBe(result.ticketRevenueCents - result.refundsCents)
  })
})
