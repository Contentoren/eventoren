import { expect, test } from "bun:test"
import { adminTicketOrdersColumnWidthsMax } from "./adminTicketOrdersColumnWidthsMax.ts"
import { adminTicketOrdersColumnWidthsMeasuredToPx } from "./adminTicketOrdersColumnWidthsMeasuredToPx.ts"
import { adminTicketOrdersColumnWidthsMin } from "./adminTicketOrdersColumnWidthsMin.ts"

test("measured desktop columns become pixel widths", () => {
  expect(adminTicketOrdersColumnWidthsMeasuredToPx([180.4, 220.6, 260, 120, 90, 80, 120, 120, 120, 140])).toEqual([
    180, 221, 260, 120, 90, 80, 120, 120, 120, 140,
  ])
})

test("measured columns respect minimums and maximums", () => {
  const px = adminTicketOrdersColumnWidthsMeasuredToPx([10, 20, 30, 40, 50, 55, 70, 75, 79, 5000])
  expect(px).not.toBeNull()
  expect([...(px ?? [])].slice(0, 9)).toEqual([...adminTicketOrdersColumnWidthsMin].slice(0, 9))
  expect(px?.[9]).toBe(adminTicketOrdersColumnWidthsMax)
})

test("invalid measurements keep the default grid", () => {
  expect(adminTicketOrdersColumnWidthsMeasuredToPx([220, 180, 150, 120, 120, 90])).toBeNull()
  expect(adminTicketOrdersColumnWidthsMeasuredToPx([180, 220, 260, 120, 90, 80, 120, 120, 120])).toBeNull()
  expect(adminTicketOrdersColumnWidthsMeasuredToPx([180, 220, 260, 120, 90, 80, 120, 120, 120, 140, 10])).toBeNull()
  expect(adminTicketOrdersColumnWidthsMeasuredToPx([180, 220, 260, 120, 90, 80, 120, 120, 120, Number.NaN])).toBeNull()
  expect(
    adminTicketOrdersColumnWidthsMeasuredToPx([180, 220, 260, 120, 90, 80, 120, 120, 120, Number.POSITIVE_INFINITY]),
  ).toBeNull()
})
