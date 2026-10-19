import { expect, test } from "bun:test"
import { adminTicketOrdersColumnWidthsMax } from "./adminTicketOrdersColumnWidthsMax.ts"
import { adminTicketOrdersColumnWidthsMin } from "./adminTicketOrdersColumnWidthsMin.ts"
import { adminTicketOrdersColumnWidthsResize } from "./adminTicketOrdersColumnWidthsResize.ts"
import { adminTicketOrdersColumnWidthsResizeByKey } from "./adminTicketOrdersColumnWidthsResizeByKey.ts"
import type { AdminTicketOrdersColumnWidths } from "./adminTicketOrdersColumnWidthsSchema.ts"

const widths: AdminTicketOrdersColumnWidths = [180, 220, 260, 120, 90, 80, 120, 120, 120, 140]

test("drag delta grows and shrinks a single column", () => {
  expect(adminTicketOrdersColumnWidthsResize(widths, 0, 30)).toEqual([210, 220, 260, 120, 90, 80, 120, 120, 120, 140])
  expect(adminTicketOrdersColumnWidthsResize(widths, 1, -20)).toEqual([180, 200, 260, 120, 90, 80, 120, 120, 120, 140])
})

test("resize never drops below the column minimum", () => {
  const resized = adminTicketOrdersColumnWidthsResize(widths, 4, -1000)
  expect(resized[4]).toBe(adminTicketOrdersColumnWidthsMin[4])
  expect(adminTicketOrdersColumnWidthsResize(widths, 0, -1000)[0]).toBe(adminTicketOrdersColumnWidthsMin[0])
})

test("resize never grows beyond the column maximum", () => {
  expect(adminTicketOrdersColumnWidthsResize(widths, 0, 10000)[0]).toBe(adminTicketOrdersColumnWidthsMax)
})

test("resize leaves other columns untouched and the input unchanged", () => {
  const resized = adminTicketOrdersColumnWidthsResize(widths, 2, 12)
  expect([...resized]).toEqual([180, 220, 272, 120, 90, 80, 120, 120, 120, 140])
  expect([...widths]).toEqual([180, 220, 260, 120, 90, 80, 120, 120, 120, 140])
})

test("invalid drag input returns the widths unchanged", () => {
  expect(adminTicketOrdersColumnWidthsResize(widths, -1, 20)).toBe(widths)
  expect(adminTicketOrdersColumnWidthsResize(widths, 10, 20)).toBe(widths)
  expect(adminTicketOrdersColumnWidthsResize(widths, 1.5, 20)).toBe(widths)
  expect(adminTicketOrdersColumnWidthsResize(widths, 0, 0)).toBe(widths)
  expect(adminTicketOrdersColumnWidthsResize(widths, 0, Number.NaN)).toBe(widths)
})

test("arrow keys move the column by one step", () => {
  expect(adminTicketOrdersColumnWidthsResizeByKey(widths, 0, "ArrowRight")).toEqual([
    196, 220, 260, 120, 90, 80, 120, 120, 120, 140,
  ])
  expect(adminTicketOrdersColumnWidthsResizeByKey(widths, 0, "ArrowLeft")).toEqual([
    164, 220, 260, 120, 90, 80, 120, 120, 120, 140,
  ])
})

test("arrow keys respect minimums and custom steps", () => {
  expect(adminTicketOrdersColumnWidthsResizeByKey(widths, 4, "ArrowLeft", 48)[4]).toBe(
    adminTicketOrdersColumnWidthsMin[4],
  )
  expect(adminTicketOrdersColumnWidthsResizeByKey(widths, 0, "ArrowRight", 40)[0]).toBe(220)
})

test("other keys and invalid steps keep the widths unchanged", () => {
  expect(adminTicketOrdersColumnWidthsResizeByKey(widths, 0, "Enter")).toBe(widths)
  expect(adminTicketOrdersColumnWidthsResizeByKey(widths, 0, "ArrowUp")).toBe(widths)
  expect(adminTicketOrdersColumnWidthsResizeByKey(widths, 0, "ArrowRight", -4)[0]).toBe(196)
})
