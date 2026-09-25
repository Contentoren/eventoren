import { expect, test } from "bun:test"
import { createRoot, createSignal } from "solid-js"
import { eventFilterBarStateCreate } from "../src/events/eventFilterBarStateCreate.ts"

test("labels a partial cursor count as a minimum and an exhausted count as exact", () => {
  const resultLabelGet = (count: number, done: boolean) =>
    createRoot((dispose) => {
      const [resultCount] = createSignal(count)
      const [isDone] = createSignal(done)
      const state = eventFilterBarStateCreate({
        filter: () => ({ query: "", location: "", category: "alle", timeWindow: "alle" }),
        onFilterChange: () => {},
        resultCount,
        isDone,
      })
      const resultLabel = state.resultLabel()
      dispose()
      return resultLabel
    })

  expect(resultLabelGet(0, false)).toBe("Events werden geladen")
  expect(resultLabelGet(1, false)).toBe("Mindestens 1 Event gefunden")
  expect(resultLabelGet(12, false)).toBe("Mindestens 12 Events gefunden")
  expect(resultLabelGet(12, true)).toBe("12 Events gefunden")
})
