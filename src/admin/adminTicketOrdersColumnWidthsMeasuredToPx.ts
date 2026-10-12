import { safeParse } from "valibot"
import { adminTicketOrdersColumnWidthsMax } from "./adminTicketOrdersColumnWidthsMax.ts"
import { adminTicketOrdersColumnWidthsMin } from "./adminTicketOrdersColumnWidthsMin.ts"
import {
  type AdminTicketOrdersColumnWidths,
  adminTicketOrdersColumnWidthsSchema,
} from "./adminTicketOrdersColumnWidthsSchema.ts"

export function adminTicketOrdersColumnWidthsMeasuredToPx(
  measured: readonly number[],
): AdminTicketOrdersColumnWidths | null {
  if (measured.length !== adminTicketOrdersColumnWidthsMin.length) return null

  const px: number[] = []
  for (let index = 0; index < measured.length; index += 1) {
    const value = measured[index]
    if (typeof value !== "number" || !Number.isFinite(value)) return null
    const min = adminTicketOrdersColumnWidthsMin[index] ?? 72
    px.push(Math.min(adminTicketOrdersColumnWidthsMax, Math.max(min, Math.round(value))))
  }

  const result = safeParse(adminTicketOrdersColumnWidthsSchema, px)
  return result.success ? result.output : null
}
