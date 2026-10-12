import { expect, test } from "bun:test"
import { createRoot, createSignal } from "solid-js"
import { inputDateTimeStateCreate } from "../ui/input/datetime/inputDateTimeStateCreate.ts"
import { timeOptions5MinGenerate } from "../ui/input/datetime/timeOptions5MinGenerate.ts"

test("time options generate every 5-minute interval of the day in order", () => {
  const options = timeOptions5MinGenerate()
  expect(options).toHaveLength(288)
  expect(options[0]).toBe("00:00")
  expect(options[1]).toBe("00:05")
  expect(options[11]).toBe("00:55")
  expect(options[12]).toBe("01:00")
  expect(options[options.length - 1]).toBe("23:55")
  for (const option of options) {
    expect(option).toMatch(/^\d{2}:\d{2}$/)
  }
  expect([...options].sort()).toEqual(options)
})

test("datetime state parses the incoming value into date and time signals", () => {
  createRoot((dispose) => {
    const [value] = createSignal("2026-10-12T18:35")
    const state = inputDateTimeStateCreate({ value })
    expect(state.date()).toBe("2026-10-12")
    expect(state.time()).toBe("18:35")
    expect(state.customTime()).toBeUndefined()
    dispose()
  })
})

test("datetime state starts empty and emits combined value once date and time are set", () => {
  createRoot((dispose) => {
    const [value] = createSignal("")
    const emitted: string[] = []
    const state = inputDateTimeStateCreate({ value, onInput: (next) => emitted.push(next) })
    expect(state.date()).toBe("")
    expect(state.time()).toBe("")

    state.dateChange("2026-10-12")
    expect(emitted).toEqual([])

    state.timeChange("18:35")
    expect(emitted).toEqual(["2026-10-12T18:35"])
    expect(state.date()).toBe("2026-10-12")
    expect(state.time()).toBe("18:35")
    dispose()
  })
})

test("datetime state emits empty string when the date is cleared", () => {
  createRoot((dispose) => {
    const [value, valueSet] = createSignal("2026-10-12T18:35")
    const emitted: string[] = []
    const state = inputDateTimeStateCreate({ value, onInput: (next) => emitted.push(next) })
    expect(state.date()).toBe("2026-10-12")

    state.dateChange("")
    expect(emitted).toEqual([""])
    valueSet("")
    expect(state.date()).toBe("")
    dispose()
  })
})

test("datetime state emits empty string when the time is cleared after a complete value", () => {
  createRoot((dispose) => {
    const [value] = createSignal("2026-10-12T18:35")
    const emitted: string[] = []
    const state = inputDateTimeStateCreate({ value, onInput: (next) => emitted.push(next) })
    state.timeChange("")
    expect(emitted).toEqual([""])
    dispose()
  })
})

test("datetime state syncs when the incoming value accessor changes", () => {
  createRoot((dispose) => {
    const [value, valueSet] = createSignal("2026-10-12T18:35")
    const state = inputDateTimeStateCreate({ value })
    expect(state.date()).toBe("2026-10-12")
    expect(state.time()).toBe("18:35")

    valueSet("2026-11-01T09:05")
    expect(state.date()).toBe("2026-11-01")
    expect(state.time()).toBe("09:05")

    valueSet("")
    expect(state.date()).toBe("")
    expect(state.time()).toBe("")
    dispose()
  })
})

test("datetime state keeps a non-5-minute time gracefully as custom time", () => {
  createRoot((dispose) => {
    const [value] = createSignal("2026-10-12T18:37")
    const state = inputDateTimeStateCreate({ value })
    expect(state.date()).toBe("2026-10-12")
    expect(state.time()).toBe("18:37")
    expect(state.customTime()).toBe("18:37")
    expect(state.timeOptions).not.toContain("18:37")
    dispose()
  })
})

test("datetime state exposes date bounds split from datetime min and max", () => {
  createRoot((dispose) => {
    const [value] = createSignal("")
    const state = inputDateTimeStateCreate({
      value,
      min: () => "2026-10-12T00:00",
      max: () => "2026-12-31T23:55",
      id: () => "event-start",
    })
    expect(state.dateMin()).toBe("2026-10-12")
    expect(state.dateMax()).toBe("2026-12-31")
    expect(state.timeId()).toBe("event-start-time")
    dispose()
  })
})
