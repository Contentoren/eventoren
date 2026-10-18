import { expect, test } from "bun:test"

import { dashRelativeTimeFormat } from "#src/dash/model/dashRelativeTimeFormat.ts"

const now = new Date("2026-11-07T12:00:00.000Z")

test("meldet fast gleiche Zeiten als gerade eben", () => {
  expect(dashRelativeTimeFormat("2026-11-07T11:59:30.000Z", now)).toBe("gerade eben")
  expect(dashRelativeTimeFormat("2026-11-07T12:00:20.000Z", now)).toBe("gerade eben")
})

test("zählt Minuten und Stunden auf Deutsch", () => {
  expect(dashRelativeTimeFormat("2026-11-07T11:55:00.000Z", now)).toBe("vor 5 Min.")
  expect(dashRelativeTimeFormat("2026-11-07T12:05:00.000Z", now)).toBe("in 5 Min.")
  expect(dashRelativeTimeFormat("2026-11-07T09:00:00.000Z", now)).toBe("vor 3 Std.")
  expect(dashRelativeTimeFormat("2026-11-07T15:00:00.000Z", now)).toBe("in 3 Std.")
})

test("benennt gestern und morgen mit Berliner Uhrzeit", () => {
  expect(dashRelativeTimeFormat("2026-11-06T19:15:00.000Z", now)).toBe("gestern, 20:15")
  expect(dashRelativeTimeFormat("2026-11-08T19:00:00.000Z", now)).toBe("morgen, 20:00")
})

test("zählt Tage und fällt danach aufs Datum zurück", () => {
  expect(dashRelativeTimeFormat("2026-11-04T12:00:00.000Z", now)).toBe("vor 3 Tagen")
  expect(dashRelativeTimeFormat("2026-11-19T12:00:00.000Z", now)).toBe("in 12 Tagen")
  expect(dashRelativeTimeFormat("2026-10-26T12:00:00.000Z", now)).toBe("26.10.2026")
  expect(dashRelativeTimeFormat("2026-12-24T12:00:00.000Z", now)).toBe("24.12.2026")
})

test("beachtet die Sommerzeit bei gestern und morgen", () => {
  const summer = new Date("2026-07-07T12:00:00.000Z")
  expect(dashRelativeTimeFormat("2026-07-06T18:15:00.000Z", summer)).toBe("gestern, 20:15")
  expect(dashRelativeTimeFormat("2026-07-08T18:00:00.000Z", summer)).toBe("morgen, 20:00")
})
