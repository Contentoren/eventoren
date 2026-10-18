import { expect, test } from "bun:test"

import { dashVoucherExpiry } from "./dashVoucherExpiry.ts"

test("1-jahr endet am gleichen Datum im Folgejahr um 23:59 Berlin (Winterzeit)", () => {
  expect(dashVoucherExpiry("2025-01-15T00:30:00.000Z", "1-jahr", null)).toBe("2026-01-15T22:59:00.000Z")
})

test("1-jahr endet am gleichen Datum im Folgejahr um 23:59 Berlin (Sommerzeit)", () => {
  expect(dashVoucherExpiry("2025-07-15T10:00:00.000Z", "1-jahr", null)).toBe("2026-07-15T21:59:00.000Z")
})

test("rechnet mit Berliner Wandzeit statt UTC-Datum", () => {
  expect(dashVoucherExpiry("2025-07-15T22:30:00.000Z", "1-jahr", null)).toBe("2026-07-16T21:59:00.000Z")
})

test("2-jahre springt zwei Jahre weiter", () => {
  expect(dashVoucherExpiry("2025-01-15T10:00:00.000Z", "2-jahre", null)).toBe("2027-01-15T22:59:00.000Z")
})

test("29. Februar fällt auf den 28. Februar im Folgejahr", () => {
  expect(dashVoucherExpiry("2024-02-29T10:00:00.000Z", "1-jahr", null)).toBe("2025-02-28T22:59:00.000Z")
  expect(dashVoucherExpiry("2024-02-29T10:00:00.000Z", "2-jahre", null)).toBe("2026-02-28T22:59:00.000Z")
})

test("3-jahre-jahresende endet am 31.12. des dritten Folgejahres", () => {
  expect(dashVoucherExpiry("2025-06-10T10:00:00.000Z", "3-jahre-jahresende", null)).toBe("2028-12-31T22:59:00.000Z")
})

test("unbegrenzt ergibt null", () => {
  expect(dashVoucherExpiry("2025-06-10T10:00:00.000Z", "unbegrenzt", "2026-05-01")).toBeNull()
})

test("datum nutzt das eigene Datum um 23:59 Berlin", () => {
  expect(dashVoucherExpiry("2025-01-15T10:00:00.000Z", "datum", "2026-05-01")).toBe("2026-05-01T21:59:00.000Z")
  expect(dashVoucherExpiry("2025-01-15T10:00:00.000Z", "datum", "2026-01-10")).toBe("2026-01-10T22:59:00.000Z")
})

test("datum ohne oder mit ungültigem Datum ergibt null", () => {
  expect(dashVoucherExpiry("2025-01-15T10:00:00.000Z", "datum", null)).toBeNull()
  expect(dashVoucherExpiry("2025-01-15T10:00:00.000Z", "datum", "")).toBeNull()
  expect(dashVoucherExpiry("2025-01-15T10:00:00.000Z", "datum", "2026-13-01")).toBeNull()
  expect(dashVoucherExpiry("2025-01-15T10:00:00.000Z", "datum", "2026-02-30")).toBeNull()
})
