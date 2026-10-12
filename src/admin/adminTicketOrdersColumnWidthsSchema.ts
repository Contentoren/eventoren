import * as v from "valibot"

const columnWidth = v.pipe(v.number(), v.finite(), v.minValue(48), v.maxValue(1600))

export const adminTicketOrdersColumnWidthsSchema = v.strictTuple([
  columnWidth,
  columnWidth,
  columnWidth,
  columnWidth,
  columnWidth,
  columnWidth,
  columnWidth,
])

export type AdminTicketOrdersColumnWidths = v.InferOutput<typeof adminTicketOrdersColumnWidthsSchema>
