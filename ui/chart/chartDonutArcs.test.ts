import { expect, test } from "bun:test"
import { chartDonutArcs } from "./chartDonutArcs.ts"

const opts = { size: 160, thickness: 18 }

test("percents sum to 100 and angles cover 360 minus gaps", () => {
  const arcs = chartDonutArcs([60, 30, 10], opts)
  expect(arcs).toHaveLength(3)
  const percentSum = arcs.reduce((sum, arc) => sum + arc.percent, 0)
  expect(percentSum).toBeCloseTo(100, 9)
  const angleSum = arcs.reduce((sum, arc) => sum + (arc.endAngle - arc.startAngle), 0)
  expect(angleSum).toBeCloseTo(360 - 3 * 2, 9)
  expect(arcs[0]?.startAngle).toBeCloseTo(1, 9)
  expect(arcs[arcs.length - 1]?.endAngle).toBeCloseTo(359, 9)
})

test("single segment is a full ring from 0 to 360", () => {
  const arcs = chartDonutArcs([42], opts)
  expect(arcs).toHaveLength(1)
  expect(arcs[0]?.startAngle).toBe(0)
  expect(arcs[0]?.endAngle).toBe(360)
  expect(arcs[0]?.percent).toBeCloseTo(100, 9)
  expect(arcs[0]?.path).toContain("A")
})

test("returns empty array for zero total", () => {
  expect(chartDonutArcs([0, 0, 0], opts)).toEqual([])
  expect(chartDonutArcs([], opts)).toEqual([])
})

test("skips zero values and keeps the input index", () => {
  const arcs = chartDonutArcs([0, 50, 0, 50], opts)
  expect(arcs).toHaveLength(2)
  expect(arcs.map((arc) => arc.index)).toEqual([1, 3])
  expect(arcs[0]?.percent).toBeCloseTo(50, 9)
  expect(arcs[1]?.percent).toBeCloseTo(50, 9)
})
