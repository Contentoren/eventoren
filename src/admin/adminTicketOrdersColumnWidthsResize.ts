import { adminTicketOrdersColumnWidthsMax } from "./adminTicketOrdersColumnWidthsMax.ts"
import { adminTicketOrdersColumnWidthsMin } from "./adminTicketOrdersColumnWidthsMin.ts"
import type { AdminTicketOrdersColumnWidths } from "./adminTicketOrdersColumnWidthsSchema.ts"

export function adminTicketOrdersColumnWidthsResize(
  widths: AdminTicketOrdersColumnWidths,
  index: number,
  deltaX: number,
): AdminTicketOrdersColumnWidths {
  if (!Number.isInteger(index) || index < 0 || index >= widths.length) return widths
  if (!Number.isFinite(deltaX) || deltaX === 0) return widths

  const current = widths[index]
  if (current === undefined) return widths

  const min = adminTicketOrdersColumnWidthsMin[index] ?? 72
  const next = Math.min(adminTicketOrdersColumnWidthsMax, Math.max(min, Math.round(current + deltaX)))
  if (next === current) return widths

  const resized = [...widths] as AdminTicketOrdersColumnWidths
  resized[index] = next
  return resized
}
