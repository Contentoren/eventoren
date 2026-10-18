import { describe, expect, test } from "bun:test"

import { dashTeamEmailsParse } from "./dashTeamEmailsParse.ts"

describe("dashTeamEmailsParse", () => {
  test("trennt Komma, Semikolon und Zeilenumbruch", () => {
    const parsed = dashTeamEmailsParse("a@example.de, b@example.de;c@example.de\nd@example.de")
    expect(parsed.valid).toEqual(["a@example.de", "b@example.de", "c@example.de", "d@example.de"])
    expect(parsed.invalid).toEqual([])
  })

  test("sammelt ungültige Adressen und entfernt Duplikate", () => {
    const parsed = dashTeamEmailsParse("gut@example.de, kein-mail, GUT@example.de ; auch-falsch@ ")
    expect(parsed.valid).toEqual(["gut@example.de"])
    expect(parsed.invalid).toEqual(["kein-mail", "auch-falsch@"])
  })

  test("leerer Text ergibt leere Listen", () => {
    expect(dashTeamEmailsParse("  \n,; ")).toEqual({ valid: [], invalid: [] })
  })
})
