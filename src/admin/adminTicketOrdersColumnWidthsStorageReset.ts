import { adminTicketOrdersColumnWidthsStorageKey } from "./adminTicketOrdersColumnWidthsStorageKey.ts"

export function adminTicketOrdersColumnWidthsStorageReset(storage?: Pick<Storage, "removeItem">): void {
  const target = storage ?? (typeof localStorage === "undefined" ? undefined : localStorage)
  if (!target) return

  try {
    target.removeItem(adminTicketOrdersColumnWidthsStorageKey)
  } catch {
    // Storage may be unavailable; callers fall back to the default grid anyway.
  }
}
