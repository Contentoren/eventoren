import { expect, test } from "bun:test"

import { dashIbanMask } from "./dashIbanMask.ts"

test("zeigt erste und letzte vier Zeichen", () => {
  expect(dashIbanMask("DE89370400440532013000")).toBe("DE89 •••• 3000")
})

test("normalisiert vor dem Maskieren", () => {
  expect(dashIbanMask("de89 3704 0044 0532 0130 00")).toBe("DE89 •••• 3000")
})

test("gibt kurze Eingaben unverändert zurück", () => {
  expect(dashIbanMask("DE89")).toBe("DE89")
})
