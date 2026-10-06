import { describe, expect, mock, test } from "bun:test"

const solidPath = "solid-js/dist/solid.js"
const solid = (await import(solidPath)) as unknown as typeof import("solid-js")
mock.module("solid-js", () => solid)
const { createRoot, createSignal } = solid
const [routeData, setRouteData] = createSignal({
  authorized: true,
  eventsResult: { success: true as const, data: [] as { id: string; title: string }[] },
})
const [liveResult, setLiveResult] = createSignal<unknown>(undefined)
let paginationArgs: (() => unknown) | undefined
let paginationOptions: unknown
let catalogInputs: Record<string, unknown> | undefined

mock.module("@tanstack/solid-router", () => ({
  getRouteApi: () => ({ useLoaderData: () => routeData }),
}))
mock.module("@tanstack/solid-start", () => ({
  createServerFn: () => ({
    validator() {
      return this
    },
    handler() {
      return async () => ({ success: false, errorMessage: "not used" })
    },
  }),
}))
mock.module("#src/auth/ui/eventorenAuthContextUse.ts", () => ({
  eventorenAuthContextUse: () => ({ ready: () => true, token: () => "test-token" }),
}))
mock.module("#src/utils/convex_client/queryPaginatedCreate.ts", () => ({
  queryPaginatedCreate: (_query: unknown, args: () => unknown, options: unknown) => {
    paginationArgs = args
    paginationOptions = options
    return {
      result: liveResult,
      pages: () => [],
      isLoading: () => false,
      isDone: () => true,
      loadMore: () => undefined,
    }
  },
}))
mock.module("#src/utils/convex_client/queryCreate.ts", () => ({ queryCreate: () => () => undefined }))
mock.module("#src/utils/convex_client/mutationCreate.ts", () => ({
  mutationCreate: () => async () => ({ success: true, data: undefined }),
}))
mock.module("#src/server/adminImageUploadFromSession.ts", () => ({
  adminImageUploadFromSession: async () => ({ success: false }),
}))
mock.module("../src/admin/adminCatalogPageStateCreate.ts", () => ({
  adminCatalogPageStateCreate: (inputs: Record<string, unknown>) => {
    catalogInputs = inputs
    return inputs
  },
}))

const { adminEventsRouteStateCreate } = await import("../src/admin/adminEventsRouteStateCreate.ts")
mock.restore()

describe("admin events route pagination integration", () => {
  test("uses the all-pages live aggregate and retains the authorized loader fallback", () => {
    createRoot((dispose) => {
      try {
        adminEventsRouteStateCreate()
        const events = catalogInputs!.events as () => unknown
        const eventsLive = catalogInputs!.eventsLive as () => unknown
        expect(paginationArgs?.()).toEqual({})
        expect(paginationOptions).toEqual({ pageSize: 50, allPages: true })
        expect(events()).toEqual([])

        const event = { id: "live-event", title: "Live event" }
        setLiveResult({ success: true, data: [event] })
        expect(eventsLive()).toEqual([event])
        expect(events()).toEqual([event])

        setLiveResult(undefined)
        setRouteData({
          authorized: true,
          eventsResult: { success: true, data: [{ id: "loader-event", title: "Loader event" }] },
        })
        expect(events()).toEqual([{ id: "loader-event", title: "Loader event" }])

        setRouteData({ authorized: false, eventsResult: { success: true, data: [event] } })
        expect(paginationArgs?.()).toBeUndefined()
        expect(events()).toEqual([])
      } finally {
        dispose()
      }
    })
  })
})
