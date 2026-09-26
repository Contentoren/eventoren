import { createMemo, onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.ts"
import type { OrganizerDataSource } from "./OrganizerDataSource.ts"
import type { OrganizerEvent } from "./OrganizerEvent.ts"
import type { OrganizerEventGroup } from "./OrganizerEventGroup.ts"
import type { OrganizerEventListPageState } from "./OrganizerEventListPageState.ts"
import { organizerDataSourceLiveCreate } from "./organizerDataSourceLiveCreate.ts"
import { organizerEventsGroup } from "./organizerEventsGroup.ts"
import { organizerTextGet } from "./organizerTextGet.ts"
import { scannerLinkErrorMessageGet } from "./scannerLinkErrorMessageGet.ts"

export function organizerEventListPageStateCreate(inputs?: {
  readonly dataSource?: OrganizerDataSource
  readonly linkAccess?: boolean
}): OrganizerEventListPageState & { readonly reload: () => Promise<void> } {
  const dataSource = inputs?.dataSource ?? organizerDataSourceLiveCreate()
  const events = createSignalObject<readonly OrganizerEvent[]>([])
  const loading = createSignalObject(true)
  const errorMessage = createSignalObject("")
  const text = createMemo(organizerTextGet)

  const eventListLoad = async () => {
    loading.set(true)
    errorMessage.set("")
    try {
      const result = await dataSource.eventList()
      if (!result.success)
        return errorMessage.set(inputs?.linkAccess ? scannerLinkErrorMessageGet(result.errorMessage) : text().loadError)
      events.set(result.data)
    } catch {
      errorMessage.set(inputs?.linkAccess ? scannerLinkErrorMessageGet("") : text().loadError)
    } finally {
      loading.set(false)
    }
  }

  onMount(() => {
    void eventListLoad()
  })

  const groups = createMemo(() => organizerEventsGroup(events.get()))
  const eventTime = (value: string) => {
    const date = new Date(value)
    if (Number.isNaN(date.valueOf())) return "—"
    return new Intl.DateTimeFormat("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  return { groups, text, loading: loading.get, errorMessage: errorMessage.get, eventTime, reload: eventListLoad }
}
