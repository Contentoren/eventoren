import { expect, test } from "bun:test"

import { dashRandomCreate } from "./dashRandomCreate.ts"

test("gleicher Seed ergibt gleiche Folge", () => {
  const first = dashRandomCreate(42)
  const second = dashRandomCreate(42)
  const firstSequence = [first(), first(), first(), first(), first()]
  const secondSequence = [second(), second(), second(), second(), second()]
  expect(firstSequence).toEqual(secondSequence)
})

test("liefert Werte im Bereich [0, 1)", () => {
  const random = dashRandomCreate(7)
  for (let index = 0; index < 100; index += 1) {
    const value = random()
    expect(value).toBeGreaterThanOrEqual(0)
    expect(value).toBeLessThan(1)
  }
})

test("unterschiedliche Seeds ergeben unterschiedliche Folgen", () => {
  const first = dashRandomCreate(1)
  const second = dashRandomCreate(2)
  const firstSequence = [first(), first(), first()]
  const secondSequence = [second(), second(), second()]
  expect(firstSequence).not.toEqual(secondSequence)
})
