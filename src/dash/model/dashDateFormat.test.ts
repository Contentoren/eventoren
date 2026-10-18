import { expect, test } from "bun:test"

import { dashDateFormat } from "#src/dash/model/dashDateFormat.ts"

test("formatiert alle Stile in Europe/Berlin", () => {
  const iso = "2026-11-07T19:00:00.000Z"
  expect(dashDateFormat(iso, "kurz")).toBe("Sa., 7. Nov., 20:00")
  expect(dashDateFormat(iso, "lang")).toBe("Samstag, 7. November 2026 · 20:00 Uhr")
  expect(dashDateFormat(iso, "datum")).toBe("07.11.2026")
  expect(dashDateFormat(iso, "zeit")).toBe("20:00")
  expect(dashDateFormat(iso, "wochentag-datum")).toBe("Sa., 7. Nov. 2026")
  expect(dashDateFormat(iso, "monat-jahr")).toBe("November 2026")
})

test("beachtet die Sommerzeit bei der Umrechnung", () => {
  const iso = "2026-07-07T18:00:00.000Z"
  expect(dashDateFormat(iso, "kurz")).toBe("Di., 7. Juli, 20:00")
  expect(dashDateFormat(iso, "lang")).toBe("Dienstag, 7. Juli 2026 · 20:00 Uhr")
})

test("zeigt Wochentage vor Mitternacht korrekt an", () => {
  const iso = "2026-11-04T22:30:00.000Z"
  expect(dashDateFormat(iso, "kurz")).toBe("Mi., 4. Nov., 23:30")
})
