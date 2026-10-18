import { describe, expect, test } from "bun:test"

import { dashGuestBulkParse } from "./dashGuestBulkParse.ts"

describe("dashGuestBulkParse", () => {
  test("parst Komma-, Semikolon- und reine Namenszeilen", () => {
    const parsed = dashGuestBulkParse("Anna Berger, anna@example.de\nBen Clark;ben@example.de\nCaro")
    expect(parsed.errors).toEqual([])
    expect(parsed.entries).toHaveLength(3)
    expect(parsed.entries[0]).toMatchObject({ name: "Anna Berger", email: "anna@example.de", line: 1 })
    expect(parsed.entries[1]).toMatchObject({ name: "Ben Clark", email: "ben@example.de", line: 2 })
    expect(parsed.entries[2]).toMatchObject({ name: "Caro", email: "", line: 3 })
  })

  test("meldet ungültige E-Mails mit Zeilennummer und überspringt Leerzeilen", () => {
    const parsed = dashGuestBulkParse("\nDana, keine-mail\nEli, eli@example.de\n, ohne@name.de")
    expect(parsed.entries).toHaveLength(1)
    expect(parsed.entries[0]).toMatchObject({ name: "Eli" })
    expect(parsed.errors).toHaveLength(2)
    expect(parsed.errors[0]).toContain("Zeile 2")
    expect(parsed.errors[1]).toContain("Zeile 4")
  })

  test("meldet Zeilen mit mehreren Adressen", () => {
    const parsed = dashGuestBulkParse("Finn, a@b.de, c@d.de")
    expect(parsed.entries).toHaveLength(0)
    expect(parsed.errors).toHaveLength(1)
    expect(parsed.errors[0]).toContain("Zeile 1")
  })
})
