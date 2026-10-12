import { safeParse } from "valibot"
import {
  type AdminTicketOrdersColumnWidths,
  adminTicketOrdersColumnWidthsSchema,
} from "./adminTicketOrdersColumnWidthsSchema.ts"
import { adminTicketOrdersColumnWidthsStorageKey } from "./adminTicketOrdersColumnWidthsStorageKey.ts"

export function adminTicketOrdersColumnWidthsStorageLoad(
  storage?: Pick<Storage, "getItem">,
): AdminTicketOrdersColumnWidths | null {
  const target = storage ?? (typeof localStorage === "undefined" ? undefined : localStorage)
  if (!target) return null

  let raw: string | null
  try {
    raw = target.getItem(adminTicketOrdersColumnWidthsStorageKey)
  } catch {
    return null
  }
  if (raw === null) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }

  const result = safeParse(adminTicketOrdersColumnWidthsSchema, parsed)
  return result.success ? result.output : null
}
