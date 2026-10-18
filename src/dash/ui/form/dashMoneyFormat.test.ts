import { expect, test } from "bun:test"

import { dashMoneyFormat } from "#src/dash/ui/form/dashMoneyFormat.ts"

test("formatiert Cent ohne Währungszeichen für die Eingabe", () => {
  expect(dashMoneyFormat(1250)).toBe("12,50")
  expect(dashMoneyFormat(0)).toBe("0,00")
  expect(dashMoneyFormat(123450)).toBe("1.234,50")
})

test("leerer Wert ergibt leeren Text", () => {
  expect(dashMoneyFormat(null)).toBe("")
})
