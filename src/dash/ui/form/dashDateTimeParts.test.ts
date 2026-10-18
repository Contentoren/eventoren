import { expect, test } from "bun:test"

import { dashDateTimeJoin, dashDateTimeSplit } from "#src/dash/ui/form/dashDateTimeParts.ts"

test("teilt datetime-local in Datum und Uhrzeit", () => {
  expect(dashDateTimeSplit("2026-08-14T20:00")).toEqual({ date: "2026-08-14", time: "20:00" })
  expect(dashDateTimeSplit("")).toEqual({ date: "", time: "" })
  expect(dashDateTimeSplit("ungültig")).toEqual({ date: "", time: "" })
})

test("fügt Datum und Uhrzeit zusammen, Fallback 20:00 bei leerer Zeit", () => {
  expect(dashDateTimeJoin("2026-08-14", "19:30")).toBe("2026-08-14T19:30")
  expect(dashDateTimeJoin("2026-08-14", "")).toBe("2026-08-14T20:00")
  expect(dashDateTimeJoin("", "")).toBe("")
  expect(dashDateTimeJoin("", "19:30")).toBe("")
})
