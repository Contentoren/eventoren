import { expect, test } from "bun:test"

import { dashDiscountCompute } from "./dashDiscountCompute.ts"
import type { DashCode } from "./dashCodeSchema.ts"

function codeCreate(overrides: Partial<DashCode> = {}): DashCode {
  return {
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
    createdAt: "2026-10-01T10:00:00.000Z",
    discount: { type: "prozent", value: 1000 },
    ...overrides,
  }
}

const now = new Date("2026-10-18T10:00:00.000Z")
const lines = [
  { ticketTypeId: "tt-a", unitPriceCents: 2200, quantity: 2 },
  { ticketTypeId: "tt-b", unitPriceCents: 1800, quantity: 1 },
]

test("Prozentrabatt gilt für alle Tickets", () => {
  const result = dashDiscountCompute({ code: codeCreate(), lines, now })
  expect(result.success).toBe(true)
  if (!result.success) return
  expect(result.data.appliedTickets).toBe(3)
  expect(result.data.amountCents).toBe(220 + 220 + 180)
})

test("Betragrabatt ist je Ticket auf den Preis begrenzt", () => {
  const code = codeCreate({ discount: { type: "betrag", value: 500 } })
  const result = dashDiscountCompute({
    code,
    lines: [{ ticketTypeId: "tt-a", unitPriceCents: 300, quantity: 2 }],
    now,
  })
  expect(result.success).toBe(true)
  if (!result.success) return
  expect(result.data).toEqual({ amountCents: 600, appliedTickets: 2 })
})

test("wählt teuerste Tickets zuerst bei begrenztem Kontingent", () => {
  const code = codeCreate({ maxTickets: 2 })
  const result = dashDiscountCompute({ code, lines, now })
  expect(result.success).toBe(true)
  if (!result.success) return
  expect(result.data.appliedTickets).toBe(2)
  expect(result.data.amountCents).toBe(220 + 220)
})

test("zieht bereits genutzte Tickets vom Limit ab", () => {
  const code = codeCreate({ maxTickets: 3 })
  const result = dashDiscountCompute({ code, lines, usedTickets: 2, now })
  expect(result.success).toBe(true)
  if (!result.success) return
  expect(result.data.appliedTickets).toBe(1)
  expect(result.data.amountCents).toBe(220)
})

test("filtert nach Ticketarten des Codes", () => {
  const code = codeCreate({ ticketTypeIds: ["tt-b"] })
  const result = dashDiscountCompute({ code, lines, now })
  expect(result.success).toBe(true)
  if (!result.success) return
  expect(result.data).toEqual({ amountCents: 180, appliedTickets: 1 })
})

test("meldet Fehler mit deutschen Texten", () => {
  const cases: { code: DashCode; errorMessage: string; label: string }[] = [
    { code: codeCreate({ active: false }), errorMessage: "Code ist nicht aktiv", label: "inaktiv" },
    {
      code: codeCreate({ validFrom: "2026-10-20T00:00:00.000Z" }),
      errorMessage: "Code gilt noch nicht",
      label: "zu früh",
    },
    {
      code: codeCreate({ validUntil: "2026-10-10T00:00:00.000Z" }),
      errorMessage: "Code ist abgelaufen",
      label: "abgelaufen",
    },
    {
      code: codeCreate({ ticketTypeIds: ["tt-fremd"] }),
      errorMessage: "Code gilt nicht für diese Tickets",
      label: "falsche Ticketart",
    },
    {
      code: codeCreate({ maxTickets: 2 }),
      errorMessage: "Code ist aufgebraucht",
      label: "aufgebraucht",
    },
    {
      code: codeCreate({ kind: "zugang", discount: null }),
      errorMessage: "Code gilt nicht für diese Tickets",
      label: "Zugangscode",
    },
  ]
  for (const entry of cases) {
    const usedTickets = entry.label === "aufgebraucht" ? 2 : 0
    const result = dashDiscountCompute({ code: entry.code, lines, usedTickets, now })
    expect(result.success).toBe(false)
    if (result.success) continue
    expect(result.errorMessage).toBe(entry.errorMessage)
  }
})
