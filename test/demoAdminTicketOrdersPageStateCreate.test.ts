import { describe, expect, test } from "bun:test"
import { createRoot, createSignal } from "solid-js"
import { demoAdminTicketOrders } from "../src/demo/fixtures/demoAdminTicketOrders.ts"
import type { DemoFlowState } from "../src/demo/model/demoFlowStateSchema.ts"
import { demoAdminTicketOrdersPageStateCreate } from "../src/demo/state/demoAdminTicketOrdersPageStateCreate.ts"
import type { DemoFlowContextValue } from "../src/demo/state/demoFlowContext.ts"

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

describe("demoAdminTicketOrdersPageStateCreate", () => {
  test("reflects loaded, loading, empty, and error states with reload restoring data", () => {
    createRoot((dispose) => {
      const flow = mockFlowContextCreate("loaded")
      const state = demoAdminTicketOrdersPageStateCreate({ flow })

      // Loaded state
      expect(state.isLoading()).toBe(false)
      expect(state.errorMessage()).toBe("")
      expect(state.orders().length).toBe(demoAdminTicketOrders.length)
      expect(state.orders()[0]?.id).toBe("admin-ord-001")

      // Loading state
      flow.setState("loading")
      expect(state.isLoading()).toBe(true)
      expect(state.errorMessage()).toBe("")
      expect(state.orders()).toEqual([])

      // Empty state
      flow.setState("empty")
      expect(state.isLoading()).toBe(false)
      expect(state.errorMessage()).toBe("")
      expect(state.orders()).toEqual([])

      // Error state
      flow.setState("error")
      expect(state.isLoading()).toBe(false)
      expect(state.errorMessage()).toBe("Die Bestellungen konnten nicht geladen werden.")
      expect(state.orders()).toEqual([])

      // Reload restores loaded state and orders
      state.reload()
      expect(flow.state()).toBe("loaded")
      expect(state.orders().length).toBe(demoAdminTicketOrders.length)
      expect(state.errorMessage()).toBe("")

      dispose()
    })
  })

  test("formats order attributes and executes local mock loadMore", async () => {
    await createRoot(async (dispose) => {
      const flow = mockFlowContextCreate("loaded")
      const state = demoAdminTicketOrdersPageStateCreate({ flow })

      const firstOrder = state.orders()[0]
      expect(firstOrder).toBeDefined()
      if (!firstOrder) return
      expect(state.customerName(firstOrder)).toBe("Sophie Schmidt")
      expect(state.priceFormat(firstOrder.totalCents)).toContain("119")
      expect(state.paymentLabel("paid")).toBe("Bezahlt")
      expect(state.paymentLabel("pending")).toBe("Offen")
      expect(state.paymentLabel("failed")).toBe("Fehlgeschlagen")
      expect(state.paymentTone("paid")).toBe("success")
      expect(state.paymentTone("pending")).toBe("warning")
      expect(state.paymentTone("failed")).toBe("danger")

      expect(state.isDone()).toBe(false)
      await state.loadMore()
      expect(state.isDone()).toBe(true)

      dispose()
    })
  })
})
