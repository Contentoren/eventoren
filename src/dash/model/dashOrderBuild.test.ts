import { expect, test } from "bun:test"

import type { DashCode } from "./dashCodeSchema.ts"
import type { DashFee } from "./dashFeeSchema.ts"
import { dashOrderBuild } from "./dashOrderBuild.ts"
import type { DashTicketType } from "./dashTicketTypeSchema.ts"
import type { DashVoucher } from "./dashVoucherSchema.ts"

const kaeuferFee: DashFee = { percentBps: 500, fixedCents: 49, payer: "kaeufer" }
const veranstalterFee: DashFee = { percentBps: 350, fixedCents: 29, payer: "veranstalter" }

const org = { id: "org-lindenhof", fee: kaeuferFee }
const event = { id: "ev-jazz-wein" }

const ticketTypes: DashTicketType[] = [
  {
    id: "tt-a",
    eventId: "ev-jazz-wein",
    name: "Kategorie A",
    description: "",
    channel: "online",
    hidden: false,
    capacity: 80,
    maxPerOrder: 10,
    taxRateBps: 700,
    sortOrder: 0,
    archivedAt: null,
    salesStartAt: null,
    salesEndAt: null,
    phases: [{ id: "ph-a-1", name: "Phase 1", priceCents: 3400, endsAt: null, quota: null }],
  },
  {
    id: "tt-b",
    eventId: "ev-jazz-wein",
    name: "Kategorie B",
    description: "",
    channel: "online",
    hidden: false,
    capacity: 70,
    maxPerOrder: 10,
    taxRateBps: 700,
    sortOrder: 1,
    archivedAt: null,
    salesStartAt: null,
    salesEndAt: null,
    phases: [{ id: "ph-b-1", name: "Phase 1", priceCents: 2900, endsAt: null, quota: null }],
  },
]

const rabattCode: DashCode = {
  id: "code-jazz10",
  eventId: "ev-jazz-wein",
  kind: "rabatt",
  code: "JAZZ10",
  ticketTypeIds: [],
  maxTickets: null,
  usedTickets: 0,
  validFrom: null,
  validUntil: null,
  active: true,
  note: "",
  createdAt: "2026-09-01T10:00:00.000Z",
  discount: { type: "prozent", value: 1000 },
}

const zugangCode: DashCode = {
  ...rabattCode,
  id: "code-presse",
  kind: "zugang",
  code: "PRESSE-JAZZ",
  discount: null,
}

function voucherCreate(): DashVoucher {
  return {
    id: "vou-1",
    orgId: "org-lindenhof",
    code: "HOF-50-AMLX",
    initialCents: 5000,
    balanceCents: 5000,
    kind: "verkauft",
    recipientName: "Familie Berger",
    recipientEmail: "familie.berger@example.de",
    message: "",
    validity: "unbegrenzt",
    expiresAt: null,
    status: "aktiv",
    createdAt: "2026-01-01T10:00:00.000Z",
    redemptions: [],
  }
}

function idCreateFactory(prefix: string): () => string {
  let counter = 0
  return () => `${prefix}-${(counter += 1)}`
}

test("berechnet Summen, Gebühr, Zahlungskosten, E-Mail und Tickets", () => {
  const result = dashOrderBuild({
    id: "order-1",
    number: "EV-260001",
    org,
    event,
    ticketTypes,
    lines: [{ ticketTypeId: "tt-a", phaseId: "ph-a-1", unitPriceCents: 3400, quantity: 2 }],
    buyer: { firstName: "Lea", lastName: "Schneider", email: "lea.schneider@example.de" },
    createdAt: "2026-10-01T10:00:00.000Z",
    channel: "online",
    method: "karte",
    ticketIdCreate: idCreateFactory("ticket"),
    ticketCodeCreate: idCreateFactory("T-ABCD"),
    invoiceNumber: "RE-2026-00001",
  })
  expect(result.success).toBe(true)
  if (!result.success) return
  const { order, tickets } = result.data
  // serviceFee = 2 x (round(3400*500/10000)+49) = 2 x 219 = 438
  expect(order.serviceFeeCents).toBe(438)
  expect(order.totalCents).toBe(6800 + 438)
  expect(order.payment).toEqual({ method: "karte", costCents: 134 })
  expect(order.emails).toEqual([
    { at: "2026-10-01T10:00:00.000Z", to: "lea.schneider@example.de", kind: "bestaetigung" },
  ])
  expect(tickets).toHaveLength(2)
  expect(tickets[0]?.orderId).toBe("order-1")
  expect(tickets[0]?.holderName).toBe("Lea Schneider")
  expect(tickets[0]?.status).toBe("gueltig")
  expect(order.lines[0]?.taxRateBps).toBe(700)
})

test("Rabattcode mindert die Summe", () => {
  const result = dashOrderBuild({
    id: "order-2",
    number: "EV-260002",
    org,
    event,
    ticketTypes,
    lines: [{ ticketTypeId: "tt-a", phaseId: "ph-a-1", unitPriceCents: 3400, quantity: 2 }],
    buyer: { firstName: "Jonas", lastName: "Weber", email: "jonas.weber@example.de" },
    createdAt: "2026-10-01T10:00:00.000Z",
    channel: "online",
    method: "paypal",
    code: rabattCode,
    ticketIdCreate: idCreateFactory("ticket"),
    ticketCodeCreate: idCreateFactory("T-ABCD"),
    invoiceNumber: "RE-2026-00002",
  })
  expect(result.success).toBe(true)
  if (!result.success) return
  expect(result.data.order.discount).toEqual({ codeId: "code-jazz10", code: "JAZZ10", amountCents: 680 })
  expect(result.data.order.totalCents).toBe(6800 - 680 + 438)
})

test("Zugangscode wird mit 0 Euro gespeichert", () => {
  const result = dashOrderBuild({
    id: "order-3",
    number: "EV-260003",
    org,
    event,
    ticketTypes,
    lines: [{ ticketTypeId: "tt-b", phaseId: "ph-b-1", unitPriceCents: 0, quantity: 1 }],
    buyer: { firstName: "Kim", lastName: "Presse", email: "kim.presse@example.de" },
    createdAt: "2026-10-01T10:00:00.000Z",
    channel: "online",
    method: "karte",
    code: zugangCode,
    ticketIdCreate: idCreateFactory("ticket"),
    ticketCodeCreate: idCreateFactory("T-ABCD"),
    invoiceNumber: null,
  })
  expect(result.success).toBe(true)
  if (!result.success) return
  expect(result.data.order.discount).toEqual({ codeId: "code-presse", code: "PRESSE-JAZZ", amountCents: 0 })
  expect(result.data.order.totalCents).toBe(0)
  expect(result.data.order.payment.method).toBe("kostenlos")
})

test("Gutschein deckt alles ab und setzt die Zahlart", () => {
  const voucher = voucherCreate()
  const result = dashOrderBuild({
    id: "order-4",
    number: "EV-260004",
    org,
    event,
    ticketTypes,
    lines: [{ ticketTypeId: "tt-b", phaseId: "ph-b-1", unitPriceCents: 2900, quantity: 1 }],
    buyer: { firstName: "Aylin", lastName: "Demir", email: "aylin.demir@example.de" },
    createdAt: "2026-10-01T10:00:00.000Z",
    channel: "online",
    method: "karte",
    voucher: { voucher, amountCents: 2900 + 194 },
    ticketIdCreate: idCreateFactory("ticket"),
    ticketCodeCreate: idCreateFactory("T-ABCD"),
    invoiceNumber: "RE-2026-00004",
  })
  expect(result.success).toBe(true)
  if (!result.success) return
  // serviceFee = round(2900*500/10000)+49 = 194; total enthält den Gutschein nicht als Abzug
  expect(result.data.order.totalCents).toBe(2900 + 194)
  expect(result.data.order.payment).toEqual({ method: "gutschein", costCents: 0 })
  expect(result.data.order.voucher?.amountCents).toBe(3094)
})

test("zahlende Veranstalter-Gebühr erzeugt keine Servicegebühr", () => {
  const result = dashOrderBuild({
    id: "order-5",
    number: "EV-260005",
    org: { id: "org-abikur", fee: veranstalterFee },
    event: { id: "ev-abiball-2027" },
    ticketTypes,
    lines: [{ ticketTypeId: "tt-a", phaseId: "ph-a-1", unitPriceCents: 3400, quantity: 2 }],
    buyer: { firstName: "Lea", lastName: "Schneider", email: "lea.schneider@example.de" },
    createdAt: "2026-10-01T10:00:00.000Z",
    channel: "online",
    method: "sepa",
    ticketIdCreate: idCreateFactory("ticket"),
    ticketCodeCreate: idCreateFactory("T-ABCD"),
    invoiceNumber: "RE-2026-00005",
  })
  expect(result.success).toBe(true)
  if (!result.success) return
  expect(result.data.order.serviceFeeCents).toBe(0)
  expect(result.data.order.totalCents).toBe(6800)
  expect(result.data.order.payment).toEqual({ method: "sepa", costCents: 35 })
})

test("Holder-Namen landen auf den Tickets", () => {
  const result = dashOrderBuild({
    id: "order-6",
    number: "EV-260006",
    org,
    event,
    ticketTypes,
    lines: [{ ticketTypeId: "tt-a", phaseId: "ph-a-1", unitPriceCents: 3400, quantity: 2 }],
    buyer: { firstName: "Lea", lastName: "Schneider", email: "lea.schneider@example.de" },
    holders: [{ name: "Jonas Schneider", email: "jonas.schneider@example.de" }],
    createdAt: "2026-10-01T10:00:00.000Z",
    channel: "online",
    method: "karte",
    ticketIdCreate: idCreateFactory("ticket"),
    ticketCodeCreate: idCreateFactory("T-ABCD"),
    invoiceNumber: "RE-2026-00006",
  })
  expect(result.success).toBe(true)
  if (!result.success) return
  expect(result.data.tickets.map((ticket) => ticket.holderName)).toEqual(["Jonas Schneider", "Lea Schneider"])
})

test("deutsche Fehlermeldungen bei leeren Positionen und Unbekanntem", () => {
  const base = {
    number: "EV-260007",
    org,
    event,
    ticketTypes,
    buyer: { firstName: "Lea", lastName: "Schneider", email: "lea.schneider@example.de" },
    createdAt: "2026-10-01T10:00:00.000Z",
    channel: "online" as const,
    method: "karte" as const,
    ticketIdCreate: idCreateFactory("ticket"),
    ticketCodeCreate: idCreateFactory("T-ABCD"),
    invoiceNumber: "RE-2026-00007",
  }
  const empty = dashOrderBuild({ ...base, id: "order-7", lines: [] })
  expect(empty.success).toBe(false)
  const unknown = dashOrderBuild({
    ...base,
    id: "order-8",
    lines: [{ ticketTypeId: "tt-falsch", phaseId: "ph-x", unitPriceCents: 1000, quantity: 1 }],
  })
  expect(unknown.success).toBe(false)
  const tooHigh = dashOrderBuild({
    ...base,
    id: "order-9",
    lines: [{ ticketTypeId: "tt-a", phaseId: "ph-a-1", unitPriceCents: 100, quantity: 1 }],
    voucher: { voucher: voucherCreate(), amountCents: 5000 },
  })
  expect(tooHigh.success).toBe(false)
})
