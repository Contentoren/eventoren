import { expect, test } from "bun:test"

import { dashListItemMove } from "./dashListItemMove.ts"

const items = [{ id: "a" }, { id: "b" }, { id: "c" }]

test("dashListItemMove zieht das Element vor das Ziel", () => {
  expect(dashListItemMove(items, "a", "c").map((entry) => entry.id)).toEqual(["b", "a", "c"])
  expect(dashListItemMove(items, "c", "a").map((entry) => entry.id)).toEqual(["c", "a", "b"])
})

test("dashListItemMove mit gleicher oder unbekannter Id gibt eine unveränderte Kopie zurück", () => {
  const same = dashListItemMove(items, "b", "b")
  expect(same).toEqual(items)
  expect(same).not.toBe(items)
  const unknown = dashListItemMove(items, "x", "a")
  expect(unknown).toEqual(items)
  expect(unknown).not.toBe(items)
  const unknownTarget = dashListItemMove(items, "a", "x")
  expect(unknownTarget).toEqual(items)
})
