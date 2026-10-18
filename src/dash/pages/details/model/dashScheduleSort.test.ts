import { expect, test } from "bun:test"

import type { DashScheduleItem } from "../../../model/dashScheduleItemSchema.ts"
import { dashScheduleSort } from "./dashScheduleSort.ts"

function item(id: string, time: string): DashScheduleItem {
  return { id, time, title: id, detail: "" }
}

test("dashScheduleSort sortiert nach Uhrzeit und bleibt bei Gleichstand stabil", () => {
  const items = [item("a", "20:00"), item("b", "18:00"), item("c", "18:00"), item("d", "22:00")]
  const sorted = dashScheduleSort(items)
  expect(sorted.map((entry) => entry.id)).toEqual(["b", "c", "a", "d"])
})

test("dashScheduleSort verändert die Eingabe nicht", () => {
  const items = [item("a", "20:00"), item("b", "18:00")]
  const sorted = dashScheduleSort(items)
  expect(sorted).not.toBe(items)
  expect(items.map((entry) => entry.id)).toEqual(["a", "b"])
})
