import { createMemo, onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.ts"
import type { OrganizerDataSource } from "./OrganizerDataSource.ts"
import type { OrganizerEvent } from "./OrganizerEvent.ts"
import type { OrganizerEventGroup } from "./OrganizerEventGroup.ts"
import type { OrganizerEventListPageState } from "./OrganizerEventListPageState.ts"
import { organizerDataSourceLiveCreate } from "./organizerDataSourceLiveCreate.ts"
import { organizerEventsGroup } from "./organizerEventsGroup.ts"
import { organizerTextGet } from "./organizerTextGet.ts"

export function organizerEventListPageStateCreate(inputs?: {
  readonly dataSource?: OrganizerDataSource
}): OrganizerEventListPageState {
  const dataSource = inputs?.dataSource ?? organizerDataSourceLiveCreate()
  const events = createSignalObject<readonly OrganizerEvent[]>([])
  const loading = createSignalObject(true)
  const errorMessage = createSignalObject("")
  const text = createMemo(organizerTextGet)

  const eventListLoad = async () => {
    try {
      const result = await dataSource.eventList()
      if (!result.success) return errorMessage.set(text().loadError)
      events.set(result.data)
    } catch {
      errorMessage.set(text().loadError)
    } finally {
      loading.set(false)
    }
  }

  onMount(() => {
    void eventListLoad()
  })

  const groups = createMemo(() => organizerEventsGroup(events.get()))
  const eventTime = (value: string) =>
    new Intl.DateTimeFormat("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value))

  return { groups, text, loading: loading.get, errorMessage: errorMessage.get, eventTime }
}
