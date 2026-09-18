import { createMemo, onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.ts"
import { userSessionBrowserRestore } from "../auth/ui/signals/userSessionBrowserRestore.ts"
import { userTokenGet } from "../auth/ui/signals/userSessionSignal.ts"
import type { OrganizerDataSource } from "./OrganizerDataSource.ts"
import type { OrganizerEvent } from "./OrganizerEvent.ts"
import type { OrganizerEventGroup } from "./OrganizerEventGroup.ts"
import type { OrganizerEventListPageState } from "./OrganizerEventListPageState.ts"
import { organizerDataSourceLiveCreate } from "./organizerDataSourceLiveCreate.ts"
import { organizerTextGet } from "./organizerTextGet.ts"

export function organizerEventListPageStateCreate(inputs?: {
  readonly dataSource?: OrganizerDataSource
  readonly token?: () => string
}): OrganizerEventListPageState {
  const dataSource = inputs?.dataSource ?? organizerDataSourceLiveCreate()
  const events = createSignalObject<readonly OrganizerEvent[]>([])
  const loading = createSignalObject(true)
  const errorMessage = createSignalObject("")
  const text = createMemo(organizerTextGet)

  const eventListLoad = async () => {
    try {
      if (!inputs?.dataSource) userSessionBrowserRestore()
      const result = await dataSource.eventList(inputs?.token?.() ?? userTokenGet())
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

function organizerEventsGroup(events: readonly OrganizerEvent[]): readonly OrganizerEventGroup[] {
  const formatter = new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
  const groups = new Map<string, OrganizerEventGroup>()
  for (const event of [...events].sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt))) {
    const date = new Date(event.startsAt)
    const key = Number.isNaN(date.valueOf())
      ? event.startsAt
      : `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
    const current = groups.get(key)
    if (current) {
      groups.set(key, { ...current, events: [...current.events, event] })
      continue
    }
    groups.set(key, {
      key,
      heading: Number.isNaN(date.valueOf()) ? event.startsAt : formatter.format(date),
      events: [event],
    })
  }
  return [...groups.values()]
}
