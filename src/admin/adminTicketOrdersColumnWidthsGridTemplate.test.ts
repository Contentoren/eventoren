import { expect, test } from "bun:test"
import { adminTicketOrdersColumnWidthsDefault } from "./adminTicketOrdersColumnWidthsDefault.ts"
import { adminTicketOrdersColumnWidthsGridTemplate } from "./adminTicketOrdersColumnWidthsGridTemplate.ts"
import { adminTicketOrdersColumnWidthsMin } from "./adminTicketOrdersColumnWidthsMin.ts"

test("default grid keeps the existing desktop fraction raster", () => {
  expect([...adminTicketOrdersColumnWidthsDefault]).toEqual([2, 1.5, 1.4, 1, 1, 0.8, 1])
  expect(adminTicketOrdersColumnWidthsGridTemplate(null)).toBe(
    "minmax(0,2fr) minmax(0,1.5fr) minmax(0,1.4fr) minmax(0,1fr) minmax(0,1fr) minmax(0,0.8fr) minmax(0,1fr)",
  )
})

test("custom widths render as shared pixel grid with minimums", () => {
  expect(adminTicketOrdersColumnWidthsGridTemplate([220, 180, 150, 120, 120, 90, 140])).toBe(
    "minmax(160px,220px) minmax(120px,180px) minmax(110px,150px) minmax(96px,120px) minmax(96px,120px) minmax(72px,90px) minmax(110px,140px)",
  )
})

test("pixel grid never renders below the minimum widths", () => {
  const template = adminTicketOrdersColumnWidthsGridTemplate([10, 20, 30, 40, 50, 60, 70])
  expect(template).toBe([...adminTicketOrdersColumnWidthsMin].map((min) => `minmax(${min}px,${min}px)`).join(" "))
})
