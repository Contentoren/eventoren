import { createMemo, createRenderEffect } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { api } from "#convex/_generated/api.js"
import type { Id } from "#convex/_generated/dataModel.js"
import type { OrganizerDashboardEventSummary } from "../../events/model/organizerDashboardEventSummaryCreate.ts"
import { queryPaginatedCreate } from "#src/utils/convex_client/queryPaginatedCreate.ts"
import type { VeranstalterDashboardEventsTab } from "./veranstalterDashboardEventsTabResolve.ts"
import { veranstalterDashboardEventsTabResolve } from "./veranstalterDashboardEventsTabResolve.ts"

export function veranstalterDashboardEventsListStateCreate(inputs: {
  readonly orgId: () => string | undefined
  readonly tab: () => VeranstalterDashboardEventsTab
  readonly query: () => string
  readonly canCreate: () => boolean
  readonly createNew: () => void
}) {
  const nowIso = new Date().toISOString()
  const paginated = queryPaginatedCreate(
    api.organizerDashboardEvents.organizerDashboardEventListQuery,
    () => {
      const orgId = inputs.orgId()
      if (!orgId) return undefined
      const tabQuery = veranstalterDashboardEventsTabResolve(inputs.tab(), nowIso)
      const search = inputs.query().trim()
      return {
        orgId: orgId as Id<"orgs">,
        ...tabQuery,
        ...(search.length > 0 ? { search } : {}),
      }
    },
    { pageSize: 50 },
  )

  const rows = createMemo((): readonly OrganizerDashboardEventSummary[] | undefined => {
    const result = paginated.result()
    if (!result || !result.success) return result === undefined ? undefined : []
    return result.data
  })

  const listError = (): string | null => {
    const result = paginated.result()
    if (result && !result.success) return result.errorMessage
    return null
  }

  const isEmpty = (): boolean => listError() === null && (rows()?.length ?? -1) === 0

  const draftQuery = createSignalObject(inputs.query())
  createRenderEffect(() => {
    draftQuery.set(inputs.query())
  })

  return {
    rows,
    listError,
    isEmpty,
    draftQuery: draftQuery.get,
    draftQueryChange: draftQuery.set,
    isLoading: paginated.isLoading,
    isDone: paginated.isDone,
    loadMore: paginated.loadMore,
    tab: inputs.tab,
    query: inputs.query,
    canCreate: inputs.canCreate,
    createNew: inputs.createNew,
  }
}

export type VeranstalterDashboardEventsListState = ReturnType<typeof veranstalterDashboardEventsListStateCreate>
