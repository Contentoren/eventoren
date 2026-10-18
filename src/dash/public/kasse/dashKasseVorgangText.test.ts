import { describe, expect, test } from "bun:test"

import { dashKasseVorgangText } from "./dashKasseVorgangText.ts"

describe("dashKasseVorgangText", () => {
  test("nutzt die Einzahl bei genau einem offenen Vorgang", () => {
    expect(dashKasseVorgangText(1)).toBe("1 offener Vorgang an anderen Kassen")
  })

  test("nutzt die Mehrzahl bei null, zwei oder mehr offenen Vorgängen", () => {
    expect(dashKasseVorgangText(0)).toBe("0 offene Vorgänge an anderen Kassen")
    expect(dashKasseVorgangText(2)).toBe("2 offene Vorgänge an anderen Kassen")
    expect(dashKasseVorgangText(5)).toBe("5 offene Vorgänge an anderen Kassen")
  })
})
