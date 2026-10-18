import { describe, expect, test } from "bun:test"

import { dashWizardEndDefault } from "./dashWizardEndDefault.ts"

const start = "2026-11-14T19:00:00.000Z"

describe("dashWizardEndDefault", () => {
  test("setzt leeres Ende auf Beginn + 3 h", () => {
    expect(dashWizardEndDefault({ startsAt: start, endsAt: null })).toBe("2026-11-14T22:00:00.000Z")
  })

  test("setzt Ende ≤ Beginn auf Beginn + 3 h", () => {
    expect(dashWizardEndDefault({ startsAt: start, endsAt: start })).toBe("2026-11-14T22:00:00.000Z")
    expect(dashWizardEndDefault({ startsAt: start, endsAt: "2026-11-14T18:00:00.000Z" })).toBe(
      "2026-11-14T22:00:00.000Z",
    )
  })

  test("lässt ein späteres Ende unverändert", () => {
    expect(dashWizardEndDefault({ startsAt: start, endsAt: "2026-11-15T01:00:00.000Z" })).toBe(
      "2026-11-15T01:00:00.000Z",
    )
  })

  test("ohne gültigen Beginn bleibt das Ende unverändert", () => {
    expect(dashWizardEndDefault({ startsAt: null, endsAt: null })).toBeNull()
    expect(dashWizardEndDefault({ startsAt: "ungültig", endsAt: "2026-11-15T01:00:00.000Z" })).toBe(
      "2026-11-15T01:00:00.000Z",
    )
  })
})
