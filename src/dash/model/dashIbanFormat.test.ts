import { expect, test } from "bun:test"

import { dashIbanFormat } from "./dashIbanFormat.ts"

test("formatiert IBANs in Vierergruppen", () => {
  expect(dashIbanFormat("DE89370400440532013000")).toBe("DE89 3704 0044 0532 0130 00")
})

test("normalisiert Kleinbuchstaben und Leerzeichen", () => {
  expect(dashIbanFormat("de89 3704 0044 0532 0130 00")).toBe("DE89 3704 0044 0532 0130 00")
})
