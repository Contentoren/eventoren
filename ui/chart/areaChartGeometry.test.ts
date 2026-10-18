import { expect, test } from "bun:test"
import {
  areaChartAreaPath,
  areaChartBaseY,
  areaChartIndexForX,
  areaChartTooltipSide,
  areaChartTooltipTop,
  areaChartXFor,
  areaChartYFor,
} from "./areaChartGeometry.ts"

test("x positions spread evenly across the plot", () => {
  expect(areaChartXFor(0, 3, 48, 200)).toBe(48)
  expect(areaChartXFor(1, 3, 48, 200)).toBe(148)
  expect(areaChartXFor(2, 3, 48, 200)).toBe(248)
  expect(areaChartXFor(0, 1, 48, 200)).toBe(148)
})

test("y positions map max to top and zero to base", () => {
  expect(areaChartYFor(1000, 1000, 16, 200)).toBe(16)
  expect(areaChartYFor(0, 1000, 16, 200)).toBe(216)
  expect(areaChartYFor(500, 1000, 16, 200)).toBe(116)
  expect(areaChartYFor(2000, 1000, 16, 200)).toBe(16)
  expect(areaChartYFor(Number.NaN, 1000, 16, 200)).toBe(216)
})

test("base y equals bottom of the plot", () => {
  expect(areaChartBaseY(16, 200)).toBe(216)
})

test("area path closes along the base", () => {
  const path = areaChartAreaPath(
    [
      { x: 48, y: 116 },
      { x: 148, y: 66 },
      { x: 248, y: 16 },
    ],
    216,
  )
  expect(path.startsWith("M 48 116")).toBe(true)
  expect(path.endsWith("L 48 216 Z")).toBe(true)
  expect(path.includes("L 248 16")).toBe(true)
})

test("area path is empty without points", () => {
  expect(areaChartAreaPath([], 216)).toBe("")
})

test("nearest index clamps to the data range", () => {
  expect(areaChartIndexForX(48, 3, 48, 200)).toBe(0)
  expect(areaChartIndexForX(148, 3, 48, 200)).toBe(1)
  expect(areaChartIndexForX(999, 3, 48, 200)).toBe(2)
  expect(areaChartIndexForX(-5, 3, 48, 200)).toBe(0)
})

test("tooltip flips to the left near the right edge", () => {
  expect(areaChartTooltipSide(100, 640)).toBe("right")
  expect(areaChartTooltipSide(600, 640)).toBe("left")
})

test("tooltip vertical position stays inside the chart", () => {
  expect(areaChartTooltipTop(4, 240)).toBeGreaterThanOrEqual(42)
  expect(areaChartTooltipTop(236, 240)).toBeLessThanOrEqual(198)
})
