import { expect, test } from "bun:test"
import { dashFileNameCreate } from "./dashFileNameCreate.ts"

test("verbindet slugs mit Berliner Datum", () => {
  const name = dashFileNameCreate(
    ["Indie Night: Lichtspiel", "Teilnehmer"],
    "csv",
    new Date("2026-10-18T10:00:00.000Z"),
  )
  expect(name).toBe("indie-night-lichtspiel_teilnehmer_2026-10-18.csv")
})

test("nutzt das Berliner Datum auch nach Mitternacht UTC", () => {
  const name = dashFileNameCreate(["Abrechnung"], "pdf", new Date("2026-10-18T00:30:00.000Z"))
  expect(name).toBe("abrechnung_2026-10-18.pdf")
})

test("filtert leere Teile und führende Punkte der Endung", () => {
  const name = dashFileNameCreate(["Jazz & Wein", "!!!"], ".xlsx", new Date("2026-10-18T10:00:00.000Z"))
  expect(name).toBe("jazz-wein_2026-10-18.xlsx")
})
