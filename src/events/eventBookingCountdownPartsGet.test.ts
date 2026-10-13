import { describe, expect, test } from "bun:test"
import { eventBookingCountdownPartsGet } from "./eventBookingCountdownPartsGet.ts"

describe("Buchungsstart-Countdown", () => {
  test("zerlegt die verbleibende Zeit in Tage, Stunden, Minuten und Sekunden", () => {
    expect(eventBookingCountdownPartsGet(new Date(90061000).toISOString(), 0).map((part) => part.value)).toEqual([
      "01",
      "01",
      "01",
      "01",
    ])
  })
  test("zeigt vor der Freigabe niemals vorzeitig null Sekunden", () => {
    expect(eventBookingCountdownPartsGet(new Date(1000).toISOString(), 999)[3]?.value).toBe("01")
  })
  test("begrenzt vergangene und ungültige Termine auf null", () => {
    for (const date of [undefined, "invalid", new Date(0).toISOString()]) {
      expect(eventBookingCountdownPartsGet(date, 1000).every((part) => part.value === "00")).toBe(true)
    }
  })
})
