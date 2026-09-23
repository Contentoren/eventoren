import { safeParse } from "valibot"
import { type AdminListView, adminListViewSchema } from "./adminListViewSchema.ts"
import { adminListViewStorageKey } from "./adminListViewStorageKey.ts"

export function adminListViewStorageLoad(): AdminListView {
  if (typeof localStorage === "undefined") return "list"

  try {
    const storedView = localStorage.getItem(adminListViewStorageKey)
    if (storedView === null) return "list"

    const result = safeParse(adminListViewSchema, storedView)
    return result.success ? result.output : "list"
  } catch {
    return "list"
  }
}
