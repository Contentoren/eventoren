import { createMemo, createRenderEffect } from "solid-js"
import { api } from "#convex/_generated/api.js"
import { mutationCreate } from "#src/utils/convex_client/mutationCreate.ts"
import { queryPaginatedCreate } from "#src/utils/convex_client/queryPaginatedCreate.ts"
import { createSignalObject } from "#ui/utils/createSignalObject.ts"
import type { AdminEventItem } from "./AdminEventItem.ts"
import type { AdminEventOverviewPanelProps } from "./AdminEventOverviewPanelProps.ts"
import { adminEventDuplicateKeyGet } from "./adminEventDuplicateKeyGet.ts"
import { adminEventOverviewSummaryCreate } from "./adminEventOverviewSummaryCreate.ts"

export function adminEventOverviewStateCreate(inputs: {
  readonly event: () => AdminEventItem | undefined
  readonly onEdit: (eventKey: string) => void
  readonly onBookings: (eventKey: string) => void
}) {
  const eventKey = createMemo(() => inputs.event()?.id)
  const actionError = createSignalObject("")
  const duplicatePending = createSignalObject(false)
  const archivePending = createSignalObject(false)
  const duplicate = mutationCreate(api.catalog.eventDuplicate)
  const archive = mutationCreate(api.catalog.eventArchive)
  const overview = queryPaginatedCreate(
    api.catalog.eventOverviewPage,
    () => {
      const key = eventKey()
      return key ? { eventKey: key } : undefined
    },
    { pageSize: 50, allPages: true },
  )
  let generation = 0
  createRenderEffect(() => {
    eventKey()
    generation += 1
    actionError.set("")
    duplicatePending.set(false)
    archivePending.set(false)
  })
  const duplicateRun = async () => {
    const key = eventKey()
    if (!key || duplicatePending.get() || archivePending.get()) return
    const request = generation
    duplicatePending.set(true)
    actionError.set("")
    let response: Awaited<ReturnType<typeof duplicate>>
    try {
      response = await duplicate({ eventKey: key })
    } catch {
      if (request !== generation || inputs.event()?.id !== key) return
      duplicatePending.set(false)
      actionError.set("Event konnte nicht dupliziert werden.")
      return
    }
    if (request !== generation || inputs.event()?.id !== key) return
    duplicatePending.set(false)
    const result = adminEventDuplicateKeyGet(response)
    if (!result.success) {
      actionError.set(result.errorMessage)
      return
    }
    inputs.onEdit(result.data)
  }
  const archiveRun = async () => {
    const event = inputs.event()
    if (!event || event.status === "archived" || duplicatePending.get() || archivePending.get()) return
    const request = generation
    archivePending.set(true)
    actionError.set("")
    let result: Awaited<ReturnType<typeof archive>>
    try {
      result = await archive({ eventKey: event.id })
    } catch {
      if (request !== generation || inputs.event()?.id !== event.id) return
      archivePending.set(false)
      actionError.set("Event konnte nicht archiviert werden.")
      return
    }
    if (request !== generation || inputs.event()?.id !== event.id) return
    archivePending.set(false)
    if (!result.success) actionError.set(result.errorMessage)
  }
  const summary = createMemo(() => {
    const result = overview.result()
    const event = inputs.event()
    if (!event || !overview.isDone() || !result?.success) return undefined
    return adminEventOverviewSummaryCreate(result.data, event.tiers)
  })
  const panelId = (key: string) => `admin-event-overview-${encodeURIComponent(key)}`
  const panelProps = (): AdminEventOverviewPanelProps => {
    const event = inputs.event()
    const result = overview.result()
    return {
      id: panelId(event?.id ?? ""),
      eventTitle: event?.title ?? "",
      archived: event?.status === "archived",
      summary: summary(),
      loading: !result || overview.isLoading() || (!overview.isDone() && result.success),
      errorMessage: result && !result.success ? result.errorMessage : undefined,
      actionErrorMessage: actionError.get(),
      duplicatePending: duplicatePending.get(),
      archivePending: archivePending.get(),
      onBookings: () => {
        if (event) inputs.onBookings(event.id)
      },
      onEdit: () => {
        if (event) inputs.onEdit(event.id)
      },
      onDuplicate: () => void duplicateRun(),
      onArchive: () => void archiveRun(),
    }
  }
  return { panelProps, panelId }
}
