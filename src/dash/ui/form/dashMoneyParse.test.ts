import { expect, test } from "bun:test"

import { dashMoneyParse } from "#src/dash/ui/form/dashMoneyParse.ts"

test("parst deutsche und englische Dezimaltrennzeichen", () => {
  expect(dashMoneyParse("12,50")).toBe(1250)
  expect(dashMoneyParse("12.50")).toBe(1250)
  expect(dashMoneyParse("12,5")).toBe(1250)
  expect(dashMoneyParse("12")).toBe(1200)
  expect(dashMoneyParse("0,00")).toBe(0)
})

test("toleriert Leerzeichen und leere Eingaben", () => {
  expect(dashMoneyParse(" 1 234,50 ")).toBe(123450)
  expect(dashMoneyParse("")).toBeNull()
  expect(dashMoneyParse("   ")).toBeNull()
})

test("lehnt ungültige Beträge ab", () => {
  expect(dashMoneyParse("12,567")).toBeNull()
  expect(dashMoneyParse("-5")).toBeNull()
  expect(dashMoneyParse("zwölf")).toBeNull()
  expect(dashMoneyParse("12,5,0")).toBeNull()
  expect(dashMoneyParse("€ 12")).toBeNull()
})
