import type { AdminEventsSearch } from "./adminEventsSearchParse.ts"

export function adminEventsArchiveModeGet(search: AdminEventsSearch) {
  return search.archive ?? (search.showArchived === true || search.status === "archived")
}
