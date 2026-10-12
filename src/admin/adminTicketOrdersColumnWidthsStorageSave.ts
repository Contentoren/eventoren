import type { AdminTicketOrdersColumnWidths } from "./adminTicketOrdersColumnWidthsSchema.ts"
import { adminTicketOrdersColumnWidthsStorageKey } from "./adminTicketOrdersColumnWidthsStorageKey.ts"

export function adminTicketOrdersColumnWidthsStorageSave(
  widths: AdminTicketOrdersColumnWidths,
  storage?: Pick<Storage, "setItem">,
): void {
  const target = storage ?? (typeof localStorage === "undefined" ? undefined : localStorage)
  if (!target) return

  try {
    target.setItem(adminTicketOrdersColumnWidthsStorageKey, JSON.stringify([...widths]))
  } catch {
    // Storage may be unavailable or full; the in-memory widths still work.
  }
}
