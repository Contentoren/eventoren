import { describe, expect, test } from "bun:test"
import { createRoot, createSignal } from "solid-js"
import { demoAdminMembers } from "../src/demo/fixtures/demoAdminMembers.ts"
import type { DemoFlowState } from "../src/demo/model/demoFlowStateSchema.ts"
import { demoAdminOrganizerMembersPageStateCreate } from "../src/demo/state/demoAdminOrganizerMembersPageStateCreate.ts"
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

describe("demoAdminOrganizerMembersPageStateCreate", () => {
  test("reflects loaded, loading, empty, and error states with reload restoring data", async () => {
    await createRoot(async (dispose) => {
      const flow = mockFlowContextCreate("loaded")
      const state = demoAdminOrganizerMembersPageStateCreate({ flow })
      const expectedOrganizers = demoAdminMembers.filter((m) => m.organizerGranted)

      // Loaded state
      expect(state.isLoading()).toBe(false)
      expect(state.hasLoaded()).toBe(true)
      expect(state.errorMessage()).toBe("")
      expect(state.members().length).toBe(expectedOrganizers.length)
      expect(state.members()[0]?.displayName).toBe("Mara König")

      // Loading state
      flow.setState("loading")
      expect(state.isLoading()).toBe(true)
      expect(state.hasLoaded()).toBe(false)
      expect(state.errorMessage()).toBe("")
      expect(state.members()).toEqual([])

      // Empty state
      flow.setState("empty")
      expect(state.isLoading()).toBe(false)
      expect(state.hasLoaded()).toBe(true)
      expect(state.errorMessage()).toBe("")
      expect(state.members()).toEqual([])

      // Error state
      flow.setState("error")
      expect(state.isLoading()).toBe(false)
      expect(state.hasLoaded()).toBe(false)
      expect(state.errorMessage()).toBe("Die Veranstalter konnten nicht geladen werden.")
      expect(state.members()).toEqual([])

      // Reload restores loaded state and members
      await state.reload()
      expect(flow.state()).toBe("loaded")
      expect(state.members().length).toBe(expectedOrganizers.length)
      expect(state.errorMessage()).toBe("")
      expect(state.hasLoaded()).toBe(true)

      dispose()
    })
  })

  test("formats contact information and invitation timestamp", () => {
    createRoot((dispose) => {
      const flow = mockFlowContextCreate("loaded")
      const state = demoAdminOrganizerMembersPageStateCreate({ flow })

      const firstOrganizer = state.members()[0]
      expect(firstOrganizer).toBeDefined()
      if (!firstOrganizer) return
      expect(state.contact(firstOrganizer)).toBe("mara.koenig@example.test")
      expect(state.invitationFormat(firstOrganizer.organizerInvitedAt)).toContain("2026")
      expect(state.invitationFormat(undefined)).toBe("—")

      dispose()
    })
  })
})
