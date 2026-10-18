import { describe, expect, test } from "bun:test"

import { dashEventDuplicateDefaultIso } from "./dashEventDialogsTime.ts"

describe("dashEventDuplicateDefaultIso", () => {
  test("legt das Duplikat-Datum auf dieselbe Uhrzeit +7 Tage", () => {
    const iso = dashEventDuplicateDefaultIso("2026-11-07T20:00:00.000Z")
    expect(iso).toBe(new Date(Date.parse("2026-11-07T20:00:00.000Z") + 7 * 24 * 3_600_000).toISOString())
  })

  test("gibt null für fehlende oder ungültige Zeiten zurück", () => {
    expect(dashEventDuplicateDefaultIso(null)).toBeNull()
    expect(dashEventDuplicateDefaultIso("kein-datum")).toBeNull()
  })
})
