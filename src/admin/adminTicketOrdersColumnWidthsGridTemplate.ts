import { adminTicketOrdersColumnWidthsDefault } from "./adminTicketOrdersColumnWidthsDefault.ts"
import { adminTicketOrdersColumnWidthsMin } from "./adminTicketOrdersColumnWidthsMin.ts"
import type { AdminTicketOrdersColumnWidths } from "./adminTicketOrdersColumnWidthsSchema.ts"

export function adminTicketOrdersColumnWidthsGridTemplate(widths: AdminTicketOrdersColumnWidths | null): string {
  if (widths === null) {
    return adminTicketOrdersColumnWidthsDefault.map((fraction) => `minmax(0,${fraction}fr)`).join(" ")
  }

  return widths
    .map((width, index) => {
      const min = adminTicketOrdersColumnWidthsMin[index] ?? 72
      const px = Math.max(Math.round(width), min)
      return `minmax(${min}px,${px}px)`
    })
    .join(" ")
}
