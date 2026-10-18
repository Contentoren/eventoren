import { expect, test } from "bun:test"
import { chartScaleNice } from "./chartScaleNice.ts"

test("returns integer ticks from 0 for zero max value", () => {
  expect(chartScaleNice(0)).toEqual({ max: 4, ticks: [0, 1, 2, 3, 4] })
})

test("returns nice scale covering 7 with ascending ticks starting at 0", () => {
  const scale = chartScaleNice(7)
  expect(scale.max).toBeGreaterThanOrEqual(7)
  expect(scale.ticks[0]).toBe(0)
  expect(scale.ticks[scale.ticks.length - 1]).toBe(scale.max)
  const ascending = scale.ticks.every((tick, index) => index === 0 || tick > (scale.ticks[index - 1] ?? 0))
  expect(ascending).toBe(true)
  expect(scale).toEqual({ max: 8, ticks: [0, 2, 4, 6, 8] })
})

test("covers 1234 with a 5-family step", () => {
  const scale = chartScaleNice(1234)
  expect(scale.max).toBeGreaterThanOrEqual(1234)
  expect(scale).toEqual({ max: 2000, ticks: [0, 500, 1000, 1500, 2000] })
})

test("covers 98765", () => {
  const scale = chartScaleNice(98765)
  expect(scale.max).toBeGreaterThanOrEqual(98765)
  expect(scale.ticks[0]).toBe(0)
  expect(scale.ticks[scale.ticks.length - 1]).toBe(scale.max)
  expect(scale).toEqual({ max: 100000, ticks: [0, 25000, 50000, 75000, 100000] })
})

test("handles non-finite and negative input", () => {
  expect(chartScaleNice(Number.NaN)).toEqual({ max: 4, ticks: [0, 1, 2, 3, 4] })
  expect(chartScaleNice(Number.POSITIVE_INFINITY)).toEqual({ max: 4, ticks: [0, 1, 2, 3, 4] })
  expect(chartScaleNice(-5)).toEqual({ max: 4, ticks: [0, 1, 2, 3, 4] })
})
