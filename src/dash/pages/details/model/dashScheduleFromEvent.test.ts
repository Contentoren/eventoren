import { expect, test } from "bun:test"

import { dashScheduleFromEvent } from "./dashScheduleFromEvent.ts"

test("dashScheduleFromEvent erzeugt Einlass, Beginn und Ende in Europe/Berlin", () => {
  const items = dashScheduleFromEvent({
    doorsAt: "2026-08-15T16:00:00.000Z",
    startsAt: "2026-08-15T17:00:00.000Z",
    endsAt: "2026-08-15T21:30:00.000Z",
  })
  expect(items.map((item) => item.title)).toEqual(["Einlass", "Beginn", "Ende"])
  expect(items.map((item) => item.time)).toEqual(["18:00", "19:00", "23:30"])
  expect(new Set(items.map((item) => item.id)).size).toBe(3)
})

test("dashScheduleFromEvent ohne Einlass erzeugt nur Beginn und Ende", () => {
  const items = dashScheduleFromEvent({
    doorsAt: null,
    startsAt: "2026-01-15T18:00:00.000Z",
    endsAt: "2026-01-15T22:00:00.000Z",
  })
  expect(items.map((item) => item.title)).toEqual(["Beginn", "Ende"])
  expect(items.map((item) => item.time)).toEqual(["19:00", "23:00"])
})
