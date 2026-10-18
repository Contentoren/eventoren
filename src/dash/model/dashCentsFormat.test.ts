import { expect, test } from "bun:test"

import { dashCentsFormat } from "#src/dash/model/dashCentsFormat.ts"

test("formatiert Cent im deutschen Format mit Euro", () => {
  expect(dashCentsFormat(123450)).toBe("1.234,50 €")
  expect(dashCentsFormat(0)).toBe("0,00 €")
})

test("zeigt Vorzeichen als Minus oder Plus", () => {
  expect(dashCentsFormat(-1200)).toBe("−12,00 €")
  expect(dashCentsFormat(-1200, { signed: true })).toBe("−12,00 €")
  expect(dashCentsFormat(1200, { signed: true })).toBe("+12,00 €")
  expect(dashCentsFormat(0, { signed: true })).toBe("0,00 €")
})

test("kürzt große Beträge in Tausend ab", () => {
  expect(dashCentsFormat(1234567, { compact: true })).toBe("12,3 Tsd. €")
})
