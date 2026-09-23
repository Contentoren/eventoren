import type { AdminListView } from "./adminListViewSchema.ts"
import { adminListViewStorageKey } from "./adminListViewStorageKey.ts"

export function adminListViewStorageSave(view: AdminListView) {
  if (typeof localStorage === "undefined") return

  try {
    localStorage.setItem(adminListViewStorageKey, view)
  } catch {
    // Storage may be unavailable or full; the in-memory preference still works.
  }
}
