import { expect, test } from "bun:test"
import { adminTicketOrdersColumnWidthsDefault } from "./adminTicketOrdersColumnWidthsDefault.ts"
import { adminTicketOrdersColumnWidthsGridTemplate } from "./adminTicketOrdersColumnWidthsGridTemplate.ts"
import { adminTicketOrdersColumnWidthsMin } from "./adminTicketOrdersColumnWidthsMin.ts"

test("default grid keeps the existing desktop fraction raster", () => {
  expect([...adminTicketOrdersColumnWidthsDefault]).toEqual([1.4, 1.5, 2, 1, 0.8, 0.6, 1, 1, 1, 1])
  expect(adminTicketOrdersColumnWidthsGridTemplate(null)).toBe(
    "minmax(0,1.4fr) minmax(0,1.5fr) minmax(0,2fr) minmax(0,1fr) minmax(0,0.8fr) minmax(0,0.6fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)",
  )
})

test("custom widths render as shared pixel grid with minimums", () => {
  expect(adminTicketOrdersColumnWidthsGridTemplate([180, 220, 260, 120, 90, 80, 120, 120, 120, 140])).toBe(
    "minmax(80px,180px) minmax(96px,220px) minmax(120px,260px) minmax(64px,120px) minmax(64px,90px) minmax(56px,80px) minmax(72px,120px) minmax(80px,120px) minmax(80px,120px) minmax(110px,140px)",
  )
})

test("pixel grid never renders below the minimum widths", () => {
  const template = adminTicketOrdersColumnWidthsGridTemplate([10, 20, 30, 40, 50, 55, 70, 75, 79, 100])
  expect(template).toBe([...adminTicketOrdersColumnWidthsMin].map((min) => `minmax(${min}px,${min}px)`).join(" "))
})
