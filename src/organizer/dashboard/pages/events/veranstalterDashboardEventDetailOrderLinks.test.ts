import { describe, expect, mock, test } from "bun:test"
import { createResult } from "#result"
import type { VeranstalterDashboardEventDetailSources } from "./veranstalterDashboardEventDetailStateCreate.ts"

const solidJsClientPath = "solid-js/dist/solid.js"
type SolidJsModule = typeof import("solid-js")
const solidJsClient = (await import(solidJsClientPath)) as unknown as SolidJsModule
mock.module("solid-js", () => solidJsClient)
const { createRoot, createSignal } = solidJsClient
const { veranstalterDashboardEventDetailStateCreate } = await import("./veranstalterDashboardEventDetailStateCreate.ts")
mock.restore()

const stubSources: VeranstalterDashboardEventDetailSources = {
  updateEvent: () => Promise.resolve(createResult(null)),
  upsertTier: (_orgId, _eventKey, input) => Promise.resolve(createResult({ tierKey: input.tierKey ?? "tier-neu" })),
  archiveTier: (_orgId, _eventKey, tierKey) => Promise.resolve(createResult({ tierKey })),
  publishEvent: () => Promise.resolve(createResult(null)),
  archiveEvent: () => Promise.resolve(createResult(null)),
  watchDetail: () => () => undefined,
}

function stateCreate(options?: {
  readonly canReadOrders?: () => boolean
  readonly canReadParticipants?: () => boolean
}) {
  let state!: ReturnType<typeof veranstalterDashboardEventDetailStateCreate>
  createRoot(() => {
    state = veranstalterDashboardEventDetailStateCreate({
      orgId: () => "org-1",
      eventKey: () => "evt-1",
      tierKey: () => undefined,
      confirm: () => undefined,
      canEdit: () => false,
      canManageTiers: () => false,
      openTier: () => undefined,
      closeTier: () => undefined,
      openConfirm: () => undefined,
      closeConfirm: () => undefined,
      toList: () => undefined,
      ...options,
      sources: stubSources,
    })
  })
  return state
}

describe("veranstalterDashboardEventDetailStateCreate order links", () => {
  test("order and participant links stay hidden without explicit permissions", () => {
    const state = stateCreate()
    expect(state.canReadOrders()).toBe(false)
    expect(state.canReadParticipants()).toBe(false)
  })

  test("participant-only entry role exposes participants without orders", () => {
    const state = stateCreate({ canReadOrders: () => false, canReadParticipants: () => true })
    expect(state.canReadOrders()).toBe(false)
    expect(state.canReadParticipants()).toBe(true)
  })

  test("order reading exposes both links and follows reactive permission changes", () => {
    const [permissions, setPermissions] = createSignal<readonly string[]>(["bestellungen.sehen"])
    const state = stateCreate({
      canReadOrders: () => permissions().includes("bestellungen.sehen"),
      canReadParticipants: () =>
        permissions().includes("bestellungen.sehen") || permissions().includes("einlass.nutzen"),
    })
    expect(state.canReadOrders()).toBe(true)
    expect(state.canReadParticipants()).toBe(true)
    setPermissions(["einlass.nutzen"])
    expect(state.canReadOrders()).toBe(false)
    expect(state.canReadParticipants()).toBe(true)
    setPermissions([])
    expect(state.canReadOrders()).toBe(false)
    expect(state.canReadParticipants()).toBe(false)
  })
})
