import { adminTicketOrdersColumnWidthsResize } from "./adminTicketOrdersColumnWidthsResize.ts"
import type { AdminTicketOrdersColumnWidths } from "./adminTicketOrdersColumnWidthsSchema.ts"

export function adminTicketOrdersColumnWidthsResizeByKey(
  widths: AdminTicketOrdersColumnWidths,
  index: number,
  key: string,
  step = 16,
): AdminTicketOrdersColumnWidths {
  const distance = Number.isFinite(step) && step > 0 ? step : 16
  if (key === "ArrowRight") return adminTicketOrdersColumnWidthsResize(widths, index, distance)
  if (key === "ArrowLeft") return adminTicketOrdersColumnWidthsResize(widths, index, -distance)
  return widths
}
