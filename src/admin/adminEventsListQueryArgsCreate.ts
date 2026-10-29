import { adminEventsArchiveModeGet } from "./adminEventsArchiveModeGet.ts"
import type { AdminEventsSearch } from "./adminEventsSearchParse.ts"

/** Status and text filters are local; the backend must choose one lifecycle list. */
export function adminEventsListQueryArgsCreate(search: AdminEventsSearch) {
  return { archiveOnly: adminEventsArchiveModeGet(search) }
}
