import { expect, test } from "bun:test"
import { chartPathMonotone } from "./chartPathMonotone.ts"

test("returns empty string for no points", () => {
  expect(chartPathMonotone([])).toBe("")
})

test("returns a Move for a single point", () => {
  expect(chartPathMonotone([{ x: 3, y: 7 }])).toBe("M 3 7")
})

test("returns a line for two points", () => {
  expect(
    chartPathMonotone([
      { x: 0, y: 5 },
      { x: 10, y: 15 },
    ]),
  ).toBe("M 0 5 L 10 15")
})

test("keeps a flat series flat (no overshoot)", () => {
  const points = [
    { x: 0, y: 20 },
    { x: 10, y: 20 },
    { x: 20, y: 20 },
    { x: 30, y: 20 },
  ]
  const path = chartPathMonotone(points)
  const numbers = path.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? []
  const ys = numbers.filter((_, index) => index % 2 === 1)
  expect(ys.length).toBeGreaterThan(0)
  for (const y of ys) expect(y).toBe(20)
})

test("keeps a rising series monotone (control points within neighbouring y range)", () => {
  const points = [
    { x: 0, y: 0 },
    { x: 10, y: 8 },
    { x: 20, y: 9 },
    { x: 30, y: 30 },
  ]
  const path = chartPathMonotone(points)
  expect(path.startsWith("M 0 0")).toBe(true)
  expect(path.endsWith("30 30")).toBe(true)
  const curves = path.split(" C ").slice(1)
  expect(curves).toHaveLength(points.length - 1)
  for (const [curveIndex, curve] of curves.entries()) {
    const numbers = curve.trim().split(" ").map(Number)
    expect(numbers).toHaveLength(6)
    const low = Math.min(points[curveIndex]?.y ?? 0, points[curveIndex + 1]?.y ?? 0)
    const high = Math.max(points[curveIndex]?.y ?? 0, points[curveIndex + 1]?.y ?? 0)
    for (const y of [numbers[1], numbers[3], numbers[5]]) {
      expect(y).toBeGreaterThanOrEqual(low - 1e-9)
      expect(y).toBeLessThanOrEqual(high + 1e-9)
    }
  }
})
