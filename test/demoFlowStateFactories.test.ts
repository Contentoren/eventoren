import { describe, expect, test } from "bun:test"
import { createRoot, createSignal } from "solid-js"
import { demoCatalogEvents } from "../src/demo/fixtures/demoCatalogEvents.ts"
import { demoTicketOrders } from "../src/demo/fixtures/demoTicketOrders.ts"
import type { DemoFlowContextValue } from "../src/demo/state/demoFlowContext.ts"
import { demoAdminStateCreate } from "../src/demo/state/demoAdminStateCreate.ts"
import { demoCatalogPageStateCreate } from "../src/demo/state/demoCatalogPageStateCreate.ts"
import { demoCheckoutStatusPageStateCreate } from "../src/demo/state/demoCheckoutStatusPageStateCreate.ts"
import { demoEventDetailPageStateCreate } from "../src/demo/state/demoEventDetailPageStateCreate.ts"
import { demoOrderHistoryPageStateCreate } from "../src/demo/state/demoOrderHistoryPageStateCreate.ts"
import { demoOrderStatusPageStateCreate } from "../src/demo/state/demoOrderStatusPageStateCreate.ts"
import { demoOrganizerEventDetailPageStateCreate } from "../src/demo/state/demoOrganizerEventDetailPageStateCreate.ts"
import { demoOrganizerEventListPageStateCreate } from "../src/demo/state/demoOrganizerEventListPageStateCreate.ts"
import type { DemoFlowState } from "../src/demo/model/demoFlowStateSchema.ts"

function mockFlowContextCreate(initialState: DemoFlowState = "loaded"): DemoFlowContextValue {
  const [state, setState] = createSignal<DemoFlowState>(initialState)
  return {
    state,
    setState,
    isLoaded: () => state() === "loaded",
    isLoading: () => state() === "loading",
    isEmpty: () => state() === "empty",
    isError: () => state() === "error",
    supportedStates: () => ["loaded", "loading", "empty", "error"],
    hasFlowStates: () => true,
    defaultState: () => initialState,
    reset: () => setState(initialState),
  }
}

describe("demoCatalogPageStateCreate with shared flow state", () => {
  test("responds to all 4 flow states and restores data on reload/retry", () => {
    createRoot((dispose) => {
      const flow = mockFlowContextCreate("loaded")
      const state = demoCatalogPageStateCreate({ events: demoCatalogEvents, flow })

      // Loaded state
      expect(state.isLoading()).toBe(false)
      expect(state.error()).toBe("")
      expect(state.visibleEvents().length).toBeGreaterThan(0)
      expect(state.resultCount()).toBe(demoCatalogEvents.length)

      // Loading state
      flow.setState("loading")
      expect(state.isLoading()).toBe(true)
      expect(state.error()).toBe("")
      expect(state.visibleEvents()).toEqual([])
      expect(state.resultCount()).toBe(0)

      // Empty state
      flow.setState("empty")
      expect(state.isLoading()).toBe(false)
      expect(state.error()).toBe("")
      expect(state.visibleEvents()).toEqual([])

      // Error state
      flow.setState("error")
      expect(state.isLoading()).toBe(false)
      expect(state.error()).toBe("Der Eventkatalog ist gerade nicht verfügbar. Bitte versuche es später erneut.")
      expect(state.visibleEvents()).toEqual([])

      // Retry restores loaded state and fixture events
      state.retry()
      expect(flow.state()).toBe("loaded")
      expect(state.visibleEvents().length).toBe(demoCatalogEvents.length)

      dispose()
    })
  })
})

describe("demoEventDetailPageStateCreate with shared flow state", () => {
  test("reflects loading, empty, error and loaded states with retry", () => {
    createRoot((dispose) => {
      const flow = mockFlowContextCreate("loaded")
      const state = demoEventDetailPageStateCreate({
        event: () => demoCatalogEvents[0]!,
        flow,
      })

      // Loaded
      expect(state.isLoaded()).toBe(true)
      expect(state.isLoading()).toBe(false)
      expect(state.isEmpty()).toBe(false)
      expect(state.isError()).toBe(false)
      expect(state.event().id).toBe(demoCatalogEvents[0]!.id)

      // Loading
      flow.setState("loading")
      expect(state.isLoading()).toBe(true)
      expect(state.isLoaded()).toBe(false)

      // Empty
      flow.setState("empty")
      expect(state.isEmpty()).toBe(true)
      expect(state.isLoaded()).toBe(false)

      // Error
      flow.setState("error")
      expect(state.isError()).toBe(true)
      expect(state.isLoaded()).toBe(false)

      // Retry
      state.retry()
      expect(flow.state()).toBe("loaded")
      expect(state.isLoaded()).toBe(true)

      dispose()
    })
  })
})

describe("demoOrderHistoryPageStateCreate with shared flow state", () => {
  test("reflects all 4 states and preserves legacy signed-out scenario", () => {
    createRoot((dispose) => {
      const flow = mockFlowContextCreate("loaded")
      const state = demoOrderHistoryPageStateCreate({ flow })

      // Loaded
      expect(state.isLoading()).toBe(false)
      expect(state.listError()).toBe("")
      expect(state.orders().length).toBe(demoTicketOrders.summaries.length)
      expect(state.isAuthenticated()).toBe(true)

      // Loading
      flow.setState("loading")
      expect(state.isLoading()).toBe(true)
      expect(state.orders()).toEqual([])

      // Empty
      flow.setState("empty")
      expect(state.isLoading()).toBe(false)
      expect(state.orders()).toEqual([])

      // Error
      flow.setState("error")
      expect(state.isLoading()).toBe(false)
      expect(state.listError()).toBe("Die Demo-Bestellungen konnten nicht geladen werden.")
      expect(state.orders()).toEqual([])

      // Retry
      state.retryList()
      expect(flow.state()).toBe("loaded")
      expect(state.orders().length).toBe(demoTicketOrders.summaries.length)

      // Preserves legacy signed-out scenario
      const signedOutState = demoOrderHistoryPageStateCreate({ scenario: "signed-out" })
      expect(signedOutState.isAuthenticated()).toBe(false)

      dispose()
    })
  })
})

describe("demoOrderStatusPageStateCreate with shared flow state", () => {
  test("reflects all 4 states and transitions back on refresh", async () => {
    await createRoot(async (dispose) => {
      const flow = mockFlowContextCreate("loaded")
      const state = demoOrderStatusPageStateCreate({ scenario: "paid", flow })

      // Loaded
      expect(state.isLoading()).toBe(false)
      expect(state.errorMessage()).toBe("")
      expect(state.orders().length).toBe(1)

      // Loading
      flow.setState("loading")
      expect(state.isLoading()).toBe(true)
      expect(state.orders()).toEqual([])

      // Empty
      flow.setState("empty")
      expect(state.isLoading()).toBe(false)
      expect(state.orders()).toEqual([])

      // Error
      flow.setState("error")
      expect(state.errorMessage()).toBe("Die Demo-Bestellung konnte nicht geladen werden.")
      expect(state.orders()).toEqual([])

      // Refresh restores loaded
      await state.refresh()
      expect(flow.state()).toBe("loaded")
      expect(state.orders().length).toBe(1)

      dispose()
    })
  })
})

describe("demoCheckoutStatusPageStateCreate with shared flow state", () => {
  test("reflects all 4 states and transitions on refresh", async () => {
    await createRoot(async (dispose) => {
      const flow = mockFlowContextCreate("loading")
      const state = demoCheckoutStatusPageStateCreate({ scenario: "loading", flow })

      // Loading
      expect(state.isLoading()).toBe(true)
      expect(state.orders()).toEqual([])

      // Loaded
      flow.setState("loaded")
      expect(state.isLoading()).toBe(false)
      expect(state.orders().length).toBe(1)

      // Empty
      flow.setState("empty")
      expect(state.orders()).toEqual([])

      // Error
      flow.setState("error")
      expect(state.errorMessage()).toBe("Die Checkout-Bestätigung konnte nicht geladen werden.")

      // Refresh restores loaded
      await state.refresh()
      expect(flow.state()).toBe("loaded")
      expect(state.orders().length).toBe(1)

      dispose()
    })
  })
})

describe("demoOrganizerEventListPageStateCreate with shared flow state", () => {
  test("reflects loaded, loading, empty, and error states", () => {
    createRoot((dispose) => {
      const flow = mockFlowContextCreate("loaded")
      const state = demoOrganizerEventListPageStateCreate({ emptyEvents: false, flow })

      // Loaded
      expect(state.loading()).toBe(false)
      expect(state.errorMessage()).toBe("")
      expect(state.groups().length).toBeGreaterThan(0)

      // Loading
      flow.setState("loading")
      expect(state.loading()).toBe(true)
      expect(state.groups()).toEqual([])

      // Empty
      flow.setState("empty")
      expect(state.loading()).toBe(false)
      expect(state.groups()).toEqual([])
      expect(state.errorMessage()).toBe("")

      // Error
      flow.setState("error")
      expect(state.errorMessage()).toBe("Veranstalter-Events konnten nicht geladen werden.")
      expect(state.groups()).toEqual([])

      // Back to loaded
      flow.setState("loaded")
      expect(state.groups().length).toBeGreaterThan(0)

      dispose()
    })
  })
})

describe("demoOrganizerEventDetailPageStateCreate with shared flow state", () => {
  test("reflects loaded, loading, empty, and error states", () => {
    createRoot((dispose) => {
      const flow = mockFlowContextCreate("loaded")
      const state = demoOrganizerEventDetailPageStateCreate({
        eventKey: () => "demo-event",
        initialSearch: () => "",
        initialTicketId: () => "",
        searchReplace: () => undefined,
        flow,
      })

      // Loaded
      expect(state.loading()).toBe(false)

      // Loading
      flow.setState("loading")
      expect(state.loading()).toBe(true)
      expect(state.tickets()).toEqual([])
      expect(state.event()).toBeUndefined()

      // Empty
      flow.setState("empty")
      expect(state.tickets()).toEqual([])
      expect(state.isDone()).toBe(true)

      // Error
      flow.setState("error")
      expect(state.errorMessage()).toBe("Veranstalter-Details konnten nicht geladen werden.")

      dispose()
    })
  })
})

describe("demoAdminStateCreate with shared flow state", () => {
  test("coordinates catalog and members loading, empty, error, and loaded states", async () => {
    await createRoot(async (dispose) => {
      const flow = mockFlowContextCreate("loaded")
      const state = demoAdminStateCreate({ flow })

      // Loaded
      expect(state.catalog.events().length).toBeGreaterThan(0)
      expect(state.catalog.isLoading?.()).toBe(false)
      expect(state.members?.members().length).toBeGreaterThan(0)
      expect(state.members?.isLoading()).toBe(false)

      // Loading
      flow.setState("loading")
      expect(state.catalog.events()).toEqual([])
      expect(state.catalog.isLoading?.()).toBe(true)
      expect(state.members?.members()).toEqual([])
      expect(state.members?.isLoading()).toBe(true)
      expect(state.members?.hasLoaded()).toBe(false)

      // Empty
      flow.setState("empty")
      expect(state.catalog.events()).toEqual([])
      expect(state.catalog.isLoading?.()).toBe(false)
      expect(state.members?.members()).toEqual([])
      expect(state.members?.total()).toBe(0)

      // Error
      flow.setState("error")
      expect(state.catalog.errorMessage()).toBe("Der Eventkatalog konnte nicht geladen werden.")
      expect(state.members?.errorMessage()).toBe("Die Mitglieder konnten nicht geladen werden.")

      // Member reload restores loaded state
      await state.members?.reload()
      expect(flow.state()).toBe("loaded")
      expect(state.catalog.events().length).toBeGreaterThan(0)
      expect(state.members?.members().length).toBeGreaterThan(0)

      dispose()
    })
  })
})
