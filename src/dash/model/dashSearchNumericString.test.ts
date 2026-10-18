import { expect, test } from "bun:test"

import { dashSearchNumericString } from "./dashSearchNumericString.ts"

test("normalisiert Zahl und numerischen String auf den String-Wert", () => {
  expect(dashSearchNumericString(2)).toBe("2")
  expect(dashSearchNumericString("2")).toBe("2")
  expect(dashSearchNumericString(30)).toBe("30")
  expect(dashSearchNumericString("365")).toBe("365")
})

test("lehnt nicht-numerische und leere Werte ab", () => {
  expect(dashSearchNumericString(undefined)).toBeUndefined()
  expect(dashSearchNumericString(null)).toBeUndefined()
  expect(dashSearchNumericString("")).toBeUndefined()
  expect(dashSearchNumericString("abc")).toBeUndefined()
  expect(dashSearchNumericString("2.5")).toBeUndefined()
  expect(dashSearchNumericString(2.5)).toBeUndefined()
  expect(dashSearchNumericString(true)).toBeUndefined()
  expect(dashSearchNumericString({})).toBeUndefined()
})

test("beschränkt mit allowed auf die angegebene Wertemenge", () => {
  const allowed = ["1", "2", "3"] as const
  expect(dashSearchNumericString(2, allowed)).toBe("2")
  expect(dashSearchNumericString("3", allowed)).toBe("3")
  expect(dashSearchNumericString(4, allowed)).toBeUndefined()
  expect(dashSearchNumericString("4", allowed)).toBeUndefined()
  expect(dashSearchNumericString("abc", allowed)).toBeUndefined()
})
