import { expect, test } from "bun:test"
import { adminTicketOrdersColumnWidthsMax } from "./adminTicketOrdersColumnWidthsMax.ts"
import { adminTicketOrdersColumnWidthsMeasuredToPx } from "./adminTicketOrdersColumnWidthsMeasuredToPx.ts"
import { adminTicketOrdersColumnWidthsMin } from "./adminTicketOrdersColumnWidthsMin.ts"

test("measured desktop columns become pixel widths", () => {
  expect(adminTicketOrdersColumnWidthsMeasuredToPx([220.4, 180.6, 150, 120, 120, 90, 140])).toEqual([
    220, 181, 150, 120, 120, 90, 140,
  ])
})

test("measured columns respect minimums and maximums", () => {
  const px = adminTicketOrdersColumnWidthsMeasuredToPx([10, 20, 30, 40, 50, 60, 5000])
  expect(px).not.toBeNull()
  expect([...(px ?? [])].slice(0, 6)).toEqual([...adminTicketOrdersColumnWidthsMin].slice(0, 6))
  expect(px?.[6]).toBe(adminTicketOrdersColumnWidthsMax)
})

test("invalid measurements keep the default grid", () => {
  expect(adminTicketOrdersColumnWidthsMeasuredToPx([220, 180, 150, 120, 120, 90])).toBeNull()
  expect(adminTicketOrdersColumnWidthsMeasuredToPx([220, 180, 150, 120, 120, 90, 140, 10])).toBeNull()
  expect(adminTicketOrdersColumnWidthsMeasuredToPx([220, 180, 150, 120, 120, 90, Number.NaN])).toBeNull()
  expect(adminTicketOrdersColumnWidthsMeasuredToPx([220, 180, 150, 120, 120, 90, Number.POSITIVE_INFINITY])).toBeNull()
})
