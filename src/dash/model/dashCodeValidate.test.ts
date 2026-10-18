import { expect, test } from "bun:test"

import type { DashCode } from "./dashCodeSchema.ts"
import { dashCodeValidate } from "./dashCodeValidate.ts"

function dashCodeFixtureCreate(overrides: Partial<DashCode> = {}): DashCode {
  return {
    id: "code-1",
    eventId: "ev-1",
    kind: "rabatt",
    code: "JAZZ10",
    ticketTypeIds: [],
    maxTickets: null,
    usedTickets: 0,
    validFrom: null,
    validUntil: null,
    active: true,
    note: "",
    createdAt: "2025-01-01T00:00:00.000Z",
    discount: null,
    ...overrides,
  }
}

const now = new Date("2026-03-15T12:00:00.000Z")

test("findet einen gültigen Code trotz Kleinschreibung und Leerzeichen", () => {
  const result = dashCodeValidate({ input: "  jazz10 ", codes: [dashCodeFixtureCreate()], eventId: "ev-1", now })
  expect(result.success).toBe(true)
  if (!result.success) throw new Error("Ergebnis sollte erfolgreich sein")
  expect(result.data.code).toBe("JAZZ10")
})

test("meldet unbekannte Codes", () => {
  const result = dashCodeValidate({ input: "FALSCH", codes: [dashCodeFixtureCreate()], eventId: "ev-1", now })
  expect(result.success).toBe(false)
  if (result.success) throw new Error("Ergebnis sollte fehlschlagen")
  expect(result.errorMessage).toBe("Code nicht gefunden")
})

test("ignoriert Codes anderer Events", () => {
  const result = dashCodeValidate({ input: "JAZZ10", codes: [dashCodeFixtureCreate()], eventId: "ev-2", now })
  expect(result.success).toBe(false)
  if (result.success) throw new Error("Ergebnis sollte fehlschlagen")
  expect(result.errorMessage).toBe("Code nicht gefunden")
})

test("meldet inaktive Codes", () => {
  const result = dashCodeValidate({
    input: "JAZZ10",
    codes: [dashCodeFixtureCreate({ active: false })],
    eventId: "ev-1",
    now,
  })
  expect(result.success).toBe(false)
  if (result.success) throw new Error("Ergebnis sollte fehlschlagen")
  expect(result.errorMessage).toBe("Code ist nicht aktiv")
})

test("meldet Codes vor Gültigkeitsbeginn", () => {
  const result = dashCodeValidate({
    input: "JAZZ10",
    codes: [dashCodeFixtureCreate({ validFrom: "2026-04-01T00:00:00.000Z" })],
    eventId: "ev-1",
    now,
  })
  expect(result.success).toBe(false)
  if (result.success) throw new Error("Ergebnis sollte fehlschlagen")
  expect(result.errorMessage).toBe("Code gilt noch nicht")
})

test("meldet abgelaufene Codes", () => {
  const result = dashCodeValidate({
    input: "JAZZ10",
    codes: [dashCodeFixtureCreate({ validUntil: "2026-03-01T00:00:00.000Z" })],
    eventId: "ev-1",
    now,
  })
  expect(result.success).toBe(false)
  if (result.success) throw new Error("Ergebnis sollte fehlschlagen")
  expect(result.errorMessage).toBe("Code ist abgelaufen")
})

test("meldet aufgebrauchte Codes", () => {
  const result = dashCodeValidate({
    input: "JAZZ10",
    codes: [dashCodeFixtureCreate({ maxTickets: 60, usedTickets: 60 })],
    eventId: "ev-1",
    now,
  })
  expect(result.success).toBe(false)
  if (result.success) throw new Error("Ergebnis sollte fehlschlagen")
  expect(result.errorMessage).toBe("Code ist aufgebraucht")
})

test("meldet leere Eingaben", () => {
  const result = dashCodeValidate({ input: "   ", codes: [dashCodeFixtureCreate()], eventId: "ev-1", now })
  expect(result.success).toBe(false)
})
