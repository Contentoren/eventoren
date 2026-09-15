import { getRouteApi } from "@tanstack/solid-router"
import { createEffect, createMemo } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.ts"
import type { CatalogEventListPublishedPage } from "../catalog/CatalogEventListPublishedPage.ts"
import { apiClientCatalogEventListPublishedPageGet } from "../client/apiClientCatalogEventListPublishedPageGet.ts"
import type { ApiClientResult } from "../client/apiClient.ts"
import type { EventFilter } from "./EventFilter.ts"
import type { EventItem } from "./EventItem.ts"

const routeApi = getRouteApi("/")

const pageSize = 12

export function indexPageStateCreate(inputs: {
  initialPage: () => { filter: EventFilter; result: ApiClientResult<CatalogEventListPublishedPage> }
  pageGet?: typeof apiClientCatalogEventListPublishedPageGet
}) {
  const search = routeApi.useSearch()
  const navigate = routeApi.useNavigate()
  const pageGet = inputs.pageGet ?? apiClientCatalogEventListPublishedPageGet
  const events = createSignalObject<readonly EventItem[]>([])
  const cursor = createSignalObject<string | null>(null)
  const isDone = createSignalObject(false)
  const isLoading = createSignalObject(false)
  const error = createSignalObject("")
  let revision = 0
  let appliedInitialPage: unknown
  let activeFilterFingerprint = ""

  const filter = createMemo<EventFilter>(() => ({
    query: search().q ?? "",
    location: search().ort ?? "",
    category: search().kategorie ?? "alle",
    timeWindow: search().zeitraum ?? "alle",
  }))

  const isBookingSuccess = createMemo(() => search().buchung === "erfolgreich")

  const reset = () => {
    revision += 1
    events.set([])
    cursor.set(null)
    isDone.set(false)
    isLoading.set(false)
    error.set("")
  }

  const pageApply = (page: CatalogEventListPublishedPage) => {
    const knownIds = new Set(events.get().map((event) => event.id))
    const nextEvents = page.page.filter((event) => !knownIds.has(event.id))
    // Append without re-sorting: the API's ascending statusAndStartsAt index is the explicit default order.
    events.set([...events.get(), ...nextEvents])
    cursor.set(page.continueCursor)
    isDone.set(page.isDone)
  }

  const pageLoad = async (pageCursor: string | null, requestRevision: number, requestFilter: EventFilter) => {
    if (isLoading.get()) return
    isLoading.set(true)
    error.set("")
    let nextCursor = pageCursor

    while (true) {
      const result = await pageGet({
        filter: requestFilter,
        paginationOpts: { numItems: pageSize, cursor: nextCursor },
      })
      if (requestRevision !== revision) return
      if (!result.success) {
        error.set(result.error.message)
        isLoading.set(false)
        return
      }

      pageApply(result.data)
      if (result.data.page.length > 0 || result.data.isDone) {
        isLoading.set(false)
        return
      }
      nextCursor = result.data.continueCursor
    }
  }

  createEffect(() => {
    const currentFingerprint = eventFilterFingerprintGet(filter())
    if (activeFilterFingerprint !== currentFingerprint) {
      activeFilterFingerprint = currentFingerprint
      reset()
    }

    const initialPage = inputs.initialPage()
    if (initialPage === appliedInitialPage) return
    if (eventFilterFingerprintGet(initialPage.filter) !== currentFingerprint) return
    appliedInitialPage = initialPage

    reset()
    if (!initialPage.result.success) {
      error.set(initialPage.result.error.message)
      return
    }
    pageApply(initialPage.result.data)
    if (initialPage.result.data.page.length === 0 && !initialPage.result.data.isDone) {
      void pageLoad(initialPage.result.data.continueCursor, revision, initialPage.filter)
    }
  })

  const applyFilter = (next: EventFilter) => {
    if (eventFilterFingerprintGet(next) !== eventFilterFingerprintGet(filter())) reset()
    navigate({
      to: "/",
      search: {
        q: next.query.length > 0 ? next.query : undefined,
        ort: next.location.length > 0 ? next.location : undefined,
        kategorie: next.category === "alle" ? undefined : next.category,
        zeitraum: next.timeWindow === "alle" ? undefined : next.timeWindow,
        buchung: search().buchung,
      },
      replace: true,
      resetScroll: false,
    })
  }

  const dismissBookingSuccess = () => {
    navigate({
      to: "/",
      search: {
        q: search().q,
        ort: search().ort,
        kategorie: search().kategorie,
        zeitraum: search().zeitraum,
        buchung: undefined,
      },
      replace: true,
      resetScroll: false,
    })
  }

  const loadMore = () => {
    const nextCursor = cursor.get()
    if (nextCursor === null || isDone.get() || isLoading.get()) return
    void pageLoad(nextCursor, revision, filter())
  }

  const retry = () => {
    if (isLoading.get()) return
    const nextCursor = events.get().length > 0 ? cursor.get() : null
    if (nextCursor === null && events.get().length > 0) return
    void pageLoad(nextCursor, revision, filter())
  }

  return {
    filter,
    events: events.get,
    resultCount: () => events.get().length,
    isDone: isDone.get,
    isLoading: isLoading.get,
    error: error.get,
    isBookingSuccess,
    dismissBookingSuccess,
    applyFilter,
    loadMore,
    retry,
  }
}

function eventFilterFingerprintGet(filter: EventFilter): string {
  return JSON.stringify({
    query: filter.query.trim().toLowerCase(),
    location: filter.location.trim().toLowerCase(),
    category: filter.category,
    timeWindow: filter.timeWindow,
  })
}
